import React from 'react';
import RateLimitError from './RateLimitError';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRateLimit: false,
      retryAfter: 900,
    };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a rate limit error
    const isRateLimit = error.status === 429 || error.message?.includes('Too many requests');
    const retryAfter = error.retryAfter || error.data?.retryAfter || 900;

    return {
      hasError: true,
      error,
      isRateLimit,
      retryAfter,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isRateLimit: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Show rate limit error page
      if (this.state.isRateLimit) {
        return (
          <RateLimitError
            retryAfter={this.state.retryAfter}
            onRetry={this.handleRetry}
            error={this.state.error}
          />
        );
      }

      // Show generic error page
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h1>糟糕！出現了錯誤</h1>
            <p>我們很抱歉，發生了意外錯誤。</p>
            <button onClick={this.handleRetry} className="btn btn--primary">
              重新載入頁面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
