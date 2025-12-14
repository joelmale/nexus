import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, ColorScheme } from '@/types/game';
import { defaultColorSchemes } from '@/utils/colorSchemes';

interface SettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  setEnableGlassmorphism: (enabled: boolean) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  // Display Settings
  colorScheme: defaultColorSchemes[0],
  theme: 'dark',
  enableGlassmorphism: false,
  reducedMotion: false,
  fontSize: 'medium',

  // Audio Settings
  enableSounds: true,
  diceRollSounds: true,
  notificationSounds: true,
  masterVolume: 75,

  // Gameplay Settings
  autoRollInitiative: false,
  showOtherPlayersRolls: true,
  highlightActivePlayer: true,
  snapToGridByDefault: true,
  defaultGridSize: 50,
  diceDisappearTime: 3000,

  // Privacy Settings
  allowSpectators: false,
  shareCharacterSheets: true,
  logGameSessions: true,

  // Performance Settings
  maxTokensPerScene: 100,
  imageQuality: 'high',
  enableAnimations: true,

  // Accessibility Settings
  highContrast: false,
  screenReaderMode: false,
  keyboardNavigation: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      setColorScheme: (colorScheme) =>
        set((state) => ({
          settings: { ...state.settings, colorScheme },
        })),

      setEnableGlassmorphism: (enabled) =>
        set((state) => ({
          settings: { ...state.settings, enableGlassmorphism: enabled },
        })),

      resetSettings: () =>
        set(() => ({
          settings: DEFAULT_SETTINGS,
        })),
    }),
    {
      name: 'nexus-settings',
    },
  ),
);

// Selector hooks for fine-grained subscriptions
export const useSettings = () => useSettingsStore((state) => state.settings);
export const useColorScheme = () =>
  useSettingsStore((state) => state.settings.colorScheme);
export const useGlassmorphism = () =>
  useSettingsStore((state) => state.settings.enableGlassmorphism);
