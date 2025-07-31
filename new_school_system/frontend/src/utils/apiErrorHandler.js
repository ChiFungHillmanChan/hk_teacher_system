import { toast } from 'react-hot-toast';

export const createApiErrorHandler = setRateLimitError => {
  return error => {
    console.error('API Error:', error);

    // Handle rate limiting
    if (error.status === 429) {
      const retryAfter = error.data?.retryAfter || error.retryAfter || 900;
      setRateLimitError({
        retryAfter: retryAfter,
        originalError: error,
      });
      return; // Don't show toast for rate limit, show the error page instead
    }

    // Handle other errors with toast notifications
    const errorMessage = error.message || error.data?.message || '發生未知錯誤';

    switch (error.status) {
      case 400:
        toast.error(`請求錯誤: ${errorMessage}`);
        break;
      case 401:
        toast.error('請重新登入');
        // Redirect to login or trigger logout
        break;
      case 403:
        toast.error('您沒有權限執行此操作');
        break;
      case 404:
        toast.error('找不到請求的資源');
        break;
      case 500:
        toast.error('伺服器錯誤，請稍後再試');
        break;
      default:
        toast.error(errorMessage);
    }
  };
};
