
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CharacterCreationProvider } from './CharacterCreationLauncher';

/**
 * Shared providers for all pages
 *
 * Wraps the application in necessary providers:
 * - DndProvider: React DnD for drag-and-drop
 * - CharacterCreationProvider: Character creation modal
 */
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <CharacterCreationProvider>
        {children}
      </CharacterCreationProvider>
    </DndProvider>
  );
};
