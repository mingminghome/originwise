import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installGtm } from './core/analytics/gtm';
import './index.css';
import App from './App.tsx';

installGtm();

document.documentElement.classList.add('ow-app-ready');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
