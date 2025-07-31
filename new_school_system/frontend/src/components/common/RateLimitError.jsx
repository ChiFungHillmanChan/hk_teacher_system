import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const RateLimitError = ({
  retryAfter = 900, // Default 15 minutes in seconds
  onRetry = () => window.location.reload(),
  onClose = null,
  fullPage = true,
}) => {
  const [timeLeft, setTimeLeft] = useState(retryAfter);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanRetry(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanRetry(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = seconds => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const elapsed = retryAfter - timeLeft;
    return (elapsed / retryAfter) * 100;
  };

  const containerClass = fullPage ? 'rate-limit-error-fullpage' : 'rate-limit-error-modal';

  return (
    <div className={containerClass}>
      <div className="rate-limit-error-content">
        {/* Close button for modal mode */}
        {!fullPage && onClose && (
          <button className="rate-limit-error-close" onClick={onClose} aria-label="關閉">
            ×
          </button>
        )}

        {/* Icon */}
        <div className="rate-limit-error-icon">
          <AlertTriangle size={48} />
        </div>

        {/* Title */}
        <h1 className="rate-limit-error-title">請求過於頻繁</h1>

        {/* Description */}
        <p className="rate-limit-error-description">為了保護系統穩定性，您需要稍作休息</p>

        {/* Countdown Section */}
        <div className="rate-limit-countdown">
          <div className="rate-limit-countdown-header">
            <Clock size={20} />
            <span>等待時間</span>
          </div>

          <div className="rate-limit-countdown-time">
            {canRetry ? '00:00' : formatTime(timeLeft)}
          </div>

          {/* Progress Bar */}
          <div className="rate-limit-progress-container">
            <div
              className="rate-limit-progress-bar"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          <p className="rate-limit-countdown-status">
            {canRetry ? '✅ 現在可以重試了！' : '⏳ 請耐心等待，系統將自動恢復'}
          </p>
        </div>

        {/* Info Cards */}
        <div className="rate-limit-info-grid">
          <div className="rate-limit-info-card rate-limit-info-card--security">
            <div className="rate-limit-info-icon">🛡️</div>
            <div className="rate-limit-info-label">系統保護</div>
            <div className="rate-limit-info-value">防止濫用</div>
          </div>

          <div className="rate-limit-info-card rate-limit-info-card--performance">
            <div className="rate-limit-info-icon">⚡</div>
            <div className="rate-limit-info-label">性能保障</div>
            <div className="rate-limit-info-value">穩定運行</div>
          </div>

          <div className="rate-limit-info-card rate-limit-info-card--time">
            <div className="rate-limit-info-icon">☕</div>
            <div className="rate-limit-info-label">休息時間</div>
            <div className="rate-limit-info-value">15分鐘</div>
          </div>
        </div>

        {/* Retry Button */}
        <button
          className={`rate-limit-retry-btn ${
            canRetry ? 'rate-limit-retry-btn--active' : 'rate-limit-retry-btn--disabled'
          }`}
          onClick={onRetry}
          disabled={!canRetry}
        >
          <RefreshCw size={20} />
          {canRetry ? '立即重試' : '請稍候...'}
        </button>

        {/* Tips */}
        <div className="rate-limit-tips">
          <h4>💡 溫馨提示</h4>
          <ul>
            <li>這是正常的安全保護機制</li>
            <li>請避免過於頻繁地刷新頁面</li>
            <li>正常使用不會觸發此限制</li>
            <li>如持續遇到問題，請聯繫技術支援</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="rate-limit-footer">HK Teacher System - 系統安全保護</div>
      </div>
    </div>
  );
};

export default RateLimitError;
