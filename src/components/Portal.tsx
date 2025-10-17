import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export const Portal: React.FC<PortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const container = document.getElementById('portal-root');
  if (!container) {
    // This should not happen in production, but it's a good safeguard
    console.error('Portal root element not found');
    return null;
  }

  return createPortal(children, container);
};
