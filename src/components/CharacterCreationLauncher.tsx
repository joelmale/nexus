import React, { useState } from 'react';
import { CharacterCreationWizard } from './CharacterCreationWizard';

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
export const CharacterCreationLauncher: React.FC<CharacterCreationLauncherProps> = ({
  playerId,
  onComplete,
  context,
  onCancel
}) => {
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

/**
 * Hook for triggering character creation from anywhere in the app
 */
export const useCharacterCreationLauncher = () => {
  const [launcher, setLauncher] = useState<{
    playerId: string;
    context: 'fullpage' | 'modal';
    onComplete: (characterId: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const startCharacterCreation = (
    playerId: string,
    context: 'fullpage' | 'modal' = 'modal',
    onComplete: (characterId: string) => void,
    onCancel?: () => void
  ) => {
    setLauncher({
      playerId,
      context,
      onComplete,
      onCancel
    });
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

  return {
    startCharacterCreation,
    LauncherComponent,
    isActive: !!launcher
  };
};