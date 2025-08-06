import { AlertCircle, Eye, EyeOff, GraduationCap, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VALIDATION_RULES } from '../../utils/constants';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  // Function to clear all errors
  const handleClearErrors = () => {
    setLoginError('');
    if (clearError && typeof clearError === 'function') {
      clearError();
    }
  };

  // Form submission handler
  const onSubmit = async data => {
    try {
      setLoginError(''); // Clear any previous errors
      if (clearError && typeof clearError === 'function') {
        clearError();
      }

      await login({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      // Show success message
      toast.success('登入成功！歡迎回來！');
    } catch (error) {
      console.error('Login failed:', error);

      // Handle different types of login errors
      let errorMessage = '登入失敗，請重試';

      if (error.response?.data?.message) {
        const serverMessage = error.response.data.message.toLowerCase();

        if (
          serverMessage.includes('invalid credentials') ||
          serverMessage.includes('invalid email') ||
          serverMessage.includes('user not found') ||
          serverMessage.includes('incorrect password')
        ) {
          errorMessage = '電郵地址或密碼錯誤，請檢查後重試';
        } else if (
          serverMessage.includes('account is locked') ||
          serverMessage.includes('temporarily locked')
        ) {
          errorMessage = '帳戶因多次登入失敗而被暫時鎖定，請稍後再試';
        } else if (
          serverMessage.includes('account is deactivated') ||
          serverMessage.includes('not active')
        ) {
          errorMessage = '帳戶已被停用，請聯繫管理員';
        } else if (serverMessage.includes('email not verified')) {
          errorMessage = '請先驗證您的電子郵件地址';
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = '電郵地址或密碼錯誤，請檢查後重試';
      }

      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Demo credentials helper
  const fillDemoCredentials = () => {
    setValue('email', 'admin@hkteacher.dev');
    setValue('password', 'Admin123!@#');
    toast.success('示範資料已填入！');
  };

  // Handle input change to clear errors
  const handleInputChange = () => {
    if (loginError) {
      setLoginError('');
    }
    if (clearError && typeof clearError === 'function') {
      clearError();
    }
  };

  if (isLoading) {
    return (
      <div className="form-loading">
        <div className="spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
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

      <div className="auth-page">
        <div className="auth-page__container">
          <div className="auth-page__header">
            <div className="auth-page__logo">
              <GraduationCap size={48} color="var(--color-primary)" />
            </div>
            <h1 className="auth-page__title">登入香港教師系統</h1>
            <p className="auth-page__subtitle">請輸入您的帳戶資料以繼續使用系統</p>
          </div>

          {/* Show login error message */}
          {loginError && (
            <div className="auth-error-banner">
              <div className="auth-error-content">
                <AlertCircle size={20} />
                <span>{loginError}</span>
                <button
                  type="button"
                  onClick={handleClearErrors}
                  className="error-dismiss"
                  aria-label="清除錯誤訊息"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                電郵地址 <span className="form-required">*</span>
              </label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <input
                  {...register('email', {
                    required: '電郵地址為必填項目',
                    pattern: {
                      value: VALIDATION_RULES.EMAIL.PATTERN,
                      message: '請輸入有效的電郵地址',
                    },
                  })}
                  id="email"
                  type="email"
                  placeholder="請輸入您的電郵地址"
                  className={`form-input ${errors.email || loginError ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                  autoComplete="email"
                  onChange={handleInputChange}
                />
              </div>
              {errors.email && (
                <div className="form-error">
                  <AlertCircle size={16} />
                  {errors.email.message}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                密碼 <span className="form-required">*</span>
              </label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                  {...register('password', {
                    required: '密碼為必填項目',
                    minLength: {
                      value: VALIDATION_RULES.PASSWORD.MIN_LENGTH,
                      message: `密碼必須至少 ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} 個字符`,
                    },
                  })}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="請輸入您的密碼"
                  className={`form-input ${
                    errors.password || loginError ? 'form-input--error' : ''
                  }`}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  onChange={handleInputChange}
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
                  正在登入...
                </>
              ) : (
                '登入'
              )}
            </button>

            {/* Login attempt info */}
            {loginError && loginError.includes('鎖定') && (
              <div className="login-info">
                <p className="login-info-text">
                  <AlertCircle size={16} />
                  為了保護您的帳戶安全，多次登入失敗後帳戶會被暫時鎖定。
                  如果您忘記了密碼，請使用「忘記密碼」功能。
                </p>
              </div>
            )}
          </form>
          {/* <div className="auth-page__footer">
            <p className="auth-page__signup-prompt">
              還沒有帳戶？{' '}
              <Link
                to="/register"
                className="auth-page__link"
              >
                立即註冊
              </Link>
            </p>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default Login;
