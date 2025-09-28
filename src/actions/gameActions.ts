/**
 * Game Action Creators
 *
 * Type-safe action creators for all game operations.
 * These provide a consistent interface for state mutations.
 */

import type { GameAction } from '@/types/hybrid';
import type { Scene, Camera, DiceRoll, UserSettings, User } from '@/types/game';
import type { PlacedToken } from '@/types/token';
import type { Drawing } from '@/types/drawing';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// ACTION CREATOR UTILITIES
// =============================================================================

function createAction<T = unknown>(
  type: string,
  payload: T,
  userId: string,
  options: {
    requiresAuth?: boolean;
    optimistic?: boolean;
    sessionId?: string;
  } = {}
): GameAction {
  return {
    id: uuidv4(),
    type,
    timestamp: Date.now(),
    userId,
    sessionId: options.sessionId,
    payload,
    version: 0, // Will be set by the state manager
    requiresAuth: options.requiresAuth || false,
    optimistic: options.optimistic || false
  };
}

// =============================================================================
// USER ACTIONS
// =============================================================================

export function updateUser(userId: string, updates: Partial<User>): GameAction {
  return createAction('user/update', { updates }, userId);
}

export function setUserName(userId: string, name: string): GameAction {
  return createAction('user/setName', { name }, userId);
}

export function setUserColor(userId: string, color: string): GameAction {
  return createAction('user/setColor', { color }, userId);
}

// =============================================================================
// SCENE ACTIONS
// =============================================================================

export function createScene(userId: string, scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): GameAction {
  const newScene: Scene = {
    ...scene,
    id: uuidv4(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return createAction('scene/create', { scene: newScene }, userId, { requiresAuth: true });
}

export function updateScene(userId: string, sceneId: string, updates: Partial<Scene>): GameAction {
  return createAction(
    'scene/update',
    { sceneId, updates: { ...updates, updatedAt: Date.now() } },
    userId,
    { requiresAuth: true }
  );
}

export function deleteScene(userId: string, sceneId: string): GameAction {
  return createAction('scene/delete', { sceneId }, userId, { requiresAuth: true });
}

export function reorderScenes(userId: string, fromIndex: number, toIndex: number): GameAction {
  return createAction('scene/reorder', { fromIndex, toIndex }, userId, { requiresAuth: true });
}

export function setActiveScene(userId: string, sceneId: string): GameAction {
  return createAction('scene/setActive', { sceneId }, userId, { requiresAuth: true });
}

export function updateCamera(userId: string, sceneId: string, camera: Partial<Camera>): GameAction {
  return createAction('camera/update', { sceneId, camera }, userId, {
    requiresAuth: true,
    optimistic: true
  });
}

export function setFollowDM(userId: string, follow: boolean): GameAction {
  return createAction('camera/setFollowDM', { follow }, userId, { requiresAuth: true });
}

// =============================================================================
// TOKEN ACTIONS
// =============================================================================

export function placeToken(userId: string, sceneId: string, token: PlacedToken): GameAction {
  return createAction('token/place', { sceneId, token }, userId, {
    requiresAuth: false, // Players can place tokens
    optimistic: true
  });
}

export function moveToken(
  userId: string,
  sceneId: string,
  tokenId: string,
  position: { x: number; y: number },
  rotation?: number
): GameAction {
  return createAction('token/move', { sceneId, tokenId, position, rotation }, userId, {
    requiresAuth: false,
    optimistic: true
  });
}

export function updateToken(userId: string, sceneId: string, tokenId: string, updates: Partial<PlacedToken>): GameAction {
  return createAction('token/update', { sceneId, tokenId, updates }, userId, {
    requiresAuth: false,
    optimistic: true
  });
}

export function deleteToken(userId: string, sceneId: string, tokenId: string): GameAction {
  return createAction('token/delete', { sceneId, tokenId }, userId, {
    requiresAuth: false // Players can delete their own tokens
  });
}

// =============================================================================
// DRAWING ACTIONS
// =============================================================================

export function createDrawing(userId: string, sceneId: string, drawing: Drawing): GameAction {
  return createAction('drawing/create', { sceneId, drawing }, userId, {
    requiresAuth: false,
    optimistic: true
  });
}

export function updateDrawing(userId: string, sceneId: string, drawingId: string, updates: Partial<Drawing>): GameAction {
  return createAction('drawing/update', { sceneId, drawingId, updates }, userId, {
    requiresAuth: false,
    optimistic: true
  });
}

export function deleteDrawing(userId: string, sceneId: string, drawingId: string): GameAction {
  return createAction('drawing/delete', { sceneId, drawingId }, userId, {
    requiresAuth: false
  });
}

export function clearDrawings(userId: string, sceneId: string, layer?: string): GameAction {
  return createAction('drawing/clear', { sceneId, layer }, userId, {
    requiresAuth: true // Only DM can clear all drawings
  });
}

// =============================================================================
// DICE ACTIONS
// =============================================================================

export function rollDice(userId: string, roll: DiceRoll): GameAction {
  return createAction('dice/roll', { roll }, userId, {
    requiresAuth: false,
    optimistic: true
  });
}

export function clearDiceHistory(userId: string): GameAction {
  return createAction('dice/clearHistory', {}, userId, { requiresAuth: true });
}

// =============================================================================
// SETTINGS ACTIONS
// =============================================================================

export function updateSettings(userId: string, settings: Partial<UserSettings>): GameAction {
  return createAction('settings/update', { settings }, userId);
}

export function resetSettings(userId: string): GameAction {
  return createAction('settings/reset', {}, userId);
}

// =============================================================================
// SESSION ACTIONS
// =============================================================================

export function createSession(userId: string, roomCode: string): GameAction {
  return createAction('session/create', { roomCode }, userId, { requiresAuth: true });
}

export function joinSession(userId: string, roomCode: string): GameAction {
  return createAction('session/join', { roomCode }, userId);
}

export function leaveSession(userId: string): GameAction {
  return createAction('session/leave', {}, userId);
}

export function kickPlayer(userId: string, playerId: string): GameAction {
  return createAction('session/kickPlayer', { playerId }, userId, { requiresAuth: true });
}

export function updatePlayerPermissions(userId: string, playerId: string, permissions: any): GameAction {
  return createAction('session/updatePermissions', { playerId, permissions }, userId, { requiresAuth: true });
}

// =============================================================================
// BULK ACTIONS
// =============================================================================

export function batchActions(userId: string, actions: GameAction[]): GameAction {
  return createAction('batch/execute', { actions }, userId, {
    requiresAuth: actions.some(action => action.requiresAuth)
  });
}

// =============================================================================
// SYNC ACTIONS (for multiplayer)
// =============================================================================

export function requestFullSync(userId: string): GameAction {
  return createAction('sync/requestFull', {}, userId);
}

export function sendHeartbeat(userId: string): GameAction {
  return createAction('sync/heartbeat', { timestamp: Date.now() }, userId);
}

// =============================================================================
// ACTION TYPE GUARDS
// =============================================================================

export function isSceneAction(action: GameAction): boolean {
  return action.type.startsWith('scene/');
}

export function isTokenAction(action: GameAction): boolean {
  return action.type.startsWith('token/');
}

export function isDrawingAction(action: GameAction): boolean {
  return action.type.startsWith('drawing/');
}

export function isDiceAction(action: GameAction): boolean {
  return action.type.startsWith('dice/');
}

export function isSessionAction(action: GameAction): boolean {
  return action.type.startsWith('session/');
}

export function requiresAuthority(action: GameAction): boolean {
  return action.requiresAuth;
}

export function isOptimistic(action: GameAction): boolean {
  return action.optimistic || false;
}