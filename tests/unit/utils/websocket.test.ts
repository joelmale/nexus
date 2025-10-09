import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { webSocketService } from '../../../src/utils/websocket';

// Mock fetch to prevent HTTP health checks
global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

// Mock import.meta.env to disable server discovery in tests
vi.mock('import.meta', () => ({
  env: {
    DEV: false, // Disable dev mode to skip server discovery
    VITE_WS_PORT: '5000',
    VITE_WS_HOST: 'localhost',
  },
}));

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
    global.WebSocket = mockConstructor as typeof WebSocket;
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
});