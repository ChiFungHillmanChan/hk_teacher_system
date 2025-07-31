// File: src/pages/students/StudentDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  School,
  GraduationCap,
  Calendar,
  Hash,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentHelpers, schoolHelpers, handleApiError } from '../../services/api';
import { 
  HK_GRADES,
  GENDER_OPTIONS,
  STUDENT_STATUS,
  getGradeChinese,
  getGenderChinese,
  getStudentStatusChinese,
  getCurrentAcademicYear,
  isGradeValidForSchoolType
} from '../../utils/constants';
import Loading from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

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

  // Get available grades based on selected school
  const getAvailableGrades = () => {
    if (!editData.school) return HK_GRADES.ALL;
    
    const selectedSchool = schools.find(s => s._id === editData.school);
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

  // Handle school change
  const handleSchoolChange = (newSchoolId) => {
    const newSchool = schools.find(s => s._id === newSchoolId);
    const oldSchool = student.school;
    
    if (newSchoolId !== oldSchool._id) {
      setPendingSchoolChange({ newSchool, oldSchool });
      setShowSchoolChangeModal(true);
    } else {
      setEditData({ ...editData, school: newSchoolId });
    }
  };

  const confirmSchoolChange = () => {
    setEditData({ ...editData, school: pendingSchoolChange.newSchool._id });
    
    // Check if current grade is valid for new school type
    const availableGrades = getAvailableGrades();
    if (!availableGrades.includes(editData.grade)) {
      // Reset grade if invalid for new school type
      if (pendingSchoolChange.newSchool.schoolType === 'primary') {
        setEditData(prev => ({ ...prev, school: pendingSchoolChange.newSchool._id, grade: 'P1' }));
      } else if (pendingSchoolChange.newSchool.schoolType === 'secondary') {
        setEditData(prev => ({ ...prev, school: pendingSchoolChange.newSchool._id, grade: 'S1' }));
      }
    }
    
    setShowSchoolChangeModal(false);
    setPendingSchoolChange(null);
  };

  // Validate student data
  const validateStudentData = () => {
    const errors = [];
    
    if (!editData.name || !editData.name.trim()) {
      errors.push('學生姓名為必填');
    }
    
    if (!editData.school) {
      errors.push('必須選擇學校');
    }
    
    if (!editData.grade) {
      errors.push('必須選擇年級');
    }
    
    if (!editData.academicYear) {
      errors.push('必須選擇學年');
    }
    
    // Check for duplicate student ID in the same school
    if (editData.studentId && editData.studentId.trim()) {
      // This would require an API call to check, for now we'll show a warning in the UI
    }
    
    return errors;
  };

  // Handle edit
  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ 
      ...student,
      school: student.school._id || student.school
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ ...student });
  };

  const handleSave = async () => {
    const errors = validateStudentData();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    
    try {
      setSaving(true);
      const updatedStudent = await studentHelpers.update(id, editData);
      setStudent(updatedStudent);
      setIsEditing(false);
      toast.success('學生資料已更新');
    } catch (err) {
      console.error('Failed to update student:', err);
      const errorInfo = handleApiError(err);
      
      // Handle specific validation errors
      if (errorInfo.message?.includes('duplicate') || errorInfo.message?.includes('重複')) {
        toast.error('學號已存在，請使用不同的學號');
      } else {
        toast.error(errorInfo.message || '更新失敗');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await studentHelpers.delete(id);
      toast.success('學生資料已刪除');
      navigate('/students');
    } catch (err) {
      console.error('Failed to delete student:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '刪除失敗');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <Loading message="載入學生資料中..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>載入失敗</h2>
          <p>{error.message}</p>
          <button onClick={() => navigate('/students')} className="btn btn--primary">
            返回學生列表
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>找不到學生</h2>
          <p>請檢查網址是否正確</p>
          <button onClick={() => navigate('/students')} className="btn btn--primary">
            返回學生列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-detail">
      {/* Header */}
      <div className="student-detail__header">
        <div className="student-detail__header-content">
          <div className="student-detail__title-section">
            <div className="student-detail__avatar">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="student-detail__title">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="form-input"
                    placeholder="學生姓名"
                  />
                ) : (
                  student.name
                )}
              </h1>
              <p className="student-detail__subtitle">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.nameEn || ''}
                    onChange={(e) => setEditData({ ...editData, nameEn: e.target.value })}
                    className="form-input"
                    placeholder="英文姓名"
                  />
                ) : (
                  student.nameEn || '未設定英文姓名'
                )}
              </p>
            </div>
          </div>
          
          <div className="student-detail__actions">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn--primary"
                >
                  {saving ? <Loading size="small" /> : <Save size={20} />}
                  保存
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn--secondary"
                >
                  <X size={20} />
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="btn btn--primary"
                >
                  <Edit size={20} />
                  編輯
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn--danger"
                >
                  <Trash2 size={20} />
                  刪除
                </button>
              </>
            )}
          </div>
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
                  onChange={(e) => setEditData({ ...editData, nameCh: e.target.value })}
                  className="form-input"
                  placeholder="中文姓名"
                />
              ) : (
                <span>{student.nameCh || '未設定'}</span>
              )}
            </div>

            <div className="student-detail__info-item">
              <label>學號</label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={editData.studentId || ''}
                    onChange={(e) => setEditData({ ...editData, studentId: e.target.value })}
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
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
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
                  value={editData.dateOfBirth ? new Date(editData.dateOfBirth).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                  className="form-input"
                />
              ) : (
                <span>
                  <Calendar size={16} />
                  {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('zh-HK') : '未設定'}
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
                      onChange={(e) => handleSchoolChange(e.target.value)}
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
                  onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
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
                    onChange={(e) => setEditData({ ...editData, class: e.target.value })}
                    className="form-input"
                    placeholder="例如：A班、1A"
                  />
                  <small className="form-help">
                    同年級同班別的學生班號不可重複
                  </small>
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
                  onChange={(e) => setEditData({ ...editData, classNumber: parseInt(e.target.value) || null })}
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
                  onChange={(e) => setEditData({ ...editData, academicYear: e.target.value })}
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
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="form-input"
                >
                  {STUDENT_STATUS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ color: STUDENT_STATUS.find(s => s.value === student.status)?.color }}>
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
                  onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
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
                  onChange={(e) => setEditData({ ...editData, remarks: e.target.value })}
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
        </div>
      </div>

      {/* School Change Confirmation Modal */}
      {showSchoolChangeModal && pendingSchoolChange && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--warning">
            <div className="modal-header">
              <AlertTriangle size={24} />
              <h3>確認轉校</h3>
            </div>
            <div className="modal-body">
              <p>
                學生 <strong>「{student.name}」</strong> 即將從 
                <strong>「{pendingSchoolChange.oldSchool.name}」</strong> 
                轉至 <strong>「{pendingSchoolChange.newSchool.name}」</strong>
              </p>
              <div className="warning-box">
                <AlertTriangle size={20} />
                <div>
                  <strong>注意：</strong>
                  <p>學生將不再屬於原學校，所有相關記錄會保持但學校歸屬將會改變。</p>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowSchoolChangeModal(false);
                  setPendingSchoolChange(null);
                }}
                className="btn btn--secondary"
              >
                取消
              </button>
              <button
                onClick={confirmSchoolChange}
                className="btn btn--warning"
              >
                確認轉校
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--danger">
            <div className="modal-header">
              <AlertTriangle size={24} />
              <h3>確認刪除學生</h3>
            </div>
            <div className="modal-body">
              <p>
                您確定要刪除學生 <strong>「{student.name}」</strong> 的所有資料嗎？
              </p>
              <div className="warning-box">
                <AlertTriangle size={20} />
                <div>
                  <strong>警告：此操作無法復原！</strong>
                  <p>刪除學生將會同時刪除所有相關的學習記錄和報告。</p>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn--secondary"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="btn btn--danger"
                disabled={deleting}
              >
                {deleting ? <Loading size="small" /> : <Trash2 size={16} />}
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;