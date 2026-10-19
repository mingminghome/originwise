import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installGtm } from './core/analytics/gtm';
import { migrateLegacyStorage } from './core/storage/store';
import './index.css';
import App from './App.tsx';

migrateLegacyStorage();
installGtm();

document.documentElement.classList.add('ow-app-ready');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
