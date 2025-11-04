import React from 'react';
import { render } from '@testing-library/react';
import { DrawingTools } from '../../../../src/components/Scene/DrawingTools';
import { describe, it, expect } from 'vitest';

describe('DrawingTools', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <svg>
        <DrawingTools
          activeTool="select"
          drawingStyle={{
            strokeColor: '#000000',
            strokeWidth: 2,
            fillColor: '#ffffff',
            fillOpacity: 0.5,
            dmNotesOnly: false,
            visibleToPlayers: true,
          }}
          camera={{ x: 0, y: 0, zoom: 1 }}
          _gridSize={50}
          svgRef={{ current: null }}
          snapToGrid={false}
          selectedObjectIds={[]}
          setSelection={() => {}}
          clearSelection={() => {}}
          placedTokens={[]}
        />
      </svg>,
    );
    expect(container).toBeDefined();
  });
});
