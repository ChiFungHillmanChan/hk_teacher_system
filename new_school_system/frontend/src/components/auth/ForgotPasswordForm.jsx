// File: src/components/auth/ForgotPasswordForm.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../../services/authService';

const ForgotPasswordForm = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: ''
    }
  });

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      const forgotPasswordPromise = authService.forgotPassword(data.email.trim().toLowerCase());

      await toast.promise(forgotPasswordPromise, {
        loading: '正在發送重設密碼郵件...',
        success: '郵件發送成功！',
        error: (err) => err.response?.data?.message || '發送失敗，請稍後再試'
      });

      setSubmittedEmail(data.email.trim().toLowerCase());
      setEmailSent(true);
    } catch (error) {
      console.error('Forgot password failed:', error);
    }
  };

  // Success state - show confirmation
  if (emailSent) {
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
        
        <div className="forgot-password-success">
          <div className="forgot-password-success-icon">
            <CheckCircle size={48} />
          </div>
          
          <h2 className="forgot-password-success-title">
            郵件已發送
          </h2>
          
          <p className="forgot-password-success-message">
            我們已向 <strong>{submittedEmail}</strong> 發送了密碼重設說明。
          </p>
          
          <div className="forgot-password-success-help">
            <h4>沒有收到郵件？</h4>
            <ul>
              <li>請檢查您的垃圾郵件夾</li>
              <li>確認郵箱地址拼寫正確</li>
              <li>郵件可能需要幾分鐘才能送達</li>
              <li>重設連結將在15分鐘後失效</li>
            </ul>
          </div>
          
          <div className="forgot-password-success-actions">
            <button
              onClick={() => setEmailSent(false)}
              className="btn btn--secondary"
            >
              重新發送
            </button>
            
            <Link
              to="/login"
              className="btn btn--primary"
            >
              返回登入
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Form state - show forgot password form
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
      
      <div className="forgot-password-info">
        <p className="forgot-password-description">
          請輸入您註冊時使用的電子郵件地址，我們將向您發送密碼重設說明。
        </p>
      </div>

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
                  value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                  message: '請輸入有效的電子郵件格式'
                }
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

        <button
          type="submit"
          className={`btn btn--primary btn--large ${isSubmitting ? 'btn--loading' : ''}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              發送中...
            </>
          ) : (
            '發送重設郵件'
          )}
        </button>

        <div className="forgot-password-back">
          <Link
            to="/login"
            className="forgot-password-back-link"
            tabIndex={isSubmitting ? -1 : 0}
          >
            <ArrowLeft size={16} />
            返回登入頁面
          </Link>
        </div>
      </form>
    </>
  );
};

export default ForgotPasswordForm;