import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ProtectedActionProvider } from './context/ProtectedActionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProtectedActionProvider>
      <App />
    </ProtectedActionProvider>
  </StrictMode>,
);
