import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Users, 
  School, 
  Calendar, 
  User, 
  Phone, 
  Mail,
  Save, 
  ArrowLeft,
  AlertCircle 
} from 'lucide-react';
import { studentHelpers, schoolHelpers, handleApiError } from '../../services/api';
import { HK_GRADES, GENDER_OPTIONS, getCurrentAcademicYear, getGradeChinese, getGenderChinese } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';


const CreateStudent = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [availableGrades, setAvailableGrades] = useState(HK_GRADES.ALL);
  const [formError, setFormError] = useState(null);
  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      nameEn: '',
      nameCh: '',
      studentId: '',
      school: '',
      academicYear: getCurrentAcademicYear(),
      grade: 'P1',
      class: '',
      classNumber: '',
      dateOfBirth: '',
      gender: '',
      'contactInfo.parentName': '',
      'contactInfo.parentPhone': '',
      'contactInfo.parentEmail': '',
      'contactInfo.address': '',
      notes: ''
    }
  });

  const selectedSchoolId = watch('school');
  const selectedGrade = watch('grade');

  // Load schools on component mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        // schoolHelpers.getAll now returns an array directly
        const schoolsData = await schoolHelpers.getAll({ limit: 100 });
        const schools = Array.isArray(schoolsData) ? schoolsData : [];
        setSchools(schools);

      } catch (error) {
        console.error('Failed to load schools:', error);
        toast.error('載入學校列表失敗');
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, [user, isAdmin, setValue]);


  // Update available grades when school selection changes
  useEffect(() => {
    if (selectedSchoolId) {
      const selectedSchool = schools.find(school => school._id === selectedSchoolId);
      if (selectedSchool) {
        switch (selectedSchool.schoolType) {
          case 'primary':
            setAvailableGrades(HK_GRADES.PRIMARY);
            if (HK_GRADES.SECONDARY.includes(selectedGrade)) {
              setValue('grade', 'P1');
            }
            break;
          case 'secondary':
            setAvailableGrades(HK_GRADES.SECONDARY);
            if (HK_GRADES.PRIMARY.includes(selectedGrade)) {
              setValue('grade', 'S1');
            }
            break;
          case 'both':
          default:
            setAvailableGrades(HK_GRADES.ALL);
            break;
        }
      }
    } else {
      setAvailableGrades(HK_GRADES.ALL);
    }
  }, [selectedSchoolId, schools, selectedGrade, setValue]);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setFormError(null); // clear old errors

      const studentData = {
        name: data.name,
        nameEn: data.nameEn || undefined,
        nameCh: data.nameCh || undefined,
        studentId: data.studentId || undefined,
        school: data.school,
        academicYear: data.academicYear?.trim(),
        grade: data.grade,
        class: data.class || undefined,
        classNumber: data.classNumber ? parseInt(data.classNumber) : undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        contactInfo: {
          parentName: data['contactInfo.parentName'] || undefined,
          parentPhone: data['contactInfo.parentPhone'] || undefined,
          parentEmail: data['contactInfo.parentEmail'] || undefined,
          address: data['contactInfo.address'] || undefined
        },
        notes: data.notes || undefined,
        createdBy: user?._id
      };

      Object.keys(studentData.contactInfo).forEach(key => {
        if (studentData.contactInfo[key] === undefined) {
          delete studentData.contactInfo[key];
        }
      });

      const createPromise = studentHelpers.create(studentData);

      console.log('studentData payload', studentData);

      await toast.promise(createPromise, {
        loading: '正在新增學生...',
        success: '學生新增成功！',
        error: '新增失敗，請查看下方錯誤'
      });

      navigate('/students');

    } catch (error) {
      console.error('Failed to create student:', error);
      setFormError(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      
      <div className="create-student-page">
        <div className="page-header">
          <div className="page-header__content">
            <div className="page-header__icon">
              <Users size={32} />
            </div>
            <div>
              <h1 className="page-title">新增學生</h1>
              <p className="page-subtitle">
                在系統中註冊一名新學生，並設定基本資料
              </p>
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
          <form onSubmit={handleSubmit(onSubmit)} className="create-student-form">
            {/* Basic Information */}
            <div className="form-section">
              <h2 className="form-section-title">基本資料</h2>
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  <User size={16} />
                  中文姓名 <span className="form-required">*</span>
                </label>
                <input
                  {...register('name', {
                    required: '學生姓名為必填項目',
                    minLength: {
                      value: 2,
                      message: '姓名至少需要2個字符'
                    },
                    maxLength: {
                      value: 50,
                      message: '姓名不能超過50個字符'
                    }
                  })}
                  id="name"
                  type="text"
                  placeholder="請輸入學生的正式姓名"
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nameEn" className="form-label">
                    英文姓名
                  </label>
                  <input
                    {...register('nameEn', {
                      maxLength: {
                        value: 50,
                        message: '英文姓名不能超過50個字符'
                      }
                    })}
                    id="nameEn"
                    type="text"
                    placeholder="請輸入英文姓名（可選）"
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="studentId" className="form-label">
                    學生編號
                  </label>
                  <input
                    {...register('studentId', {
                      validate: (value) => {
                        if (!value) return true; // Optional, skip validation if empty
                        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
                          return '學生編號只能包含字母、數字、連字號和底線';
                        }
                        if (value.length < 3 || value.length > 20) {
                          return '學生編號必須介於3至20個字符之間';
                        }
                        return true;
                      }
                    })}
                    id="studentId"
                    type="text"
                    placeholder="請輸入學生編號（可選）"
                    className={`form-input ${errors.studentId ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.studentId && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.studentId.message}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="gender" className="form-label">
                    性別
                  </label>
                  <select
                    {...register('gender')}
                    id="gender"
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    <option value="">請選擇性別（可選）</option>
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {getGenderChinese(option.value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth" className="form-label">
                  <Calendar size={16} />
                  出生日期
                </label>
                <input
                  {...register('dateOfBirth', {
                    validate: (value) => {
                      if (!value) return true; // Optional field
                      const birthDate = new Date(value);
                      const today = new Date();
                      const age = today.getFullYear() - birthDate.getFullYear();
                      
                      if (age < 3) return '年齡必須至少3歲';
                      if (age > 25) return '年齡不能超過25歲';
                      return true;
                    }
                  })}
                  id="dateOfBirth"
                  type="date"
                  className={`form-input ${errors.dateOfBirth ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.dateOfBirth && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.dateOfBirth.message}
                  </div>
                )}
              </div>
            </div>

            {/* Academic Information */}
            <div className="form-section">
              <h2 className="form-section-title">學術資料</h2>
              
              <div className="form-group">
                <label htmlFor="school" className="form-label">
                  <School size={16} />
                  所屬學校 <span className="form-required">*</span>
                </label>
                <select
                  {...register('school', {
                    required: '請選擇所屬學校'
                  })}
                  id="school"
                  className={`form-input ${errors.school ? 'form-input--error' : ''}`}
                  disabled={isSubmitting || loadingSchools}
                >
                  <option value="">
                    {loadingSchools ? '載入學校中...' : '請選擇學校'}
                  </option>
                  {schools.map(school => (
                    <option key={school._id} value={school._id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                {errors.school && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.school.message}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="academicYear" className="form-label">
                    學年 <span className="form-required">*</span>
                  </label>
                  <input
                    {...register('academicYear', {
                      required: '學年為必填項目',
                      pattern: {
                        value: /^\d{4}\/\d{2}$/,
                        message: '學年格式必須為 YYYY/YY（例如：2025/26）'
                      }
                    })}
                    id="academicYear"
                    type="text"
                    placeholder="2025/26"
                    className={`form-input ${errors.academicYear ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.academicYear && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.academicYear.message}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="grade" className="form-label">
                    年級 <span className="form-required">*</span>
                  </label>
                  <select
                    {...register('grade', {
                      required: '請選擇年級'
                    })}
                    id="grade"
                    className={`form-input ${errors.grade ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">請選擇年級</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade}>
                        {getGradeChinese(grade)}
                      </option>
                    ))}
                  </select>
                  {errors.grade && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.grade.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="class" className="form-label">
                    班別
                  </label>
                  <input
                    {...register('class', {
                      maxLength: {
                        value: 10,
                        message: '班別不能超過10個字符'
                      }
                    })}
                    id="class"
                    type="text"
                    placeholder="例如：甲、乙、A、B（可選）"
                    className={`form-input ${errors.class ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.class && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.class.message}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="classNumber" className="form-label">
                    學號
                  </label>
                  <input
                    {...register('classNumber', {
                      min: {
                        value: 1,
                        message: '學號必須至少為1'
                      },
                      max: {
                        value: 50,
                        message: '學號不能超過50'
                      }
                    })}
                    id="classNumber"
                    type="number"
                    placeholder="1-50（可選）"
                    className={`form-input ${errors.classNumber ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                    min="1"
                    max="50"
                  />
                  {errors.classNumber && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.classNumber.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  borderRadius: '6px'
                }}
              >
                <AlertCircle size={18} />
                {typeof formError === 'string' ? formError : formError.message || '未知錯誤'}
              </div>
            )}


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
                      正在添加學生資料...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      添加學生資料
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

export default CreateStudent;