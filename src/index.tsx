import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthWrapper } from './components/Auth/AuthWrapper';
import { AuthProvider } from './contexts/AuthContext';
import './index.css'; // This line loads Tailwind

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AuthWrapper>
        <App />
      </AuthWrapper>
    </AuthProvider>
  </React.StrictMode>
);