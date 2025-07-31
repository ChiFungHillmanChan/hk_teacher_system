// File: src/pages/auth/ForgotPassword.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

const ForgotPassword = () => {
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
            <h1 className="auth-title">忘記密碼</h1>
            <p className="auth-subtitle">
              不用擔心，我們會幫您找回密碼
            </p>
          </div>

          {/* Form */}
          <div className="auth-form-container">
            <ForgotPasswordForm />
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

export default ForgotPassword;