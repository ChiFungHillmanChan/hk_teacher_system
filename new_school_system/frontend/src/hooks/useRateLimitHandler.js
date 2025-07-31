import { useState } from 'react';

export const useRateLimitHandler = () => {
  const [rateLimitError, setRateLimitError] = useState(null);

  const handleApiError = error => {
    if (error.status === 429) {
      const retryAfter = error.data?.retryAfter || error.retryAfter || 900; // Default 15 minutes
      setRateLimitError({
        retryAfter: retryAfter,
        originalError: error,
      });
      return true; // Error was handled
    }
    return false; // Error not handled, let other error handlers deal with it
  };

  const clearRateLimitError = () => {
    setRateLimitError(null);
  };

  const retryAfterRateLimit = () => {
    setRateLimitError(null);
    // You can add additional retry logic here
    window.location.reload();
  };

  return {
    rateLimitError,
    handleApiError,
    clearRateLimitError,
    retryAfterRateLimit,
  };
};
