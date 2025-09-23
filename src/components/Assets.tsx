import React from 'react';

interface LogoProps {
  variant?: 'default' | 'light' | 'dark' | 'wordmark' | 'symbol';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

interface IconProps {
  size?: number | string;
  className?: string;
}

// Logo component for branding
export const NexusLogo: React.FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8', 
    lg: 'h-12',
    xl: 'h-16'
  };

  const logoSrc = `/assets/logos/nexus-logo${variant !== 'default' ? `-${variant}` : ''}.svg`;
  
  return (
    <img 
      src={logoSrc}
      alt="Nexus VTT"
      className={`${sizeClasses[size]} ${className}`}
      onError={(e) => {
        // Fallback to PNG if SVG fails
        const target = e.target as HTMLImageElement;
        target.src = logoSrc.replace('.svg', '.png');
      }}
    />
  );
};

// Icon component for app icons
export const NexusIcon: React.FC<IconProps> = ({ 
  size = 24, 
  className = '' 
}) => {
  return (
    <img 
      src="/assets/icons/nexus-icon.svg"
      alt="Nexus"
      width={size}
      height={size}
      className={className}
      onError={(e) => {
        // Fallback to PNG if SVG fails
        const target = e.target as HTMLImageElement;
        target.src = '/assets/icons/nexus-icon.png';
      }}
    />
  );
};

// Asset paths helper for direct access
export const AssetPaths = {
  logos: {
    default: '/assets/logos/nexus-logo.svg',
    light: '/assets/logos/nexus-logo-light.svg',
    dark: '/assets/logos/nexus-logo-dark.svg',
    wordmark: '/assets/logos/nexus-wordmark.svg',
    symbol: '/assets/logos/nexus-symbol.svg'
  },
  icons: {
    svg: '/assets/icons/nexus-icon.svg',
    png192: '/assets/icons/nexus-icon-192.png',
    png512: '/assets/icons/nexus-icon-512.png',
    favicon: '/assets/icons/nexus-favicon.ico'
  },
  images: {
    ogImage: '/assets/images/og-image.png',
    hero: '/assets/images/hero-background.jpg'
  }
} as const;

// Hook for checking if assets exist
export const useAssetExists = (assetPath: string) => {
  const [exists, setExists] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setExists(true);
    img.onerror = () => setExists(false);
    img.src = assetPath;
  }, [assetPath]);

  return exists;
};
