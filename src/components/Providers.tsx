import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CharacterCreationProvider } from './CharacterCreationLauncher';
import { useGameStore } from '@/stores/gameStore';
import { useSessionPersistence } from '@/hooks/useSessionPersistence';

/**
 * Shared providers for all pages
 *
 * Wraps the application in necessary providers:
 * - DndProvider: React DnD for drag-and-drop
 * - CharacterCreationProvider: Character creation modal
 * - Session Persistence: Automatic game state save/restore
 */
export const Providers: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const checkAuth = useGameStore((state) => state.checkAuth);

  // Initialize authentication state on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Enable automatic session persistence (saves game state on changes)
  useSessionPersistence({
    autoSave: true,
    saveInterval: 30000, // Save every 30 seconds
    enableAutoRecovery: true, // Attempt to restore session on page load
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <CharacterCreationProvider>{children}</CharacterCreationProvider>
    </DndProvider>
  );
};
