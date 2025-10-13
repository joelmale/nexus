import React from 'react';
import '../styles/Tooltip.css';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = React.memo(
  ({ text, children, className }) => {
    return (
      <div className={`tooltip-container ${className || ''}`}>
        {children}
        <div className="tooltip-box">
          <div dangerouslySetInnerHTML={{ __html: text }} />
        </div>
      </div>
    );
  },
);
