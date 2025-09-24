// Color scheme utilities for theme management
import type { ColorScheme } from '@/types/game';

// Pre-defined color schemes with hex colors
export const defaultColorSchemes: ColorScheme[] = [
  {
    id: 'nexus-default',
    name: 'Nexus Default',
    primary: '#6366F1',
    secondary: '#8B5CF6', 
    accent: '#06B6D4',
    surface: '#1E293B',
    text: '#F8FAFC',
  },
  {
    id: 'emerald-depths',
    name: 'Emerald Depths',
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    surface: '#064E3B',
    text: '#ECFDF5',
  },
  {
    id: 'crimson-flame',
    name: 'Crimson Flame',
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#F97316',
    surface: '#7F1D1D',
    text: '#FEF2F2',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    primary: '#7C3AED',
    secondary: '#5B21B6',
    accent: '#A855F7',
    surface: '#581C87',
    text: '#FAF5FF',
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    primary: '#0284C7',
    secondary: '#0369A1',
    accent: '#38BDF8',
    surface: '#0C4A6E',
    text: '#F0F9FF',
  },
  {
    id: 'golden-sunset',
    name: 'Golden Sunset',
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FBBF24',
    surface: '#92400E',
    text: '#FFFBEB',
  },
  {
    id: 'forest-whisper',
    name: 'Forest Whisper',
    primary: '#22C55E',
    secondary: '#16A34A',
    accent: '#84CC16',
    surface: '#14532D',
    text: '#F0FDF4',
  },
  {
    id: 'midnight-rose',
    name: 'Midnight Rose',
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    surface: '#831843',
    text: '#FDF2F8',
  },
];

/**
 * Generate a random color scheme with coordinated colors (returns hex)
 */
export const generateRandomColorScheme = (): ColorScheme => {
  // Generate a base hue (0-360)
  const baseHue = Math.floor(Math.random() * 360);
  
  // Create complementary and analogous colors
  const primaryHue = baseHue;
  const secondaryHue = (baseHue + 30) % 360; // Analogous
  const accentHue = (baseHue + 180) % 360; // Complementary
  
  // Generate saturation and lightness values for harmony
  const baseSaturation = 65 + Math.floor(Math.random() * 25); // 65-90%
  const baseLightness = 45 + Math.floor(Math.random() * 15);  // 45-60%
  
  // Helper function to convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };
  
  const colorScheme: ColorScheme = {
    id: `random-${Date.now()}`,
    name: `Random Palette ${Math.floor(Math.random() * 1000)}`,
    primary: hslToHex(primaryHue, baseSaturation, baseLightness),
    secondary: hslToHex(secondaryHue, baseSaturation - 5, baseLightness - 5),
    accent: hslToHex(accentHue, baseSaturation + 5, baseLightness + 10),
    surface: hslToHex(primaryHue, Math.floor(baseSaturation * 0.3), Math.floor(baseLightness * 0.4)),
    text: hslToHex(primaryHue, 15, 95),
  };
  
  return colorScheme;
};

/**
 * Apply a color scheme to CSS custom properties
 */
export const applyColorScheme = (colorScheme: ColorScheme): void => {
  const root = document.documentElement;
  
  // Convert HSL colors to RGB for CSS custom properties
  const hslToRgb = (hsl: string): string => {
    const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return hsl;
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return `${r}, ${g}, ${b}`;
  };
  
  // Apply the color scheme
  root.style.setProperty('--color-primary', colorScheme.primary);
  root.style.setProperty('--color-secondary', colorScheme.secondary);
  root.style.setProperty('--color-accent', colorScheme.accent);
  
  // Create RGB versions for opacity usage
  root.style.setProperty('--color-primary-rgb', hslToRgb(colorScheme.primary));
  root.style.setProperty('--color-secondary-rgb', hslToRgb(colorScheme.secondary));
  root.style.setProperty('--color-accent-rgb', hslToRgb(colorScheme.accent));
  
  // Update glass surface colors to match the new scheme
  const surfaceRgb = hslToRgb(colorScheme.surface);
  root.style.setProperty('--glass-surface', `rgba(${surfaceRgb}, 0.1)`);
  root.style.setProperty('--glass-surface-hover', `rgba(${surfaceRgb}, 0.15)`);
  root.style.setProperty('--glass-surface-strong', `rgba(${surfaceRgb}, 0.2)`);
  
  // Update gradients
  root.style.setProperty('--gradient-primary', 
    `linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.secondary} 100%)`);
  root.style.setProperty('--gradient-secondary', 
    `linear-gradient(135deg, ${colorScheme.secondary} 0%, ${colorScheme.accent} 100%)`);
  root.style.setProperty('--gradient-tertiary', 
    `linear-gradient(135deg, ${colorScheme.accent} 0%, ${colorScheme.primary} 100%)`);
};

/**
 * Get a color scheme by ID
 */
export const getColorSchemeById = (id: string): ColorScheme | undefined => {
  return defaultColorSchemes.find(scheme => scheme.id === id);
};

/**
 * Validate a color scheme object
 */
export const validateColorScheme = (colorScheme: Partial<ColorScheme>): boolean => {
  const requiredFields = ['id', 'name', 'primary', 'secondary', 'accent', 'surface', 'text'];
  
  for (const field of requiredFields) {
    if (!colorScheme[field as keyof ColorScheme]) {
      return false;
    }
  }
  
  return true;
};

/**
 * Create a custom color scheme from user input
 */
export const createCustomColorScheme = (
  name: string,
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    text: string;
  }
): ColorScheme => {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim() || 'Custom Scheme',
    ...colors,
  };
};

/**
 * Generate a palette preview for color scheme selection
 */
export const getColorSchemePreview = (colorScheme: ColorScheme): string[] => {
  return [
    colorScheme.primary,
    colorScheme.secondary,
    colorScheme.accent,
    colorScheme.surface,
    colorScheme.text,
  ];
};

/**
 * Calculate contrast ratio between two colors (simplified)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // This is a simplified contrast calculation
  // In a production app, you'd want a more robust implementation
  const getLuminance = (color: string): number => {
    // Simple luminance approximation
    return 0.5; // Placeholder - would need proper color parsing
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if a color scheme meets accessibility guidelines
 */
export const isAccessible = (colorScheme: ColorScheme): boolean => {
  // Check text contrast against surface
  const textSurfaceContrast = getContrastRatio(colorScheme.text, colorScheme.surface);
  return textSurfaceContrast >= 4.5; // WCAG AA standard
};
