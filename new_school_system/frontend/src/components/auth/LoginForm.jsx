// File: src/components/auth/LoginForm.jsx
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VALIDATION_RULES } from '../../utils/constants';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Check for success message from password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('reset') === 'success') {
      toast.success('密碼重設成功！請使用新密碼登入。', {
        duration: 5000,
      });
      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  // Form submission handler
  const onSubmit = async data => {
    try {
      clearError();

      const loginPromise = login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      await toast.promise(loginPromise, {
        loading: '登入中...',
        success: '歡迎回來！',
        error: err => {
          const message = err.message || '登入失敗';
          if (message.includes('Invalid credentials')) {
            return '電子郵件或密碼錯誤';
          }
          if (message.includes('locked')) {
            return '帳號已被鎖定，請稍後再試或重設密碼';
          }
          if (message.includes('verify')) {
            return '請先驗證您的電子郵件地址';
          }
          if (message.includes('deactivated')) {
            return '帳號已被停用，請聯絡管理員';
          }
          return message;
        },
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Demo credentials helper
  const fillDemoCredentials = () => {
    setValue('email', 'admin@hkteacher.dev');
    setValue('password', 'Admin123!@#');
    toast.success('測試帳號資料已填入！', {
      duration: 2000,
    });
  };

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
            boxShadow: 'var(--shadow-lg)',
          },
        }}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            電子郵件 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Mail size={20} className="input-icon" />
            <input
              {...register('email', {
                required: '請輸入您的電子郵件',
                pattern: {
                  value: VALIDATION_RULES.EMAIL.PATTERN,
                  message: '請輸入有效的電子郵件格式',
                },
              })}
              id="email"
              type="email"
              placeholder="請輸入您的電子郵件"
              className={`form-input ${errors.email ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
            />
          </div>
          {errors.email && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.email.message}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            密碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Lock size={20} className="input-icon" />
            <input
              {...register('password', {
                required: '請輸入您的密碼',
                minLength: {
                  value: 1,
                  message: '請輸入密碼',
                },
              })}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="請輸入您的密碼"
              className={`form-input ${errors.password ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="current-password"
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

        <div className="form-options">
          <label className="checkbox-label">
            <input type="checkbox" className="checkbox" disabled={isSubmitting} />
            <span className="checkbox-text">記住我</span>
          </label>

          <Link to="/forgot-password" className="forgot-link" tabIndex={isSubmitting ? -1 : 0}>
            忘記密碼？
          </Link>
        </div>

        <button
          type="submit"
          className={`btn btn--primary btn--large ${isSubmitting ? 'btn--loading' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              登入中...
            </>
          ) : (
            '登入'
          )}
        </button>
      </form>
    </>
  );
};

export default LoginForm;
