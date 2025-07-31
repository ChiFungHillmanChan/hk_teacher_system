import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Key,
  GraduationCap,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { VALIDATION_RULES, HK_DISTRICTS } from '../../utils/constants';

const RegisterForm = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(false);
  const [inviteVerified, setInviteVerified] = useState(false);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      inviteCode: '',
      teacherId: '',
      password: '',
      confirmPassword: '',
      preferredDistrict: '',
      experience: '',
      subjects: ''
    }
  });

  const password = watch('password');

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      // Debug: Log the form data
      console.log('Form data received:', data);

      // Verify invite code first if not already verified
      if (!inviteVerified) {
        await verifyInviteCode(data.inviteCode);
      }

      const registrationData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(), // Make sure this is included
        inviteCode: data.inviteCode.trim(),
        password: data.password,
      };

      // Add optional fields if provided
      if (data.teacherId) registrationData.teacherId = data.teacherId.trim();
      if (data.preferredDistrict) registrationData.preferredDistrict = data.preferredDistrict;
      if (data.experience) registrationData.experience = parseInt(data.experience);
      if (data.subjects) {
        registrationData.subjects = data.subjects.split(',').map(s => s.trim()).filter(s => s);
      }

      // Debug: Log the final registration data
      console.log('Registration data to send:', registrationData);

      const registerPromise = registerUser(registrationData);

      await toast.promise(registerPromise, {
        loading: '正在註冊...',
        success: '註冊成功！歡迎加入！',
        error: (err) => {
          console.error('Registration error details:', err);
          return err.message || '註冊失敗';
        }
      });

      // Redirect to dashboard after successful registration
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };
  // Verify invite code
  const verifyInviteCode = async (inviteCode) => {
    if (!inviteCode) {
      throw new Error('請輸入邀請碼');
    }

    // For testing purposes, allow fixed invite code
    if (inviteCode === '1234567890') {
      setInviteVerified(true);
      return;
    }

    setIsVerifyingInvite(true);
    try {
      await authService.verifyInviteCode(inviteCode);
      setInviteVerified(true);
      toast.success('邀請碼驗證成功！');
      
    } catch (error) {
      setInviteVerified(false);
      throw new Error(error.response?.data?.message || '邀請碼無效');
    } finally {
      setIsVerifyingInvite(false);
    }
  };

  const handleInviteCodeVerify = async () => {
    const inviteCode = watch('inviteCode');
    try {
      await verifyInviteCode(inviteCode);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
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
            boxShadow: 'var(--shadow-lg)'
          }
        }}
      />
      
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
        {/* Name Field */}
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            姓名 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <User size={20} className="input-icon" />
            <input
              {...register('name', {
                required: '姓名為必填項目',
                minLength: {
                  value: VALIDATION_RULES.NAME.MIN_LENGTH,
                  message: `姓名至少需要${VALIDATION_RULES.NAME.MIN_LENGTH}個字符`
                },
                maxLength: {
                  value: VALIDATION_RULES.NAME.MAX_LENGTH,
                  message: `姓名不能超過${VALIDATION_RULES.NAME.MAX_LENGTH}個字符`
                },
                pattern: {
                  value: VALIDATION_RULES.NAME.PATTERN,
                  message: '姓名只能包含中文、英文字母和空格'
                }
              })}
              id="name"
              type="text"
              placeholder="請輸入您的姓名"
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>
          {errors.name && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.name.message}
            </div>
          )}
        </div>

        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            電子郵件 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Mail size={20} className="input-icon" />
            <input
              {...register('email', {
                required: '電子郵件為必填項目',
                pattern: {
                  value: VALIDATION_RULES.EMAIL.PATTERN,
                  message: '請輸入有效的電子郵件地址'
                }
              })}
              id="email"
              type="email"
              placeholder="請輸入您的電子郵件地址"
              className={`form-input ${errors.email ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.email.message}
            </div>
          )}
        </div>

        {/* Phone Field */}
        <div className="form-group">
          <label htmlFor="phone" className="form-label">
            電話號碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Phone size={20} className="input-icon" />
            <input
              {...register('phone', {
                required: '電話號碼為必填項目',
                pattern: {
                  value: VALIDATION_RULES.PHONE.PATTERN,
                  message: '請輸入有效的電話號碼'
                }
              })}
              id="phone"
              type="tel"
              placeholder="請輸入您的電話號碼"
              className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="tel"
            />
          </div>
          {errors.phone && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.phone.message}
            </div>
          )}
        </div>

        {/* Invite Code Field */}
        <div className="form-group">
          <label htmlFor="inviteCode" className="form-label">
            邀請碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Key size={20} className="input-icon" />
            <input
              {...register('inviteCode', {
                required: '邀請碼為必填項目',
                minLength: {
                  value: 10,
                  message: '邀請碼必須為10個字符'
                },
                maxLength: {
                  value: 10,
                  message: '邀請碼必須為10個字符'
                }
              })}
              id="inviteCode"
              type="text"
              placeholder="請輸入您的邀請碼"
              className={`form-input ${errors.inviteCode ? 'form-input--error' : ''} ${inviteVerified ? 'form-input--success' : ''}`}
              disabled={isSubmitting}
              autoComplete="off"
            />
            {!inviteVerified && (
              <button
                type="button"
                onClick={handleInviteCodeVerify}
                className="btn btn--secondary btn--small btn-verify-invite"
                disabled={isVerifyingInvite || !watch('inviteCode')}
              >
                {isVerifyingInvite ? '驗證中...' : '驗證'}
              </button>
            )}
          </div>
          {errors.inviteCode && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.inviteCode.message}
            </div>
          )}
          {inviteVerified && (
            <div className="form-success">
              ✓ 邀請碼驗證成功
            </div>
          )}
          <div className="form-help">
            邀請碼由管理員提供，每個邀請碼只能使用一次
          </div>
        </div>

        {/* Teacher ID Field (Optional) */}
        <div className="form-group">
          <label htmlFor="teacherId" className="form-label">
            教師編號 <span className="form-optional">(選填)</span>
          </label>
          <div className="input-wrapper">
            <GraduationCap size={20} className="input-icon" />
            <input
              {...register('teacherId', {
                minLength: {
                  value: 3,
                  message: '教師編號至少需要3個字符'
                },
                maxLength: {
                  value: 20,
                  message: '教師編號不能超過20個字符'
                },
                pattern: {
                  value: /^[a-zA-Z0-9\-_]+$/,
                  message: '教師編號只能包含字母、數字、連字號和下劃線'
                }
              })}
              id="teacherId"
              type="text"
              placeholder="請輸入您的教師編號"
              className={`form-input ${errors.teacherId ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
          {errors.teacherId && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.teacherId.message}
            </div>
          )}
        </div>

        {/* Preferred District Field (Optional) */}
        <div className="form-group">
          <label htmlFor="preferredDistrict" className="form-label">
            偏好工作地區 <span className="form-optional">(選填)</span>
          </label>
          <div className="input-wrapper">
            <Building2 size={20} className="input-icon" />
            <select
              {...register('preferredDistrict')}
              id="preferredDistrict"
              className={`form-input ${errors.preferredDistrict ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
            >
              <option value="">請選擇偏好工作地區</option>
              {HK_DISTRICTS.map(district => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          {errors.preferredDistrict && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.preferredDistrict.message}
            </div>
          )}
        </div>

        {/* Teaching Experience Field (Optional) */}
        <div className="form-group">
          <label htmlFor="experience" className="form-label">
            教學經驗 <span className="form-optional">(選填)</span>
          </label>
          <div className="input-wrapper">
            <select
              {...register('experience')}
              id="experience"
              className={`form-input ${errors.experience ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
            >
              <option value="">請選擇教學經驗年數</option>
              <option value="0">應屆畢業生</option>
              <option value="1">1年</option>
              <option value="2">2年</option>
              <option value="3">3年</option>
              <option value="4">4年</option>
              <option value="5">5年或以上</option>
            </select>
          </div>
        </div>

        {/* Teaching Subjects Field (Optional) */}
        <div className="form-group">
          <label htmlFor="subjects" className="form-label">
            教授科目 <span className="form-optional">(選填)</span>
          </label>
          <div className="input-wrapper">
            <textarea
              {...register('subjects')}
              id="subjects"
              placeholder="請輸入您教授的科目，以逗號分隔（例如：中文, 英文, 數學）"
              className={`form-input ${errors.subjects ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              rows="3"
            />
          </div>
          {errors.subjects && (
            <div className="form-error">
              <AlertCircle size={16} />
              {errors.subjects.message}
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
                required: '密碼為必填項目',
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
              placeholder="請輸入您的密碼"
              className={`form-input ${errors.password ? 'form-input--error' : ''}`}
              disabled={isSubmitting}
              autoComplete="new-password"
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

        {/* Confirm Password Field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            確認密碼 <span className="form-required">*</span>
          </label>
          <div className="input-wrapper">
            <Lock size={20} className="input-icon" />
            <input
              {...register('confirmPassword', {
                required: '請確認您的密碼',
                validate: value => value === password || '密碼不匹配'
              })}
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="請再次輸入您的密碼"
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

        <button
          type="submit"
          className={`btn btn--primary btn--large ${isSubmitting ? 'btn--loading' : ''}`}
          disabled={isSubmitting || !inviteVerified}
        >
          {isSubmitting ? (
            <>
              <div className="btn-spinner"></div>
              註冊中...
            </>
          ) : (
            '註冊帳戶'
          )}
        </button>

        {/* Demo Credentials for Development */}
        {import.meta.env.DEV && (
          <div className="demo-credentials">
            <h4>測試邀請碼:</h4>
            <p><strong>邀請碼:</strong> 1234567890</p>
            <button
              type="button"
              onClick={() => setValue('inviteCode', '1234567890')}
              className="btn btn--secondary btn--small"
              disabled={isSubmitting}
            >
              填入測試邀請碼
            </button>
          </div>
        )}
      </form>
    </>
  );
};

export default RegisterForm;