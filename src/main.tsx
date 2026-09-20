import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PenyediaSesi } from './lib/sesi';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PenyediaSesi>
        <App />
      </PenyediaSesi>
    </BrowserRouter>
  </StrictMode>,
);
