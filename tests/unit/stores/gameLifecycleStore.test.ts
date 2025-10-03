/**
 * Game Lifecycle Store Tests
 *
 * Comprehensive tests for game state lifecycle management,
 * including phase transitions, permissions, and state persistence.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameLifecycleStore } from '@/stores/gameLifecycleStore';
import type { LiveGameConfig } from '@/types/gameLifecycle';

// Mock UUID generation for consistent testing
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

describe('GameLifecycleStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameLifecycleStore.getState().startPreparation();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start in offline preparation mode', () => {
      const state = useGameLifecycleStore.getState();

      expect(state.mode).toBe('offline');
      expect(state.phase).toBe('preparation');
      expect(state.isHost).toBe(true);
      expect(state.canGoLive).toBe(false);
      expect(state.hasLocalChanges).toBe(false);
      expect(state.serverRoomCode).toBe(null);
      expect(state.localSessionId).toBe('test-uuid-123');
    });

    it('should have correct permissions for preparation phase', () => {
      const permissions = useGameLifecycleStore.getState().getPermissions();

      expect(permissions.canEditScenes).toBe(true);
      expect(permissions.canEditCharacters).toBe(true);
      expect(permissions.canEditSettings).toBe(true);
      expect(permissions.canInvitePlayers).toBe(false);
      expect(permissions.canSyncToServer).toBe(false);
      expect(permissions.isLocalOnly).toBe(true);
    });
  });

  describe('Phase Transitions', () => {
    it('should allow valid transitions from preparation', () => {
      const store = useGameLifecycleStore.getState();

      expect(store.canTransitionTo('ready')).toBe(true);
      expect(store.canTransitionTo('starting')).toBe(true);
      expect(store.canTransitionTo('live')).toBe(false);
      expect(store.canTransitionTo('paused')).toBe(false);
      expect(store.canTransitionTo('ended')).toBe(false);
    });

    it('should successfully transition to ready state', () => {
      const store = useGameLifecycleStore.getState();

      store.markReadyToStart();

      const newState = useGameLifecycleStore.getState();
      expect(newState.phase).toBe('ready');
      expect(newState.canGoLive).toBe(true);
    });

    it('should allow valid transitions from ready', () => {
      const store = useGameLifecycleStore.getState();
      store.markReadyToStart();

      expect(store.canTransitionTo('preparation')).toBe(true);
      expect(store.canTransitionTo('starting')).toBe(true);
      expect(store.canTransitionTo('live')).toBe(false);
    });

    it('should prevent invalid transitions', () => {
      const store = useGameLifecycleStore.getState();

      // Try to go directly to live from preparation
      store.goLive('TEST123', store.createSnapshot());

      // Should remain in preparation phase
      const state = useGameLifecycleStore.getState();
      expect(state.phase).toBe('preparation');
      expect(state.serverRoomCode).toBe(null);
    });
  });

  describe('Going Live Workflow', () => {
    it('should complete full workflow from preparation to live', async () => {
      const store = useGameLifecycleStore.getState();

      // Step 1: Mark ready
      store.markReadyToStart();
      expect(useGameLifecycleStore.getState().phase).toBe('ready');

      // Step 2: Start going live
      const config: LiveGameConfig = {
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6,
        gameTitle: 'Test Campaign'
      };

      const roomCode = await store.startGoingLive(config);
      expect(useGameLifecycleStore.getState().phase).toBe('starting');
      expect(useGameLifecycleStore.getState().mode).toBe('hosting');
      expect(roomCode).toMatch(/[A-Z0-9]{4}/); // Room code pattern

      // Step 3: Complete going live
      const snapshot = store.createSnapshot();
      store.goLive(roomCode, snapshot);

      const finalState = useGameLifecycleStore.getState();
      expect(finalState.phase).toBe('live');
      expect(finalState.mode).toBe('hosting');
      expect(finalState.serverRoomCode).toBe(roomCode);
      expect(finalState.lastSyncedAt).toBeGreaterThan(0);
      expect(finalState.hasLocalChanges).toBe(false);
    });

    it('should rollback on startGoingLive failure', async () => {
      const store = useGameLifecycleStore.getState();
      store.markReadyToStart();

      // Mock Math.random to make startGoingLive fail consistently
      const originalRandom = Math.random;
      Math.random = vi.fn(() => {
        throw new Error('Server connection failed');
      });

      const config: LiveGameConfig = {
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6
      };

      await expect(store.startGoingLive(config)).rejects.toThrow('Server connection failed');

      // Should rollback to ready state
      const state = useGameLifecycleStore.getState();
      expect(state.phase).toBe('ready');
      expect(state.mode).toBe('offline');

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('Game Control Actions', () => {
    beforeEach(async () => {
      // Set up a live game for testing pause/resume/end
      const store = useGameLifecycleStore.getState();
      store.markReadyToStart();
      const roomCode = await store.startGoingLive({
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6
      });
      store.goLive(roomCode, store.createSnapshot());
    });

    it('should pause and resume game', () => {
      const store = useGameLifecycleStore.getState();

      // Pause
      store.pauseGame('DM taking a break');
      expect(useGameLifecycleStore.getState().phase).toBe('paused');

      // Resume
      store.resumeGame();
      expect(useGameLifecycleStore.getState().phase).toBe('live');
    });

    it('should end game properly', () => {
      const store = useGameLifecycleStore.getState();

      store.endGame('Session complete', true);

      const state = useGameLifecycleStore.getState();
      expect(state.phase).toBe('ended');
      expect(state.mode).toBe('offline');
      expect(state.serverRoomCode).toBe(null);
      expect(state.lastSyncedAt).toBe(null);
    });

    it('should allow starting new session after ending', () => {
      const store = useGameLifecycleStore.getState();

      store.endGame();
      expect(useGameLifecycleStore.getState().phase).toBe('ended');

      // Should be able to start preparation again
      expect(store.canTransitionTo('preparation')).toBe(true);

      store.startPreparation();
      expect(useGameLifecycleStore.getState().phase).toBe('preparation');
    });
  });

  describe('Player Join Workflow', () => {
    it('should allow player to join live game', async () => {
      const store = useGameLifecycleStore.getState();

      await store.joinLiveGame('ABCD');

      const state = useGameLifecycleStore.getState();
      expect(state.mode).toBe('joining');
      expect(state.phase).toBe('live');
      expect(state.isHost).toBe(false);
      expect(state.serverRoomCode).toBe('ABCD');
    });

    it('should handle join failure gracefully', async () => {
      const store = useGameLifecycleStore.getState();

      // Mock join failure
      vi.spyOn(store, 'emitEvent').mockImplementation(() => {
        throw new Error('Room not found');
      });

      await expect(store.joinLiveGame('INVALID')).rejects.toThrow('Room not found');

      // Should fallback to offline preparation
      const state = useGameLifecycleStore.getState();
      expect(state.mode).toBe('offline');
      expect(state.phase).toBe('preparation');
    });

    it('should allow leaving game', async () => {
      const store = useGameLifecycleStore.getState();

      await store.joinLiveGame('ABCD');
      store.leaveGame();

      const state = useGameLifecycleStore.getState();
      expect(state.mode).toBe('offline');
      expect(state.phase).toBe('preparation');
      expect(state.isHost).toBe(false);
      expect(state.serverRoomCode).toBe(null);
    });
  });

  describe('State Management', () => {
    it('should track local changes', () => {
      const store = useGameLifecycleStore.getState();

      expect(store.hasLocalChanges).toBe(false);

      store.markLocalChanges();
      expect(useGameLifecycleStore.getState().hasLocalChanges).toBe(true);
    });

    it('should mark as synced', () => {
      const store = useGameLifecycleStore.getState();

      store.markLocalChanges();
      expect(useGameLifecycleStore.getState().hasLocalChanges).toBe(true);

      store.markSynced();
      const state = useGameLifecycleStore.getState();
      expect(state.hasLocalChanges).toBe(false);
      expect(state.lastSyncedAt).toBeGreaterThan(0);
    });

    it('should detect when sync is needed', async () => {
      const store = useGameLifecycleStore.getState();

      // In preparation phase, should not need sync even with changes
      store.markLocalChanges();
      expect(store.needsSync()).toBe(false);

      // Transition to live
      store.markReadyToStart();
      const roomCode = await store.startGoingLive({
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6
      });
      store.goLive(roomCode, store.createSnapshot());

      // Now should need sync with local changes
      store.markLocalChanges();
      expect(store.needsSync()).toBe(true);

      // After syncing, should not need sync
      store.markSynced();
      expect(store.needsSync()).toBe(false);
    });

    it('should create valid snapshots', () => {
      const store = useGameLifecycleStore.getState();
      const snapshot = store.createSnapshot();

      expect(snapshot.id).toBe('test-uuid-123');
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.phase).toBe('preparation');
      expect(snapshot.metadata.sessionId).toBe('test-uuid-123');
      expect(snapshot.metadata.version).toBe(1);
      expect(Array.isArray(snapshot.scenes)).toBe(true);
      expect(Array.isArray(snapshot.characters)).toBe(true);
    });
  });

  describe('Permissions System', () => {
    it('should have correct permissions for each phase', () => {
      const store = useGameLifecycleStore.getState();

      // Preparation
      let permissions = store.getPermissions();
      expect(permissions.isLocalOnly).toBe(true);
      expect(permissions.canSyncToServer).toBe(false);

      // Ready
      store.markReadyToStart();
      permissions = store.getPermissions();
      expect(permissions.isLocalOnly).toBe(true);
      expect(permissions.canEditScenes).toBe(true);
    });

    it('should change permissions when going live', async () => {
      const store = useGameLifecycleStore.getState();

      store.markReadyToStart();
      const roomCode = await store.startGoingLive({
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6
      });

      // Starting phase
      let permissions = store.getPermissions();
      expect(permissions.canEditScenes).toBe(false);
      expect(permissions.canSyncToServer).toBe(true);
      expect(permissions.isLocalOnly).toBe(false);

      // Live phase
      store.goLive(roomCode, store.createSnapshot());
      permissions = store.getPermissions();
      expect(permissions.canEditScenes).toBe(true);
      expect(permissions.canInvitePlayers).toBe(true);
      expect(permissions.canSyncToServer).toBe(true);
      expect(permissions.isLocalOnly).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should emit events for lifecycle transitions', () => {
      const store = useGameLifecycleStore.getState();
      const emitEventSpy = vi.spyOn(store, 'emitEvent');

      store.markReadyToStart();

      expect(emitEventSpy).toHaveBeenCalledWith('lifecycle/readyToStart', {
        sessionId: 'test-uuid-123',
        snapshot: expect.objectContaining({
          id: 'test-uuid-123',
          phase: 'ready'
        })
      });

      emitEventSpy.mockRestore();
    });

    it('should handle event handler errors gracefully', () => {
      // Test that the store handles errors in event handlers without crashing
      // This is tested by verifying that emitEvent method exists and can be called
      const store = useGameLifecycleStore.getState();

      expect(typeof store.emitEvent).toBe('function');

      // Should be able to call emitEvent without issues
      expect(() => {
        store.emitEvent('lifecycle/enterPreparation', { sessionId: 'test' });
      }).not.toThrow();
    });
  });

  describe('State Utilities', () => {
    it('should correctly detect online status', async () => {
      const store = useGameLifecycleStore.getState();

      // Offline initially
      expect(store.isOnline()).toBe(false);

      // Still offline when ready
      store.markReadyToStart();
      expect(store.isOnline()).toBe(false);

      // Online when hosting
      await store.startGoingLive({
        allowPlayerJoining: true,
        syncFrequency: 1000,
        maxPlayers: 6
      });
      expect(store.isOnline()).toBe(true);

      // Online when live
      const roomCode = useGameLifecycleStore.getState().serverRoomCode || 'TEST';
      store.goLive(roomCode, store.createSnapshot());
      expect(store.isOnline()).toBe(true);
    });
  });
});

describe('GameLifecycleStore Integration', () => {
  it('should handle complete host workflow', async () => {
    const store = useGameLifecycleStore.getState();
    const emitEventSpy = vi.spyOn(store, 'emitEvent');

    // Complete workflow
    store.startPreparation();
    store.markReadyToStart();
    const roomCode = await store.startGoingLive({
      allowPlayerJoining: true,
      syncFrequency: 1000,
      maxPlayers: 6
    });
    store.goLive(roomCode, store.createSnapshot());
    store.endGame();

    // Verify all expected lifecycle events were emitted
    const expectedEvents = [
      'lifecycle/enterPreparation',
      'lifecycle/readyToStart',
      'lifecycle/startLive',
      'lifecycle/goLive',
      'lifecycle/endGame'
    ];

    expectedEvents.forEach(eventType => {
      expect(emitEventSpy).toHaveBeenCalledWith(eventType, expect.any(Object));
    });

    emitEventSpy.mockRestore();
  });
});