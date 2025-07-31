// File: src/pages/auth/ResetPassword.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';

const ResetPassword = () => {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <GraduationCap size={32} />
              <span>HK Teacher System</span>
            </Link>
            <h1 className="auth-title">重設密碼</h1>
            <p className="auth-subtitle">
              請輸入您的新密碼
            </p>
          </div>

          {/* Form */}
          <div className="auth-form-container">
            <ResetPasswordForm />
          </div>

          {/* Footer */}
          <div className="auth-footer">
            <p>
              記起密碼了？{' '}
              <Link to="/login" className="auth-link">
                立即登入
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;