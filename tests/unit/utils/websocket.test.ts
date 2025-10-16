import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { webSocketService } from '../../../src/utils/websocket';

// Mock fetch to prevent HTTP health checks in tests
global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

// Set environment to production mode to disable server discovery
vi.stubEnv('DEV', false);
vi.stubEnv('VITE_WS_PORT', '5000');
vi.stubEnv('VITE_WS_HOST', 'localhost');

// Mock WebSocket
const mockWebSocket: {
  addEventListener: Mock;
  removeEventListener: Mock;
  send: Mock;
  close: Mock;
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
} = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 0, // CONNECTING
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
};

// Mock global WebSocket
describe('WebSocketManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockConstructor = vi.fn().mockImplementation(() => {
      // Immediately trigger onopen to simulate successful connection
      mockWebSocket.readyState = 0; // CONNECTING
      setTimeout(() => {
        mockWebSocket.readyState = 1; // OPEN
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen(new Event('open'));
        }
      }, 0);
      return mockWebSocket;
    });
    Object.assign(mockConstructor, {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    });
    global.WebSocket = mockConstructor as unknown as typeof WebSocket;
    mockWebSocket.readyState = 0; // CONNECTING
    mockWebSocket.onopen = null;
    mockWebSocket.onmessage = null;
    mockWebSocket.onclose = null;
    mockWebSocket.onerror = null;
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  it('should create WebSocket connection', async () => {
    await webSocketService.connect('TEST123');

    expect(global.WebSocket).toHaveBeenCalled();
    expect(webSocketService.isConnected()).toBe(true);
  });

  it('should handle connection events', async () => {
    await webSocketService.connect('TEST123');
    expect(webSocketService.isConnected()).toBe(true);
  });

  it('should send messages when connected', async () => {
    await webSocketService.connect('TEST123');

    const testEvent = {
      type: 'dice/roll',
      data: { roll: { expression: '1d20' } },
    };
    webSocketService.sendEvent(testEvent);

    expect(mockWebSocket.send).toHaveBeenCalled();
  });

  it('should not send messages when disconnected', () => {
    webSocketService.connect('TEST123');

    const testEvent = {
      type: 'dice/roll',
      data: { roll: { expression: '1d20' } },
    };
    webSocketService.sendEvent(testEvent);

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should handle malformed JSON messages gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await webSocketService.connect('TEST123');

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: 'invalid json' } as MessageEvent);
    }

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should disconnect properly', async () => {
    await webSocketService.connect('TEST123');

    webSocketService.disconnect();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  describe('Heartbeat Mechanism', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start heartbeat when connected', async () => {
      await webSocketService.connect('TEST123');

      // Fast-forward time to trigger heartbeat
      vi.advanceTimersByTime(31000);

      // Should have sent ping messages
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"'),
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"ping"'),
      );
    });

    it('should respond to server ping with pong', async () => {
      await webSocketService.connect('TEST123');

      // Simulate receiving ping from server
      const pingMessage = {
        type: 'heartbeat',
        data: { type: 'ping', id: 'test-ping-id' },
        timestamp: Date.now(),
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(pingMessage),
        } as MessageEvent);
      }

      // Should respond with pong
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"pong"'),
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"id":"test-ping-id"'),
      );
    });

    it('should update connection quality on pong response', async () => {
      await webSocketService.connect('TEST123');

      // Initially should have default quality
      expect(webSocketService.getConnectionQuality().quality).toBe('excellent');

      // Simulate receiving pong from server
      const pongMessage = {
        type: 'heartbeat',
        data: { type: 'pong', id: 'test-pong-id' },
        timestamp: Date.now() - 50, // 50ms ago
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(pongMessage),
        } as MessageEvent);
      }

      const quality = webSocketService.getConnectionQuality();
      expect(quality.latency).toBe(50);
      expect(quality.quality).toBe('excellent'); // 50ms is excellent
    });

    it('should handle missed pongs and degrade quality', async () => {
      await webSocketService.connect('TEST123');

      // Initially excellent quality
      expect(webSocketService.getConnectionQuality().quality).toBe('excellent');

      // Fast-forward past heartbeat timeout (no pong received)
      vi.advanceTimersByTime(31000 + 11000); // heartbeat + timeout

      const quality = webSocketService.getConnectionQuality();
      expect(quality.consecutiveMisses).toBeGreaterThan(0);
      expect(['good', 'poor', 'critical']).toContain(quality.quality);
    });

    it('should stop heartbeat on disconnect', async () => {
      await webSocketService.connect('TEST123');

      // Start heartbeat
      vi.advanceTimersByTime(1000);

      webSocketService.disconnect();

      // Fast-forward time - should not send more heartbeats
      const sendCountBefore = mockWebSocket.send.mock.calls.length;
      vi.advanceTimersByTime(31000);

      // Send count should not increase
      expect(mockWebSocket.send).toHaveBeenCalledTimes(sendCountBefore);
    });

    it('should handle poor connection quality', async () => {
      await webSocketService.connect('TEST123');

      // Simulate high latency pong (poor quality)
      const pongMessage = {
        type: 'heartbeat',
        data: { type: 'pong', id: 'test-pong-id' },
        timestamp: Date.now() - 2500, // 2.5 seconds ago
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(pongMessage),
        } as MessageEvent);
      }

      const quality = webSocketService.getConnectionQuality();
      expect(quality.quality).toBe('poor');
      expect(quality.latency).toBe(2500);
    });

    it('should handle critical connection quality', async () => {
      await webSocketService.connect('TEST123');

      // Simulate very high latency pong (critical quality)
      const pongMessage = {
        type: 'heartbeat',
        data: { type: 'pong', id: 'test-pong-id' },
        timestamp: Date.now() - 5000, // 5 seconds ago
      };

      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(pongMessage),
        } as MessageEvent);
      }

      const quality = webSocketService.getConnectionQuality();
      expect(quality.quality).toBe('critical');
      expect(quality.latency).toBe(5000);
    });
  });
});
