import {
  BookOpen,
  CalendarDays as Calendar,
  Edit,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ReportFilters from '../../components/reports/ReportFilters';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers, studentHelpers } from '../../services/api';
import { getCurrentAcademicYear, getGradeChinese } from '../../utils/constants';

import { handleApiError, studentReportHelpers } from '../../services/api';

// RECOMMENDED: Utility function for consistent auth headers
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}`,
});

const StudentReports = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    currentAcademicYear: getCurrentAcademicYear(),
    school: '',
    currentGrade: '',
    student: '',
  });

  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        const schools = Array.isArray(schoolsData) ? schoolsData : [];

        setSchools(schools);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast.error('載入資料失敗');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const params = {
          school: filters.school,
          currentAcademicYear: filters.currentAcademicYear,
          ...(filters.currentGrade && { currentGrade: filters.currentGrade }),
          limit: 1000,
        };

        const studentsData = await studentHelpers.getAll(params);
        const allStudents = Array.isArray(studentsData) ? studentsData : [];

        const filteredStudents = allStudents.filter(student => {
          const academicYearMatch = student.currentAcademicYear === filters.currentAcademicYear;
          const gradeMatch = !filters.currentGrade || student.currentGrade === filters.currentGrade;

          return academicYearMatch && gradeMatch;
        });

        setStudents(filteredStudents);
      } catch (error) {
        console.error('❌ Failed to load students:', error);
        toast.error('載入學生列表失敗');
        setStudents([]);
      }
    };

    loadStudents();
  }, [filters.school, filters.currentAcademicYear, filters.currentGrade]);

  useEffect(() => {
    const loadRecords = async () => {
      if (!filters.student) {
        setRecords([]);
        setFilteredRecords([]);
        return;
      }

      try {
        setLoading(true);

        const recordsData = await studentReportHelpers.getByStudent(filters.student, {
          currentAcademicYear: filters.currentAcademicYear,
          page: 1,
          limit: 100,
        });

        setRecords(recordsData);
        setFilteredRecords(recordsData);
      } catch (error) {
        const errorInfo = handleApiError(error);

        setRecords([]);
        setFilteredRecords([]);

        if (errorInfo.type !== 'notfound') {
          toast.error(errorInfo.message || '載入記錄失敗');
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [filters.student, filters.currentAcademicYear]);

  // Filter records based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecords(records);
      return;
    }

    const filtered = records.filter(
      record =>
        record.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof record.remarks === 'string' &&
          record.remarks?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (typeof record.remarks === 'object' &&
          record.remarks?.teacher_comments?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  const handleFilterChange = newFilters => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDeleteRecord = async recordId => {
    if (!window.confirm('確定要刪除這個記錄嗎？此操作無法復原。')) {
      return;
    }

    try {
      await studentReportHelpers.delete(recordId);

      setRecords(prev => prev.filter(record => record._id !== recordId));
      setFilteredRecords(prev => prev.filter(record => record._id !== recordId));
      toast.success('記錄已成功刪除');
    } catch (error) {
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '刪除記錄失敗');
    }
  };

  const loadAllReports = async () => {
    try {
      setLoading(true);

      const response = await studentReportHelpers.getAll({
        school: filters.school,
        currentAcademicYear: filters.currentAcademicYear,
        currentGrade: filters.currentGrade,
        page: 1,
        limit: 100,
      });

      const reportsData = response.data?.reports || [];
      setRecords(reportsData);
      setFilteredRecords(reportsData);
    } catch (error) {
      console.error('Failed to load all reports:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '載入報告失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadMyReports = async () => {
    try {
      setLoading(true);

      const response = await studentReportHelpers.getMyReports({
        school: filters.school,
        currentAcademicYear: filters.currentAcademicYear,
        subject: filters.subject,
        page: 1,
        limit: 100,
      });

      const reportsData = response.data?.reports || [];
      setRecords(reportsData);
      setFilteredRecords(reportsData);
    } catch (error) {
      console.error('Failed to load my reports:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '載入我的報告失敗');
    } finally {
      setLoading(false);
    }
  };

  // ✨ ADDITIONAL: Get report statistics function
  const loadReportStats = async () => {
    try {
      const response = await studentReportHelpers.getStats({
        school: filters.school,
        currentAcademicYear: filters.currentAcademicYear,
      });

      console.log('Report Statistics:', response.data);
      // You can use this data to show statistics in your UI
      return response.data;
    } catch (error) {
      console.error('Failed to load report stats:', error);
      const errorInfo = handleApiError(error);
      console.error(errorInfo.message);
    }
  };
  // Alternative implementation using utility function (RECOMMENDED)
  const loadRecordsWithUtil = async () => {
    if (!filters.student) {
      setRecords([]);
      setFilteredRecords([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/student-records/student/${filters.student}?academicYear=${filters.currentAcademicYear}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch records');
      }

      const data = await response.json();
      const recordsData = data.data?.records || [];

      setRecords(recordsData);
      setFilteredRecords(recordsData);
    } catch (error) {
      console.error('Failed to load records:', error);
      setRecords([]);
      setFilteredRecords([]);

      if (!error.message.includes('404') && !error.message.includes('Not Found')) {
        toast.error('載入記錄失敗');
      }
    }
  };

  const handleDeleteRecordWithUtil = async recordId => {
    if (!window.confirm('確定要刪除這個記錄嗎？此操作無法復原。')) {
      return;
    }

    try {
      const response = await fetch(`/api/student-records/${recordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${
            localStorage.getItem('accessToken') || localStorage.getItem('token')
          }`, // With fallback
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete record');
      }

      setRecords(prev => prev.filter(record => record._id !== recordId));
      setFilteredRecords(prev => prev.filter(record => record._id !== recordId));

      toast.success('記錄已成功刪除');
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('刪除記錄失敗');
    }
  };

  const getPerformanceDisplay = rating => {
    const ratingMap = {
      excellent: { text: '優秀', color: '#27ae60' },
      good: { text: '良好', color: '#3498db' },
      satisfactory: { text: '一般', color: '#f39c12' },
      needs_improvement: { text: '需改進', color: '#e74c3c' },
      fair: { text: '一般', color: '#f39c12' },
      poor: { text: '差', color: '#95a5a6' },
    };
    return ratingMap[rating] || { text: rating, color: '#95a5a6' };
  };

  const getHomeworkStatusDisplay = status => {
    const statusMap = {
      assigned: { text: '已分配', color: '#3498db' },
      completed: { text: '已完成', color: '#27ae60' },
      overdue: { text: '逾期', color: '#e74c3c' },
    };
    return statusMap[status] || { text: status, color: '#95a5a6' };
  };

  // Helper function to safely render remarks
  const renderRemarks = remarks => {
    if (!remarks) return null;

    // If remarks is a string (backward compatibility)
    if (typeof remarks === 'string') {
      return (
        <div className="record-card__remarks">
          <span className="remarks-label">備註：</span>
          <span className="remarks-text">{remarks}</span>
        </div>
      );
    }

    // If remarks is an object with structured data
    if (typeof remarks === 'object') {
      const hasContent =
        remarks.teacher_comments ||
        (remarks.strengths && remarks.strengths.length > 0) ||
        (remarks.areas_for_improvement && remarks.areas_for_improvement.length > 0) ||
        (remarks.recommendations && remarks.recommendations.length > 0) ||
        (remarks.next_steps && remarks.next_steps.length > 0) ||
        remarks.parent_feedback_requested;

      if (!hasContent) return null;

      return (
        <div className="record-card__remarks">
          <span className="remarks-label">備註：</span>
          <div className="remarks-content">
            {remarks.teacher_comments && (
              <div className="remark-item">
                <strong>教師評語：</strong>
                <span>{remarks.teacher_comments}</span>
              </div>
            )}

            {remarks.strengths && remarks.strengths.length > 0 && (
              <div className="remark-item">
                <strong>優點：</strong>
                <span>{remarks.strengths.join('、')}</span>
              </div>
            )}

            {remarks.areas_for_improvement && remarks.areas_for_improvement.length > 0 && (
              <div className="remark-item">
                <strong>改進方向：</strong>
                <span>{remarks.areas_for_improvement.join('、')}</span>
              </div>
            )}

            {remarks.recommendations && remarks.recommendations.length > 0 && (
              <div className="remark-item">
                <strong>建議：</strong>
                <span>{remarks.recommendations.join('、')}</span>
              </div>
            )}

            {remarks.next_steps && remarks.next_steps.length > 0 && (
              <div className="remark-item">
                <strong>下步計劃：</strong>
                <span>{remarks.next_steps.join('、')}</span>
              </div>
            )}

            {remarks.parent_feedback_requested && (
              <div className="remark-item">
                <strong>需要家長回饋</strong>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const selectedStudent = students.find(s => s._id === filters.student);

  if (loading) {
    return (
      <div className="student-reports-page">
        <div className="loading-container">
          <div className="loading-spinner loading-spinner--large"></div>
          <p className="loading-message">載入學生報告中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-reports-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__content">
          <div className="page-header__icon">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="page-title">學生報告記錄</h1>
            <p className="page-subtitle">管理和查看學生的課堂記錄與表現評估</p>
          </div>
        </div>

        <div className="page-header__actions">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn--secondary">
            <Filter size={20} />
            {showFilters ? '隱藏篩選' : '顯示篩選'}
          </button>

          {filters.student && (
            <Link to={`/reports/student/${filters.student}/create`} className="btn btn--primary">
              <Plus size={20} />
              新增記錄
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="reports-filters-section">
          <ReportFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            schools={schools}
            students={students}
            loading={loading}
          />
        </div>
      )}

      {/* Selected Student Info */}
      {selectedStudent && (
        <div className="selected-student-info">
          <div className="student-card">
            <div className="student-card__avatar">
              <User size={24} />
            </div>
            <div className="student-card__info">
              <h3 className="student-card__name">{selectedStudent.name}</h3>
              <div className="student-card__details">
                <span className="student-card__grade">
                  {getGradeChinese(selectedStudent.currentGrade)}
                  {selectedStudent.currentClass && ` ${selectedStudent.currentClass}班`}
                </span>
                <span className="student-card__school">
                  {schools.find(s => s._id === selectedStudent.school)?.name}
                </span>
                <span className="student-card__year">{filters.currentAcademicYear}學年</span>
              </div>
            </div>
            <div className="student-card__stats">
              <div className="stat">
                <span className="stat__value">{records.length}</span>
                <span className="stat__label">總記錄數</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Records */}
      {filters.student && (
        <div className="reports-content">
          {/* Search Bar */}
          <div className="search-section">
            <div className="search-bar">
              <Search size={20} className="search-bar__icon" />
              <input
                type="text"
                placeholder="搜索課題、內容或備註..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-bar__input"
              />
            </div>
          </div>

          {/* Records List */}
          <div className="records-section">
            {filteredRecords.length > 0 ? (
              <div className="records-list">
                {filteredRecords.map(record => (
                  <div key={record._id} className="record-card">
                    <div className="record-card__header">
                      <div className="record-card__date">
                        <Calendar size={16} />
                        {new Date(record.reportDate).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </div>
                      <div className="record-card__actions">
                        <Link
                          to={`/reports/record/${record._id}`}
                          className="btn btn--small btn--secondary"
                        >
                          <Eye size={16} />
                          查看
                        </Link>
                        <Link
                          to={`/reports/record/${record._id}/edit`}
                          className="btn btn--small btn--secondary"
                        >
                          <Edit size={16} />
                          編輯
                        </Link>
                        <button
                          onClick={() => handleDeleteRecord(record._id)}
                          className="btn btn--small btn--secondary"
                        >
                          <Trash2 size={16} />
                          刪除
                        </button>
                      </div>
                    </div>

                    <div className="record-card__content">
                      <h3 className="record-card__topic">{record.topic}</h3>
                      <p className="record-card__description">{record.content}</p>

                      {record.performance && (
                        <div className="record-card__performance">
                          <span className="performance-label">學生表現：</span>
                          <span
                            className="performance-badge"
                            style={{
                              backgroundColor:
                                getPerformanceDisplay(record.performance.rating).color + '20',
                              color: getPerformanceDisplay(record.performance.rating).color,
                            }}
                          >
                            {getPerformanceDisplay(record.performance.rating).text}
                          </span>
                          {record.performance.notes && (
                            <span className="performance-notes">- {record.performance.notes}</span>
                          )}
                        </div>
                      )}

                      {record.homework && record.homework.description && (
                        <div className="record-card__homework">
                          <span className="homework-label">功課安排：</span>
                          <span className="homework-description">
                            {record.homework.description}
                          </span>
                          {record.homework.status && (
                            <span
                              className="homework-status"
                              style={{
                                backgroundColor:
                                  getHomeworkStatusDisplay(record.homework.status).color + '20',
                                color: getHomeworkStatusDisplay(record.homework.status).color,
                              }}
                            >
                              {getHomeworkStatusDisplay(record.homework.status).text}
                            </span>
                          )}
                        </div>
                      )}

                      {/* FIXED: Use the helper function to safely render remarks */}
                      {renderRemarks(record.remarks)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FileText size={48} />
                <h3>暫無記錄</h3>
                <p>{searchTerm ? '沒有找到符合搜索條件的記錄' : '該學生在此學年還沒有任何記錄'}</p>
                {filters.student && !searchTerm && (
                  <Link
                    to={`/reports/student/${filters.student}/create`}
                    className="btn btn--primary"
                  >
                    <Plus size={20} />
                    新增首個記錄
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Student Selected */}
      {!filters.student && (
        <div className="empty-state">
          <User size={48} />
          <h3>請選擇學生</h3>
          <p>請使用上方的篩選器選擇學年、學校、年級和學生以查看報告記錄</p>
        </div>
      )}
    </div>
  );
};

export default StudentReports;
