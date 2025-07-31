import {
  AlertCircle,
  ArrowLeft,
  Building,
  Mail,
  MapPin,
  Phone,
  Save,
  School,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { handleApiError, schoolHelpers } from '../../services/api';
import { HK_DISTRICTS, SCHOOL_TYPES } from '../../utils/constants';

const CreateSchool = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // Check authorization
  useEffect(() => {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      toast.error('請先登入');
      navigate('/login');
    }
  }, [user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      nameEn: '',
      schoolType: 'primary',
      district: '',
      address: '',
      contactPerson: '',
      email: '',
      phone: '',
      description: '',
    },
  });

  const onSubmit = async data => {
    try {
      setIsSubmitting(true);
      setFormError(null); // Clear old errors

      const schoolData = {
        ...data,
        createdBy: user?._id,
      };

      const createPromise = schoolHelpers.create(schoolData);

      await toast.promise(createPromise, {
        loading: '正在建立學校...',
        success: '學校建立成功！',
        error: '建立失敗，請查看下方錯誤',
      });

      // Navigate back to schools list or dashboard
      navigate('/schools');
    } catch (error) {
      console.error('Failed to create school:', error);
      setFormError(handleApiError(error)); // Set form error instead of relying on toast only
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="create-school-page">
        <div className="page-header">
          <div className="page-header__content">
            <div className="page-header__icon">
              <School size={32} />
            </div>
            <div>
              <h1 className="page-title">建立新學校</h1>
              <p className="page-subtitle">在系統中註冊一所新的學校，並設定基本資訊</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn--secondary"
            disabled={isSubmitting}
          >
            <ArrowLeft size={20} />
            返回
          </button>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit(onSubmit)} className="create-school-form">
            {/* 1. 基本資料 (Basic Information) */}
            <div className="form-section">
              <h2 className="form-section-title">基本資料</h2>

              {/* 學校名稱 (Required) */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <Building size={16} />
                  學校名稱 <span className="form-required">*</span>
                </label>
                <input
                  {...register('name', {
                    required: '學校名稱為必填項目',
                    minLength: {
                      value: 3,
                      message: '學校名稱至少需要3個字符',
                    },
                    maxLength: {
                      value: 100,
                      message: '學校名稱不能超過100個字符',
                    },
                  })}
                  id="name"
                  type="text"
                  placeholder="請輸入學校的正式名稱"
                  className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.name.message}
                  </div>
                )}
              </div>

              {/* 英文名稱 (Optional) */}
              <div className="form-group">
                <label htmlFor="nameEn" className="form-label">
                  英文名稱 (optional)
                </label>
                <input
                  {...register('nameEn', {
                    maxLength: {
                      value: 100,
                      message: '英文名稱不能超過100個字符',
                    },
                    pattern: {
                      value: /^[A-Za-z0-9\s\-().]*$/, // only allows A-Z, a-z, 0-9, space, -, (, ), .
                      message: '英文名稱只可包含英文字母、數字、空格、括號、句號及連字符',
                    },
                  })}
                  id="nameEn"
                  type="text"
                  placeholder="請輸入英文名稱（可選）"
                  className={`form-input ${errors.nameEn ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.nameEn && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.nameEn.message}
                  </div>
                )}
              </div>

              <div className="form-row">
                {/* 學校類型 (Required) */}
                <div className="form-group">
                  <label htmlFor="schoolType" className="form-label">
                    學校類型 <span className="form-required">*</span>
                  </label>
                  <select
                    {...register('schoolType', {
                      required: '請選擇學校類型',
                    })}
                    id="schoolType"
                    className={`form-input ${errors.schoolType ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">請選擇學校類型</option>
                    {SCHOOL_TYPES.map(schoolType => (
                      <option key={schoolType.value} value={schoolType.value}>
                        {schoolType.label}
                      </option>
                    ))}
                  </select>
                  {errors.schoolType && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.schoolType.message}
                    </div>
                  )}
                </div>

                {/* 所屬地區 (Optional) */}
                <div className="form-group">
                  <label htmlFor="district" className="form-label">
                    所屬地區 (optional)
                  </label>
                  <select
                    {...register('district')}
                    id="district"
                    className={`form-input ${errors.district ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">請選擇地區（可選）</option>
                    {HK_DISTRICTS.map(district => (
                      <option key={district.value} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. 位置資訊 (Location Information) */}
            <div className="form-section">
              <h2 className="form-section-title">位置資訊</h2>

              {/* 學校地址 (Optional) */}
              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  <MapPin size={16} />
                  學校地址 (optional)
                </label>
                <textarea
                  {...register('address', {
                    maxLength: {
                      value: 500,
                      message: '地址不能超過500個字符',
                    },
                  })}
                  id="address"
                  rows="3"
                  placeholder="請輸入學校的完整地址（可選）"
                  className={`form-input ${errors.address ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.address && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.address.message}
                  </div>
                )}
              </div>
            </div>

            {/* 3. 聯絡資訊 (Contact Information) */}
            <div className="form-section">
              <h2 className="form-section-title">聯絡資訊</h2>

              {/* 聯絡人 (Optional) */}
              <div className="form-group">
                <label htmlFor="contactPerson" className="form-label">
                  <User size={16} />
                  聯絡人 (optional)
                </label>
                <input
                  {...register('contactPerson', {
                    maxLength: {
                      value: 100,
                      message: '聯絡人姓名不能超過100個字符',
                    },
                  })}
                  id="contactPerson"
                  type="text"
                  placeholder="請輸入主要聯絡人姓名（可選）"
                  className={`form-input ${errors.contactPerson ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.contactPerson && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.contactPerson.message}
                  </div>
                )}
              </div>

              <div className="form-row">
                {/* 電郵地址 (Optional) */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <Mail size={16} />
                    電郵地址 (optional)
                  </label>
                  <input
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: '請輸入有效的電郵地址',
                      },
                      maxLength: {
                        value: 100,
                        message: '電郵地址不能超過100個字符',
                      },
                    })}
                    id="email"
                    type="email"
                    placeholder="請輸入聯絡電郵（可選）"
                    className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.email.message}
                    </div>
                  )}
                </div>

                {/* 電話 (Optional) */}
                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    <Phone size={16} />
                    電話 (optional)
                  </label>
                  <input
                    {...register('phone', {
                      pattern: {
                        value: /^[+]?[\d\s\-()]{8,20}$/,
                        message: '請輸入有效的電話號碼',
                      },
                      maxLength: {
                        value: 20,
                        message: '電話號碼不能超過20個字符',
                      },
                    })}
                    id="phone"
                    type="tel"
                    placeholder="請輸入聯絡電話（可選）"
                    className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.phone.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. 其他資訊 (Other Information) */}
            <div className="form-section">
              <h2 className="form-section-title">其他資訊</h2>

              {/* 學校簡介 (Optional) */}
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  學校簡介 (optional)
                </label>
                <textarea
                  {...register('description', {
                    maxLength: {
                      value: 1000,
                      message: '學校簡介不能超過1000個字符',
                    },
                  })}
                  id="description"
                  rows="4"
                  placeholder="請輸入學校的簡介或特色（可選）"
                  className={`form-input ${errors.description ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.description.message}
                  </div>
                )}
                <div className="form-help">
                  您可以在此描述學校的辦學理念、特色課程或其他重要資訊。
                </div>
              </div>
            </div>

            {/* Added form error display */}
            {formError && (
              <div
                style={{
                  margin: '1rem 0',
                  padding: '0.75rem',
                  border: '1px solid #f5c2c7',
                  background: '#f8d7da',
                  color: '#842029',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '6px',
                }}
              >
                <AlertCircle size={18} />
                {typeof formError === 'string' ? formError : formError.message || '未知錯誤'}
              </div>
            )}

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                取消
              </button>

              <button
                type="submit"
                className={`btn btn--primary ${isSubmitting ? 'btn--loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="btn-spinner"></div>
                    正在建立學校...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    建立學校
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateSchool;
