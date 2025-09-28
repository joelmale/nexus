import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useSession, useIsHost } from '@/stores/gameStore';
import { sceneUtils } from '@/utils/sceneUtils';
import type { Scene } from '@/types/game';

interface SceneTabsProps {
  scenes: Scene[];
  activeSceneId: string;
  onEditScene?: (scene: Scene) => void;
}

export const SceneTabs: React.FC<SceneTabsProps> = ({
  scenes,
  activeSceneId,
  onEditScene
}) => {
  const { setActiveScene, createScene, deleteScene, updateScene, reorderScenes } = useGameStore();
  const session = useSession();
  const isHost = useIsHost();
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  // Inline rename functionality
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Scroll functionality
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  // Scroll detection and navigation
  const updateScrollButtons = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    setShowScrollButtons(scrollWidth > clientWidth);
  };

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
  };

  // Filter scenes based on visibility and user permissions
  const visibleScenes = scenes.filter(scene => {
    if (isHost) return true; // DM can see all scenes
    return scene.visibility === 'shared' || scene.visibility === 'public';
  });

  // Update scroll buttons on mount and when scenes change
  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [visibleScenes]);

  const handleCreateScene = () => {
    const sceneNumber = scenes.length + 1;
    const defaultScene = sceneUtils.createDefaultScene(
      `Scene ${sceneNumber}`,
      session?.hostId || 'unknown'
    );
    createScene(defaultScene);
  };

  const handleDeleteScene = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scenes.length > 1 && window.confirm('Delete this scene? This cannot be undone.')) {
      deleteScene(sceneId);
    }
  };

  const handleEditScene = (scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditScene) {
      onEditScene(scene);
    }
  };

  const handleTabContextMenu = (scene: Scene, e: React.MouseEvent) => {
    e.preventDefault();
    if (isHost && onEditScene) {
      onEditScene(scene);
    }
  };

  // Inline rename functionality
  const handleTabDoubleClick = (scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isHost && scene.isEditable) {
      setEditingSceneId(scene.id);
      setEditingName(scene.name);
      // Focus the input after state update
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  };

  const handleRenameSubmit = (sceneId: string) => {
    if (editingName.trim() && editingName.trim() !== '') {
      updateScene(sceneId, { name: editingName.trim() });
    }
    setEditingSceneId(null);
    setEditingName('');
  };

  const handleRenameCancel = () => {
    setEditingSceneId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, sceneId: string) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleRenameSubmit(sceneId);
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  // Drag and drop functionality
  const handleDragStart = (e: React.DragEvent, sceneId: string) => {
    if (!isHost) return;
    setDraggedTab(sceneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sceneId);
  };

  const handleDragOver = (e: React.DragEvent, sceneId: string) => {
    if (!isHost || !draggedTab) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTab(sceneId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTab(null);
  };

  const handleDrop = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault();
    if (!isHost || !draggedTab || draggedTab === targetSceneId) {
      setDraggedTab(null);
      setDragOverTab(null);
      return;
    }

    const fromIndex = visibleScenes.findIndex(scene => scene.id === draggedTab);
    const toIndex = visibleScenes.findIndex(scene => scene.id === targetSceneId);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderScenes(fromIndex, toIndex);
    }

    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const getVisibilityIcon = (scene: Scene) => {
    switch (scene.visibility) {
      case 'private': return '🔒';
      case 'shared': return '👥';
      case 'public': return '🌐';
      default: return '';
    }
  };

  const getSceneStatusClass = (scene: Scene) => {
    let classes = 'scene-tab';
    if (scene.id === activeSceneId) classes += ' active';
    if (!scene.isEditable) classes += ' locked';
    if (scene.visibility === 'private' && !isHost) classes += ' hidden';
    if (draggedTab === scene.id) classes += ' dragging';
    if (dragOverTab === scene.id) classes += ' drag-over';
    return classes;
  };

  return (
    <div className="scene-tabs-container">
      {/* Left scroll arrow */}
      {showScrollButtons && (
        <button
          className={`scroll-arrow scroll-arrow-left ${!canScrollLeft ? 'disabled' : ''}`}
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          type="button"
          aria-label="Scroll tabs left"
        >
          ‹
        </button>
      )}

      {/* Scrollable tabs container */}
      <div
        className="scene-tabs"
        role="tablist"
        ref={scrollContainerRef}
        onScroll={updateScrollButtons}
      >
        {visibleScenes.map(scene => (
        <div
          key={scene.id}
          className={getSceneStatusClass(scene)}
          role="tab"
          aria-selected={scene.id === activeSceneId}
          draggable={isHost}
          onClick={() => setActiveScene(scene.id)}
          onContextMenu={(e) => handleTabContextMenu(scene, e)}
          onDoubleClick={(e) => handleTabDoubleClick(scene, e)}
          onDragStart={(e) => handleDragStart(e, scene.id)}
          onDragOver={(e) => handleDragOver(e, scene.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, scene.id)}
          onDragEnd={handleDragEnd}
        >
          {/* Scene name and visibility indicator */}
          {isHost && (
            <span className="scene-visibility" title={`Visibility: ${scene.visibility}`}>
              {getVisibilityIcon(scene)}
            </span>
          )}
          {/* Scene name - conditional edit mode */}
          {editingSceneId === scene.id ? (
            <input
              ref={editInputRef}
              type="text"
              className="scene-name-input"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => handleRenameKeyDown(e, scene.id)}
              onBlur={() => handleRenameSubmit(scene.id)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="scene-name" title={scene.description}>
              {scene.name}
            </span>
          )}

          {/* Delete button for DM only */}
          {isHost && scenes.length > 1 && (
            <button
              className="delete-scene"
              onClick={(e) => handleDeleteScene(scene.id, e)}
              title="Delete scene"
              type="button"
            >
              ×
            </button>
          )}

          {/* Active indicator */}
          {scene.id === activeSceneId && <div className="active-indicator" />}
        </div>
      ))}

        {/* Add New Scene Tab - DM only */}
        {isHost && (
          <div className="scene-tab new-scene-tab" role="tab">
            <button
              type="button"
              onClick={handleCreateScene}
              title="Create new scene"
              className="new-scene-button"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Right scroll arrow */}
      {showScrollButtons && (
        <button
          className={`scroll-arrow scroll-arrow-right ${!canScrollRight ? 'disabled' : ''}`}
          onClick={scrollRight}
          disabled={!canScrollRight}
          type="button"
          aria-label="Scroll tabs right"
        >
          ›
        </button>
      )}
    </div>
  );
};
