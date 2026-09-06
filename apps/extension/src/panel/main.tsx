import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PanelApp from './PanelApp';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento #root não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <PanelApp />
  </StrictMode>,
);