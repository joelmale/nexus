import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { GameEvent, Scene, PlacedToken, User } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

// Mock the persistence service to avoid actual DB operations in tests
vi.mock('@/services/drawingPersistence', () => ({
  drawingPersistenceService: {
    saveScene: vi.fn().mockResolvedValue(undefined),
    loadAllScenes: vi.fn().mockResolvedValue([]),
    loadDrawings: vi.fn().mockResolvedValue([]),
  },
}));

const getInitialState = () => useGameStore.getState();

describe('gameStore event handlers', () => {
  // Reset the store to its initial state before each test to ensure isolation
  beforeEach(() => {
    useGameStore.setState(getInitialState(), true);
  });

  describe('Token Events', () => {
    it('should handle "token/place" event and add a token to a scene', () => {
      // Setup: Create an initial scene in the store
      const sceneId = uuidv4();
      const scene: Scene = {
        id: sceneId,
        name: 'Test Scene',
        placedTokens: [],
        drawings: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSettings: { enabled: true, size: 50, color: '#fff', opacity: 0.5, snapToGrid: true },
      };
      useGameStore.setState(state => ({ sceneState: { ...state.sceneState, scenes: [scene] } }));

      // Act: Apply the 'token/place' event
      const token: PlacedToken = { id: uuidv4(), assetId: 'asset1', x: 100, y: 100, width: 50, height: 50, rotation: 0, opacity: 1, visible: true, name: 'Goblin', createdAt: Date.now(), updatedAt: Date.now() };
      const event: GameEvent = { type: 'token/place', data: { sceneId, token } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check if the token was added correctly
      const updatedScene = useGameStore.getState().sceneState.scenes[0];
      expect(updatedScene.placedTokens).toHaveLength(1);
      expect(updatedScene.placedTokens[0]).toEqual(token);
      expect(updatedScene.updatedAt).toBeGreaterThan(scene.updatedAt);
    });

    it('should handle "token/move" event and update a token\'s position', () => {
      // Setup: Create a scene with a token
      const sceneId = uuidv4();
      const tokenId = uuidv4();
      const initialToken: PlacedToken = { id: tokenId, assetId: 'asset1', x: 100, y: 100, width: 50, height: 50, rotation: 0, opacity: 1, visible: true, name: 'Goblin', createdAt: Date.now(), updatedAt: Date.now() };
      const scene: Scene = {
        id: sceneId,
        name: 'Test Scene',
        placedTokens: [initialToken],
        drawings: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSettings: { enabled: true, size: 50, color: '#fff', opacity: 0.5, snapToGrid: true },
      };
      useGameStore.setState(state => ({ sceneState: { ...state.sceneState, scenes: [scene] } }));

      // Act: Apply the 'token/move' event
      const newPosition = { x: 250, y: 300 };
      const newRotation = 90;
      const event: GameEvent = { type: 'token/move', data: { sceneId, tokenId, position: newPosition, rotation: newRotation } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check if the token's position and rotation were updated
      const movedToken = useGameStore.getState().sceneState.scenes[0].placedTokens[0];
      expect(movedToken.x).toBe(newPosition.x);
      expect(movedToken.y).toBe(newPosition.y);
      expect(movedToken.rotation).toBe(newRotation);
      expect(movedToken.updatedAt).toBeGreaterThan(initialToken.updatedAt);
    });
  });

  describe('User & Session Events', () => {
    it('should handle "user/join" event and add a new player to the session', () => {
      // Setup: Create a session with one player (the host)
      const host: User = { id: 'host-id', name: 'Host', type: 'host', color: 'red', connected: true };
      useGameStore.setState(state => ({ session: { roomCode: 'ABCD', hostId: 'host-id', players: [host], status: 'connected' } }));

      // Act: Apply the 'user/join' event for a new player
      const newUser: User = { id: 'player-id', name: 'New Player', type: 'player', color: 'blue', connected: true };
      const event: GameEvent = { type: 'user/join', data: { user: newUser } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check if the new player was added
      const players = useGameStore.getState().session?.players;
      expect(players).toHaveLength(2);
      expect(players).toContainEqual(newUser);
    });

    it('should handle "user/join" event and update an existing player\'s data', () => {
      // Setup: Create a session with a player who will be updated
      const initialUser: User = { id: 'player-id', name: 'Player', type: 'player', color: 'blue', connected: false };
      useGameStore.setState(state => ({ session: { roomCode: 'ABCD', hostId: 'host-id', players: [initialUser], status: 'connected' } }));

      // Act: Apply the 'user/join' event with updated data for the same user
      const updatedUser: User = { id: 'player-id', name: 'Player', type: 'player', color: 'blue', connected: true };
      const event: GameEvent = { type: 'user/join', data: { user: updatedUser } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check if the player's data was updated
      const players = useGameStore.getState().session?.players;
      expect(players).toHaveLength(1);
      expect(players?.[0].connected).toBe(true);
    });
  });

  describe('Scene Events', () => {
    it('should handle "scene/delete" event and remove a scene', () => {
      // Setup: Create two scenes
      const scene1: Scene = { id: 'scene-1', name: 'Scene One', placedTokens: [], drawings: [], createdAt: Date.now(), updatedAt: Date.now(), gridSettings: { enabled: true, size: 50, color: '#fff', opacity: 0.5, snapToGrid: true } };
      const scene2: Scene = { id: 'scene-2', name: 'Scene Two', placedTokens: [], drawings: [], createdAt: Date.now(), updatedAt: Date.now(), gridSettings: { enabled: true, size: 50, color: '#fff', opacity: 0.5, snapToGrid: true } };
      useGameStore.setState(state => ({
        sceneState: {
          ...state.sceneState,
          scenes: [scene1, scene2],
          activeSceneId: 'scene-1',
        }
      }));

      // Act: Apply the 'scene/delete' event
      const event: GameEvent = { type: 'scene/delete', data: { sceneId: 'scene-1' } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check that the scene was removed and the active scene was updated
      const { scenes, activeSceneId } = useGameStore.getState().sceneState;
      expect(scenes).toHaveLength(1);
      expect(scenes[0].id).toBe('scene-2');
      expect(activeSceneId).toBe('scene-2');
    });

    it('should handle "scene/delete" for the last scene and set activeSceneId to null', () => {
      // Setup: Create one scene
      const scene1: Scene = { id: 'scene-1', name: 'Scene One', placedTokens: [], drawings: [], createdAt: Date.now(), updatedAt: Date.now(), gridSettings: { enabled: true, size: 50, color: '#fff', opacity: 0.5, snapToGrid: true } };
      useGameStore.setState(state => ({
        sceneState: {
          ...state.sceneState,
          scenes: [scene1],
          activeSceneId: 'scene-1',
        }
      }));

      // Act: Apply the 'scene/delete' event
      const event: GameEvent = { type: 'scene/delete', data: { sceneId: 'scene-1' } };
      useGameStore.getState().applyEvent(event);

      // Assert: Check that the scene was removed and activeSceneId is null
      const { scenes, activeSceneId } = useGameStore.getState().sceneState;
      expect(scenes).toHaveLength(0);
      expect(activeSceneId).toBeNull();
    });
  });
});

describe('gameStore direct actions', () => {
  beforeEach(() => {
    useGameStore.setState(getInitialState(), true);
  });

  it('addDiceRoll should add a roll and cap the history at 50', () => {
    // Setup: Create 50 initial rolls
    const initialRolls: DiceRoll[] = Array.from({ length: 50 }, (_, i) => ({
      id: `roll-${i}`,
      expression: '1d20',
      results: [i + 1],
      total: i + 1,
      timestamp: Date.now(),
      userId: 'user-1',
      userName: 'Tester'
    }));
    useGameStore.setState({ diceRolls: initialRolls });

    // Act: Add one more roll
    const newRoll: DiceRoll = { id: 'new-roll', expression: '1d4', results: [4], total: 4, timestamp: Date.now(), userId: 'user-1', userName: 'Tester' };
    useGameStore.getState().addDiceRoll(newRoll);

    // Assert: Check that the new roll is at the start and the length is still 50
    const diceRolls = useGameStore.getState().diceRolls;
    expect(diceRolls).toHaveLength(50);
    expect(diceRolls[0]).toEqual(newRoll);
    expect(diceRolls[49].id).toBe('roll-48'); // The oldest roll ('roll-49') should be gone
  });
});