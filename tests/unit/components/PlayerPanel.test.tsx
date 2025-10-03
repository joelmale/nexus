import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { within } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerPanel } from '@/components/PlayerPanel';
import { useSession, useIsHost } from '@/stores/gameStore';
import { useCharacters, useCharacterCreation } from '@/stores/characterStore';
import { useCharacterCreationLauncher } from '@/components/CharacterCreationLauncher';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { useAppFlowStore } from '@/stores/appFlowStore';
import type { Character } from '@/types/character';
import type { Player, Session } from '@/types/game';

// Mock the store hooks
vi.mock('@/stores/gameStore', () => ({
  useSession: vi.fn(),
  useIsHost: vi.fn(),
}));

vi.mock('@/stores/characterStore', () => ({
  useCharacters: vi.fn(),
  useCharacterCreation: vi.fn(),
}));

vi.mock('@/components/CharacterCreationLauncher', () => ({
  useCharacterCreationLauncher: vi.fn(),
}));

vi.mock('@/stores/initiativeStore', () => ({
  useInitiativeStore: vi.fn(),
}));

vi.mock('@/stores/appFlowStore', () => ({
  useAppFlowStore: vi.fn(),
}));

// Mock the CharacterSheet component
vi.mock('@/components/CharacterSheet', () => ({
  CharacterSheet: ({
    character,
    readonly,
  }: {
    character: Character;
    readonly: boolean;
  }) => (
    <div data-testid="character-sheet">
      Character Sheet for {character.name} (readonly: {readonly.toString()})
    </div>
  ),
}));

describe('PlayerPanel', () => {
  const mockPlayers: Player[] = [
    {
      id: 'host-123',
      name: 'Game Master',
      type: 'host',
      color: '#6366f1',
      connected: true,
      canEditScenes: true,
    },
    {
      id: 'player-1',
      name: 'Alice',
      type: 'player',
      color: '#ec4899',
      connected: true,
      canEditScenes: false,
    },
    {
      id: 'player-2',
      name: 'Bob',
      type: 'player',
      color: '#22c55e',
      connected: false,
      canEditScenes: false,
    },
  ];

  const mockSession: Session = {
    roomCode: 'TEST',
    hostId: 'host-123',
    players: mockPlayers,
    status: 'connected',
  };

  const mockCharacters: Character[] = [
    {
      id: 'char-1',
      playerId: 'player-1',
      name: 'Alice Fighter',
      level: 5,
      race: { name: 'Human', size: 'Medium', speed: 30, traits: [] },
      classes: [{ name: 'Fighter', level: 5, hitDie: 10, features: [] }],
      hitPoints: { maximum: 47, current: 35, temporary: 0 },
      armorClass: 18,
    } as Character,
    {
      id: 'char-2',
      playerId: 'player-1',
      name: 'Alice Wizard',
      level: 3,
      race: { name: 'Elf', size: 'Medium', speed: 30, traits: [] },
      classes: [{ name: 'Wizard', level: 3, hitDie: 6, features: [] }],
      hitPoints: { maximum: 20, current: 20, temporary: 0 },
      armorClass: 12,
    } as Character,
  ];

  const mockCharacterActions = {
    setActiveCharacter: vi.fn(),
    createCharacter: vi.fn(),
  };

  const mockCharacterCreation = {
    creationState: null,
    startCharacterCreation: vi.fn(),
    cancelCharacterCreation: vi.fn(),
    updateCreationState: vi.fn(),
    nextCreationStep: vi.fn(),
    previousCreationStep: vi.fn(),
    completeCharacterCreation: vi.fn(),
  };

  const mockInitiativeActions = {
    addEntry: vi.fn(),
    rollInitiativeForAll: vi.fn(),
    startCombat: vi.fn(),
  };

  const mockLauncher = {
    startCharacterCreation: vi.fn(),
    LauncherComponent: null,
    isActive: false,
  };

  const mockAppFlow = {
    setView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useSession).mockReturnValue(mockSession);
    vi.mocked(useIsHost).mockReturnValue(false);
    vi.mocked(useCharacters).mockReturnValue({
      characters: mockCharacters,
      activeCharacter: null,
      ...mockCharacterActions,
    });
    vi.mocked(useCharacterCreation).mockReturnValue(mockCharacterCreation);
    vi.mocked(useInitiativeStore).mockReturnValue(mockInitiativeActions);
    vi.mocked(useCharacterCreationLauncher).mockReturnValue(mockLauncher);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAppFlowStore).mockReturnValue(mockAppFlow as any);
  });

  describe('Component Rendering', () => {
    it('should render player panel with header', () => {
      render(<PlayerPanel />);

      expect(screen.getByText('Players & Characters')).toBeInTheDocument();
    });

    it('should render my characters section', () => {
      vi.mocked(useCharacters).mockReturnValue({
        characters: mockCharacters,
        activeCharacter: null,
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      const myCharactersSection = screen
        .getByText('My Characters')
        .closest('.my-characters-section')!;
      expect(myCharactersSection).toBeInTheDocument();

      // Find character names within the My Characters section
      expect(
        within(myCharactersSection).getByText('Alice Fighter'),
      ).toBeInTheDocument();
      expect(
        within(myCharactersSection).getByText('Alice Wizard'),
      ).toBeInTheDocument();
    });

    it('should render all players section', () => {
      render(<PlayerPanel />);

      expect(screen.getByText('All Players (2/3 online)')).toBeInTheDocument();
      expect(screen.getByText('Game Master')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show Begin Combat button for hosts', () => {
      vi.mocked(useIsHost).mockReturnValue(true);

      render(<PlayerPanel />);

      expect(screen.getByText('⚔️ Begin Combat')).toBeInTheDocument();
    });

    it('should not show Begin Combat button for players', () => {
      vi.mocked(useIsHost).mockReturnValue(false);

      render(<PlayerPanel />);

      expect(screen.queryByText('⚔️ Begin Combat')).not.toBeInTheDocument();
    });
  });

  describe('Character Management', () => {
    it('should display character information correctly', () => {
      render(<PlayerPanel />);

      const myCharactersSection = screen
        .getByText('My Characters')
        .closest('.my-characters-section')!;

      // Find character names within the My Characters section
      const characterList = within(myCharactersSection)
        .getByText('Alice Fighter')
        .closest('.character-item')!;
      expect(
        within(characterList).getByText('Level 5 Human Fighter'),
      ).toBeInTheDocument();
      expect(
        within(characterList).getByText('HP: 35/47 | AC: 18'),
      ).toBeInTheDocument();

      const wizardCharacter = within(myCharactersSection)
        .getByText('Alice Wizard')
        .closest('.character-item')!;
      expect(
        within(wizardCharacter).getByText('Level 3 Elf Wizard'),
      ).toBeInTheDocument();
      expect(
        within(wizardCharacter).getByText('HP: 20/20 | AC: 12'),
      ).toBeInTheDocument();
    });

    it('should show create character button', () => {
      render(<PlayerPanel />);

      expect(screen.getByText('➕ New Character')).toBeInTheDocument();
    });

    it('should handle create character click', () => {
      render(<PlayerPanel />);

      const createButton = screen.getByText('➕ New Character');
      fireEvent.click(createButton);

      expect(mockAppFlow.setView).toHaveBeenCalledWith('player_setup');
    });

    it('should handle character view click', () => {
      render(<PlayerPanel />);

      const myCharactersSection = screen
        .getByText('My Characters')
        .closest('.my-characters-section')!;
      const characterItem =
        within(myCharactersSection).getByText('Alice Fighter');
      fireEvent.click(characterItem.closest('.character-item')!);

      expect(mockCharacterActions.setActiveCharacter).toHaveBeenCalledWith(
        'char-1',
      );
    });

    it('should show empty state when no characters', () => {
      vi.mocked(useCharacters).mockReturnValue({
        characters: [],
        activeCharacter: null,
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      expect(
        screen.getByText('No characters created yet.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Create a character to get started!'),
      ).toBeInTheDocument();
    });
  });

  describe('Player Cards', () => {
    it('should display player connection status', () => {
      render(<PlayerPanel />);

      // Since there are multiple online/offline indicators, query for all and check them
      const onlineIndicators = screen.getAllByText('Online');
      const offlineIndicators = screen.getAllByText('Offline');

      // Find at least one online player
      expect(
        onlineIndicators.some((el) =>
          el.closest('.player-card')?.classList.contains('online'),
        ),
      ).toBe(true);

      // Find at least one offline player
      expect(
        offlineIndicators.some((el) =>
          el.closest('.player-card')?.classList.contains('offline'),
        ),
      ).toBe(true);
    });

    it('should display host badge', () => {
      render(<PlayerPanel />);

      expect(screen.getByText('Dungeon Master')).toBeInTheDocument();
    });

    it('should display character count for each player', () => {
      render(<PlayerPanel />);

      // Host has 0 characters
      const hostCard = screen.getByText('Game Master').closest('.player-card');
      expect(hostCard).toHaveTextContent('0 characters');

      // Alice has 2 characters
      const aliceCard = screen.getByText('Alice').closest('.player-card');
      expect(aliceCard).toHaveTextContent('2 characters');

      // Bob has 0 characters
      const bobCard = screen.getByText('Bob').closest('.player-card');
      expect(bobCard).toHaveTextContent('0 characters');
    });

    it('should show player controls for hosts', () => {
      vi.mocked(useIsHost).mockReturnValue(true);

      render(<PlayerPanel />);

      // Should show controls for non-host players
      const playerCards = screen.getAllByText('🚪'); // Kick buttons
      expect(playerCards).toHaveLength(2); // For Alice and Bob
    });

    it('should not show player controls for non-hosts', () => {
      vi.mocked(useIsHost).mockReturnValue(false);

      render(<PlayerPanel />);

      expect(screen.queryByText('🚪')).not.toBeInTheDocument();
    });
  });

  describe('Combat Integration', () => {
    it('should handle Begin Combat button click', () => {
      vi.mocked(useIsHost).mockReturnValue(true);

      render(<PlayerPanel />);

      const beginCombatButton = screen.getByText('⚔️ Begin Combat');
      fireEvent.click(beginCombatButton);

      expect(mockInitiativeActions.addEntry).toHaveBeenCalledTimes(2); // For each character
      expect(mockInitiativeActions.rollInitiativeForAll).toHaveBeenCalled();
      expect(mockInitiativeActions.startCombat).toHaveBeenCalled();
    });

    it('should disable Begin Combat button when no characters', () => {
      vi.mocked(useIsHost).mockReturnValue(true);
      vi.mocked(useCharacters).mockReturnValue({
        characters: [],
        activeCharacter: null,
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      const beginCombatButton = screen.getByText('⚔️ Begin Combat');
      expect(beginCombatButton).toBeDisabled();
    });

    it('should show combat preparation section for hosts with characters', () => {
      vi.mocked(useIsHost).mockReturnValue(true);

      render(<PlayerPanel />);

      expect(screen.getByText('Combat Preparation')).toBeInTheDocument();
      expect(screen.getByText('2 player characters ready')).toBeInTheDocument();
      expect(screen.getByText('🎲 Add All to Initiative')).toBeInTheDocument();
    });
  });

  describe('Character Creation Wizard', () => {
    it('should render character creation wizard when active', () => {
      const mockLauncher = {
        startCharacterCreation: vi.fn(),
        LauncherComponent: (
          <div data-testid="wizard">Character Creation Wizard</div>
        ),
        isActive: true,
      };
      vi.mocked(useCharacterCreationLauncher).mockReturnValue(mockLauncher);

      render(<PlayerPanel />);

      expect(screen.getByTestId('wizard')).toBeInTheDocument();
    });
  });

  describe('Character Sheet View', () => {
    it('should render character sheet when character is selected', () => {
      vi.mocked(useCharacters).mockReturnValue({
        characters: mockCharacters,
        activeCharacter: mockCharacters[0],
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      expect(screen.getByTestId('character-sheet')).toBeInTheDocument();
      expect(screen.getByText('Alice Fighter')).toBeInTheDocument();
      expect(screen.getByText('← Back to Players')).toBeInTheDocument();
    });

    it('should handle back to players navigation', () => {
      vi.mocked(useCharacters).mockReturnValue({
        characters: mockCharacters,
        activeCharacter: mockCharacters[0],
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      const backButton = screen.getByText('← Back to Players');
      fireEvent.click(backButton);

      // Should call setActiveCharacter with null to go back
      expect(mockCharacterActions.setActiveCharacter).toHaveBeenCalledWith(
        null,
      );
    });

    it('should show readonly character sheet for other players characters', () => {
      const otherPlayerCharacter = {
        ...mockCharacters[0],
        playerId: 'other-player',
      };

      vi.mocked(useCharacters).mockReturnValue({
        characters: [otherPlayerCharacter],
        activeCharacter: otherPlayerCharacter,
        ...mockCharacterActions,
      });

      render(<PlayerPanel />);

      expect(screen.getByTestId('character-sheet')).toHaveTextContent(
        'readonly: true',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing session gracefully', () => {
      vi.mocked(useSession).mockReturnValue(null);

      expect(() => {
        render(<PlayerPanel />);
      }).not.toThrow();
    });

    it('should handle empty players list', () => {
      vi.mocked(useSession).mockReturnValue({
        ...mockSession,
        players: [],
      });

      render(<PlayerPanel />);

      expect(screen.getByText('All Players (0/0 online)')).toBeInTheDocument();
    });

    it('should handle character action failures gracefully', () => {
      mockCharacterActions.setActiveCharacter.mockImplementation(() => {
        throw new Error('Store error');
      });

      render(<PlayerPanel />);

      const myCharactersSection = screen
        .getByText('My Characters')
        .closest('.my-characters-section')!;
      const characterItem =
        within(myCharactersSection).getByText('Alice Fighter');

      expect(() => {
        fireEvent.click(characterItem.closest('.character-item')!);
      }).not.toThrow();
    });
  });
});
