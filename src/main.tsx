import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import './styles/critical-bundle.css';
import {
  loadUtilityStyles,
  preloadCriticalStyles,
  logCSSLoadingReport,
  getCSSLoadStats,
  getCSSQueueStatus,
} from './utils/cssLoader';
import { initializeTheme } from './utils/themeManager';

// Load non-critical styles after initial render for better performance
const loadNonCriticalStyles = async () => {
  try {
    // Preload critical styles that are likely to be needed soon
    preloadCriticalStyles();

    // Load utility and accessibility styles
    await loadUtilityStyles();

    // Initialize theme system (loads appropriate theme styles)
    await initializeTheme();

    console.debug('✅ Non-critical styles loaded successfully');
  } catch (error) {
    console.warn('⚠️ Failed to load some non-critical styles:', error);
  }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="/lobby" element={<Layout />} />
        <Route path="/game/:sessionId" element={<Layout />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>,
);

// Load non-critical styles after initial render
loadNonCriticalStyles();

// Add CSS debugging utilities to window for development
if (import.meta.env.DEV) {
  (window as any).cssDebug = {
    logReport: logCSSLoadingReport,
    getStats: getCSSLoadStats,
    getQueueStatus: getCSSQueueStatus,
  };
}
