// File: src/pages/students/StudentsManagement.jsx
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Filter,
  GraduationCap,
  Plus,
  School,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { handleApiError, schoolHelpers, studentHelpers } from '../../services/api';
import {
  HK_GRADES,
  getCurrentAcademicYear,
  getGradeChinese,
  getStudentStatusChinese,
} from '../../utils/constants';

const StudentsManagement = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Selection states
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [availableAcademicYears, setAvailableAcademicYears] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load schools data
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoading(true);
        setError(null);

        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        const schools = Array.isArray(schoolsData) ? schoolsData : [];

        setSchools(schools);
      } catch (err) {
        console.error('Failed to load schools:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, [user, isAdmin]);

  // Update available academic years when school is selected
  useEffect(() => {
    if (selectedSchool) {
      const school = schools.find(s => s._id === selectedSchool);
      if (school && school.academicYears) {
        const years = school.academicYears
          .map(ay => ay.year)
          .sort()
          .reverse();
        setAvailableAcademicYears(years);

        // Auto-select current academic year if available
        const currentYear = getCurrentAcademicYear();
        if (years.includes(currentYear)) {
          setSelectedAcademicYear(currentYear);
        } else if (years.length > 0) {
          setSelectedAcademicYear(years[0]); // Select most recent year
        }
      } else {
        setAvailableAcademicYears([]);
        setSelectedAcademicYear('');
      }
    } else {
      setAvailableAcademicYears([]);
      setSelectedAcademicYear('');
    }
  }, [selectedSchool, schools]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedSchool || !selectedAcademicYear) {
        setStudents([]);
        setFilteredStudents([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const studentsData = await studentHelpers.getAll({
          school: selectedSchool,
          academicYear: selectedAcademicYear,
          limit: 500,
        });

        const students = Array.isArray(studentsData) ? studentsData : [];
        setStudents(students);
        setFilteredStudents(students);
      } catch (err) {
        console.error('Failed to load students:', err);
        setError(handleApiError(err));
        setStudents([]);
        setFilteredStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [selectedSchool, selectedAcademicYear]);

  // Apply filters to students
  useEffect(() => {
    let filtered = Array.isArray(students) ? students : [];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        student =>
          student.name.toLowerCase().includes(term) ||
          (student.nameEn && student.nameEn.toLowerCase().includes(term)) ||
          (student.nameCh && student.nameCh.toLowerCase().includes(term))
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter(student => student.grade === selectedGrade);
    }

    if (selectedStatus) {
      filtered = filtered.filter(student => student.status === selectedStatus);
    }

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [students, searchTerm, selectedGrade, selectedStatus]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedStatus('');
  };

  // Get available grades for selected school
  const getAvailableGrades = () => {
    if (!selectedSchool) return [];

    const school = schools.find(s => s._id === selectedSchool);
    if (!school) return [];

    let grades = [];
    if (school.schoolType === 'primary') {
      grades = HK_GRADES.PRIMARY;
    } else if (school.schoolType === 'secondary') {
      grades = HK_GRADES.SECONDARY;
    } else if (school.schoolType === 'both') {
      grades = HK_GRADES.ALL;
    }

    return grades;
  };

  // Get school name by ID
  const getSchoolName = schoolId => {
    const school = schools.find(s => s._id === schoolId);
    return school ? school.name : '未知學校';
  };

  if (loading && schools.length === 0) {
    return (
      <div className="students-management">
        <div className="students-management__loading">
          <div className="loading-spinner loading-spinner--large"></div>
          <p className="loading-message">載入學生資料中...</p>
        </div>
      </div>
    );
  }

  if (error && schools.length === 0) {
    return (
      <div className="students-management">
        <div className="students-management__error">
          <AlertCircle size={48} />
          <h2>載入學生資料失敗</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn--primary">
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="students-management">
      {/* Header */}
      <div className="students-management__header">
        <div className="students-management__title-section">
          <h1 className="students-management__title">
            <Users size={32} />
            學生管理
          </h1>
          <p className="students-management__subtitle">管理學校內的學生資料</p>
        </div>

        <div className="students-management__actions">
          <Link to="/students/create" className="btn btn--primary">
            <Plus size={20} />
            新增學生
          </Link>
        </div>
      </div>

      {/* School and Academic Year Selection */}
      <div className="students-management__selection">
        <div className="selection-panel">
          <h3 className="selection-panel__title">選擇學校和學年</h3>

          <div className="selection-panel__content">
            <div className="form-group">
              <label className="form-label">
                <School size={16} />
                學校
              </label>
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

            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} />
                學年
              </label>
              <select
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="form-input"
              >
                <option value="">請選擇學年</option>
                {availableAcademicYears.map(year => (
                  <option key={year} value={year}>
                    {year} 學年
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Show students section only when both school and year are selected */}
      {selectedSchool && selectedAcademicYear && (
        <>
          {/* Search and Filters */}
          <div className="students-management__controls">
            {/* Search Bar */}
            <div className="search-bar">
              <div className="search-bar__input">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="搜尋學生姓名..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="form-input"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="search-bar__clear">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="filter-controls">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn--secondary filter-toggle ${
                  showFilters ? 'filter-toggle--active' : ''
                }`}
              >
                <Filter size={16} />
                篩選
                <ChevronDown
                  size={16}
                  className={`filter-toggle__icon ${
                    showFilters ? 'filter-toggle__icon--rotated' : ''
                  }`}
                />
              </button>

              {(selectedGrade || selectedStatus) && (
                <button onClick={clearFilters} className="btn btn--ghost btn--small">
                  清除篩選
                </button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="filter-panel">
              <div className="filter-panel__content">
                <div className="filter-group">
                  <label className="filter-label">年級</label>
                  <select
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="form-input form-input--small"
                  >
                    <option value="">所有年級</option>
                    {getAvailableGrades().map(grade => (
                      <option key={grade} value={grade}>
                        {getGradeChinese(grade)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">狀態</label>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="form-input form-input--small"
                  >
                    <option value="">所有狀態</option>
                    <option value="enrolled">已註冊</option>
                    <option value="transferred">已轉校</option>
                    <option value="graduated">已畢業</option>
                    <option value="dropped_out">已退學</option>
                    <option value="suspended">已停學</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="students-management__summary">
            <p className="results-summary">
              {getSchoolName(selectedSchool)} · {selectedAcademicYear} 學年 · 顯示{' '}
              {filteredStudents.length} 位學生
              {searchTerm && ` · 搜尋 "${searchTerm}"`}
              {selectedGrade && ` · ${getGradeChinese(selectedGrade)}`}
              {selectedStatus && ` · ${getStudentStatusChinese(selectedStatus)}`}
            </p>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="students-management__loading">
              <div className="loading-spinner"></div>
              <p>載入學生資料中...</p>
            </div>
          ) : currentStudents.length > 0 ? (
            <div className="students-table-container">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>學生姓名</th>
                    <th>學號</th>
                    <th>年級班別</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.map(student => (
                    <tr key={student._id}>
                      <td>
                        <div className="student-info">
                          <div className="student-info__avatar">
                            <User size={20} />
                          </div>
                          <div className="student-info__details">
                            <div className="student-info__name">{student.name}</div>
                            {student.nameEn && (
                              <div className="student-info__name-en">{student.nameEn}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="grade-class">
                          <span className="grade">{getGradeChinese(student.grade)}</span>
                          {student.class && <span className="class">{student.class}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="student-id">{student.classNumber}</span>
                      </td>
                      <td>
                        <div className="student-actions">
                          <Link
                            to={`/students/${student._id}`}
                            className="btn btn--secondary btn--small"
                          >
                            查看
                          </Link>
                          <Link
                            to={`/students/${student._id}/edit`}
                            className="btn btn--primary btn--small"
                          >
                            編輯
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="students-management__empty">
              <Users size={64} />
              <h3>找不到學生</h3>
              <p>
                {searchTerm || selectedGrade || selectedStatus
                  ? '請嘗試調整搜尋條件或篩選器'
                  : '此學校在該學年暫無學生資料'}
              </p>
              <Link to="/students/create" className="btn btn--primary">
                <Plus size={16} />
                新增學生
              </Link>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination__btn pagination__btn--prev"
              >
                上一頁
              </button>

              <div className="pagination__info">
                第 {currentPage} 頁，共 {totalPages} 頁
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination__btn pagination__btn--next"
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}

      {/* No Selection State */}
      {(!selectedSchool || !selectedAcademicYear) && (
        <div className="students-management__no-selection">
          <GraduationCap size={64} />
          <h3>請選擇學校和學年</h3>
          <p>選擇學校和學年後，即可查看和管理學生資料</p>
        </div>
      )}
    </div>
  );
};

export default StudentsManagement;
