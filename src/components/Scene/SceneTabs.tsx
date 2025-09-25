import React from 'react';
import { useGameStore } from '@/stores/gameStore';
import type { Scene } from '@/types/game';

interface SceneTabsProps {
  scenes: Scene[];
  activeSceneId: string;
  isHost: boolean;
}

export const SceneTabs: React.FC<SceneTabsProps> = ({ scenes, activeSceneId, isHost }) => {
  const { setActiveScene, createScene, deleteScene } = useGameStore();
  
  const handleCreateScene = () => {
    const defaultScene = {
      name: `Scene ${scenes.length + 1}`,
      description: '',
      gridSettings: {
        enabled: true,
        size: 50,
        color: '#ffffff',
        opacity: 0.3,
        snapToGrid: true,
      },
    };
    
    createScene(defaultScene);
  };

  const handleDeleteScene = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scenes.length > 1 && window.confirm('Delete this scene? This cannot be undone.')) {
      deleteScene(sceneId);
    }
  };
  
  return (
    <ul className="scene-tabs" role="tablist">
      {scenes.map(scene => (
        <li key={scene.id} className="scene-tab" role="tab">
          <label>
            <input 
              type="radio" 
              name="scene" 
              value={scene.id}
              checked={scene.id === activeSceneId}
              onChange={() => setActiveScene(scene.id)}
            />
            <div className="scene-label">{scene.name}</div>
            {isHost && scenes.length > 1 && (
              <button 
                className="scene-remove" 
                type="button"
                onClick={(e) => handleDeleteScene(scene.id, e)}
                title="Delete scene"
              >
                ×
              </button>
            )}
          </label>
        </li>
      ))}
      
      {isHost && (
        <li className="scene-create" role="tab">
          <button type="button" onClick={handleCreateScene} title="Create new scene">
            + New Scene
          </button>
        </li>
      )}
    </ul>
  );
};
