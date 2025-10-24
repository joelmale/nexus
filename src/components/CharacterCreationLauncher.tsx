import React, { useState, createContext } from 'react';
import { CharacterCreationWizard } from './CharacterCreationWizard';
import {
  loadPlayerPanelStyles,
  loadCharacterWizardStyles,
  loadThemeStyles,
  preloadOnUserIntent,
} from '@/utils/cssLoader';
import { getCurrentTheme } from '@/utils/themeManager';
import type { Character } from '@/types/character';

// Context for sharing character creation launcher across components
interface CharacterCreationContextType {
  startCharacterCreation: (
    playerId: string,
    context: 'fullpage' | 'modal',
    onComplete: (characterId: string, character?: Character) => void,
    onCancel?: () => void,
  ) => void;
  LauncherComponent: React.ReactNode;
  isActive: boolean;
}

const CharacterCreationContext =
  createContext<CharacterCreationContextType | null>(null);

export const CharacterCreationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [launcher, setLauncher] = useState<{
    playerId: string;
    context: 'fullpage' | 'modal';
    onComplete: (characterId: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const startCharacterCreation = async (
    playerId: string,
    context: 'fullpage' | 'modal' = 'modal',
    onComplete: (characterId: string) => void,
    onCancel?: () => void,
  ) => {
    console.time('🎭 Character Creation Setup');

    // Preload related styles that might be needed soon
    preloadOnUserIntent('character-creation');

    try {
      // Load theme first (critical) - this ensures CSS variables are available
      console.time('🎨 Theme Loading');
      const currentTheme = getCurrentTheme();
      await loadThemeStyles(currentTheme, 'CharacterCreationLauncher');
      console.timeEnd('🎨 Theme Loading');

      // Load wizard styles with enhanced error handling
      console.time('🧙‍♂️ Wizard Loading');
      await Promise.all([
        loadCharacterWizardStyles('CharacterCreationLauncher'),
        loadPlayerPanelStyles('CharacterCreationLauncher'),
      ]);
      console.timeEnd('🧙‍♂️ Wizard Loading');

      console.timeEnd('🎭 Character Creation Setup');

      setLauncher({
        playerId,
        context,
        onComplete,
        onCancel,
      });
    } catch (error) {
      console.error('❌ Failed to load character creation styles:', error);
      // Still try to open the wizard - it might work with fallbacks
      console.warn('⚠️ Attempting to open wizard with degraded styling');
      setLauncher({
        playerId,
        context,
        onComplete,
        onCancel,
      });
    }
  };

  const closeLauncher = () => {
    setLauncher(null);
  };

  const LauncherComponent = launcher ? (
    <CharacterCreationLauncher
      playerId={launcher.playerId}
      context={launcher.context}
      onComplete={(characterId) => {
        launcher.onComplete(characterId);
        closeLauncher();
      }}
      onCancel={() => {
        if (launcher.onCancel) {
          launcher.onCancel();
        }
        closeLauncher();
      }}
    />
  ) : null;

  return (
    <CharacterCreationContext.Provider
      value={{
        startCharacterCreation,
        LauncherComponent,
        isActive: !!launcher,
      }}
    >
      {children}
    </CharacterCreationContext.Provider>
  );
};



interface CharacterCreationLauncherProps {
  playerId: string;
  onComplete: (characterId: string) => void;
  context: 'fullpage' | 'modal';
  onCancel?: () => void;
}

/**
 * Launcher component that handles dual context rendering of the character creation wizard
 * - fullpage: Renders as a full-page experience (for initial character creation)
 * - modal: Renders as a modal overlay (for in-game character creation)
 */
export const CharacterCreationLauncher: React.FC<
  CharacterCreationLauncherProps
> = ({ playerId, onComplete, context, onCancel }) => {
  const [isActive, setIsActive] = useState(true);

  const handleComplete = (characterId: string) => {
    setIsActive(false);
    onComplete(characterId);
  };

  const handleCancel = () => {
    setIsActive(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (!isActive) {
    return null;
  }

  return (
    <CharacterCreationWizard
      playerId={playerId}
      onComplete={handleComplete}
      onCancel={handleCancel}
      isModal={context === 'modal'}
    />
  );
};
