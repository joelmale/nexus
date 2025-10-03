import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { webSocketService } from '../../../src/utils/websocket';

// Mock WebSocket
const mockWebSocket: {
  addEventListener: Mock;
  removeEventListener: Mock;
  send: Mock;
  close: Mock;
  readyState: number;
  onopen: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
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
    const mockConstructor = vi.fn().mockImplementation(() => mockWebSocket);
    Object.assign(mockConstructor, {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    });
    global.WebSocket = mockConstructor as any;
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
    const connectPromise = webSocketService.connect('TEST123');

    expect(global.WebSocket).toHaveBeenCalled();

    // Simulate successful connection
    mockWebSocket.readyState = 1; // OPEN
    if (mockWebSocket.onopen) {
      mockWebSocket.onopen(new Event('open'));
    }

    await expect(connectPromise).resolves.toBeUndefined();
    expect(webSocketService.isConnected()).toBe(true);
  });

  it('should handle connection events', () => {
    const messageListener = vi.fn();

    webSocketService.addEventListener('message', messageListener);
    webSocketService.connect('TEST123');

    // Simulate WebSocket events
    mockWebSocket.readyState = 1; // OPEN
    if (mockWebSocket.onopen) {
      mockWebSocket.onopen({} as Event);
    }

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: '{"type":"event","data":{"name":"test"}}' } as MessageEvent);
    }

    expect(messageListener).toHaveBeenCalled();
  });

  it('should send messages when connected', () => {
    webSocketService.connect('TEST123');

    // Simulate connection
    mockWebSocket.readyState = 1; // OPEN
    if (mockWebSocket.onopen) {
      mockWebSocket.onopen({} as Event);
    }

    const testEvent = { type: 'dice/roll', data: { roll: { expression: '1d20' } } };
    webSocketService.sendEvent(testEvent);

    expect(mockWebSocket.send).toHaveBeenCalled();
  });

  it('should not send messages when disconnected', () => {
    webSocketService.connect('TEST123');

    const testEvent = { type: 'dice/roll', data: { roll: { expression: '1d20' } } };
    webSocketService.sendEvent(testEvent);

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should handle malformed JSON messages gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    webSocketService.connect('TEST123');

    if (mockWebSocket.onmessage) {
      mockWebSocket.onmessage({ data: 'invalid json' } as MessageEvent);
    }

    expect(consoleSpy).toHaveBeenCalledWith('🔌 [CLIENT] Failed to parse WebSocket message:', expect.any(SyntaxError), 'invalid json');
    consoleSpy.mockRestore();
  });

  it('should disconnect properly', () => {
    webSocketService.connect('TEST123');
    webSocketService.disconnect();

    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
  });
});