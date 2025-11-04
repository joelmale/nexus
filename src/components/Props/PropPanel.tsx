import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { usePropAssets } from '@/services/propAssets';
import type { Prop, PropCategory } from '@/types/prop';

interface PropPanelProps {
  onPropSelect?: (prop: Prop) => void;
}

const CATEGORIES: { value: PropCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📦' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'decoration', label: 'Decoration', icon: '🎨' },
  { value: 'treasure', label: 'Treasure', icon: '💰' },
  { value: 'container', label: 'Container', icon: '📦' },
  { value: 'door', label: 'Door', icon: '🚪' },
  { value: 'trap', label: 'Trap', icon: '⚠️' },
  { value: 'light', label: 'Light', icon: '💡' },
  { value: 'effect', label: 'Effect', icon: '✨' },
  { value: 'other', label: 'Other', icon: '🔧' },
];

export const PropPanel: React.FC<PropPanelProps> = ({ onPropSelect }) => {
  const { getAllProps } = usePropAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [activeCategory, setActiveCategory] = useState<PropCategory | 'all'>(() => {
    const saved = localStorage.getItem('propPanel.activeCategory');
    if (saved) {
      return saved as PropCategory | 'all';
    }
    return 'all';
  });

  const allProps = getAllProps();

  useEffect(() => {
    localStorage.setItem('propPanel.activeCategory', activeCategory);
  }, [activeCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<PropCategory | 'all', number> = {
      all: allProps.length,
      furniture: 0,
      decoration: 0,
      treasure: 0,
      container: 0,
      door: 0,
      trap: 0,
      light: 0,
      effect: 0,
      other: 0,
    };

    allProps.forEach((prop) => {
      if (prop.category in counts) {
        counts[prop.category]++;
      }
    });

    return counts;
  }, [allProps]);

  // Filtered props
  const filteredProps = useMemo(() => {
    let props = allProps;

    // Filter by category
    if (activeCategory !== 'all') {
      props = props.filter((p) => p.category === activeCategory);
    }

    // Filter by search
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      props = props.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return props;
  }, [allProps, activeCategory, deferredSearchQuery]);

  const handlePropClick = (prop: Prop) => {
    if (onPropSelect) {
      onPropSelect(prop);
    }
  };

  return (
    <div className="prop-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color, #444)' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
          🎭 Props
        </h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search props..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid var(--border-color, #444)',
            borderRadius: '4px',
            background: 'var(--bg-secondary, #2a2a2a)',
            color: 'var(--text-primary, #fff)',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.75rem',
        borderBottom: '1px solid var(--border-color, #444)',
        overflowX: 'auto'
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            style={{
              padding: '0.4rem 0.75rem',
              border: `2px solid ${activeCategory === cat.value ? 'var(--color-primary, #4A9EFF)' : 'var(--border-color, #444)'}`,
              borderRadius: '6px',
              background: activeCategory === cat.value ? 'var(--color-primary-dark, #2a5a9f)' : 'var(--bg-secondary, #2a2a2a)',
              color: 'var(--text-primary, #fff)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span style={{
              fontSize: '0.75rem',
              opacity: 0.7,
              marginLeft: '0.25rem'
            }}>
              ({categoryCounts[cat.value]})
            </span>
          </button>
        ))}
      </div>

      {/* Props Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '1rem',
        alignContent: 'start'
      }}>
        {filteredProps.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary, #888)'
          }}>
            {searchQuery ? `No props found matching "${searchQuery}"` : 'No props available'}
          </div>
        ) : (
          filteredProps.map((prop) => (
            <div
              key={prop.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/prop', JSON.stringify(prop));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handlePropClick(prop)}
              style={{
                padding: '0.75rem',
                border: '2px solid var(--border-color, #444)',
                borderRadius: '8px',
                background: 'var(--bg-secondary, #2a2a2a)',
                cursor: 'grab',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary, #4A9EFF)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color, #444)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <img
                src={prop.image}
                alt={prop.name}
                style={{
                  width: '80px',
                  height: '80px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  background: '#1a1a1a',
                }}
              />
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-primary, #fff)',
                textAlign: 'center',
                lineHeight: '1.2',
                wordBreak: 'break-word',
              }}>
                {prop.name}
              </div>
              {prop.size && (
                <div style={{
                  fontSize: '0.625rem',
                  color: 'var(--text-secondary, #888)',
                  textTransform: 'uppercase',
                }}>
                  {prop.size}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--border-color, #444)',
        background: 'var(--bg-tertiary, #1a1a1a)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary, #888)',
        textAlign: 'center'
      }}>
        {filteredProps.length} prop{filteredProps.length !== 1 ? 's' : ''} • Drag to canvas to place
      </div>
    </div>
  );
};
