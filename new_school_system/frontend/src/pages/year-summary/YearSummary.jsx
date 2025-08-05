// File: src/pages/year-summary/YearSummary.jsx - FIXED VERSION
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  GraduationCap,
  RefreshCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../context/AuthContext';
import { handleApiError, schoolHelpers, studentHelpers } from '../../services/api';
import { HK_GRADES, getCurrentAcademicYear, getGradeChinese } from '../../utils/constants';

const YearSummary = () => {
  const { user } = useAuth();

  // Page state
  const [currentPage, setCurrentPage] = useState('grades-1-5'); // 'grades-1-5' or 'grade-6'

  // Data state
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState('');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRetained, setShowOnlyRetained] = useState(false);

  // Upgrade state
  const [studentUpgradeStatus, setStudentUpgradeStatus] = useState({}); // studentId -> 'upgrade' | 'retain' | 'graduate' | 'delete'
  const [processing, setProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // FIXED: Add the missing getNextAcademicYear function
  const getNextAcademicYear = () => {
    const current = getCurrentAcademicYear();
    const [startYear] = current.split('/');
    const nextStart = parseInt(startYear) + 1;
    const nextEnd = (nextStart + 1).toString().slice(-2);
    return `${nextStart}/${nextEnd}`;
  };

  // Load schools
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        console.log('School data:', schoolsData);
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      } catch (err) {
        console.error('Failed to load schools:', err);
        toast.error('載入學校列表失敗');
      }
    };

    loadSchools();
  }, []);

  // Load students when school changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedSchool) {
        setStudents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const studentsData = await studentHelpers.getAll({
          school: selectedSchool,
          limit: 1000,
          currentAcademicYear: getCurrentAcademicYear(),
        });
        const students = Array.isArray(studentsData) ? studentsData : [];
        console.log('Student data:', students);
        setStudents(students);

        // Initialize upgrade status
        const initialStatus = {};
        students.forEach(student => {
          // Default to upgrade unless it's P6 or S6
          if (student.currentGrade === 'P6' || student.currentGrade === 'S6') {
            initialStatus[student._id] = student.currentGrade === 'P6' ? 'transition' : 'graduate';
          } else {
            initialStatus[student._id] = 'upgrade';
          }
        });
        setStudentUpgradeStatus(initialStatus);
      } catch (err) {
        console.error('Failed to load students:', err);
        toast.error('載入學生資料失敗');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [selectedSchool]);

  // Get filtered students based on current page
  const getFilteredStudents = () => {
    let filtered = students;

    // Filter by page type
    if (currentPage === 'grades-1-5') {
      filtered = filtered.filter(student =>
        ['P1', 'P2', 'P3', 'P4', 'P5', 'S1', 'S2', 'S3', 'S4', 'S5'].includes(student.currentGrade)
      );
    } else if (currentPage === 'grade-6') {
      filtered = filtered.filter(student => ['P6', 'S6'].includes(student.currentGrade));
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        student =>
          student.name.toLowerCase().includes(term) ||
          (student.nameEn && student.nameEn.toLowerCase().includes(term)) ||
          (student.studentId && student.studentId.toLowerCase().includes(term))
      );
    }

    // Show only retained students
    if (showOnlyRetained) {
      filtered = filtered.filter(student => studentUpgradeStatus[student._id] === 'retain');
    }

    return filtered;
  };

  // Get next grade
  const getNextGrade = currentGrade => {
    const gradeIndex = HK_GRADES.ALL.indexOf(currentGrade);
    if (gradeIndex === -1 || gradeIndex === HK_GRADES.ALL.length - 1) {
      return null;
    }
    return HK_GRADES.ALL[gradeIndex + 1];
  };

  // Handle upgrade status change
  const handleUpgradeStatusChange = (studentId, status) => {
    setStudentUpgradeStatus(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Get upgrade summary
  const getUpgradeSummary = () => {
    const summary = {
      total: 0,
      upgrade: 0,
      retain: 0,
      graduate: 0,
      delete: 0,
      transition: 0, // P6 to S1 transitions
    };

    getFilteredStudents().forEach(student => {
      const status = studentUpgradeStatus[student._id];
      summary.total++;
      if (status) {
        summary[status]++;
      }
    });

    return summary;
  };

  // FIXED: Process upgrades with proper error handling and API calls
  const processUpgrades = async () => {
    try {
      setProcessing(true);
      const updates = [];
      const deletes = [];
      const currentAcademicYear = getCurrentAcademicYear();
      const nextAcademicYear = getNextAcademicYear();

      const results = {
        successful: 0,
        failed: 0,
        errors: [],
      };

      console.log(
        '🔄 Processing upgrades for academic year:',
        currentAcademicYear,
        '→',
        nextAcademicYear
      );

      // Process each student individually for better error handling
      for (const student of getFilteredStudents()) {
        const status = studentUpgradeStatus[student._id];

        try {
          switch (status) {
            case 'upgrade': {
              const nextGrade = getNextGrade(student.currentGrade);
              if (nextGrade) {
                console.log(
                  `⬆️ Upgrading ${student.name} from ${student.currentGrade} to ${nextGrade}`
                );

                await studentHelpers.update(student._id, {
                  currentGrade: nextGrade,
                  currentAcademicYear: nextAcademicYear,
                  status: 'enrolled',
                });

                results.successful++;
              } else {
                console.warn(`⚠️ Cannot upgrade ${student.name} - no next grade available`);
                results.failed++;
                results.errors.push(`${student.name}: 無法升級，已是最高年級`);
              }
              break;
            }

            case 'transition': // P6 to S1
              console.log(`🔄 Transitioning ${student.name} from P6 to S1`);

              await studentHelpers.update(student._id, {
                currentGrade: 'S1',
                currentAcademicYear: nextAcademicYear,
                status: 'enrolled',
              });

              results.successful++;
              break;

            case 'graduate':
              console.log(`🎓 Graduating ${student.name}`);

              await studentHelpers.update(student._id, {
                currentAcademicYear: nextAcademicYear,
                status: 'graduated',
              });

              results.successful++;
              break;

            case 'delete':
              console.log(`🗑️ Deleting ${student.name}`);

              await studentHelpers.delete(student._id);
              results.successful++;
              break;

            case 'retain':
              console.log(`🔄 Retaining ${student.name} in ${student.currentGrade}`);

              await studentHelpers.update(student._id, {
                currentAcademicYear: nextAcademicYear,
                status: 'enrolled',
                // Grade stays the same - don't update currentGrade
              });

              results.successful++;
              break;

            default:
              console.warn(`⚠️ Unknown status ${status} for student ${student.name}`);
              results.failed++;
              results.errors.push(`${student.name}: 未知的處理狀態`);
          }
        } catch (error) {
          console.error(`❌ Failed to process ${student.name}:`, error);
          results.failed++;

          // Extract meaningful error message
          let errorMessage = error.message || '處理失敗';
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.data?.message) {
            errorMessage = error.data.message;
          }

          results.errors.push(`${student.name}: ${errorMessage}`);
        }
      }

      // Show results to user
      if (results.successful > 0) {
        toast.success(`成功處理 ${results.successful} 名學生的升級`);
      }

      if (results.failed > 0) {
        toast.error(`${results.failed} 名學生處理失敗`);
        console.error('Processing errors:', results.errors);

        // Show detailed errors to user
        results.errors.forEach(error => {
          toast.error(error, { duration: 5000 });
        });
      }

      // Reload data only if we had some success
      if (results.successful > 0) {
        console.log('🔄 Reloading student data...');
        try {
          const studentsData = await studentHelpers.getAll({
            school: selectedSchool,
            limit: 1000,
            currentAcademicYear: nextAcademicYear,
          });
          setStudents(Array.isArray(studentsData) ? studentsData : []);

          // Reset upgrade status for new data
          const newInitialStatus = {};
          const newStudents = Array.isArray(studentsData) ? studentsData : [];
          newStudents.forEach(student => {
            if (student.currentGrade === 'P6' || student.currentGrade === 'S6') {
              newInitialStatus[student._id] =
                student.currentGrade === 'P6' ? 'transition' : 'graduate';
            } else {
              newInitialStatus[student._id] = 'upgrade';
            }
          });
          setStudentUpgradeStatus(newInitialStatus);
        } catch (reloadError) {
          console.error('Failed to reload data:', reloadError);
          toast.error('升級完成但重新載入資料失敗，請刷新頁面');
        }
      }

      setShowConfirmModal(false);
    } catch (err) {
      console.error('❌ Critical error in processUpgrades:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '升級處理發生嚴重錯誤');
    } finally {
      setProcessing(false);
    }
  };

  const filteredStudents = getFilteredStudents();
  const summary = getUpgradeSummary();

  return (
    <div className="year-summary">
      {/* Header */}
      <div className="year-summary__header">
        <div className="year-summary__title-section">
          <div className="year-summary__icon">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="year-summary__title">年度整理</h1>
            <p className="year-summary__subtitle">
              學年升級管理 - {getCurrentAcademicYear()} → {getNextAcademicYear()}
            </p>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="year-summary__nav">
        <button
          onClick={() => setCurrentPage('grades-1-5')}
          className={`year-summary__nav-btn ${
            currentPage === 'grades-1-5' ? 'year-summary__nav-btn--active' : ''
          }`}
        >
          <Users size={20} />
          小一至小五、中一至中五
          <span className="year-summary__nav-count">
            {
              students.filter(s =>
                ['P1', 'P2', 'P3', 'P4', 'P5', 'S1', 'S2', 'S3', 'S4', 'S5'].includes(
                  s.currentGrade
                )
              ).length
            }
          </span>
        </button>
        <button
          onClick={() => setCurrentPage('grade-6')}
          className={`year-summary__nav-btn ${
            currentPage === 'grade-6' ? 'year-summary__nav-btn--active' : ''
          }`}
        >
          <GraduationCap size={20} />
          小六、中六
          <span className="year-summary__nav-count">
            {students.filter(s => ['P6', 'S6'].includes(s.currentGrade)).length}
          </span>
        </button>
      </div>

      {/* School Selection */}
      <div className="year-summary__school-section">
        <div className="form-group">
          <label className="form-label">選擇學校</label>
          <select
            value={selectedSchool}
            onChange={e => setSelectedSchool(e.target.value)}
            className="form-input"
          >
            <option value="">請選擇學校</option>
            {schools.map(school => (
              <option key={school._id} value={school._id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSchool && (
        <>
          {/* Filters and Summary */}
          <div className="year-summary__controls">
            <div className="year-summary__filters">
              <div className="filter-group">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="搜尋學生姓名或學號..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="form-input form-input--small"
                />
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyRetained}
                  onChange={e => setShowOnlyRetained(e.target.checked)}
                />
                只顯示留級學生
              </label>
            </div>

            <div className="year-summary__summary">
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="summary-stat__value">{summary.total}</span>
                  <span className="summary-stat__label">總數</span>
                </div>
                <div className="summary-stat summary-stat--success">
                  <span className="summary-stat__value">{summary.upgrade}</span>
                  <span className="summary-stat__label">升級</span>
                </div>
                <div className="summary-stat summary-stat--warning">
                  <span className="summary-stat__value">{summary.retain}</span>
                  <span className="summary-stat__label">留級</span>
                </div>
                {currentPage === 'grade-6' && (
                  <>
                    <div className="summary-stat summary-stat--info">
                      <span className="summary-stat__value">{summary.transition}</span>
                      <span className="summary-stat__label">升中</span>
                    </div>
                    <div className="summary-stat summary-stat--success">
                      <span className="summary-stat__value">{summary.graduate}</span>
                      <span className="summary-stat__label">畢業</span>
                    </div>
                    <div className="summary-stat summary-stat--danger">
                      <span className="summary-stat__value">{summary.delete}</span>
                      <span className="summary-stat__label">刪除</span>
                    </div>
                  </>
                )}
              </div>

              {summary.total > 0 && (
                <button
                  onClick={() => {
                    console.log('🔘 確認升級 button clicked');
                    console.log('📊 Current summary:', summary);
                    console.log('👥 Filtered students:', filteredStudents.length);
                    console.log('📋 Student upgrade status:', studentUpgradeStatus);
                    console.log('🎯 About to set showConfirmModal to true');
                    setShowConfirmModal(true);
                    console.log('✅ showConfirmModal should now be true');
                  }}
                  className="btn btn--primary"
                  disabled={processing}
                >
                  <CheckCircle size={20} />
                  確認升級
                </button>
              )}
            </div>
          </div>

          {/* Students List */}
          {loading ? (
            <Loading message="載入學生資料中..." />
          ) : filteredStudents.length > 0 ? (
            <div className="year-summary__students">
              <div className="students-upgrade-table">
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>學生</th>
                      <th>目前年級</th>
                      <th>升級狀態</th>
                      {currentPage === 'grades-1-5' && <th>升級後</th>}
                      {currentPage === 'grade-6' && <th>畢業/轉校處理</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const status = studentUpgradeStatus[student._id];
                      const nextGrade = getNextGrade(student.currentGrade);

                      return (
                        <tr key={student._id}>
                          <td>
                            <div className="student-info">
                              <div className="student-info__avatar">{student.name.charAt(0)}</div>
                              <div className="student-info__details">
                                <div className="student-info__name">{student.name}</div>
                                <div className="student-info__id">
                                  {student.studentId || '無學號'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="grade-badge">
                              {getGradeChinese(student.currentGrade)}
                            </span>
                          </td>
                          <td>
                            {currentPage === 'grades-1-5' ? (
                              <div className="upgrade-controls">
                                <label className="radio-label">
                                  <input
                                    type="radio"
                                    name={`student-${student._id}`}
                                    checked={status === 'upgrade'}
                                    onChange={() =>
                                      handleUpgradeStatusChange(student._id, 'upgrade')
                                    }
                                  />
                                  <span className="radio-text">
                                    <Check size={16} />
                                    升級
                                  </span>
                                </label>
                                <label className="radio-label radio-label--warning">
                                  <input
                                    type="radio"
                                    name={`student-${student._id}`}
                                    checked={status === 'retain'}
                                    onChange={() =>
                                      handleUpgradeStatusChange(student._id, 'retain')
                                    }
                                  />
                                  <span className="radio-text">
                                    <X size={16} />
                                    留級
                                  </span>
                                </label>
                              </div>
                            ) : (
                              <div className="upgrade-controls">
                                {student.currentGrade === 'P6' ? (
                                  <>
                                    <label className="radio-label">
                                      <input
                                        type="radio"
                                        name={`student-${student._id}`}
                                        checked={status === 'transition'}
                                        onChange={() =>
                                          handleUpgradeStatusChange(student._id, 'transition')
                                        }
                                      />
                                      <span className="radio-text">
                                        <ArrowRight size={16} />
                                        升中一
                                      </span>
                                    </label>
                                    <label className="radio-label radio-label--warning">
                                      <input
                                        type="radio"
                                        name={`student-${student._id}`}
                                        checked={status === 'retain'}
                                        onChange={() =>
                                          handleUpgradeStatusChange(student._id, 'retain')
                                        }
                                      />
                                      <span className="radio-text">
                                        <RefreshCcw size={16} />
                                        重讀小六
                                      </span>
                                    </label>
                                  </>
                                ) : (
                                  <>
                                    <label className="radio-label radio-label--success">
                                      <input
                                        type="radio"
                                        name={`student-${student._id}`}
                                        checked={status === 'graduate'}
                                        onChange={() =>
                                          handleUpgradeStatusChange(student._id, 'graduate')
                                        }
                                      />
                                      <span className="radio-text">
                                        <GraduationCap size={16} />
                                        畢業保留
                                      </span>
                                    </label>
                                    <label className="radio-label radio-label--danger">
                                      <input
                                        type="radio"
                                        name={`student-${student._id}`}
                                        checked={status === 'delete'}
                                        onChange={() =>
                                          handleUpgradeStatusChange(student._id, 'delete')
                                        }
                                      />
                                      <span className="radio-text">
                                        <X size={16} />
                                        刪除記錄
                                      </span>
                                    </label>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          {currentPage === 'grades-1-5' && (
                            <td>
                              {status === 'upgrade' && nextGrade ? (
                                <div className="upgrade-preview">
                                  <span className="grade-badge grade-badge--next">
                                    {getGradeChinese(nextGrade)}
                                  </span>
                                </div>
                              ) : status === 'retain' ? (
                                <div className="upgrade-preview">
                                  <span className="grade-badge grade-badge--retain">
                                    {getGradeChinese(student.currentGrade)} (留級)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          )}
                          {currentPage === 'grade-6' && (
                            <td>
                              {status === 'transition' && (
                                <div className="transition-info">
                                  <span className="grade-badge grade-badge--next">中一</span>
                                  <small className="transition-note">需要選擇中學</small>
                                </div>
                              )}
                              {status === 'graduate' && (
                                <span className="status-badge status-badge--success">
                                  畢業生記錄保留
                                </span>
                              )}
                              {status === 'delete' && (
                                <span className="status-badge status-badge--danger">
                                  記錄將被刪除
                                </span>
                              )}
                              {status === 'retain' && (
                                <span className="status-badge status-badge--warning">重讀小六</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <h3>沒有學生資料</h3>
              <p>
                {searchTerm || showOnlyRetained
                  ? '沒有符合篩選條件的學生'
                  : '此學校在選定年級範圍內沒有學生'}
              </p>
            </div>
          )}
        </>
      )}

      {/* DEBUG: Show modal state */}
      {console.log('🔍 DEBUG: showConfirmModal =', showConfirmModal)}

      {/* Confirmation Modal with Enhanced Visibility */}
      {showConfirmModal && (
        <>
          {console.log('🎭 MODAL: Rendering confirmation modal')}
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={e => {
              console.log('🔘 Modal overlay clicked');
              if (e.target === e.currentTarget) {
                setShowConfirmModal(false);
              }
            }}
          >
            <div
              className="modal-content modal-content--large"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '0',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                border: '3px solid #059669', // Add visible border for debugging
              }}
              onClick={e => {
                console.log('🔘 Modal content clicked');
                e.stopPropagation();
              }}
            >
              <div
                className="modal-header"
                style={{
                  padding: '24px 24px 0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '16px',
                  marginBottom: '24px',
                }}
              >
                <CheckCircle size={24} style={{ color: '#059669' }} />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#111827',
                  }}
                >
                  確認年度升級
                </h3>
              </div>

              <div
                className="modal-body"
                style={{
                  padding: '0 24px 24px 24px',
                }}
              >
                <p
                  style={{
                    marginBottom: '20px',
                    fontSize: '1rem',
                    color: '#374151',
                  }}
                >
                  即將執行以下年度升級操作：
                </p>

                <div
                  className="upgrade-summary-details"
                  style={{
                    marginBottom: '24px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {summary.upgrade > 0 && (
                    <div
                      className="summary-detail"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <CheckCircle size={20} style={{ color: '#059669' }} />
                      <span>{summary.upgrade} 名學生將升級到下一年級</span>
                    </div>
                  )}
                  {summary.retain > 0 && (
                    <div
                      className="summary-detail"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <RefreshCcw size={20} style={{ color: '#d97706' }} />
                      <span>{summary.retain} 名學生將留級重讀</span>
                    </div>
                  )}
                  {summary.transition > 0 && (
                    <div
                      className="summary-detail"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <ArrowRight size={20} style={{ color: '#2563eb' }} />
                      <span>{summary.transition} 名小六學生將升讀中一</span>
                    </div>
                  )}
                  {summary.graduate > 0 && (
                    <div
                      className="summary-detail"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <GraduationCap size={20} style={{ color: '#059669' }} />
                      <span>{summary.graduate} 名中六學生畢業，記錄將保留</span>
                    </div>
                  )}
                  {summary.delete > 0 && (
                    <div
                      className="summary-detail"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <X size={20} style={{ color: '#dc2626' }} />
                      <span>{summary.delete} 名學生記錄將被永久刪除</span>
                    </div>
                  )}
                </div>

                <div
                  className="warning-box"
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    color: '#92400e',
                  }}
                >
                  <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <strong>注意：</strong>
                    <ul
                      style={{
                        margin: '8px 0 0 0',
                        paddingLeft: '20px',
                      }}
                    >
                      <li>此操作會更新所有學生的學年和年級資訊</li>
                      <li>小六升中一的學生需要後續手動指定中學</li>
                      <li>畢業生狀態會更改為「已畢業」</li>
                      <li>被標記刪除的記錄將無法復原</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                className="modal-actions"
                style={{
                  padding: '16px 24px 24px 24px',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  borderTop: '1px solid #e5e7eb',
                  marginTop: '24px',
                }}
              >
                <button
                  onClick={() => {
                    console.log('❌ 取消 button clicked');
                    setShowConfirmModal(false);
                  }}
                  className="btn btn--secondary"
                  disabled={processing}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#374151',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('✅ 確認執行升級 button clicked - starting processUpgrades()');
                    console.log('📊 Final summary before processing:', summary);
                    processUpgrades();
                  }}
                  className="btn btn--primary"
                  disabled={processing}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    backgroundColor: processing ? '#9ca3af' : '#059669',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {processing ? (
                    <>
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      ></div>
                      處理中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      確認執行升級
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default YearSummary;
