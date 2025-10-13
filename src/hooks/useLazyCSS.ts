import { useEffect, useState } from 'react';
import { loadCSS } from '../utils/cssLoader';

/**
 * Hook for lazy loading CSS files when a component mounts
 * @param cssPaths - Array of CSS file paths to load
 * @param enabled - Whether to load the CSS (default: true)
 */
export function useLazyCSS(cssPaths: string[], enabled: boolean = true) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || cssPaths.length === 0) return;

    const loadStyles = async () => {
      try {
        await Promise.all(cssPaths.map((path) => loadCSS(path)));
        setIsLoaded(true);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to load CSS:', err);
      }
    };

    loadStyles();
  }, [enabled, ...cssPaths]); // Include cssPaths in dependency array

  return { isLoaded, error };
}

/**
 * Predefined hooks for common component style loading
 */

export function useSceneStyles() {
  return useLazyCSS(['scenes.css']);
}

export function useCharacterStyles() {
  return useLazyCSS(['character.css']);
}

export function useDiceStyles() {
  return useLazyCSS(['dice.css']);
}

export function usePlayerPanelStyles() {
  return useLazyCSS(['player-panel.css']);
}

export function useInitiativeStyles() {
  return useLazyCSS(['initiative-tracker.css']);
}

export function useAssetStyles() {
  return useLazyCSS(['assets.css', 'asset-browser.css']);
}

export function useChatStyles() {
  return useLazyCSS(['chat.css']);
}

export function useAdminStyles() {
  return useLazyCSS([
    'offline-preparation.css',
    'welcome-page.css',
    'linear-flow.css',
  ]);
}
