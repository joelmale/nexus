import React from 'react';
import ReactDOM from 'react-dom/client';
import { Layout } from './components/Layout';
import './styles/main.css';
import './styles/assets.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Layout />
  </React.StrictMode>,
);
