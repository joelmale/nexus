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
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
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
  className = '',
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
