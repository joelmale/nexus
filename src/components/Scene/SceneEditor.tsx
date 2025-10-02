import React, { useState, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useSceneImages, sceneUtils } from '@/utils/sceneUtils';
import { AssetBrowser } from '@/components/AssetBrowser';
import { BaseMapBrowser } from './BaseMapBrowser';
import { assetManager, type AssetMetadata } from '@/utils/assetManager';
import type { BaseMap } from '@/services/baseMapAssets';
import type { Scene } from '@/types/game';

interface SceneEditorProps {
  scene: Scene;
  onClose: () => void;
}

export const SceneEditor: React.FC<SceneEditorProps> = ({ scene, onClose }) => {
  const { updateScene } = useGameStore();
  const { storeImage } = useSceneImages();
  // Safe access to scene properties with defaults
  const safeGridSettings = scene.gridSettings || {
    enabled: true,
    size: 50,
    color: '#ffffff',
    opacity: 0.3,
    snapToGrid: true,
    showToPlayers: true,
  };

  const [formData, setFormData] = useState({
    name: scene.name,
    description: scene.description || '',
    gridEnabled: safeGridSettings.enabled,
    gridSize: safeGridSettings.size,
    gridColor: safeGridSettings.color,
    gridOpacity: safeGridSettings.opacity,
    snapToGrid: safeGridSettings.snapToGrid,
  });
  const [backgroundImage, setBackgroundImage] = useState(scene.backgroundImage);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [showBaseMapBrowser, setShowBaseMapBrowser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file using utility
      const validation = sceneUtils.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Store image and get reference URL
      const imageUrl = await storeImage(file, scene.id);

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setBackgroundImage({
          url: imageUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          offsetX: -img.naturalWidth / 2, // Center the image
          offsetY: -img.naturalHeight / 2,
          scale: 1.0,
        });
        setIsUploading(false);
      };

      img.onerror = () => {
        setUploadError('Failed to load image');
        setIsUploading(false);
      };

      img.src = URL.createObjectURL(file); // Use the original file for immediate preview
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload image',
      );
      setIsUploading(false);
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundImage(undefined);
  };

  const handleAssetSelect = async (asset: AssetMetadata) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Load the asset from the asset server
      const assetUrl = await assetManager.loadAsset(asset.id);

      setBackgroundImage({
        url: assetUrl,
        width: asset.dimensions.width,
        height: asset.dimensions.height,
        offsetX: -asset.dimensions.width / 2, // Center the image
        offsetY: -asset.dimensions.height / 2,
        scale: 1.0,
      });

      setShowAssetBrowser(false);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to load asset',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleBaseMapSelect = (map: BaseMap) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Load the image to get dimensions
      const img = new Image();
      img.onload = () => {
        setBackgroundImage({
          url: map.path,
          width: img.naturalWidth,
          height: img.naturalHeight,
          offsetX: -img.naturalWidth / 2,
          offsetY: -img.naturalHeight / 2,
          scale: 1.0,
        });
        setIsUploading(false);
        setShowBaseMapBrowser(false);
      };

      img.onerror = () => {
        setUploadError('Failed to load base map');
        setIsUploading(false);
      };

      img.src = map.path;
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Failed to load base map',
      );
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    // Validate the scene data
    const sceneData = {
      name: formData.name.trim() || 'Untitled Scene',
      description: formData.description.trim(),
      gridSettings: {
        enabled: formData.gridEnabled,
        size: Math.max(10, Math.min(200, Number(formData.gridSize))),
        color: formData.gridColor,
        opacity: Math.max(0, Math.min(1, Number(formData.gridOpacity))),
        snapToGrid: formData.snapToGrid,
        showToPlayers: true,
      },
      backgroundImage,
    };

    const validation = sceneUtils.validateScene(sceneData);
    if (!validation.valid) {
      alert(
        'Please fix the following errors:\n' + validation.errors.join('\n'),
      );
      return;
    }

    const updates: Partial<Scene> = sceneData;
    updateScene(scene.id, updates);
    onClose();
  };

  return (
    <div className="scene-editor-overlay">
      <div className="scene-editor">
        <div className="scene-editor-header">
          <h2>
            {scene.createdAt === scene.updatedAt
              ? 'Create Scene'
              : 'Edit Scene'}
          </h2>
          <button className="btn btn-small" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="scene-editor-content">
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-field">
              <label htmlFor="scene-name">Scene Name</label>
              <input
                id="scene-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Scene 1"
                maxLength={100}
              />
            </div>

            <div className="form-field">
              <label htmlFor="scene-description">Description (Optional)</label>
              <textarea
                id="scene-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter description here"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Background Image</h3>

            {backgroundImage ? (
              <div className="background-preview">
                <img
                  src={backgroundImage.url}
                  alt="Scene background"
                  className="background-thumbnail"
                />
                <div className="background-info">
                  <p>
                    Size: {backgroundImage.width} × {backgroundImage.height}px
                  </p>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={handleRemoveBackground}
                    disabled={isUploading}
                  >
                    Remove Background
                  </button>
                </div>
              </div>
            ) : (
              <div className="background-upload">
                <div className="upload-options">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </button>

                  <span className="or-divider">or</span>

                  <button
                    className="btn btn-primary"
                    onClick={() => setShowBaseMapBrowser(true)}
                    disabled={isUploading}
                  >
                    Browse Base Maps
                  </button>

                  <span className="or-divider">or</span>

                  <button
                    className="btn btn-primary"
                    onClick={() => setShowAssetBrowser(true)}
                    disabled={isUploading}
                  >
                    Browse Asset Library
                  </button>
                </div>
                <p className="upload-hint">
                  Upload your own image, browse bundled base maps, or browse
                  from the asset library.
                </p>
                {uploadError && <div className="error">{uploadError}</div>}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Grid Settings</h3>

            <div className="form-field checkbox-field">
              <input
                id="grid-enabled"
                type="checkbox"
                name="gridEnabled"
                checked={formData.gridEnabled}
                onChange={handleInputChange}
              />
              <label htmlFor="grid-enabled">Enable Grid</label>
            </div>

            {formData.gridEnabled && (
              <>
                <div className="form-field">
                  <label htmlFor="grid-size">Grid Size (pixels)</label>
                  <input
                    id="grid-size"
                    type="number"
                    name="gridSize"
                    value={formData.gridSize}
                    onChange={handleInputChange}
                    min="10"
                    max="200"
                    step="5"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="grid-color">Grid Color</label>
                  <input
                    id="grid-color"
                    type="color"
                    name="gridColor"
                    value={formData.gridColor}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="grid-opacity">Grid Opacity</label>
                  <input
                    id="grid-opacity"
                    type="range"
                    name="gridOpacity"
                    value={formData.gridOpacity}
                    onChange={handleInputChange}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                  <span className="opacity-value">
                    {Math.round(Number(formData.gridOpacity) * 100)}%
                  </span>
                </div>

                <div className="form-field checkbox-field">
                  <input
                    id="snap-to-grid"
                    type="checkbox"
                    name="snapToGrid"
                    checked={formData.snapToGrid}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="snap-to-grid">Snap to Grid</label>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="scene-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Scene
          </button>
        </div>
      </div>

      {/* Base Map Browser Modal */}
      {showBaseMapBrowser && (
        <BaseMapBrowser
          onSelect={handleBaseMapSelect}
          onClose={() => setShowBaseMapBrowser(false)}
        />
      )}

      {/* Asset Browser Modal */}
      {showAssetBrowser && (
        <div className="asset-browser-overlay">
          <div className="asset-browser-modal">
            <div className="asset-browser-header">
              <h3>Choose Background Image</h3>
              <button
                className="btn btn-small"
                onClick={() => setShowAssetBrowser(false)}
              >
                ✕
              </button>
            </div>
            <AssetBrowser onAssetSelect={handleAssetSelect} />
          </div>
        </div>
      )}
    </div>
  );
};
