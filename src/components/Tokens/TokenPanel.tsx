import React, { useState } from 'react';
import { useTokenAssets } from '@/services/tokenAssets';
import { TokenLibraryManager } from './TokenLibraryManager';
import { TokenCreationPanel } from './TokenCreationPanel';
import { DraggableToken } from './DraggableToken';
import type { Token } from '@/types/token';

interface TokenPanelProps {
  onTokenSelect?: (token: Token) => void;
}

export const TokenPanel: React.FC<TokenPanelProps> = ({ onTokenSelect }) => {
  const { getAllTokens, getLibraries, manager } = useTokenAssets();
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [showCreationPanel, setShowCreationPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const stats = manager.getCacheStats();
  const allTokens = getAllTokens();
  const libraries = getLibraries();

  const filteredTokens = searchQuery.trim()
    ? allTokens.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.tags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          ) ||
          token.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allTokens;

  const handleTokenClick = (token: Token) => {
    if (onTokenSelect) {
      onTokenSelect(token);
    }
  };

  return (
    <>
      <div
        className="token-panel"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f9f9f9',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'white',
          }}
        >
          <h2
            style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 'bold' }}
          >
            Tokens
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            {stats.totalTokens} tokens across {stats.libraries} libraries
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'white',
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setShowLibraryManager(true)}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
          >
            📚 Manage Libraries
          </button>
          <button
            onClick={() => setShowCreationPanel(true)}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e7e34';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#28a745';
            }}
          >
            + Create Token
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'white',
          }}
        >
          <input
            type="text"
            placeholder="Search tokens by name, tag, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Stats Summary */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#e3f2fd',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              fontSize: '13px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#007bff',
                }}
              >
                {stats.totalTokens}
              </div>
              <div style={{ color: '#666' }}>Total Tokens</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#28a745',
                }}
              >
                {allTokens.filter((t) => t.isCustom).length}
              </div>
              <div style={{ color: '#666' }}>Custom</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#6c757d',
                }}
              >
                {libraries.filter((lib) => !lib.isDefault).length}
              </div>
              <div style={{ color: '#666' }}>Libraries</div>
            </div>
          </div>
        </div>

        {/* Token Grid */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          {filteredTokens.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: '16px',
                gap: '16px',
              }}
            >
              <p>
                {searchQuery.trim()
                  ? 'No tokens match your search'
                  : 'No tokens available'}
              </p>
              {!searchQuery.trim() && (
                <button
                  onClick={() => setShowCreationPanel(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#28a745',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  + Create Your First Token
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
              }}
            >
              {filteredTokens.map((token) => (
                <DraggableToken
                  key={token.id}
                  token={token}
                  onClick={handleTokenClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLibraryManager && (
        <TokenLibraryManager
          isOpen={showLibraryManager}
          onClose={() => setShowLibraryManager(false)}
          onTokenSelect={(token) => {
            handleTokenClick(token);
            setShowLibraryManager(false);
          }}
        />
      )}

      {showCreationPanel && (
        <TokenCreationPanel
          isOpen={showCreationPanel}
          onClose={() => setShowCreationPanel(false)}
          onTokenCreated={() => {
            setShowCreationPanel(false);
          }}
        />
      )}
    </>
  );
};
