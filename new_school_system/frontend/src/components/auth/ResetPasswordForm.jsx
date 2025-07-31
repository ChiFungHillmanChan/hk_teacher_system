import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { VALIDATION_RULES } from '../../utils/constants';

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true = valid, false = invalid
  const [resetSuccess, setResetSuccess] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');

  // Verify token validity on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        return;
      }

      try {
        // You might want to add a token verification endpoint
        // For now, we'll assume the token is valid if it exists
        setTokenValid(true);
      } catch (error) {
        console.error('Token verification failed:', error);
        setTokenValid(false);
      }
    };

    verifyToken();
  }, [token]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      const resetPromise = authService.resetPassword(token, data.password, data.confirmPassword);

      await toast.promise(resetPromise, {
        loading: '正在重設密碼...',
        success: '密碼重設成功！',
        error: (err) => {
          const message = err.response?.data?.message;
          if (message?.includes('expired')) {
            return '重設連結已過期，請重新申請';
          } else if (message?.includes('invalid')) {
            return '無效的重設連結，請重新申請';
          }
          return message || '密碼重設失敗';
        }
      });

      setResetSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: '密碼已成功重設，請使用新密碼登入' 
          } 
        });
      }, 3000);

    } catch (error) {
      console.error('Reset password failed:', error.response?.data || error.message);
      
      // If token is expired or invalid, set tokenValid to false
      if (error.response?.data?.message?.includes('expired') || 
          error.response?.data?.message?.includes('invalid')) {
        setTokenValid(false);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // Loading state while checking token
  if (tokenValid === null) {
    return (
      <div className="reset-password-loading">
        <div className="loading-spinner loading-spinner--medium"></div>
        <p className="loading-message">正在驗證重設連結...</p>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-white)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }
          }}
        />
        
        <div className="reset-password-error">
          <div className="reset-error-icon">
            <XCircle size={64} color="var(--color-error)" />
          </div>
          
          <h2 className="reset-error-title">重設連結無效或已過期</h2>
          
          <p className="reset-error-message">
            您使用的重設密碼連結可能已過期或無效。
            重設連結只在發送後的 <strong>15 分鐘</strong> 內有效。
          </p>
          
          <div className="reset-error-actions">
            <Link
              to="/forgot-password"
              className="btn btn--primary"
            >
              重新申請重設密碼
            </Link>
            
            <Link
              to="/login"
              className="btn btn--secondary"
            >
              返回登入
            </Link>
          </div>
          
          <div className="reset-error-help">
            <p><strong>常見問題：</strong></p>
            <ul>
              <li>重設連結只能使用一次</li>
              <li>連結在 15 分鐘後會自動過期</li>
              <li>請確保使用最新收到的連結</li>
              <li>如有問題，請重新申請重設密碼</li>
            </ul>
          </div>
        </div>
      </>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--color-white)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }
          }}
        />
        
        <div className="reset-password-success">
          <div className="reset-success-icon">
            <CheckCircle size={64} color="var(--color-success)" />
          </div>
          
          <h2 className="reset-success-title">密碼重設成功！</h2>
          
          <p className="reset-success-message">
            您的密碼已成功重設。3 秒後將自動跳轉到登入頁面。
          </p>
          
          <div className="reset-success-actions">
            <Link
              to="/login"
              className="btn btn--primary"
            >
              立即登入
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Reset password form
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-white)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)'
          }
        }}
      />
      
      <div className="reset-password-info">
        <p className="reset-password-description">
          請輸入您的新密碼。新密碼必須包含大小寫字母、數字和特殊字符，且至少8個字符長。
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {/* New Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            新密碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Lock size={20} className="input-icon" />
            <input
              {...register('password', {
                required: '請輸入新密碼',
                minLength: {
                  value: VALIDATION_RULES.PASSWORD.MIN_LENGTH,
                  message: `密碼至少需要${VALIDATION_RULES.PASSWORD.MIN_LENGTH}個字符`
                },
                pattern: {
                  value: VALIDATION_RULES.PASSWORD.PATTERN,
                  message: '密碼必須包含大小寫字母、數字和特殊字符'
                }
              })}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="請輸入您的新密碼"
              className={`form-input ${errors.password ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="password-toggle"
              aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
              disabled={isSubmitting}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.password.message}
            </div>
          )}
        </div>

        {/* Confirm New Password Field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            確認新密碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Lock size={20} className="input-icon" />
            <input
              {...register('confirmPassword', {
                required: '請確認您的新密碼',
                validate: value => value === password || '密碼不匹配'
              })}
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="請再次輸入您的新密碼"
              className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="password-toggle"
              aria-label={showConfirmPassword ? '隱藏密碼' : '顯示密碼'}
              disabled={isSubmitting}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.confirmPassword.message}
            </div>
          )}
        </div>

        {/* Password Requirements */}
        <div className="password-requirements">
          <h4>密碼要求：</h4>
          <ul>
            <li className={password && password.length >= 8 ? 'requirement-met' : ''}>
              至少 8 個字符
            </li>
            <li className={password && /[a-z]/.test(password) ? 'requirement-met' : ''}>
              包含小寫字母
            </li>
            <li className={password && /[A-Z]/.test(password) ? 'requirement-met' : ''}>
              包含大寫字母
            </li>
            <li className={password && /\d/.test(password) ? 'requirement-met' : ''}>
              包含數字
            </li>
            <li className={password && /[@$!%*?&]/.test(password) ? 'requirement-met' : ''}>
              包含特殊字符 (@$!%*?&)
            </li>
          </ul>
        </div>

        <button
          type="submit"
          className={`btn btn--primary btn--large ${isSubmitting ? 'btn--loading' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              重設密碼中...
            </>
          ) : (
            '重設密碼'
          )}
        </button>

        <div className="reset-password-back">
          <Link
            to="/login"
            className="reset-password-back-link"
            tabIndex={isSubmitting ? -1 : 0}
          >
            返回登入頁面
          </Link>
        </div>
      </form>
    </>
  );
};

export default ResetPasswordForm;