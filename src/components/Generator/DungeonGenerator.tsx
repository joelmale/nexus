import React, { useEffect, useRef, useState } from 'react';

interface DungeonGeneratorProps {
  onMapGenerated: (imageData: string) => void;
}

export const DungeonGenerator: React.FC<DungeonGeneratorProps> = ({
  onMapGenerated,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Debug: Log all messages for troubleshooting
      console.log('DungeonGenerator received message:', event.data);

      // Validate origin for security (allow same origin or data URI)
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        console.log('Message rejected due to origin:', event.origin);
        return;
      }

      // Handle PNG generation from dungeon generator
      if (event.data.type === 'DUNGEON_PNG_GENERATED') {
        console.log('Processing DUNGEON_PNG_GENERATED message');
        onMapGenerated(event.data.data.imageData);
      }

      // Legacy support
      if (event.data.type === 'DUNGEON_MAP_GENERATED') {
        console.log('Processing DUNGEON_MAP_GENERATED message (legacy)');
        onMapGenerated(event.data.data.imageData);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMapGenerated]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="generator-iframe-container">
      {isLoading && (
        <div className="generator-loading">
          <div className="spinner"></div>
          <p>Loading dungeon generator...</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/one-page-dungeon/index.html"
        className="generator-iframe"
        title="Dungeon Generator"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
      />
    </div>
  );
};
