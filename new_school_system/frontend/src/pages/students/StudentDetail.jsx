// File: src/pages/students/StudentDetail.jsx - Condensed version
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
  Edit,
  Eye,
  FileText,
  GraduationCap,
  Hash,
  MapPin,
  Plus,
  Save,
  School,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../context/AuthContext';

import {
  handleApiError,
  meetingRecordHelpers,
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

  // Student records/reports data (legacy)
  const [studentRecords, setStudentRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  // Tab state for enhanced records view
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedYear, setSelectedYear] = useState('2025/26');

  // Data for different tabs
  const [reports, setReports] = useState([]);
  const [regularMeetings, setRegularMeetings] = useState([]);
  const [iepMeetings, setIepMeetings] = useState([]);

  const [reportsLoading, setReportsLoading] = useState(false);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  // Available academic years
  const academicYears = ['2024/25', '2025/26', '2026/27', '2027/28'];

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const translatePerformanceLevel = level => {
    const translations = {
      excellent: '優秀',
      good: '良好',
      satisfactory: '一般',
      fair: '一般',
      average: '一般',
      needs_improvement: '需改進',
      poor: '差',
    };
    return translations[level] || level;
  };

  // Permission check functions
  const canDeleteStudent = () => {
    if (user?.role === 'admin') return true;
    
    return student.teachers?.some(teacher => {
      const teacherUserId = teacher.user?.id || teacher.user;
      return teacherUserId === user.id;
    });
  };

  const getPermissionStatus = () => {
    if (user?.role === 'admin') {
      return {
        canDelete: true,
        reason: 'admin',
        message: '✅ 您有管理員權限，可以刪除此學生'
      };
    }

    const isAssociatedTeacher = student.teachers?.some(teacher => {
      const teacherUserId = teacher.user?.id || teacher.user;
      return teacherUserId === user.id;
    });

    if (isAssociatedTeacher) {
      return {
        canDelete: true,
        reason: 'teacher',
        message: '✅ 您是此學生的老師，可以刪除此學生'
      };
    }

    return {
      canDelete: false,
      reason: 'no_permission',
      message: '⚠️ 您沒有權限刪除此學生（僅限該學生的老師或管理員）'
    };
  };

  // Tabs configuration
  const tabs = [
    {
      id: 'reports',
      label: '學生報告',
      icon: <BookOpen size={16} />,
      count: reports.length,
    },
    {
      id: 'regular',
      label: '普通會議',
      icon: <FileText size={16} />,
      count: regularMeetings.length,
    },
    {
      id: 'iep',
      label: 'IEP 會議',
      icon: <UserCheck size={16} />,
      count: iepMeetings.length,
    },
  ];

  // Load student data
  useEffect(() => {
    const loadStudent = async () => {
      try {
        setLoading(true);
        const studentData = await studentHelpers.getById(id);
        setStudent(studentData);
        setEditData(studentData);
      } catch (err) {
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

  // Load student records/reports
  useEffect(() => {
    const loadStudentRecords = async () => {
      if (!student?._id) {
        setStudentRecords([]);
        return;
      }

      try {
        setRecordsLoading(true);
        setRecordsError(null);

        const recordsData = await studentReportHelpers.getByStudent(student._id, {
          academicYear: getCurrentAcademicYear(),
          page: 1,
          limit: 100,
        });

        setStudentRecords(Array.isArray(recordsData) ? recordsData : []);
      } catch (error) {
        const errorInfo = handleApiError(error);
        setStudentRecords([]);

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

  // Load tab data when student, tab, or year changes
  useEffect(() => {
    if (student) {
      loadTabData();
    }
  }, [activeTab, selectedYear, student]);

  // Load data for specific tabs
  const loadTabData = async () => {
    if (activeTab === 'reports') {
      await loadReports();
    } else if (activeTab === 'regular') {
      await loadMeetings('regular');
    } else if (activeTab === 'iep') {
      await loadMeetings('iep');
    }
  };

  // Load reports with year filtering
  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const recordsData = await studentReportHelpers.getByStudent(student._id, {
        academicYear: selectedYear,
        page: 1,
        limit: 100,
      });
      setReports(Array.isArray(recordsData) ? recordsData : []);
    } catch (error) {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Load meeting records
  const loadMeetings = async meetingType => {
    try {
      setMeetingsLoading(true);
      const data = await meetingRecordHelpers.getByStudent(id, {
        meetingType,
        academicYear: selectedYear,
      });

      const meetings = data.meetings?.[meetingType] || [];
      if (meetingType === 'regular') {
        setRegularMeetings(meetings);
      } else {
        setIepMeetings(meetings);
      }
    } catch (error) {
      if (meetingType === 'regular') {
        setRegularMeetings([]);
      } else {
        setIepMeetings([]);
      }
    } finally {
      setMeetingsLoading(false);
    }
  };

  // Load schools when editing
  useEffect(() => {
    const loadSchools = async () => {
      if (!isEditing) return;

      try {
        setSchoolsLoading(true);
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      } catch (err) {
        toast.error('載入學校列表失敗');
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [isEditing]);

  // Get current tab data and loading state
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'reports':
        return reports;
      case 'regular':
        return regularMeetings;
      case 'iep':
        return iepMeetings;
      default:
        return [];
    }
  };

  const getCurrentTabLoading = () => {
    return activeTab === 'reports' ? reportsLoading : meetingsLoading;
  };

  // Render tab content
  const renderTabContent = () => {
    const data = getCurrentTabData();
    const loading = getCurrentTabLoading();

    if (loading) {
      return (
        <div className="tab-content__loading">
          <div className="loading-spinner"></div>
          <p>載入資料中...</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="tab-content__empty">
          {activeTab === 'reports' ? (
            <>
              <BookOpen size={48} />
              <h3>暫無學生報告</h3>
              <p>此學生在 {selectedYear} 學年還沒有報告記錄</p>
              <Link
                to={`/reports/create?student=${id}&year=${selectedYear}`}
                className="btn btn--primary"
              >
                <Plus size={16} />
                建立報告
              </Link>
            </>
          ) : (
            <>
              {activeTab === 'regular' ? <FileText size={48} /> : <UserCheck size={48} />}
              <h3>暫無{activeTab === 'regular' ? '普通' : 'IEP'}會議紀錄</h3>
              <p>
                此學生在 {selectedYear} 學年還沒有{activeTab === 'regular' ? '普通' : 'IEP'}會議紀錄
              </p>
              <Link
                to={`/meetings/create?type=${activeTab}&student=${id}&year=${selectedYear}&school=${student.school._id}`}
                className="btn btn--primary"
              >
                <Plus size={16} />
                建立{activeTab === 'regular' ? '普通' : 'IEP'}會議紀錄
              </Link>
            </>
          )}
        </div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <div className="reports-list">
          {data.map(record => (
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
                  {record.content || record.subjectDetails?.learningObjectives?.[0] || '無內容'}
                </p>
              </div>

              <div className="report-card__meta">
                <span className="report-card__subject">{record.subject?.name || '一般課程'}</span>
                {record.performance?.understanding?.level && (
                  <span className="report-card__performance">
                    理解程度: {translatePerformanceLevel(record.performance.understanding.level)}
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
        </div>
      );
    } else {
      // Meeting records (regular or IEP)
      return (
        <div className="meetings-list">
          {data.map(meeting => (
            <div key={meeting._id} className="meeting-card">
              <div className="meeting-card__header">
                <div className="meeting-card__title">
                  <h3>{meeting.meetingTitle}</h3>
                  <span className={`meeting-type-badge meeting-type-badge--${meeting.meetingType}`}>
                    {meeting.meetingType === 'regular' ? '普通' : 'IEP'}
                  </span>
                </div>
                <div className="meeting-card__date">
                  {new Date(meeting.meetingDate).toLocaleDateString('zh-HK')}
                </div>
              </div>

              <div className="meeting-card__content">
                <div className="meeting-card__info">
                  <div className="meeting-info-item">
                    <Clock size={14} />
                    <span>散會時間: {meeting.endTime}</span>
                  </div>
                  <div className="meeting-info-item">
                    <Users size={14} />
                    <span>與會人員: {meeting.participants.substring(0, 50)}...</span>
                  </div>
                  <div className="meeting-info-item">
                    <MapPin size={14} />
                    <span>地點: {meeting.meetingLocation}</span>
                  </div>
                </div>

                <div className="meeting-card__sen-categories">
                  <strong>SEN 類別:</strong>
                  <div className="sen-tags">
                    {meeting.senCategories.map((category, index) => (
                      <span key={index} className="sen-tag">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                {meeting.meetingType === 'iep' && meeting.supportLevel && (
                  <div className="meeting-card__support-level">
                    <strong>支援層級:</strong>
                    <span className={`support-level-badge support-level--${meeting.supportLevel}`}>
                      {meeting.supportLevel}
                    </span>
                  </div>
                )}
              </div>

              <div className="meeting-card__actions">
                <Link to={`/meetings/${meeting._id}`} className="btn btn--secondary btn--small">
                  查看詳情
                </Link>
                <Link to={`/meetings/${meeting._id}/edit`} className="btn btn--primary btn--small">
                  編輯
                </Link>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  const getChineseNameDisplay = student => {
    if (student.nameCh && student.nameCh !== student.name) {
      return student.nameCh;
    }

    if (student.name && /[\u4e00-\u9fff]/.test(student.name)) {
      return student.name;
    }

    return '未設定';
  };

  const getAvailableGrades = () => {
    if (!student?.school) return HK_GRADES.ALL;

    const selectedSchool = student.school;
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

  // Check for duplicate class numbers
  const checkDuplicateClassNumber = async (newClassNumber) => {
    if (!newClassNumber || !editData.currentClass || !editData.currentAcademicYear) {
      return false;
    }

    try {
      const studentsData = await studentHelpers.getAll({
        school: student.school._id,
        academicYear: editData.currentAcademicYear,
        limit: 1000,
      });

      const duplicateStudents = studentsData.filter(s => 
        s._id !== student._id && 
        s.currentGrade === editData.currentGrade &&
        s.currentClass === editData.currentClass &&
        s.currentClassNumber === parseInt(newClassNumber)
      );

      if (duplicateStudents.length > 0) {
        const studentNames = duplicateStudents.map(s => s.name).join(', ');
        toast.error(`班號 ${newClassNumber} 已被使用，使用者：${studentNames}`);
        return true;
      }

      return false;
    } catch (error) {
      toast.error('檢查班號時發生錯誤');
      return true;
    }
  };

  // Handle class number changes properly
  const handleClassNumberChange = async (newClassNumber) => {
    const numValue = parseInt(newClassNumber);
    
    if (!newClassNumber || newClassNumber === '') {
      setEditData({ ...editData, currentClassNumber: null });
      return;
    }

    if (isNaN(numValue) || numValue < 1 || numValue > 50) {
      toast.error('班號必須是 1-50 之間的數字');
      return;
    }

    if (editData.currentClass && editData.currentGrade && editData.currentAcademicYear) {
      const isDuplicate = await checkDuplicateClassNumber(numValue);
      if (isDuplicate) {
        return;
      }
    }

    setEditData({ ...editData, currentClassNumber: numValue });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { studentId, createdBy, teachers, school, ...safeEditData } = editData;

      const gradeMap = {
        P1: 'primary_1',
        P2: 'primary_2',
        P3: 'primary_3',
        P4: 'primary_4',
        P5: 'primary_5',
        P6: 'primary_6',
        S1: 'secondary_1',
        S2: 'secondary_2',
        S3: 'secondary_3',
        S4: 'secondary_4',
        S5: 'secondary_5',
        S6: 'secondary_6',
      };

      if (
        safeEditData.currentClass &&
        /^[A-Z]$/.test(safeEditData.currentClass) &&
        safeEditData.currentGrade
      ) {
        const gradeMatch = safeEditData.currentGrade.match(/\d+/);
        if (gradeMatch) {
          const classPrefix = gradeMatch[0];
          safeEditData.currentClass = `${classPrefix}${safeEditData.currentClass}`;
        }
      }

      if (safeEditData.currentGrade in gradeMap) {
        safeEditData.currentGrade = gradeMap[safeEditData.currentGrade];
      }

      if (!editData.name?.trim()) {
        toast.error('學生姓名為必填項目');
        return;
      }

      if (editData.currentGrade) {
        if (
          student.school &&
          !isGradeValidForSchoolType(editData.currentGrade, student.school.schoolType)
        ) {
          toast.error('所選年級與學校類型不符');
          return;
        }
      }

      if (safeEditData.currentClassNumber && safeEditData.currentClassNumber !== student.currentClassNumber) {
        const isDuplicate = await checkDuplicateClassNumber(safeEditData.currentClassNumber);
        if (isDuplicate) {
          return;
        }
      }

      const payload = {
        ...safeEditData,
        _id: student._id,
      };

      const updatedStudent = await studentHelpers.update(student._id, payload);
      setStudent(updatedStudent);
      setIsEditing(false);

      toast.success('學生資料已更新');
    } catch (err) {
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '保存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    const permissionStatus = getPermissionStatus();
    
    if (!permissionStatus.canDelete) {
      toast.error('您沒有權限刪除此學生');
      return;
    }
    
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    const permissionStatus = getPermissionStatus();
    
    if (!permissionStatus.canDelete) {
      toast.error('您沒有權限刪除此學生');
      setShowDeleteModal(false);
      return;
    }

    try {
      setDeleting(true);
      await studentHelpers.delete(student._id);
      toast.success('學生已刪除');
      navigate('/students');
    } catch (err) {
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '刪除失敗');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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
                {student.school?.name || '未設定學校'} • {getGradeChinese(student.currentGrade)}
                {student.currentClass && ` ${student.currentClass}班`}
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
                <button 
                  onClick={handleDeleteClick} 
                  className="btn btn--danger"
                  disabled={!canDeleteStudent()}
                  style={{ 
                    backgroundColor: canDeleteStudent() ? '#dc3545' : '#ccc',
                    borderColor: canDeleteStudent() ? '#dc3545' : '#ccc',
                    color: 'white',
                    cursor: canDeleteStudent() ? 'pointer' : 'not-allowed',
                    opacity: canDeleteStudent() ? 1 : 0.6
                  }}
                  title={canDeleteStudent() ? '刪除學生' : '您沒有權限刪除此學生'}
                >
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
                    value={editData.name || ''}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
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
                <div>
                  <span>
                    <School size={16} />
                    {student.school?.name || '未設定'}
                  </span>
                  {isEditing && (
                    <small className="form-help text-muted">
                      學校資訊不可修改
                    </small>
                  )}
                </div>
              </div>

              <div className="student-detail__info-item">
                <label>年級</label>
                {isEditing ? (
                  <select
                    value={editData.currentGrade || ''}
                    onChange={e => setEditData({ ...editData, currentGrade: e.target.value })}
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
                    {getGradeChinese(student.currentGrade)}
                  </span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>班別</label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={editData.currentClass || ''}
                      onChange={e => setEditData({ ...editData, currentClass: e.target.value })}
                      className="form-input"
                      placeholder="例如：A班、1A"
                    />
                    <small className="form-help">同年級同班別的學生班號不可重複</small>
                  </div>
                ) : (
                  <span>{student.currentClass || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>班號</label>
                {isEditing ? (
                  <div>
                    <input
                      type="number"
                      value={editData.currentClassNumber || ''}
                      onChange={e => handleClassNumberChange(e.target.value)}
                      className="form-input"
                      placeholder="班號"
                      min="1"
                      max="50"
                    />
                    <small className="form-help">
                      班號必須在同校、同學年、同年級、同班別中唯一
                    </small>
                  </div>
                ) : (
                  <span>{student.currentClassNumber || '未設定'}</span>
                )}
              </div>

              <div className="student-detail__info-item">
                <label>學年</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.currentAcademicYear || ''}
                    onChange={e =>
                      setEditData({ ...editData, currentAcademicYear: e.target.value })
                    }
                    className="form-input"
                    placeholder="例如：2024/25"
                  />
                ) : (
                  <span>
                    <Calendar size={16} />
                    {student.currentAcademicYear}
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

          {/* Enhanced Records Section with Tabs */}
          <div className="student-detail__records-section">
            {/* Tab Header */}
            <div className="tabs-header">
              <div className="tabs-nav">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                    <span className="tab-count">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Year Filter */}
              <div className="year-filter">
                <label htmlFor="yearSelect" className="year-filter__label">
                  <Calendar size={16} />
                  學年篩選
                </label>
                <select
                  id="yearSelect"
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="year-filter__select"
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tab Actions */}
            <div className="tab-actions">
              {activeTab === 'reports' && (
                <Link
                  to={`/reports/create?student=${id}&year=${selectedYear}`}
                  className="btn btn--primary"
                >
                  <Plus size={16} />
                  新增報告
                </Link>
              )}
              {(activeTab === 'regular' || activeTab === 'iep') && (
                <Link
                  to={`/meetings/create?type=${activeTab}&student=${id}&year=${selectedYear}&school=${student.school._id}`}
                  className="btn btn--primary"
                >
                  <Plus size={16} />
                  新增{activeTab === 'regular' ? '普通' : 'IEP'}會議紀錄
                </Link>
              )}
            </div>

            {/* Tab Content */}
            <div className="tab-content">{renderTabContent()}</div>
          </div>

          {/* Legacy Reports Section - Keep for backward compatibility but hidden when using tabs */}
          <div className="student-detail__reports-section" style={{ display: 'none' }}>
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
                          理解程度:{' '}
                          {translatePerformanceLevel(record.performance.understanding.level)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '1px solid #ddd',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #eee'
            }}>
              <Trash2 size={24} style={{ color: '#dc3545', marginRight: '10px' }} />
              <h3 style={{ 
                margin: 0, 
                color: '#dc3545', 
                fontSize: '20px',
                fontWeight: '600'
              }}>
                確認刪除學生
              </h3>
            </div>

            {/* Body */}
            <div style={{ marginBottom: '25px' }}>
              <p style={{ 
                marginBottom: '15px', 
                fontSize: '16px',
                lineHeight: '1.5',
                color: '#333'
              }}>
                確定要刪除 <strong style={{ color: '#dc3545' }}>{student.name}</strong> 嗎？
              </p>
              
              <div style={{ 
                color: '#dc3545', 
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '6px',
                fontSize: '14px',
                lineHeight: '1.4'
              }}>
                ⚠️ 此操作將永久刪除學生資料及相關記錄，無法復原。
              </div>
              
              {/* Permission status */}
              {(() => {
                const permissionStatus = getPermissionStatus();
                return (
                  <div style={{ 
                    color: permissionStatus.canDelete ? '#28a745' : '#856404', 
                    fontSize: '14px',
                    padding: '10px',
                    backgroundColor: permissionStatus.canDelete ? '#f8fff9' : '#fff3cd',
                    border: `1px solid ${permissionStatus.canDelete ? '#c3e6cb' : '#ffeaa7'}`,
                    borderRadius: '4px'
                  }}>
                    {permissionStatus.message}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              paddingTop: '15px',
              borderTop: '1px solid #eee'
            }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
              >
                取消
              </button>
              
              <button 
                onClick={handleConfirmDelete} 
                disabled={deleting || !canDeleteStudent()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: deleting ? '#ccc' : (canDeleteStudent() ? '#dc3545' : '#ccc'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: (deleting || !canDeleteStudent()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s',
                  opacity: (deleting || !canDeleteStudent()) ? 0.6 : 1
                }}
              >
                {deleting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    刪除中...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    確認刪除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentDetail;