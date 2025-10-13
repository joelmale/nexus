/**
 * Game Lifecycle Store
 *
 * Manages the transition between offline preparation and live multiplayer phases.
 * Handles state persistence, synchronization, and lifecycle events.
 */

import React from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  GamePhase,
  GameLifecycleState,
  GameStateSnapshot,
  LiveGameConfig,
  GameLifecycleAction,
  GameLifecycleEvent,
  GameLifecycleEvents,
} from '@/types/gameLifecycle';
import { PHASE_PERMISSIONS } from '@/types/gameLifecycle';

interface GameLifecycleStore extends GameLifecycleState {
  // State queries
  canTransitionTo: (newPhase: GamePhase) => boolean;
  getPermissions: () => (typeof PHASE_PERMISSIONS)[GamePhase];
  isOnline: () => boolean;
  needsSync: () => boolean;

  // Core lifecycle actions
  startPreparation: () => void;
  markReadyToStart: () => void;
  startGoingLive: (config: LiveGameConfig) => Promise<string>; // Returns room code
  goLive: (roomCode: string, gameState: GameStateSnapshot) => void;
  pauseGame: (reason?: string) => void;
  resumeGame: () => void;
  endGame: (reason?: string, saveSnapshot?: boolean) => void;

  // Player actions
  joinLiveGame: (roomCode: string) => Promise<void>;
  leaveGame: () => void;

  // State management
  createSnapshot: () => GameStateSnapshot;
  loadSnapshot: (snapshot: GameStateSnapshot) => void;
  markLocalChanges: () => void;
  markSynced: () => void;

  // Event handling
  emitEvent: <T extends GameLifecycleEvent>(
    event: T,
    payload: GameLifecycleEvents[T],
  ) => void;

  // Internal state (not managed by Immer)
  _eventHandlers: Map<GameLifecycleEvent, Array<(payload: unknown) => void>>;
  _transition: (newPhase: GamePhase, userId: string) => boolean;
}

const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  preparation: ['ready', 'starting'],
  ready: ['preparation', 'starting'],
  starting: ['live', 'preparation'],
  live: ['paused', 'ended'],
  paused: ['live', 'ended'],
  ended: ['preparation'],
};

// Event handlers stored outside of Immer state to avoid freezing
export const eventHandlers = new Map<
  GameLifecycleEvent,
  Array<(payload: unknown) => void>
>();

export const useGameLifecycleStore = create<GameLifecycleStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      mode: 'offline',
      phase: 'preparation',
      isHost: false,
      canGoLive: false,
      hasLocalChanges: false,
      lastSyncedAt: null,
      serverRoomCode: null,
      localSessionId: uuidv4(),
      _eventHandlers: eventHandlers,

      // State queries
      canTransitionTo: (newPhase: GamePhase) => {
        const currentPhase = get().phase;
        return VALID_TRANSITIONS[currentPhase]?.includes(newPhase) ?? false;
      },

      getPermissions: () => {
        const phase = get().phase;
        return PHASE_PERMISSIONS[phase];
      },

      isOnline: () => {
        const { phase, mode } = get();
        return phase === 'live' || mode === 'hosting';
      },

      needsSync: () => {
        const { hasLocalChanges, phase } = get();
        return hasLocalChanges && (phase === 'live' || phase === 'starting');
      },

      // Core lifecycle actions
      startPreparation: () => {
        set((state) => {
          state.mode = 'offline';
          state.phase = 'preparation';
          state.isHost = true;
          state.canGoLive = false;
          state.hasLocalChanges = false;
          state.serverRoomCode = null;
          state.localSessionId = uuidv4();
          console.log('🎯 Started preparation phase');
        });

        get().emitEvent('lifecycle/enterPreparation', {
          sessionId: get().localSessionId,
        });
      },

      markReadyToStart: () => {
        if (!get().canTransitionTo('ready')) {
          console.warn('Cannot transition to ready state');
          return;
        }

        set((state) => {
          state.phase = 'ready';
          state.canGoLive = true;
        });

        const snapshot = get().createSnapshot();
        get().emitEvent('lifecycle/readyToStart', {
          sessionId: get().localSessionId,
          snapshot,
        });

        console.log('✅ Marked ready to start live game');
      },

      startGoingLive: async (config: LiveGameConfig) => {
        if (!get().canTransitionTo('starting')) {
          throw new Error('Cannot start going live from current phase');
        }

        set((state) => {
          state.phase = 'starting';
          state.mode = 'hosting';
        });

        try {
          // Create snapshot of current state
          const snapshot = get().createSnapshot();

          // This will be implemented to connect to server and get room code
          // For now, generate a mock room code
          const roomCode = Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();

          get().emitEvent('lifecycle/startLive', { config, snapshot });

          return roomCode;
        } catch (error) {
          // Rollback on failure
          set((state) => {
            state.phase = 'ready';
            state.mode = 'offline';
          });
          throw error;
        }
      },

      goLive: (roomCode: string, gameState: GameStateSnapshot) => {
        if (!get().canTransitionTo('live')) {
          console.warn('Cannot transition to live state');
          return;
        }

        set((state) => {
          state.phase = 'live';
          state.mode = 'hosting';
          state.serverRoomCode = roomCode;
          state.lastSyncedAt = Date.now();
          state.hasLocalChanges = false;
        });

        get().emitEvent('lifecycle/goLive', { roomCode, gameState });
        console.log(`🚀 Game is now live! Room code: ${roomCode}`);
      },

      pauseGame: (reason?: string) => {
        if (!get().canTransitionTo('paused')) {
          console.warn('Cannot pause game from current phase');
          return;
        }

        set((state) => {
          state.phase = 'paused';
        });

        get().emitEvent('lifecycle/pauseGame', { reason });
        console.log('⏸️ Game paused');
      },

      resumeGame: () => {
        if (!get().canTransitionTo('live')) {
          console.warn('Cannot resume game from current phase');
          return;
        }

        set((state) => {
          state.phase = 'live';
        });

        get().emitEvent('lifecycle/resumeGame', {});
        console.log('▶️ Game resumed');
      },

      endGame: (reason?: string, saveSnapshot = true) => {
        if (!get().canTransitionTo('ended')) {
          console.warn('Cannot end game from current phase');
          return;
        }

        set((state) => {
          state.phase = 'ended';
          state.mode = 'offline';
          state.serverRoomCode = null;
          state.lastSyncedAt = null;
        });

        get().emitEvent('lifecycle/endGame', { reason, saveSnapshot });
        console.log('🏁 Game ended');
      },

      // Player actions
      joinLiveGame: async (roomCode: string) => {
        set((state) => {
          state.mode = 'joining';
          state.isHost = false;
        });

        try {
          // This will be implemented to connect to server
          set((state) => {
            state.phase = 'live';
            state.serverRoomCode = roomCode;
            state.lastSyncedAt = Date.now();
          });

          get().emitEvent('lifecycle/playerJoin', { roomCode });
          console.log(`🎮 Joined live game: ${roomCode}`);
        } catch (error) {
          set((state) => {
            state.mode = 'offline';
            state.phase = 'preparation';
          });
          throw error;
        }
      },

      leaveGame: () => {
        set((state) => {
          state.mode = 'offline';
          state.phase = 'preparation';
          state.isHost = false;
          state.serverRoomCode = null;
          state.lastSyncedAt = null;
          state.hasLocalChanges = false;
          state.localSessionId = uuidv4();
        });

        console.log('👋 Left game');
      },

      // State management
      createSnapshot: (): GameStateSnapshot => {
        // This will be implemented to capture current game state
        // For now, return mock data
        const state = get();
        return {
          id: uuidv4(),
          timestamp: Date.now(),
          phase: state.phase,
          scenes: [], // Will be populated from game store
          activeSceneId: null,
          characters: [],
          initiative: {},
          settings: {},
          metadata: {
            version: 1,
            createdBy: 'mock-user', // Will be populated from user store
            sessionId: state.localSessionId,
          },
        };
      },

      loadSnapshot: (snapshot: GameStateSnapshot) => {
        // This will be implemented to restore game state
        console.log('📂 Loading snapshot:', snapshot.id);
      },

      markLocalChanges: () => {
        set((state) => {
          state.hasLocalChanges = true;
        });
      },

      markSynced: () => {
        set((state) => {
          state.hasLocalChanges = false;
          state.lastSyncedAt = Date.now();
        });
      },

      // Event handling
      emitEvent: <T extends GameLifecycleEvent>(
        event: T,
        payload: GameLifecycleEvents[T],
      ) => {
        const handlers = eventHandlers.get(event) || [];
        handlers.forEach((handler) => {
          try {
            handler(payload);
          } catch (error) {
            console.error(
              `Error in lifecycle event handler for ${event}:`,
              error,
            );
          }
        });
      },

      // Internal state
      _transition: (newPhase: GamePhase, userId: string) => {
        const canTransition = get().canTransitionTo(newPhase);
        if (!canTransition) {
          console.warn(`Invalid transition to ${newPhase} from ${get().phase}`);
          return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const action: GameLifecycleAction = {
          type: `lifecycle/${newPhase}` as GameLifecycleEvent,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: {} as any,
          timestamp: Date.now(),
          userId,
        };

        set((state) => {
          state.phase = newPhase;
        });

        return true;
      },
    })),
  ),
);

// Hook for event subscription
export const useGameLifecycleEvents = (
  event: GameLifecycleEvent,
  handler: (payload: unknown) => void,
) => {
  React.useEffect(() => {
    const handlers = eventHandlers.get(event) || [];
    handlers.push(handler);
    eventHandlers.set(event, handlers);

    return () => {
      const currentHandlers = eventHandlers.get(event) || [];
      const filteredHandlers = currentHandlers.filter((h) => h !== handler);
      eventHandlers.set(event, filteredHandlers);
    };
  }, [event, handler]);
};
