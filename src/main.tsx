import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import './styles/main.css';
import './styles/assets.css';
import './styles/lobby-glassmorphism.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lobby" replace />} />
        <Route path="/lobby" element={<Layout />} />
        <Route path="/game/:sessionId" element={<Layout />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
