import React, { useState, useEffect } from 'react';
import { baseMapAssetManager, type BaseMap } from '@/services/baseMapAssets';
import { dungeonMapService } from '@/services/dungeonMapService';
import { assetFavoritesManager } from '@/services/assetFavorites';
import '@/styles/asset-browser.css';

interface BaseMapBrowserProps {
  onSelect: (map: BaseMap) => void;
  onClose: () => void;
}

export const BaseMapBrowser: React.FC<BaseMapBrowserProps> = ({
  onSelect,
  onClose,
}) => {
  const [maps, setMaps] = useState<BaseMap[]>([]);
  const [filteredMaps, setFilteredMaps] = useState<BaseMap[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMap, setSelectedMap] = useState<BaseMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMaps = async () => {
      await baseMapAssetManager.initialize();
      const defaultMaps = baseMapAssetManager.getAllMaps();
      const generatedMaps = dungeonMapService.getAsBaseMaps();
      const allMaps = [...generatedMaps, ...defaultMaps];
      setMaps(allMaps);
      setFilteredMaps(allMaps);
      setIsLoading(false);
    };

    initializeMaps();
  }, []);

  useEffect(() => {
    let filtered = maps;

    // Filter by category
    if (selectedCategory === 'favorites') {
      const favorites = assetFavoritesManager.getFavorites();
      filtered = filtered.filter((map) => favorites.includes(map.id));
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter((map) => map.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (map) =>
          map.name.toLowerCase().includes(lowerQuery) ||
          map.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
      );
    }

    setFilteredMaps(filtered);
  }, [searchQuery, selectedCategory, maps]);

  const handleMapClick = (map: BaseMap) => {
    setSelectedMap(map);
  };

  const handleSelect = () => {
    if (selectedMap) {
      assetFavoritesManager.addToRecent(selectedMap.id, 'map');
      onSelect(selectedMap);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    assetFavoritesManager.toggleFavorite(mapId);
    // Force re-render
    setFilteredMaps([...filteredMaps]);
  };

  return (
    <div className="asset-browser-overlay" onClick={onClose}>
      <div className="asset-browser-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asset-browser-header">
          <h2>🗺️ Default Base Maps</h2>
          <button className="btn btn-small" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="asset-browser-search">
          <input
            type="text"
            placeholder="Search maps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="asset-browser-filters" style={{
          padding: '8px 16px',
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {['all', 'favorites', 'outdoor', 'indoor', 'dungeon', 'urban'].map((category) => (
            <button
              key={category}
              className={`btn btn-small ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(category)}
              style={{ textTransform: 'capitalize' }}
            >
              {category === 'all' ? 'All Maps' : category === 'favorites' ? '⭐ Favorites' : category}
            </button>
          ))}
        </div>

        <div
          className="asset-browser-content"
          style={{ overflowY: 'auto', flex: 1 }}
        >
          {isLoading ? (
            <div className="asset-browser-loading">
              <p>Loading base maps...</p>
            </div>
          ) : filteredMaps.length === 0 ? (
            <div className="asset-browser-empty">
              <p>No maps found</p>
              {searchQuery && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="asset-browser-grid">
              {filteredMaps.map((map) => (
                <div
                  key={map.id}
                  className={`asset-browser-item ${selectedMap?.id === map.id ? 'selected' : ''}`}
                  onClick={() => handleMapClick(map)}
                  style={{
                    border: selectedMap?.id === map.id ? '3px solid var(--primary-color)' : '2px solid var(--border-color)',
                    boxShadow: selectedMap?.id === map.id ? '0 0 12px var(--primary-color)' : 'none',
                    transform: selectedMap?.id === map.id ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="asset-thumbnail">
                    <img
                      src={map.thumbnail || map.path}
                      alt={map.name}
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to full image if thumbnail fails
                        e.currentTarget.src = map.path;
                      }}
                    />
                    <button
                      onClick={(e) => toggleFavorite(e, map.id)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {assetFavoritesManager.isFavorite(map.id) ? '⭐' : '☆'}
                    </button>
                    {map.category && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '4px 8px',
                        background: 'var(--primary-color)',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {map.category}
                      </span>
                    )}
                  </div>
                  <div className="asset-info">
                    <h4>{map.name}</h4>
                    {map.gridSize && (
                      <p className="asset-dimensions">
                        {map.gridSize.width} × {map.gridSize.height} grid
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="asset-browser-footer">
          <div className="asset-count">
            {filteredMaps.length} map{filteredMaps.length !== 1 ? 's' : ''}
            {searchQuery && ` (filtered from ${maps.length})`}
          </div>
          <div className="asset-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSelect}
              disabled={!selectedMap}
            >
              Select Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
