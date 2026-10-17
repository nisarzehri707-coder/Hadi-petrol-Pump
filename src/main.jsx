import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { App } from './App';
import './index.css';

// Register Service Worker for offline PWA functionality if available
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#020617',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
              ⚠️ Application Notice
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
              {this.state.error?.message || 'A render error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
