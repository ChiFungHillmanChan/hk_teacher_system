// File: src/pages/students/StudentDetail.jsx
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Edit,
  Eye,
  FileText,
  GraduationCap,
  Hash,
  Save,
  School,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../context/AuthContext';
import {
  handleApiError,
  schoolHelpers,
  studentHelpers,
  studentReportHelpers,
} from '../../services/api';
import {
  GENDER_OPTIONS,
  HK_GRADES,
  STUDENT_STATUS,
  getCurrentAcademicYear,
  getGenderChinese,
  getGradeChinese,
  getStudentStatusChinese,
  isGradeValidForSchoolType,
} from '../../utils/constants';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Student data
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Schools data for dropdown
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Student records/reports data
  const [studentRecords, setStudentRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // School change confirmation modal
  const [showSchoolChangeModal, setShowSchoolChangeModal] = useState(false);
  const [pendingSchoolChange, setPendingSchoolChange] = useState(null);

  // Load student data
  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoading(true);
        const studentData = await studentHelpers.getById(id);
        setStudent(studentData);
        setEditData(studentData);
      } catch (err) {
        console.error('Failed to load student:', err);
        setError(handleApiError(err));
        toast.error('載入學生資料失敗');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadStudent();
    }
  }, [id]);

  // Load student records/reports - using the same method as reports page
  useEffect(() => {
    const loadStudentRecords = async () => {
      if (!student?._id) {
        setStudentRecords([]);
        return;
      }

      try {
        setRecordsLoading(true);
        setRecordsError(null);

        // Use the same API method as StudentReports component
        const recordsData = await studentReportHelpers.getByStudent(student._id, {
          academicYear: getCurrentAcademicYear(),
          page: 1,
          limit: 100,
        });

        setStudentRecords(Array.isArray(recordsData) ? recordsData : []);
      } catch (error) {
        console.error('Failed to load student records:', error);
        const errorInfo = handleApiError(error);

        setStudentRecords([]);

        // Only show error toast if it's not a "not found" error
        if (errorInfo.type !== 'notfound' && !error.message?.includes('404')) {
          setRecordsError(errorInfo.message || '載入學習記錄失敗');
          toast.error(errorInfo.message || '載入學習記錄失敗');
        }
      } finally {
        setRecordsLoading(false);
      }
    };

    loadStudentRecords();
  }, [student?._id]);

  // Load schools when editing
  useEffect(() => {
    const loadSchools = async () => {
      if (!isEditing) return;

      try {
        setSchoolsLoading(true);
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      } catch (err) {
        console.error('Failed to load schools:', err);
        toast.error('載入學校列表失敗');
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [isEditing]);

  // Helper function to get Chinese name display
  const getChineseNameDisplay = student => {
    // If nameCh is set and different from name, show it
    if (student.nameCh && student.nameCh !== student.name) {
      return student.nameCh;
    }

    // If nameCh is same as name or not set, check if name contains Chinese characters
    if (student.name && /[\u4e00-\u9fff]/.test(student.name)) {
      return student.name; // Name contains Chinese, so it IS the Chinese name
    }

    // Name doesn't contain Chinese characters and no separate nameCh
    return '未設定';
  };

  // Get available grades based on school type
  const getAvailableGrades = () => {
    if (!editData.school) return HK_GRADES.ALL;

    const selectedSchool = schools.find(school => school._id === editData.school);
    if (!selectedSchool) return HK_GRADES.ALL;

    switch (selectedSchool.schoolType) {
      case 'primary':
        return HK_GRADES.PRIMARY;
      case 'secondary':
        return HK_GRADES.SECONDARY;
      case 'both':
      default:
        return HK_GRADES.ALL;
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...student });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ ...student });
  };

  const handleSchoolChange = schoolId => {
    if (schoolId !== student.school?._id) {
      setPendingSchoolChange(schoolId);
      setShowSchoolChangeModal(true);
    } else {
      setEditData({ ...editData, school: schoolId });
    }
  };

  const confirmSchoolChange = () => {
    setEditData({ ...editData, school: pendingSchoolChange });
    setShowSchoolChangeModal(false);
    setPendingSchoolChange(null);
  };

  const cancelSchoolChange = () => {
    setShowSchoolChangeModal(false);
    setPendingSchoolChange(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!editData.name?.trim()) {
        toast.error('學生姓名為必填項目');
        return;
      }

      if (editData.school && editData.grade) {
        const selectedSchool = schools.find(s => s._id === editData.school);
        if (
          selectedSchool &&
          !isGradeValidForSchoolType(editData.grade, selectedSchool.schoolType)
        ) {
          toast.error('所選年級與學校類型不符');
          return;
        }
      }

      const updatedStudent = await studentHelpers.update(student._id, editData);
      setStudent(updatedStudent);
      setIsEditing(false);
      toast.success('學生資料已更新');
    } catch (err) {
      console.error('Failed to save student:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await studentHelpers.delete(student._id);
      toast.success('學生已刪除');
      navigate('/students');
    } catch (err) {
      console.error('Failed to delete student:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  // Format date for display
  const formatDate = dateString => {
    if (!dateString) return '未設定';
    return new Date(dateString).toLocaleDateString('zh-HK');
  };

  if (loading) {
    return (
      <div className="student-detail">
        <Loading message="載入學生資料中..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-detail">
        <div className="error-container">
          <AlertTriangle size={48} />
          <h2>載入失敗</h2>
          <p>{error?.message || '找不到學生資料'}</p>
          <button onClick={() => navigate('/students')} className="btn btn--primary">
            返回學生列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="student-detail">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header__content">
            <div className="page-header__icon">
              <User size={32} />
            </div>
            <div>
              <h1 className="page-title">{student.name}</h1>
              <p className="page-subtitle">
                {student.school?.name || '未設定學校'} • {getGradeChinese(student.grade)}
                {student.class && ` ${student.class}班`}
              </p>
            </div>
          </div>

          <div className="page-header__actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn btn--primary">
                  {saving ? <Loading size="small" /> : <Save size={20} />}
                  保存
                </button>
                <button onClick={handleCancelEdit} className="btn btn--secondary">
                  <X size={20} />
                  取消
                </button>
              </>
            ) : (
              <>
                <button onClick={handleEdit} className="btn btn--primary">
                  <Edit size={20} />
                  編輯
                </button>
                <button onClick={() => setShowDeleteModal(true)} className="btn btn--danger">
                  <Trash2 size={20} />
                  刪除
                </button>
              </>
            )}
          </div>
        </div>

        {/* Student Information */}
        <div className="student-detail__content">
          <div className="student-detail__info-section">
            <h2 className="section-title">學生資訊</h2>

            <div className="student-detail__info-grid">
              {/* Basic Information */}
              <div className="student-detail__info-item">
                <label>中文姓名</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.nameCh || ''}
                    onChange={e => setEditData({ ...editData, nameCh: e.target.value })}
                    className="form-input"
                    placeholder="中文姓名"
                  />
                ) : (
                  <span>{getChineseNameDisplay(student)}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>學號</label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={editData.studentId || ''}
                      onChange={e => setEditData({ ...editData, studentId: e.target.value })}
                      className="form-input"
                      placeholder="學號"
                    />
                    <small className="form-help">
                      <Hash size={12} />
                      學號在同一學校內必須唯一
                    </small>
                  </div>
                ) : (
                  <span>
                    <Hash size={16} />
                    {student.studentId || '未設定'}
                  </span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>性別</label>
                {isEditing ? (
                  <select
                    value={editData.gender || ''}
                    onChange={e => setEditData({ ...editData, gender: e.target.value })}
                    className="form-input"
                  >
                    <option value="">選擇性別</option>
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{getGenderChinese(student.gender) || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>出生日期</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={
                      editData.dateOfBirth
                        ? new Date(editData.dateOfBirth).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => setEditData({ ...editData, dateOfBirth: e.target.value })}
                    className="form-input"
                  />
                ) : (
                  <span>
                    <Calendar size={16} />
                    {formatDate(student.dateOfBirth)}
                  </span>
                )}
              </div>

              {/* School Information */}
              <div className="student-detail__info-item">
                <label>所屬學校</label>
                {isEditing ? (
                  <div>
                    {schoolsLoading ? (
                      <Loading size="small" message="載入學校..." />
                    ) : (
                      <select
                        value={editData.school || ''}
                        onChange={e => handleSchoolChange(e.target.value)}
                        className="form-input"
                      >
                        <option value="">選擇學校</option>
                        {schools.map(school => (
                          <option key={school._id} value={school._id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <small className="form-help">
                      <AlertTriangle size={12} />
                      更改學校會影響學生的所屬關係
                    </small>
                  </div>
                ) : (
                  <span>
                    <School size={16} />
                    {student.school?.name || '未設定'}
                  </span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>年級</label>
                {isEditing ? (
                  <select
                    value={editData.grade || ''}
                    onChange={e => setEditData({ ...editData, grade: e.target.value })}
                    className="form-input"
                  >
                    <option value="">選擇年級</option>
                    {getAvailableGrades().map(grade => (
                      <option key={grade} value={grade}>
                        {getGradeChinese(grade)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>
                    <GraduationCap size={16} />
                    {getGradeChinese(student.grade)}
                  </span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>班別</label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={editData.class || ''}
                      onChange={e => setEditData({ ...editData, class: e.target.value })}
                      className="form-input"
                      placeholder="例如：A班、1A"
                    />
                    <small className="form-help">同年級同班別的學生班號不可重複</small>
                  </div>
                ) : (
                  <span>{student.class || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>班號</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.classNumber || ''}
                    onChange={e =>
                      setEditData({ ...editData, classNumber: parseInt(e.target.value) || null })
                    }
                    className="form-input"
                    placeholder="班號"
                    min="1"
                  />
                ) : (
                  <span>{student.classNumber || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>學年</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.academicYear || ''}
                    onChange={e => setEditData({ ...editData, academicYear: e.target.value })}
                    className="form-input"
                    placeholder="例如：2024/25"
                  />
                ) : (
                  <span>
                    <Calendar size={16} />
                    {student.academicYear}
                  </span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>狀態</label>
                {isEditing ? (
                  <select
                    value={editData.status || ''}
                    onChange={e => setEditData({ ...editData, status: e.target.value })}
                    className="form-input"
                  >
                    {STUDENT_STATUS.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{ color: STUDENT_STATUS.find(s => s.value === student.status)?.color }}
                  >
                    {getStudentStatusChinese(student.status)}
                  </span>
                )}
              </div>

              {/* Contact Information */}
              <div className="student-detail__info-item">
                <label>聯絡電話</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.contactPhone || ''}
                    onChange={e => setEditData({ ...editData, contactPhone: e.target.value })}
                    className="form-input"
                    placeholder="聯絡電話"
                  />
                ) : (
                  <span>{student.contactPhone || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item student-detail__info-item--full">
                <label>備註</label>
                {isEditing ? (
                  <textarea
                    value={editData.remarks || ''}
                    onChange={e => setEditData({ ...editData, remarks: e.target.value })}
                    className="form-input"
                    placeholder="其他備註資訊"
                    rows={3}
                  />
                ) : (
                  <span>{student.remarks || '無'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Student Reports Section */}
          <div className="student-detail__reports-section">
            <div className="section-header">
              <h2 className="section-title">
                <BookOpen size={24} />
                學習記錄
              </h2>
              <button
                onClick={() => navigate(`/reports/student/${student._id}/create`)}
                className="btn btn--primary btn--small"
              >
                新增記錄
              </button>
            </div>

            {recordsLoading ? (
              <div className="loading-container">
                <Loading size="small" message="載入學習記錄中..." />
              </div>
            ) : recordsError ? (
              <div className="error-state">
                <AlertTriangle size={48} />
                <h3>載入記錄失敗</h3>
                <p>{recordsError}</p>
                <button onClick={() => window.location.reload()} className="btn btn--secondary">
                  重新載入
                </button>
              </div>
            ) : studentRecords.length > 0 ? (
              <div className="reports-list">
                {studentRecords.slice(0, 5).map(record => (
                  <div key={record._id} className="report-card">
                    <div className="report-card__header">
                      <div className="report-card__title">
                        <FileText size={20} />
                        <h4>{record.subjectDetails?.topic || record.content || '課堂記錄'}</h4>
                      </div>
                      <div className="report-card__date">
                        {formatDate(record.reportDate || record.createdAt)}
                      </div>
                    </div>

                    <div className="report-card__content">
                      <p>
                        {record.content ||
                          record.subjectDetails?.learningObjectives?.[0] ||
                          '無內容'}
                      </p>
                    </div>

                    <div className="report-card__meta">
                      <span className="report-card__subject">
                        {record.subject?.name || '一般課程'}
                      </span>
                      {record.performance?.understanding?.level && (
                        <span className="report-card__performance">
                          理解程度: {record.performance.understanding.level}
                        </span>
                      )}
                    </div>

                    <div className="report-card__actions">
                      <button
                        onClick={() => navigate(`/reports/${record._id}`)}
                        className="btn btn--secondary btn--small"
                      >
                        <Eye size={16} />
                        查看詳情
                      </button>
                    </div>
                  </div>
                ))}

                {studentRecords.length > 5 && (
                  <div className="show-more">
                    <button
                      onClick={() => navigate(`/reports?student=${student._id}`)}
                      className="btn btn--primary"
                    >
                      查看全部 {studentRecords.length} 筆記錄
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <BookOpen size={48} />
                <h3>尚無學習記錄</h3>
                <p>開始為此學生建立學習記錄</p>
                <button
                  onClick={() => navigate(`/reports/student/${student._id}/create`)}
                  className="btn btn--primary"
                >
                  建立第一筆記錄
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* School Change Confirmation Modal */}
      {showSchoolChangeModal && (
        <div className="modal-overlay" onClick={cancelSchoolChange}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>確認更改學校</h3>
            </div>
            <div className="modal__body">
              <p>更改學校會影響學生的所屬關係和相關記錄。確定要繼續嗎？</p>
            </div>
            <div className="modal__footer">
              <button onClick={cancelSchoolChange} className="btn btn--secondary">
                取消
              </button>
              <button onClick={confirmSchoolChange} className="btn btn--primary">
                確認更改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h3>確認刪除學生</h3>
            </div>
            <div className="modal__body">
              <p>
                確定要刪除 <strong>{student.name}</strong> 嗎？
              </p>
              <p className="text-danger">此操作將永久刪除學生資料及相關記錄，無法復原。</p>
            </div>
            <div className="modal__footer">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn--secondary"
                disabled={deleting}
              >
                取消
              </button>
              <button onClick={handleDelete} className="btn btn--danger" disabled={deleting}>
                {deleting ? <Loading size="small" /> : <Trash2 size={16} />}
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentDetail;
