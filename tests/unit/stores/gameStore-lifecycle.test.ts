/**
 * Game Store Lifecycle Helpers Tests
 *
 * Tests for the lifecycle helper functions that derive state from gameStore.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/stores/gameStore';
import type { GamePhase } from '@/types/gameLifecycle';

// Helper function to derive game phase from store state
function getGamePhase(): GamePhase {
  const state = useGameStore.getState();
  if (state.view === 'welcome' || state.view === 'player_setup' || state.view === 'dm_setup') {
    return 'preparation';
  }
  if (state.view === 'game' && state.user.connected && state.session) {
    return 'live';
  }
  return 'ready';
}

// Helper function to derive game mode from store state
function getGameMode() {
  const state = useGameStore.getState();
  if (!state.user.connected) return 'offline';
  if (state.session?.hostId === state.user.id) return 'hosting';
  return 'live';
}

// Helper function to check if online
function getIsOnline() {
  const state = useGameStore.getState();
  return state.user.connected && !!state.session;
}

// Helper function to check if can go live
function getCanGoLive() {
  const state = useGameStore.getState();
  return state.view === 'game' && !state.user.connected && !!state.session;
}

// Helper function to get server room code
function getServerRoomCode() {
  const state = useGameStore.getState();
  return state.session?.roomCode || null;
}

describe('GameStore Lifecycle Helpers', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.getState().reset();
  });

  describe('getGamePhase', () => {
    it('should return "preparation" for welcome view', () => {
      const store = useGameStore.getState();
      store.setView('welcome');

      expect(getGamePhase()).toBe('preparation');
    });

    it('should return "preparation" for setup views', () => {
      const store = useGameStore.getState();
      store.setView('dm_setup');

      expect(getGamePhase()).toBe('preparation');
    });

    it('should return "ready" for game view when not connected', () => {
      const store = useGameStore.getState();
      store.setView('game');
      // User is not connected by default

      expect(getGamePhase()).toBe('ready');
    });

    it('should return "live" for game view when connected with session', () => {
      const store = useGameStore.getState();
      store.setView('game');
      store.setUser({ connected: true });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getGamePhase()).toBe('live');
    });
  });

  describe('getGameMode', () => {
    it('should return "offline" when not connected', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: false });

      expect(getGameMode()).toBe('offline');
    });

    it('should return "hosting" when connected and user is host', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: true, type: 'host', id: 'host-123' });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getGameMode()).toBe('hosting');
    });

    it('should return "live" when connected and user is player', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: true, type: 'player', id: 'player-123' });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getGameMode()).toBe('live');
    });
  });

  describe('getIsOnline', () => {
    it('should return false when offline', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: false });

      expect(getIsOnline()).toBe(false);
    });

    it('should return true when hosting', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: true, type: 'host', id: 'host-123' });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getIsOnline()).toBe(true);
    });

    it('should return true when joined as player', () => {
      const store = useGameStore.getState();
      store.setUser({ connected: true, type: 'player', id: 'player-123' });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getIsOnline()).toBe(true);
    });
  });

  describe('getCanGoLive', () => {
    it('should return false when not in game view', () => {
      const store = useGameStore.getState();
      store.setView('welcome');

      expect(getCanGoLive()).toBe(false);
    });

    it('should return false when in game view but not connected', () => {
      const store = useGameStore.getState();
      store.setView('game');
      store.setUser({ connected: false });

      expect(getCanGoLive()).toBe(false);
    });

    it('should return true when in game view, not connected, and has session', () => {
      const store = useGameStore.getState();
      store.setView('game');
      store.setUser({ connected: false });
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getCanGoLive()).toBe(true);
    });
  });

  describe('getServerRoomCode', () => {
    it('should return null when no session', () => {
      const store = useGameStore.getState();
      store.setSession(null);

      expect(getServerRoomCode()).toBe(null);
    });

    it('should return room code when session exists', () => {
      const store = useGameStore.getState();
      store.setSession({
        roomCode: 'TEST123',
        hostId: 'host-123',
        players: [],
        status: 'connected',
      });

      expect(getServerRoomCode()).toBe('TEST123');
    });
  });
});
