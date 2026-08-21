import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { AuthProvider } from './contexts/AuthContext.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

