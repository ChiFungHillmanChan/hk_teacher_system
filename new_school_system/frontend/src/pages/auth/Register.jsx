import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import RegisterForm from '../../components/auth/RegisterForm';

const Register = () => {
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-page__header">
          <div className="auth-page__logo">
            <GraduationCap size={48} color="var(--color-primary)" />
          </div>
          <h1 className="auth-page__title">註冊新帳戶</h1>
          <p className="auth-page__subtitle">
            加入香港教師學生管理系統，開始您的教學之旅
          </p>
        </div>

        <RegisterForm />

        <div className="auth-page__footer">
          <p className="auth-page__signup-prompt">
            已經有帳戶了？{' '}
            <Link to="/login" className="auth-page__link">
              立即登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;