import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Save,
  Target,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { handleApiError, studentHelpers, studentReportHelpers } from '../../services/api';
import { getGradeChinese } from '../../utils/constants';

const CreateStudentRecord = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      subject: '一般課程',
      topic: '',
      duration: 60,
      content: '',
      attendanceStatus: 'present',
      participationLevel: 'good',
      understandingLevel: 'good',
      teacherComments: '',
      strengths: '',
      areasForImprovement: '',
      recommendations: '',
      homeworkDescription: '',
      homeworkDueDate: '',
    },
  });

  // Load student data
  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoading(true);
        const studentData = await studentHelpers.getById(studentId);
        setStudent(studentData);
      } catch (error) {
        console.error('Failed to load student:', error);
        const errorInfo = handleApiError(error);
        toast.error(errorInfo.message || '載入學生資料失敗');
        navigate('/reports');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadStudent();
    }
  }, [studentId, navigate]);

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear}/${nextYear.toString().slice(-2)}`;
  };

  const mapPerformanceRating = (rating, fieldType) => {
    console.log(`🔍 Mapping ${rating} for ${fieldType}`); // Debug log

    const mappings = {
      participation: {
        excellent: 'excellent',
        good: 'good',
        fair: 'fair',
        poor: 'poor',
      },
      understanding: {
        excellent: 'excellent',
        good: 'good',
        fair: 'satisfactory',
        poor: 'needs_improvement',
      },
      conduct: {
        excellent: 'excellent',
        good: 'good',
        fair: 'satisfactory',
        poor: 'needs_improvement',
      },
    };

    const result = mappings[fieldType]?.[rating] || rating;
    console.log(`✅ Mapped to: ${result}`); // Debug log
    return result;
  };

  const onSubmit = async data => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      // Validate user authentication
      if (!user) {
        throw new Error('用戶信息無效，請重新登錄');
      }

      // Get user ID - handle both 'id' and '_id' formats
      const userId = user._id || user.id;

      if (!userId) {
        throw new Error('用戶ID缺失，請重新登錄');
      }

      // Validate student and school data
      if (!student || !student.school) {
        throw new Error('學生信息無效，請重新載入頁面');
      }

      // Prepare student report data with all fields
      const reportData = {
        student: studentId,
        school: student.school._id || student.school,
        academicYear: getCurrentAcademicYear(),
        reportDate: new Date(data.date).toISOString(),
        term: 'continuous',

        subject: {
          name: data.subject?.trim() || '一般課程',
          teacher: userId,
        },

        subjectDetails: {
          topic: data.topic.trim(),
          duration: parseInt(data.duration) || 60,
          learningObjectives: data.content ? [data.content.trim()] : [],
          materials: [],
          activities: [],
        },

        // Content field (separate from subjectDetails)
        content: data.content?.trim() || '',

        performance: {
          attendance: {
            status: 'present',
            punctuality: 'good',
          },
          participation: {
            level: mapPerformanceRating(data.performanceRating, 'participation'),
            engagement: 'active',
            ...(data.performanceNotes?.trim() && { contribution: data.performanceNotes.trim() }),
          },
          understanding: {
            level: mapPerformanceRating(data.performanceRating, 'understanding'),
            ...(data.performanceNotes?.trim() && {
              comprehension_notes: data.performanceNotes.trim(),
            }),
          },
          assessment: {
            type: 'observation',
            ...(data.performanceNotes?.trim() && { feedback: data.performanceNotes.trim() }),
          },
        },

        behavior: {
          conduct: mapPerformanceRating(data.performanceRating, 'conduct'),
          cooperation: 'satisfactory',
          respect: 'satisfactory',
          following_instructions: 'satisfactory',
          ...(data.performanceNotes?.trim() && { notes: data.performanceNotes.trim() }),
        },

        remarks: {
          teacher_comments: data.teacherComments?.trim() || '',
          strengths: data.strengths
            ? data.strengths
                .split(',')
                .map(s => s.trim())
                .filter(s => s)
            : [],
          areas_for_improvement: data.areasForImprovement
            ? data.areasForImprovement
                .split(',')
                .map(s => s.trim())
                .filter(s => s)
            : [],
          recommendations: data.recommendations
            ? data.recommendations
                .split(',')
                .map(s => s.trim())
                .filter(s => s)
            : [],
          follow_up_required: false,
        },

        tags: [],
        isPrivate: false,
        status: 'submitted',
      };

      // Add homework if provided
      if (data.homeworkDescription?.trim()) {
        reportData.homework = {
          details: {
            description: data.homeworkDescription.trim(),
            ...(data.homeworkDueDate && { due_date: new Date(data.homeworkDueDate).toISOString() }),
            estimated_duration: 30,
          },
          completion: {
            status: 'pending',
          },
        };
      }

      // Final validation
      if (!reportData.subject.teacher) {
        throw new Error('教師信息缺失，請重新登錄');
      }

      if (!reportData.student) {
        throw new Error('學生信息缺失，請檢查學生ID');
      }

      // Create the report
      const createPromise = studentReportHelpers.create(reportData);

      await toast.promise(createPromise, {
        loading: '正在新增課堂記錄...',
        success: '課堂記錄已成功建立！',
        error: '建立失敗，請查看下方錯誤',
      });

      navigate('/reports');
    } catch (error) {
      console.error('Failed to create student record:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '建立記錄失敗，請再試一次');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-record-page">
        <div className="loading-container">
          <div className="loading-spinner loading-spinner--large"></div>
          <p className="loading-message">載入學生資料中...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="create-record-page">
        <div className="error-container">
          <AlertCircle size={48} />
          <h2>找不到學生資料</h2>
          <p>請檢查學生ID是否正確，或返回重新選擇。</p>
          <button onClick={() => navigate('/reports')} className="btn btn--primary">
            返回報告頁面
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="create-record-page">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header__content">
            <div className="page-header__icon">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="page-title">建立課堂記錄</h1>
              <p className="page-subtitle">為 {student.name} 建立新的課堂記錄</p>
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

        {/* Student Info Card */}
        <div className="student-info-card">
          <div className="student-info-card__avatar">
            <User size={24} />
          </div>
          <div className="student-info-card__details">
            <h3 className="student-info-card__name">{student.name}</h3>
            <div className="student-info-card__meta">
              <span>學生編號：{student.studentId || '未設定學生編號\n'}</span>
              <span>
                年級：{getGradeChinese(student.grade)}
                {student.class && ` ${student.class}班`}
              </span>
              <span>學年：{getCurrentAcademicYear()}</span>
            </div>
          </div>
        </div>

        {/* Record Form */}
        <div className="form-container">
          <form onSubmit={handleSubmit(onSubmit)} className="create-record-form">
            {/* Basic Information */}
            <div className="form-section">
              <h2 className="form-section-title">基本資料</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date" className="form-label">
                    <Calendar size={16} />
                    日期 <span className="form-required">*</span>
                  </label>
                  <input
                    {...register('date', {
                      required: '日期為必填項目',
                    })}
                    id="date"
                    type="date"
                    className={`form-input ${errors.date ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.date && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.date.message}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="subject" className="form-label">
                    <BookOpen size={16} />
                    科目
                  </label>
                  <input
                    {...register('subject', {
                      maxLength: {
                        value: 100,
                        message: '科目名稱不能超過100個字符',
                      },
                    })}
                    id="subject"
                    type="text"
                    placeholder="例如：數學、中文、英文"
                    className={`form-input ${errors.subject ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.subject && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.subject.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="topic" className="form-label">
                    <Target size={16} />
                    課題 <span className="form-required">*</span>
                  </label>
                  <input
                    {...register('topic', {
                      required: '課題為必填項目',
                      maxLength: {
                        value: 200,
                        message: '課題不能超過200個字符',
                      },
                    })}
                    id="topic"
                    type="text"
                    placeholder="例如：分數運算、閱讀理解、單詞記憶"
                    className={`form-input ${errors.topic ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.topic && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.topic.message}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="duration" className="form-label">
                    <Clock size={16} />
                    課時（分鐘）
                  </label>
                  <input
                    {...register('duration', {
                      min: {
                        value: 1,
                        message: '課時必須至少1分鐘',
                      },
                      max: {
                        value: 300,
                        message: '課時不能超過300分鐘',
                      },
                    })}
                    id="duration"
                    type="number"
                    min="1"
                    max="300"
                    placeholder="60"
                    className={`form-input ${errors.duration ? 'form-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.duration && (
                    <div className="form-error">
                      <AlertCircle size={16} />
                      {errors.duration.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="content" className="form-label">
                  <FileText size={16} />
                  課堂內容
                </label>
                <textarea
                  {...register('content', {
                    maxLength: {
                      value: 1000,
                      message: '課堂內容不能超過1000個字符',
                    },
                  })}
                  id="content"
                  rows="4"
                  placeholder="請詳細描述今日的課堂內容、教學重點和學習目標..."
                  className={`form-input ${errors.content ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.content && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.content.message}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Assessment */}
            <div className="form-section">
              <h2 className="form-section-title">學習表現</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="attendanceStatus" className="form-label">
                    <Users size={16} />
                    出勤狀況
                  </label>
                  <select
                    {...register('attendanceStatus')}
                    id="attendanceStatus"
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    <option value="present">出席</option>
                    <option value="absent">缺席</option>
                    <option value="late">遲到</option>
                    <option value="early_leave">早退</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="participationLevel" className="form-label">
                    <Users size={16} />
                    參與程度
                  </label>
                  <select
                    {...register('participationLevel')}
                    id="participationLevel"
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    <option value="excellent">優秀</option>
                    <option value="good">良好</option>
                    <option value="fair">一般</option>
                    <option value="poor">較差</option>
                    <option value="not_applicable">不適用</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="understandingLevel" className="form-label">
                    <CheckCircle size={16} />
                    理解程度
                  </label>
                  <select
                    {...register('understandingLevel')}
                    id="understandingLevel"
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    <option value="excellent">優秀</option>
                    <option value="good">良好</option>
                    <option value="satisfactory">滿意</option>
                    <option value="needs_improvement">需要改進</option>
                    <option value="poor">較差</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Detailed Remarks */}
            <div className="form-section">
              <h2 className="form-section-title">詳細備註</h2>

              <div className="form-group">
                <label htmlFor="teacherComments" className="form-label">
                  <MessageSquare size={16} />
                  教師評語
                </label>
                <textarea
                  {...register('teacherComments', {
                    maxLength: {
                      value: 1000,
                      message: '教師評語不能超過1000個字符',
                    },
                  })}
                  id="teacherComments"
                  rows="3"
                  placeholder="請輸入對學生今日表現的評語..."
                  className={`form-input ${errors.teacherComments ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.teacherComments && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.teacherComments.message}
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="strengths" className="form-label">
                    優點
                  </label>
                  <input
                    {...register('strengths')}
                    id="strengths"
                    type="text"
                    placeholder="例如：專注力強, 積極發問 (用逗號分隔)"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                  <div className="form-help">多個優點請用逗號分隔</div>
                </div>

                <div className="form-group">
                  <label htmlFor="areasForImprovement" className="form-label">
                    改進方向
                  </label>
                  <input
                    {...register('areasForImprovement')}
                    id="areasForImprovement"
                    type="text"
                    placeholder="例如：需要更多練習, 提高專注力 (用逗號分隔)"
                    className="form-input"
                    disabled={isSubmitting}
                  />
                  <div className="form-help">多個改進方向請用逗號分隔</div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recommendations" className="form-label">
                  建議
                </label>
                <input
                  {...register('recommendations')}
                  id="recommendations"
                  type="text"
                  placeholder="例如：增加閱讀練習, 複習今日內容 (用逗號分隔)"
                  className="form-input"
                  disabled={isSubmitting}
                />
                <div className="form-help">多個建議請用逗號分隔</div>
              </div>
            </div>

            {/* Homework (Optional) */}
            <div className="form-section">
              <h2 className="form-section-title">功課安排（可選）</h2>

              <div className="form-group">
                <label htmlFor="homeworkDescription" className="form-label">
                  功課描述
                </label>
                <textarea
                  {...register('homeworkDescription', {
                    maxLength: {
                      value: 500,
                      message: '功課描述不能超過500個字符',
                    },
                  })}
                  id="homeworkDescription"
                  rows="3"
                  placeholder="請描述今日安排的功課內容..."
                  className={`form-input ${errors.homeworkDescription ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.homeworkDescription && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.homeworkDescription.message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="homeworkDueDate" className="form-label">
                  功課截止日期
                </label>
                <input
                  {...register('homeworkDueDate')}
                  id="homeworkDueDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className={`form-input ${errors.homeworkDueDate ? 'form-input--error' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.homeworkDueDate && (
                  <div className="form-error">
                    <AlertCircle size={16} />
                    {errors.homeworkDueDate.message}
                  </div>
                )}
                <div className="form-help">如有功課安排，請設定截止日期</div>
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
                  borderRadius: '6px',
                }}
              >
                <AlertCircle size={18} />
                {typeof formError === 'string' ? formError : formError.message || '未知錯誤'}
              </div>
            )}

            {/* Submit Actions */}
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
                    正在儲存記錄...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    儲存記錄
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

export default CreateStudentRecord;
