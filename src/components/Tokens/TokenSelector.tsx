import React, { useState, useMemo } from 'react';
import { useTokenAssets } from '@/services/tokenAssets';
import { useTokenInterfaceStrategy } from '@/hooks/useDeviceDetection';
import type { Token, TokenCategory } from '@/types/token';

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenSelect: (token: Token) => void;
  selectedToken?: Token | null;
}

const TOKEN_CATEGORIES: { id: TokenCategory; label: string; icon: string }[] = [
  { id: 'pc', label: 'Players', icon: '🧙‍♂️' },
  { id: 'npc', label: 'NPCs', icon: '👤' },
  { id: 'monster', label: 'Monsters', icon: '👹' },
  { id: 'object', label: 'Objects', icon: '📦' },
  { id: 'vehicle', label: 'Vehicles', icon: '🚗' },
  { id: 'effect', label: 'Effects', icon: '✨' },
];

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onTokenSelect,
  selectedToken
}) => {
  const { getTokensByCategory, searchTokens, isLoading } = useTokenAssets();
  const { strategy, interfaceConfig } = useTokenInterfaceStrategy();
  
  const [activeCategory, setActiveCategory] = useState<TokenCategory>('pc');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTokens = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTokens(searchQuery);
    }
    
    return getTokensByCategory(activeCategory);
  }, [getTokensByCategory, searchTokens, searchQuery, activeCategory]);

  const handleTokenClick = (token: Token) => {
    onTokenSelect(token);
    if (strategy === 'modal') {
      onClose();
    }
  };

  if (!isOpen || isLoading) {
    return null;
  }

  const TokenGrid = () => (
    <div 
      className="token-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${interfaceConfig.tokenGridColumns}, 1fr)`,
        gap: '8px',
        padding: '16px',
        maxHeight: '60vh',
        overflowY: 'auto'
      }}
    >
      {filteredTokens.map((token) => (
        <div
          key={token.id}
          className={`token-item ${selectedToken?.id === token.id ? 'selected' : ''}`}
          onClick={() => handleTokenClick(token)}
          style={{
            border: '2px solid transparent',
            borderColor: selectedToken?.id === token.id ? '#007bff' : '#ddd',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            textAlign: 'center',
            backgroundColor: selectedToken?.id === token.id ? '#e3f2fd' : '#f9f9f9',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedToken?.id !== token.id) {
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.backgroundColor = '#f0f8ff';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedToken?.id !== token.id) {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.backgroundColor = '#f9f9f9';
            }
          }}
        >
          <div
            style={{
              width: interfaceConfig.tokenSize === 'small' ? '40px' : '60px',
              height: interfaceConfig.tokenSize === 'small' ? '40px' : '60px',
              margin: '0 auto 8px',
              backgroundImage: `url(${token.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '50%',
              border: '1px solid #ccc'
            }}
          />
          <div
            style={{
              fontSize: interfaceConfig.tokenSize === 'small' ? '10px' : '12px',
              fontWeight: 'bold',
              color: '#333',
              lineHeight: '1.2',
              wordBreak: 'break-word'
            }}
          >
            {token.name}
          </div>
          {token.size !== 'medium' && (
            <div
              style={{
                fontSize: '10px',
                color: '#666',
                marginTop: '2px'
              }}
            >
              {token.size}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const CategoryTabs = () => (
    <div className="category-tabs" style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
      {TOKEN_CATEGORIES.slice(0, interfaceConfig.maxVisibleCategories).map((category) => (
        <button
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          style={{
            flex: 1,
            padding: '12px 8px',
            border: 'none',
            backgroundColor: activeCategory === category.id ? '#007bff' : 'transparent',
            color: activeCategory === category.id ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{category.icon}</span>
          <span>{category.label}</span>
        </button>
      ))}
    </div>
  );

  const SearchBar = () => (
    interfaceConfig.enableSearch ? (
      <div style={{ padding: '16px' }}>
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>
    ) : null
  );

  // Modal rendering for mobile/tablet
  if (strategy === 'modal') {
    return (
      <div
        className="token-selector-modal"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '500px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #ddd' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Select Token</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          
          <SearchBar />
          <CategoryTabs />
          <TokenGrid />
        </div>
      </div>
    );
  }

  // Sidebar rendering for desktop with touch
  if (strategy === 'sidebar') {
    return (
      <div
        className="token-selector-sidebar"
        style={{
          position: 'fixed',
          right: isOpen ? 0 : '-400px',
          top: 0,
          bottom: 0,
          width: '400px',
          backgroundColor: 'white',
          boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          transition: 'right 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #ddd' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Tokens</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>
        
        <SearchBar />
        <CategoryTabs />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TokenGrid />
        </div>
      </div>
    );
  }

  // Floating window placeholder (to be implemented later)
  return (
    <div>Floating window not yet implemented</div>
  );
};
