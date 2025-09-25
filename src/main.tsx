import React from 'react';
import ReactDOM from 'react-dom/client';
import { Layout } from './components/Layout';
import './styles/main.css';
import './styles/assets.css';
import './styles/lobby-glassmorphism.css';
import './styles/game-layout.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout />
  </React.StrictMode>,
);
