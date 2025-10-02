import React, { useState, useEffect } from 'react';
import { baseMapAssetManager, type BaseMap } from '@/services/baseMapAssets';
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
  const [selectedMap, setSelectedMap] = useState<BaseMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeMaps = async () => {
      await baseMapAssetManager.initialize();
      const allMaps = baseMapAssetManager.getAllMaps();
      setMaps(allMaps);
      setFilteredMaps(allMaps);
      setIsLoading(false);
    };

    initializeMaps();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = baseMapAssetManager.searchMaps(searchQuery);
      setFilteredMaps(filtered);
    } else {
      setFilteredMaps(maps);
    }
  }, [searchQuery, maps]);

  const handleMapClick = (map: BaseMap) => {
    setSelectedMap(map);
  };

  const handleSelect = () => {
    if (selectedMap) {
      onSelect(selectedMap);
    }
  };

  return (
    <div className="asset-browser-overlay">
      <div className="asset-browser">
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

        <div className="asset-browser-content">
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
                >
                  <div className="asset-thumbnail">
                    <img src={map.path} alt={map.name} loading="lazy" />
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
