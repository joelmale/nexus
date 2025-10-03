import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionPersistenceService } from '@/services/sessionPersistence';
import type { PersistedSession, PersistedGameState } from '@/services/sessionPersistence';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document.cookie
const cookieMock = {
  _cookie: '',
  get cookie() {
    return this._cookie;
  },
  set cookie(value) {
    this._cookie = value;
  },
};

Object.defineProperty(document, 'cookie', {
  get: vi.fn(() => cookieMock.cookie),
  set: vi.fn((value) => {
    cookieMock.cookie = value;
  }),
  configurable: true,
});


// Mock window.location and history
const mockLocation = {
  search: '',
  pathname: '/test',
};

const mockHistory = {
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: mockHistory,
});

describe('SessionPersistenceService', () => {
  const mockSession: PersistedSession = {
    roomCode: 'TEST123',
    userId: 'user-123',
    userType: 'player',
    userName: 'Test User',
    hostId: 'host-123',
    lastActivity: Date.now(),
    sessionVersion: 1,
  };

  const mockGameState: PersistedGameState = {
    characters: [
      {
        id: 'char-1',
        name: 'Test Character',
        level: 5,
        playerId: 'user-123',
      },
    ],
    initiative: {
      entries: [],
      currentTurn: 0,
      round: 1,
      isActive: false,
    },
    scenes: [
      {
        id: 'scene-1',
        name: 'Test Scene',
        gridSize: 50,
        dimensions: { width: 1000, height: 1000 },
      },
    ],
    activeSceneId: 'scene-1',
    settings: {
      colorScheme: { id: 'default', name: 'Default' },
      enableGlassmorphism: false,
    },
    lastUpdated: Date.now(),
    stateVersion: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    localStorageMock.getItem.mockReturnValue(null);
    mockLocation.search = '';
    cookieMock.cookie = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should save session data to localStorage', () => {
      sessionPersistenceService.saveSession(mockSession);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'nexus-session',
        expect.stringContaining(mockSession.roomCode)
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.roomCode).toBe(mockSession.roomCode);
      expect(savedData.userId).toBe(mockSession.userId);
      expect(savedData.lastActivity).toBeGreaterThan(mockSession.lastActivity);
    });

    it('should load session data from localStorage', () => {
      const sessionData = JSON.stringify(mockSession);
      localStorageMock.getItem.mockReturnValue(sessionData);

      const loadedSession = sessionPersistenceService.loadSession();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('nexus-session');
      expect(loadedSession).toEqual(mockSession);
    });

    it('should return null when no session data exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      cookieMock.cookie = ''; // Ensure cookie is empty

      const loadedSession = sessionPersistenceService.loadSession();

      expect(loadedSession).toBeNull();
    });

    it('should handle expired sessions', () => {
      const expiredSession = {
        ...mockSession,
        lastActivity: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredSession));

      const loadedSession = sessionPersistenceService.loadSession();

      expect(loadedSession).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-session');
    });

    it('should handle version mismatches', () => {
      const oldVersionSession = {
        ...mockSession,
        sessionVersion: 0, // Old version
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldVersionSession));

      const loadedSession = sessionPersistenceService.loadSession();

      expect(loadedSession).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-session');
    });

    it('should handle invalid JSON gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const loadedSession = sessionPersistenceService.loadSession();

      expect(loadedSession).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-session');
    });

    it('should clear session data', () => {
      sessionPersistenceService.clearSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-session');
    });
  });

  describe('Game State Management', () => {
    it('should save game state to localStorage', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { lastUpdated, stateVersion, ...gameStateInput } = mockGameState;

      sessionPersistenceService.saveGameState(gameStateInput);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'nexus-game-state',
        expect.stringContaining('Test Character')
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.characters).toEqual(gameStateInput.characters);
      expect(savedData.scenes).toEqual(gameStateInput.scenes);
      expect(savedData.lastUpdated).toBeGreaterThan(0);
      expect(savedData.stateVersion).toBe(1);
    });

    it('should load game state from localStorage', () => {
      const gameStateData = JSON.stringify(mockGameState);
      localStorageMock.getItem.mockReturnValue(gameStateData);

      const loadedGameState = sessionPersistenceService.loadGameState();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('nexus-game-state');
      expect(loadedGameState).toEqual(mockGameState);
    });

    it('should return null when no game state exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const loadedGameState = sessionPersistenceService.loadGameState();

      expect(loadedGameState).toBeNull();
    });

    it('should handle game state version mismatches', () => {
      const oldVersionGameState = {
        ...mockGameState,
        stateVersion: 0,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldVersionGameState));

      const loadedGameState = sessionPersistenceService.loadGameState();

      expect(loadedGameState).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-game-state');
    });

    it('should clear game state data', () => {
      sessionPersistenceService.clearGameState();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-game-state');
    });
  });

  describe('Recovery Data', () => {
    it('should get complete recovery data when both session and game state exist', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockSession))
        .mockReturnValueOnce(JSON.stringify(mockGameState));

      const recoveryData = sessionPersistenceService.getRecoveryData();

      expect(recoveryData.isValid).toBe(true);
      expect(recoveryData.canReconnect).toBe(true);
      expect(recoveryData.session).toEqual(mockSession);
      expect(recoveryData.gameState).toEqual(mockGameState);
    });

    it('should indicate invalid recovery when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const recoveryData = sessionPersistenceService.getRecoveryData();

      expect(recoveryData.isValid).toBe(false);
      expect(recoveryData.canReconnect).toBe(false);
      expect(recoveryData.session).toBeNull();
    });

    it('should indicate no reconnect for old sessions', () => {
      const oldSession = {
        ...mockSession,
        lastActivity: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(oldSession))
        .mockReturnValueOnce(JSON.stringify(mockGameState));

      const recoveryData = sessionPersistenceService.getRecoveryData();

      expect(recoveryData.isValid).toBe(true);
      expect(recoveryData.canReconnect).toBe(false);
    });
  });

  describe('Activity Management', () => {
    it('should update activity timestamp', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));

      sessionPersistenceService.updateActivity();

      expect(localStorageMock.setItem).toHaveBeenCalled();

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.lastActivity).toBeGreaterThan(mockSession.lastActivity);
    });

    it('should handle update activity when no session exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      cookieMock.cookie = ''; // Ensure cookie is empty

      expect(() => {
        sessionPersistenceService.updateActivity();
      }).not.toThrow();

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Reconnection URL Management', () => {
    it('should generate reconnect URL with valid session', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSession));

      const url = sessionPersistenceService.generateReconnectUrl('http://localhost:3000');

      expect(url).toBe(
        'http://localhost:3000?reconnect=TEST123&userId=user-123&userType=player'
      );
    });

    it('should return null for invalid or old sessions', () => {
      const oldSession = {
        ...mockSession,
        lastActivity: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldSession));

      const url = sessionPersistenceService.generateReconnectUrl('http://localhost:3000');

      expect(url).toBeNull();
    });

    it('should check for reconnection in URL parameters', () => {
      mockLocation.search = '?reconnect=TEST123&userId=user-123&userType=player';

      const reconnectionData = sessionPersistenceService.checkForReconnection();

      expect(reconnectionData).toEqual({
        roomCode: 'TEST123',
        userId: 'user-123',
        userType: 'player',
      });

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        expect.any(String),
        '/test'
      );
    });

    it('should return null when no reconnection data in URL', () => {
      mockLocation.search = '';

      const reconnectionData = sessionPersistenceService.checkForReconnection();

      expect(reconnectionData).toBeNull();
    });

    it('should handle incomplete URL parameters', () => {
      mockLocation.search = '?reconnect=TEST123&userId=user-123'; // Missing userType

      const reconnectionData = sessionPersistenceService.checkForReconnection();

      expect(reconnectionData).toBeNull();
    });
  });

  describe('Session Validation', () => {
    it('should validate correct session structure', () => {
      const isValid = sessionPersistenceService.validateSession(mockSession);

      expect(isValid).toBe(true);
    });

    it('should reject invalid session structures', () => {
      const invalidSessions = [
        { ...mockSession, roomCode: 123 }, // Wrong type
        { ...mockSession, userId: undefined }, // Missing field
        { ...mockSession, userType: 'invalid' }, // Invalid value
        { ...mockSession, userName: null }, // Wrong type
        { ...mockSession, lastActivity: 'not-a-number' }, // Wrong type
      ];

      invalidSessions.forEach(invalidSession => {
        const isValid = sessionPersistenceService.validateSession(invalidSession as any);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Statistics', () => {
    it('should provide session statistics', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockSession))
        .mockReturnValueOnce(JSON.stringify(mockGameState));

      const stats = sessionPersistenceService.getSessionStats();

      expect(stats.hasSession).toBe(true);
      expect(stats.hasGameState).toBe(true);
      expect(stats.sessionAge).toBeGreaterThan(0);
      expect(stats.gameStateAge).toBeGreaterThan(0);
      expect(stats.canReconnect).toBe(true);
    });

    it('should handle missing data in statistics', () => {
      localStorageMock.getItem.mockReturnValue(null);
      cookieMock.cookie = ''; // Ensure cookie is empty

      const stats = sessionPersistenceService.getSessionStats();

      expect(stats.hasSession).toBe(false);
      expect(stats.hasGameState).toBe(false);
      expect(stats.sessionAge).toBeNull();
      expect(stats.gameStateAge).toBeNull();
      expect(stats.canReconnect).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        sessionPersistenceService.saveSession(mockSession);
      }).not.toThrow();
    });

    it('should handle localStorage read errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const session = sessionPersistenceService.loadSession();
      expect(session).toBeNull();
    });

    it('should handle URL parsing errors gracefully', () => {
      // Mock a malformed URL scenario
      Object.defineProperty(window, 'location', {
        value: { search: 'malformed?url' },
        configurable: true,
      });

      expect(() => {
        sessionPersistenceService.checkForReconnection();
      }).not.toThrow();
    });
  });

  describe('Clear All Data', () => {
    it('should clear both session and game state data', () => {
      sessionPersistenceService.clearAll();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nexus-game-state');
    });
  });
});
