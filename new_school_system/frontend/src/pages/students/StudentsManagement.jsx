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
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast'; 
import { useAuth } from '../../context/AuthContext';
import { handleApiError, schoolHelpers, studentHelpers } from '../../services/api';
import {
  HK_GRADES,
  getCurrentAcademicYear,
  getGradeChinese,
  getStudentStatusChinese,
} from '../../utils/constants';

const sortStudents = students => {
  const gradeOrder = {
    primary_1: 1,
    primary_2: 2,
    primary_3: 3,
    primary_4: 4,
    primary_5: 5,
    primary_6: 6,
    secondary_1: 7,
    secondary_2: 8,
    secondary_3: 9,
    secondary_4: 10,
    secondary_5: 11,
    secondary_6: 12,
  };

  return [...students].sort((a, b) => {
    // Sort by grade/year
    const gradeA = gradeOrder[a.currentGrade] || 99;
    const gradeB = gradeOrder[b.currentGrade] || 99;
    if (gradeA !== gradeB) return gradeA - gradeB;

    // Sort by class letter (e.g., '1A' => 'A')
    const classA = a.currentClass?.match(/[A-Z]/)?.[0] || '';
    const classB = b.currentClass?.match(/[A-Z]/)?.[0] || '';
    if (classA !== classB) return classA.localeCompare(classB);

    // Sort by class number
    const numA = a.currentClassNumber || 0;
    const numB = b.currentClassNumber || 0;
    return numA - numB;
  });
};

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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  useEffect(() => {
    const loadAcademicYears = async () => {
      if (!selectedSchool) {
        setAvailableAcademicYears([]);
        setSelectedAcademicYear('');
        return;
      }

      try {

        const allStudents = await studentHelpers.getAll({
          school: selectedSchool,
          limit: 1000, 
        });

        const uniqueYears = [...new Set(
          allStudents
            .map(student => student.currentAcademicYear)
            .filter(year => year) 
        )].sort().reverse();

        setAvailableAcademicYears(uniqueYears);

        // Set default year
        const currentYear = getCurrentAcademicYear();
        if (uniqueYears.includes(currentYear)) {
          setSelectedAcademicYear(currentYear);
        } else if (uniqueYears.length > 0) {
          setSelectedAcademicYear(uniqueYears[0]);
        }
      } catch (error) {
        console.error('❌ Failed to load academic years:', error);
        setAvailableAcademicYears([]);
      }
    };

    loadAcademicYears();
  }, [selectedSchool]);

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

        const students = Array.isArray(studentsData) ? sortStudents(studentsData) : [];
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
      filtered = filtered.filter(student => student.currentGrade === selectedGrade);
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

  // ✅ Delete function with proper error handling
  const handleDeleteStudent = async (studentId, studentName) => {
    console.log('🗑️ Delete initiated for student:', {
      id: studentId,
      name: studentName,
      userRole: user?.role,
      userId: user?._id
    });

    // Find the student to check teacher relationships
    const studentToDelete = students.find(s => s._id === studentId);
    console.log('👨‍🏫 Student teachers:', studentToDelete?.teachers);
    
    // Check if current user is associated with this student
    const isAssociatedTeacher = studentToDelete?.teachers?.some(
      teacher => teacher.user === user._id || teacher.user._id === user._id
    );
    console.log('🔐 User can delete?', { 
      isAdmin: user?.role === 'admin',
      isAssociatedTeacher,
      canDelete: user?.role === 'admin' || isAssociatedTeacher
    });

    if (!window.confirm(`確定要刪除學生 ${studentName} 嗎？此操作無法復原。`)) {
      console.log('❌ User cancelled deletion');
      return;
    }

    try {
      console.log('🚀 Calling delete API for student:', studentId);
      
      const result = await studentHelpers.delete(studentId);
      console.log('✅ Delete API response:', result);
      
      toast.success('學生已刪除');
      
      // Refresh the students list
      console.log('🔄 Refreshing student list...');
      const updatedStudents = students.filter(s => s._id !== studentId);
      setStudents(updatedStudents);
      
      // Reapply current filters
      let filtered = updatedStudents;
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
        filtered = filtered.filter(student => student.currentGrade === selectedGrade);
      }
      if (selectedStatus) {
        filtered = filtered.filter(student => student.status === selectedStatus);
      }
      
      setFilteredStudents(filtered);
      console.log('✅ Student list updated, new count:', filtered.length);
      
    } catch (error) {
      console.error('❌ Failed to delete student:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        data: error.data
      });
      
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '刪除失敗');
    }
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
                    <th>年級班別</th>
                    <th>學號</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.map((student) => {

                    if (!student._id) {
                      return null;
                    }
                    return (
                      <tr key={`student-${student._id}-${selectedAcademicYear}`}>
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
                            <span className="grade">{getGradeChinese(student.currentGrade)}</span>
                            {student.currentClass && (
                              <span className="class">{student.currentClass}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="student-id">{student.currentClassNumber}</span>
                        </td>
                        <td>
                          <div className="student-actions">
                            <Link
                              to={`/students/${student._id}`}
                              className="btn btn--secondary btn--small"
                              onClick={() => console.log('👁️ View clicked for student ID:', student._id)}
                            >
                              查看
                            </Link>
                            <button 
                              onClick={() => {
                                console.log('🗑️ Delete button clicked for student:', student._id);
                                handleDeleteStudent(student._id, student.name);
                              }}
                              className="btn btn--danger btn--small"
                              title="刪除學生"
                            >
                              <Trash2 size={16} />
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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