import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Providers } from './components/Providers';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LinearWelcomePage } from './components/LinearWelcomePage';
import { PlayerSetupPage } from './components/PlayerSetupPage';
import { DMSetupPage } from './components/DMSetupPage';
import { LinearGameLayout } from './components/LinearGameLayout';
import { Dashboard } from './components/Dashboard';
import { AdminPage } from './components/AdminPage';
import './styles/critical-bundle.css';
import {
  loadUtilityStyles,
  logCSSLoadingReport,
  getCSSLoadStats,
  getCSSQueueStatus,
} from './utils/cssLoader';
import { initializeTheme } from './utils/themeManager';

// Load non-critical styles after initial render for better performance
const loadNonCriticalStyles = async () => {
  try {
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
      <Providers>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/lobby" replace />} />

          {/* Lobby routes - linear flow for creating/joining games */}
          <Route path="/lobby" element={<LinearWelcomePage />} />
          <Route path="/lobby/player-setup" element={<PlayerSetupPage />} />
          <Route path="/lobby/dm-setup" element={<DMSetupPage />} />
          <Route
            path="/lobby/game/:roomCode"
            element={
              <ProtectedRoute requireUser requireSession>
                <LinearGameLayout />
              </ProtectedRoute>
            }
          />

          {/* User dashboard (authenticated users) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin panel (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <Route path="/admin" element={<AdminPage />} />
          )}

          {/* Fallback - redirect unknown routes to lobby */}
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </Providers>
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
