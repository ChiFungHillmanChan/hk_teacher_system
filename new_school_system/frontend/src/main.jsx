import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Global error boundary for unhandled errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: '#e74c3c', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            We're sorry, but something unexpected happened.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
          {import.meta.env.DEV && (
            <details style={{ marginTop: '2rem', textAlign: 'left' }}>
              <summary>Error Details (Development)</summary>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: '1rem', 
                margin: '1rem 0',
                borderRadius: '0.25rem',
                overflow: 'auto',
                fontSize: '0.875rem'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)