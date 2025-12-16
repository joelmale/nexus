import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionPersistenceService } from '../../src/services/sessionPersistence';
import type { Scene, PlacedToken, Drawing } from '../../src/types/game';

// Mock localStorage
const createLocalStorageMock = () => {
  const storage: Record<string, string> = {};

  return {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] || null,
  };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Game Persistence Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Complete Campaign Save and Restore Flow', () => {
    it('should persist and restore complete game state with scenes, tokens, and drawings', async () => {
      // Step 1: Create a complete game state with all entities
      const mockPlacedToken: PlacedToken = {
        id: 'token-1',
        tokenId: 'base-token-1',
        sceneId: 'scene-1',
        roomCode: 'TEST123',
        x: 100,
        y: 200,
        rotation: 45,
        scale: 1.5,
        layer: 'tokens',
        visibleToPlayers: true,
        dmNotesOnly: false,
        conditions: [
          {
            id: 'condition-1',
            name: 'Poisoned',
            icon: '🤢',
          },
        ],
        isDead: false,
        isInInitiative: true,
        nameOverride: 'Custom Token Name',
        sizeOverride: 'large',
        placedBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockDrawing: Drawing = {
        id: 'drawing-1',
        type: 'line',
        style: {
          strokeColor: '#ff0000',
          strokeWidth: 2,
          fillColor: 'transparent',
          fillOpacity: 1.0,
        },
        layer: 'background',
        roomCode: 'TEST123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'user-123',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      };

      const mockScene: Scene = {
        id: 'scene-1',
        name: 'Test Dungeon',
        description: 'A dark dungeon',
        roomCode: 'TEST123',
        visibility: 'shared',
        isEditable: true,
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        backgroundImage: {
          url: 'https://example.com/dungeon.jpg',
          width: 2000,
          height: 1500,
          offsetX: 0,
          offsetY: 0,
          scale: 1.0,
        },
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#000000',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
          offsetX: 0,
          offsetY: 0,
        },
        lightingSettings: {
          enabled: true,
          globalIllumination: false,
          ambientLight: 0.3,
          darkness: 0.7,
        },
        drawings: [mockDrawing],
        placedTokens: [mockPlacedToken],
        placedProps: [],
        isActive: true,
        playerCount: 2,
      };

      const gameState = {
        characters: [],
        initiative: {},
        scenes: [mockScene],
        activeSceneId: 'scene-1',
        settings: {
          colorScheme: { id: 'default', name: 'Default' },
          enableGlassmorphism: false,
        },
      };

      // Step 2: Save the game state
      sessionPersistenceService.saveGameState(gameState);

      // Step 3: Save session data
      sessionPersistenceService.saveSession({
        roomCode: 'TEST123',
        userId: 'user-123',
        userType: 'host',
        userName: 'Test DM',
        lastActivity: Date.now(),
        sessionVersion: 1,
      });

      // Step 4: Simulate leaving room (clear only session, not game state)
      sessionPersistenceService.clearSession();

      // Step 5: Verify session is cleared but game state remains
      const sessionAfterLeave = sessionPersistenceService.loadSession();
      const gameStateAfterLeave =
        await sessionPersistenceService.loadGameState();

      expect(sessionAfterLeave).toBeNull();
      expect(gameStateAfterLeave).not.toBeNull();
      expect(gameStateAfterLeave?.scenes).toHaveLength(1);

      // Step 6: Verify all game data is preserved
      const restoredScene = gameStateAfterLeave?.scenes[0] as Scene;

      // Verify scene data
      expect(restoredScene.name).toBe('Test Dungeon');
      expect(restoredScene.backgroundImage?.url).toBe(
        'https://example.com/dungeon.jpg',
      );
      expect(restoredScene.gridSettings.size).toBe(50);

      // Verify tokens are preserved
      expect(restoredScene.placedTokens).toHaveLength(1);
      const restoredToken = restoredScene.placedTokens[0];
      expect(restoredToken.nameOverride).toBe('Custom Token Name');
      expect(restoredToken.sizeOverride).toBe('large');
      expect(restoredToken.x).toBe(100);
      expect(restoredToken.y).toBe(200);
      expect(restoredToken.rotation).toBe(45);
      expect(restoredToken.conditions).toHaveLength(1);
      expect(restoredToken.conditions[0].name).toBe('Poisoned');
      expect(restoredToken.isInInitiative).toBe(true);

      // Verify drawings are preserved
      expect(restoredScene.drawings).toHaveLength(1);
      const restoredDrawing = restoredScene.drawings[0];
      expect(restoredDrawing.type).toBe('line');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((restoredDrawing as any).style.strokeColor).toBe('#ff0000');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((restoredDrawing as any).start).toEqual({ x: 0, y: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((restoredDrawing as any).end).toEqual({ x: 100, y: 100 });

      console.log('✅ All game data preserved after leaving room');
    });

    it('should handle multiple scenes with different content', async () => {
      const scene1: Scene = {
        id: 'scene-1',
        name: 'Town Square',
        description: 'A busy town',
        roomCode: 'TEST123',
        visibility: 'shared',
        isEditable: true,
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        backgroundImage: {
          url: 'https://example.com/town.jpg',
          width: 1000,
          height: 1000,
          offsetX: 0,
          offsetY: 0,
          scale: 1.0,
        },
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#000000',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: false,
          globalIllumination: true,
          ambientLight: 1.0,
          darkness: 0.0,
        },
        drawings: [],
        placedTokens: [
          {
            id: 'token-1',
            tokenId: 'npc-1',
            sceneId: 'scene-1',
            roomCode: 'TEST123',
            x: 50,
            y: 50,
            rotation: 0,
            scale: 1.0,
            layer: 'tokens',
            visibleToPlayers: true,
            dmNotesOnly: false,
            conditions: [],
            placedBy: 'user-123',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        placedProps: [],
        isActive: false,
        playerCount: 0,
      };

      const scene2: Scene = {
        id: 'scene-2',
        name: 'Dragon Lair',
        description: 'A dangerous cave',
        roomCode: 'TEST123',
        visibility: 'private',
        isEditable: true,
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#ff0000',
          opacity: 0.5,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: true,
          globalIllumination: false,
          ambientLight: 0.1,
          darkness: 0.9,
        },
        drawings: [
          {
            id: 'drawing-1',
            type: 'fog-of-war',
            style: {
              strokeColor: '#000000',
              strokeWidth: 5,
              fillColor: '#000000',
              fillOpacity: 0.8,
            },
            layer: 'background',
            roomCode: 'TEST123',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: 'user-123',
            area: [
              { x: 0, y: 0 },
              { x: 200, y: 0 },
              { x: 200, y: 200 },
              { x: 0, y: 200 },
            ],
            density: 0.8,
            revealed: false,
          },
        ],
        placedTokens: [
          {
            id: 'token-dragon',
            tokenId: 'dragon-1',
            sceneId: 'scene-2',
            roomCode: 'TEST123',
            x: 500,
            y: 500,
            rotation: 180,
            scale: 3.0,
            layer: 'tokens',
            visibleToPlayers: false,
            dmNotesOnly: true,
            conditions: [],
            isDead: false,
            sizeOverride: 'gargantuan',
            placedBy: 'user-123',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        placedProps: [],
        isActive: true,
        playerCount: 2,
      };

      const gameState = {
        characters: [],
        initiative: {},
        scenes: [scene1, scene2],
        activeSceneId: 'scene-2',
        settings: {},
      };

      // Save and restore
      sessionPersistenceService.saveGameState(gameState);
      const restored = await sessionPersistenceService.loadGameState();

      // Verify both scenes are preserved
      expect(restored?.scenes).toHaveLength(2);
      expect(restored?.activeSceneId).toBe('scene-2');

      const restoredScene1 = (restored?.scenes as Scene[]).find(
        (s) => s.id === 'scene-1',
      );
      const restoredScene2 = (restored?.scenes as Scene[]).find(
        (s) => s.id === 'scene-2',
      );

      expect(restoredScene1?.name).toBe('Town Square');
      expect(restoredScene1?.description).toBe('A busy town');
      expect(restoredScene1?.visibility).toBe('shared');

      expect(restoredScene2?.name).toBe('Dragon Lair');
      expect(restoredScene2?.description).toBe('A dangerous cave');
      expect(restoredScene2?.visibility).toBe('private');
      expect(restoredScene2!.drawings).toHaveLength(1);
      expect(restoredScene2!.drawings[0].type).toBe('fog-of-war');

      console.log('✅ Multiple scenes with different content preserved');
    });

    it('should preserve token state changes over time', async () => {
      const initialToken: PlacedToken = {
        id: 'token-1',
        tokenId: 'hero-1',
        sceneId: 'scene-1',
        roomCode: 'TEST123',
        x: 100,
        y: 100,
        rotation: 0,
        scale: 1.0,
        layer: 'tokens',
        visibleToPlayers: true,
        dmNotesOnly: false,
        conditions: [],
        isDead: false,
        isInInitiative: false,
        placedBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const scene: Scene = {
        id: 'scene-1',
        name: 'Battle Map',
        description: '',
        roomCode: 'TEST123',
        visibility: 'shared',
        isEditable: true,
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#000000',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: false,
          globalIllumination: true,
          ambientLight: 1.0,
          darkness: 0.0,
        },
        drawings: [],
        placedTokens: [initialToken],
        placedProps: [],
        isActive: true,
        playerCount: 1,
      };

      // Save initial state
      sessionPersistenceService.saveGameState({
        characters: [],
        initiative: {},
        scenes: [scene],
        activeSceneId: 'scene-1',
        settings: {},
      });

      // Simulate token movement and state changes
      const updatedToken: PlacedToken = {
        ...initialToken,
        x: 250,
        y: 300,
        rotation: 90,
        isDead: true,
        isInInitiative: true,
        conditions: [
          { id: 'cond-1', name: 'Stunned', icon: '💫' },
          { id: 'cond-2', name: 'Prone', icon: '⬇️' },
        ],
        nameOverride: 'Wounded Hero',
        updatedAt: Date.now(),
      };

      const updatedScene = {
        ...scene,
        placedTokens: [updatedToken],
        updatedAt: Date.now(),
      };

      // Save updated state
      sessionPersistenceService.saveGameState({
        characters: [],
        initiative: {},
        scenes: [updatedScene],
        activeSceneId: 'scene-1',
        settings: {},
      });

      // Load and verify updates
      const restored = await sessionPersistenceService.loadGameState();
      const restoredToken = (restored?.scenes as Scene[])[0].placedTokens[0];

      expect(restoredToken?.x).toBe(250);
      expect(restoredToken?.y).toBe(300);
      expect(restoredToken?.rotation).toBe(90);
      expect(restoredToken?.isDead).toBe(true);
      expect(restoredToken?.isInInitiative).toBe(true);
      expect(restoredToken?.conditions).toHaveLength(2);
      expect(restoredToken?.nameOverride).toBe('Wounded Hero');

      console.log('✅ Token state changes preserved over time');
    });

    it('should handle empty scenes gracefully', async () => {
      const emptyScene: Scene = {
        id: 'scene-1',
        name: 'Empty Room',
        description: '',
        roomCode: 'TEST123',
        visibility: 'shared',
        isEditable: true,
        createdBy: 'user-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSettings: {
          enabled: true,
          size: 50,
          color: '#000000',
          opacity: 0.3,
          snapToGrid: true,
          showToPlayers: true,
        },
        lightingSettings: {
          enabled: false,
          globalIllumination: true,
          ambientLight: 1.0,
          darkness: 0.0,
        },
        drawings: [],
        placedTokens: [],
        placedProps: [],
        isActive: true,
        playerCount: 0,
      };

      sessionPersistenceService.saveGameState({
        characters: [],
        initiative: {},
        scenes: [emptyScene],
        activeSceneId: 'scene-1',
        settings: {},
      });

      const restored = await sessionPersistenceService.loadGameState();

      expect(restored?.scenes as Scene[]).toHaveLength(1);
      expect((restored?.scenes as Scene[])[0].placedTokens).toHaveLength(0);
      expect((restored?.scenes as Scene[])[0].drawings).toHaveLength(0);

      console.log('✅ Empty scenes handled correctly');
    });
  });

  describe('Session Separation from Game State', () => {
    it('should clear session without affecting game state', async () => {
      // Save both session and game state
      sessionPersistenceService.saveSession({
        roomCode: 'TEST123',
        userId: 'user-123',
        userType: 'host',
        userName: 'Test User',
        lastActivity: Date.now(),
        sessionVersion: 1,
      });

      sessionPersistenceService.saveGameState({
        characters: [],
        initiative: {},
        scenes: [
          {
            id: 'scene-1',
            name: 'Test Scene',
            description: '',
            roomCode: 'TEST123',
            visibility: 'shared',
            isEditable: true,
            createdBy: 'user-123',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            gridSettings: {
              enabled: true,
              size: 50,
              color: '#000000',
              opacity: 0.3,
              snapToGrid: true,
              showToPlayers: true,
            },
            lightingSettings: {
              enabled: false,
              globalIllumination: true,
              ambientLight: 1.0,
              darkness: 0.0,
            },
            drawings: [],
            placedTokens: [],
            isActive: true,
            playerCount: 0,
          },
        ],
        activeSceneId: 'scene-1',
        settings: {},
      });

      // Clear only session
      sessionPersistenceService.clearSession();

      // Verify
      const session = sessionPersistenceService.loadSession();
      const gameState = sessionPersistenceService.loadGameState();

      expect(session).toBeNull();
      expect(gameState).not.toBeNull();
      expect(gameState?.scenes).toHaveLength(1);

      console.log('✅ Session cleared independently from game state');
    });

    it('should clear game state without affecting session', async () => {
      // Save both
      sessionPersistenceService.saveSession({
        roomCode: 'TEST123',
        userId: 'user-123',
        userType: 'host',
        userName: 'Test User',
        lastActivity: Date.now(),
        sessionVersion: 1,
      });

      sessionPersistenceService.saveGameState({
        characters: [],
        initiative: {},
        scenes: [],
        activeSceneId: null,
        settings: {},
      });

      // Clear only game state
      sessionPersistenceService.clearGameState();

      // Verify
      const session = sessionPersistenceService.loadSession();
      const gameState = sessionPersistenceService.loadGameState();

      expect(session).not.toBeNull();
      expect(gameState).toBeNull();

      console.log('✅ Game state cleared independently from session');
    });
  });
});
