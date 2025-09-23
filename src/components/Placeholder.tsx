import React from 'react';

interface PlaceholderProps {
  title: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>This feature is coming soon!</p>
      <div className="placeholder-content">
        <div className="placeholder-card">
          <h3>Planned Features</h3>
          <ul>
            {title === 'Scenes' && (
              <>
                <li>Interactive battle maps</li>
                <li>Grid system with measurements</li>
                <li>Background image support</li>
                <li>Drawing tools and annotations</li>
                <li>Fog of war and lighting</li>
              </>
            )}
            {title === 'Tokens' && (
              <>
                <li>Character and NPC tokens</li>
                <li>Token library and management</li>
                <li>Health and status tracking</li>
                <li>Initiative order management</li>
                <li>Token movement and positioning</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
