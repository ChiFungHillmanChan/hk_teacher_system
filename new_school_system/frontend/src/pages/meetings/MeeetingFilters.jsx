import {
  BookOpen,
  Calendar,
  ChevronDown,
  GraduationCap,
  Lock,
  RefreshCw,
  School,
  Search,
  Unlock,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers, studentHelpers } from '../../services/api';
import { HK_GRADES, getGradeChinese } from '../../utils/constants';

const MeetingFilters = ({
  filters,
  onFilterChange,
  schools = [],
  students = [],
  loading = false,
}) => {
  const { user, isAdmin } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedSelection, setLockedSelection] = useState(null);

  // Meeting types
  const meetingTypes = [
    { value: 'regular', label: '普通會議', icon: <BookOpen size={14} /> },
    { value: 'iep', label: 'IEP會議', icon: <UserCheck size={14} /> },
  ];

  // Load locked selection from localStorage on mount
  useEffect(() => {
    const savedSelection = localStorage.getItem('meetingFiltersLocked');
    if (savedSelection) {
      try {
        const parsed = JSON.parse(savedSelection);
        setLockedSelection(parsed);
        setIsLocked(true);
        // Auto-apply locked selection
        onFilterChange(parsed.filters);
      } catch (error) {
        console.error('Failed to parse locked selection:', error);
        localStorage.removeItem('meetingFiltersLocked');
      }
    }
  }, []);

  // Load academic years when school changes
  useEffect(() => {
    const loadAcademicYears = async () => {
      if (!filters.school) {
        setAcademicYears([]);
        return;
      }

      try {
        setLoadingAcademicYears(true);
        const academicYearsData = await schoolHelpers.getAvailableAcademicYears(filters.school);
        setAcademicYears(academicYearsData.academicYears || []);
      } catch (error) {
        console.error('❌ Failed to load academic years:', error);
        const currentYear = new Date().getFullYear();
        const fallbackYears = [];
        for (let i = -1; i < 4; i++) {
          const year = currentYear + i;
          const nextYear = year + 1;
          fallbackYears.push(`${year}/${nextYear.toString().slice(-2)}`);
        }
        setAcademicYears(fallbackYears);
      } finally {
        setLoadingAcademicYears(false);
      }
    };

    loadAcademicYears();
  }, [filters.school]);

  // Load all students when all required filters are selected
  useEffect(() => {
    const loadAllStudents = async () => {
      if (!filters.school || !filters.academicYear || !filters.currentGrade) {
        setAllStudents([]);
        setFilteredStudents([]);
        return;
      }

      try {
        setLoadingStudents(true);
        const params = {
          school: filters.school,
          currentAcademicYear: filters.academicYear,
          currentGrade: filters.currentGrade,
          limit: 1000,
        };

        const studentsData = await studentHelpers.getAll(params);
        const studentsList = Array.isArray(studentsData) ? studentsData : [];

        const filteredStudentsList = studentsList.filter(student => {
          const academicYearMatch = student.currentAcademicYear === filters.academicYear;
          const gradeMatch = student.currentGrade === filters.currentGrade;
          return academicYearMatch && gradeMatch;
        });

        setAllStudents(filteredStudentsList);
        setFilteredStudents(filteredStudentsList);
      } catch (error) {
        console.error('❌ Failed to load students:', error);
        setAllStudents([]);
        setFilteredStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadAllStudents();
  }, [filters.school, filters.academicYear, filters.currentGrade]);

  // Filter students based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(allStudents);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allStudents.filter(student => {
      const nameMatch = student.name?.toLowerCase().includes(query);
      const nameEnMatch = student.nameEn?.toLowerCase().includes(query);
      const studentIdMatch = student.studentId?.toLowerCase().includes(query);
      return nameMatch || nameEnMatch || studentIdMatch;
    });

    setFilteredStudents(filtered);
  }, [searchQuery, allStudents]);

  // Get available grades based on selected school
  const getAvailableGrades = () => {
    if (!filters.school) return HK_GRADES.ALL;

    const selectedSchool = schools.find(school => school._id === filters.school);
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

  const availableGrades = getAvailableGrades();

  // Check if all required filters are selected for student selection
  const canSelectStudent =
    filters.meetingType && filters.school && filters.academicYear && filters.currentGrade;

  // Filter change handlers with cascading resets
  const handleMeetingTypeChange = meetingType => {
    onFilterChange({
      meetingType,
      school: '',
      academicYear: '',
      currentGrade: '',
      student: '',
    });
    setSearchQuery('');
  };

  const handleSchoolChange = school => {
    onFilterChange({
      school,
      academicYear: '',
      currentGrade: '',
      student: '',
    });
    setSearchQuery('');
  };

  const handleAcademicYearChange = academicYear => {
    onFilterChange({
      academicYear,
      currentGrade: '',
      student: '',
    });
    setSearchQuery('');
  };

  const handleGradeChange = currentGrade => {
    onFilterChange({
      currentGrade,
      student: '',
    });
    setSearchQuery('');
  };

  const handleStudentChange = student => {
    onFilterChange({ student });
    // Find the student and set search query to their name
    const selectedStudent = filteredStudents.find(s => s._id === student);
    if (selectedStudent) {
      setSearchQuery(selectedStudent.name);
    }
  };

  const handleStudentSelect = studentId => {
    handleStudentChange(studentId);
  };

  const resetFilters = () => {
    if (isLocked) {
      handleUnlock(); // Unlock first
    }
    onFilterChange({
      meetingType: '',
      academicYear: '',
      school: '',
      currentGrade: '',
      student: '',
    });
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (filters.student) {
      onFilterChange({ student: '' });
    }
  };

  // Lock/Unlock functionality
  const handleLock = () => {
    if (!canSelectStudent) return;

    const selectionToLock = {
      filters: {
        meetingType: filters.meetingType,
        school: filters.school,
        academicYear: filters.academicYear,
        currentGrade: filters.currentGrade,
      },
      schoolName: schools.find(s => s._id === filters.school)?.name,
      gradeName: getGradeChinese(filters.currentGrade),
      timestamp: new Date().toISOString(),
    };

    setLockedSelection(selectionToLock);
    setIsLocked(true);
    localStorage.setItem('meetingFiltersLocked', JSON.stringify(selectionToLock));
  };

  const handleUnlock = () => {
    setIsLocked(false);
    setLockedSelection(null);
    localStorage.removeItem('meetingFiltersLocked');
  };

  const getSelectedStudentInfo = () => {
    if (!filters.student) return null;
    return allStudents.find(s => s._id === filters.student);
  };

  return (
    <div className="meeting-filters-compact">
      {/* Lock Status Display */}
      {isLocked && lockedSelection && (
        <div className="lock-status-bar">
          <div className="lock-info">
            <Lock size={16} />
            <span>已鎖定選擇:</span>
            <span className="lock-details">
              {lockedSelection.filters.meetingType === 'regular' ? '普通會議' : 'IEP會議'} •
              {lockedSelection.schoolName} •{lockedSelection.filters.academicYear}學年 •
              {lockedSelection.gradeName}
            </span>
          </div>
          <button onClick={handleUnlock} className="unlock-btn">
            <Unlock size={14} />
            解鎖
          </button>
        </div>
      )}

      {/* Meeting Type Selection - Prominent at Top */}
      <div className="meeting-type-section">
        <label className="meeting-type-label">1. 選擇會議類型</label>
        <div className="meeting-type-buttons-large">
          {meetingTypes.map(type => (
            <button
              key={type.value}
              onClick={() => handleMeetingTypeChange(type.value)}
              className={`meeting-type-btn-large ${
                filters.meetingType === type.value ? 'meeting-type-btn-large--active' : ''
              }`}
              disabled={loading || isLocked}
            >
              {type.icon}
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Filter Row - School, Year, Grade */}
      <div className="filter-row-compact">
        <div className="filter-item">
          <label className="filter-label-compact">
            <School size={14} />
            2. 學校
          </label>
          <div className="select-wrapper-compact">
            <select
              value={filters.school}
              onChange={e => handleSchoolChange(e.target.value)}
              className="select-compact"
              disabled={loading || schools.length === 0 || !filters.meetingType || isLocked}
            >
              <option value="">選擇學校</option>
              {schools.map(school => (
                <option key={school._id} value={school._id}>
                  {school.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon-compact" />
          </div>
        </div>

        <div className="filter-item">
          <label className="filter-label-compact">
            <Calendar size={14} />
            3. 學年
          </label>
          <div className="select-wrapper-compact">
            <select
              value={filters.academicYear}
              onChange={e => handleAcademicYearChange(e.target.value)}
              className="select-compact"
              disabled={loading || loadingAcademicYears || !filters.school || isLocked}
            >
              <option value="">選擇學年</option>
              {academicYears.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon-compact" />
          </div>
        </div>

        <div className="filter-item">
          <label className="filter-label-compact">
            <GraduationCap size={14} />
            4. 年級
          </label>
          <div className="select-wrapper-compact">
            <select
              value={filters.currentGrade}
              onChange={e => handleGradeChange(e.target.value)}
              className="select-compact"
              disabled={loading || !filters.school || !filters.academicYear || isLocked}
            >
              <option value="">選擇年級</option>
              {availableGrades.map(currentGrade => (
                <option key={currentGrade} value={currentGrade}>
                  {getGradeChinese(currentGrade)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon-compact" />
          </div>
        </div>

        {/* Lock/Reset Buttons */}
        <div className="filter-actions-compact">
          {canSelectStudent && !isLocked && (
            <button onClick={handleLock} className="lock-btn-compact" title="鎖定當前選擇">
              <Lock size={14} />
            </button>
          )}
          <button
            onClick={resetFilters}
            className="reset-btn-compact"
            disabled={loading}
            title="重置所有篩選"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Student Selection Section - Only show when all filters are selected */}
      {canSelectStudent && (
        <div className="student-selection-section">
          <div className="student-selection-header">
            <h3>選擇學生</h3>
            <span className="student-count">({filteredStudents.length} 位學生)</span>
          </div>

          {/* Student Search Bar */}
          <div className="student-search-section">
            <div className="search-input-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋學生姓名、英文名或學號..."
                className="student-search-input"
                disabled={loadingStudents}
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="search-clear-btn">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchQuery && filteredStudents.length > 0 && (
              <div className="search-results-dropdown">
                {filteredStudents.slice(0, 8).map(student => (
                  <div
                    key={student._id}
                    onClick={() => handleStudentSelect(student._id)}
                    className={`search-result-item ${
                      filters.student === student._id ? 'search-result-item--selected' : ''
                    }`}
                  >
                    <div className="student-avatar">{student.name?.charAt(0)?.toUpperCase()}</div>
                    <div className="student-details">
                      <div className="student-name">{student.name}</div>
                      <div className="student-meta">
                        {student.studentId && <span>{student.studentId}</span>}
                        {student.studentId && <span> • </span>}
                        <span>{student.currentClass}班</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredStudents.length > 8 && (
                  <div className="search-results-more">
                    還有 {filteredStudents.length - 8} 個結果...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Student Dropdown */}
          <div className="student-dropdown-section">
            <label className="filter-label-compact">
              <User size={14} />
              或從下拉選單選擇
            </label>
            <div className="select-wrapper-compact">
              <select
                value={filters.student}
                onChange={e => handleStudentChange(e.target.value)}
                className="select-compact"
                disabled={loadingStudents}
              >
                <option value="">請選擇學生</option>
                {filteredStudents.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name}
                    {student.studentId && ` (${student.studentId})`}
                    {student.currentClass && ` - ${student.currentClass}班`}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="select-icon-compact" />
            </div>
          </div>

          {/* Loading/Error States */}
          {loadingStudents && <div className="student-loading">載入學生列表中...</div>}

          {!loadingStudents && filteredStudents.length === 0 && (
            <div className="no-students">該年級沒有學生記錄</div>
          )}
        </div>
      )}

      {/* Selected Student Display */}
      {filters.student && (
        <div className="selected-student-display">
          <div className="selected-student-info">
            <div className="student-avatar-selected">
              {getSelectedStudentInfo()?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="student-details-selected">
              <div className="student-name-selected">{getSelectedStudentInfo()?.name}</div>
              <div className="student-meta-selected">
                {getSelectedStudentInfo()?.studentId && (
                  <span>{getSelectedStudentInfo().studentId}</span>
                )}
                {getSelectedStudentInfo()?.studentId && <span> • </span>}
                <span>
                  {getGradeChinese(getSelectedStudentInfo()?.currentGrade)}
                  {getSelectedStudentInfo()?.currentClass}班
                </span>
                <span> • </span>
                <span>{filters.academicYear}學年</span>
                <span> • </span>
                <span>{filters.meetingType === 'regular' ? '普通會議' : 'IEP會議'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Progress */}
      <div className="filter-progress-compact">
        <div className="progress-steps">
          <div
            className={`progress-step ${
              filters.meetingType ? 'progress-step--completed' : 'progress-step--current'
            }`}
          >
            <span className="step-number">1</span>
            <span className="step-label">會議類型</span>
          </div>
          <div
            className={`progress-step ${
              filters.school
                ? 'progress-step--completed'
                : !filters.meetingType
                ? 'progress-step--disabled'
                : 'progress-step--current'
            }`}
          >
            <span className="step-number">2</span>
            <span className="step-label">學校</span>
          </div>
          <div
            className={`progress-step ${
              filters.academicYear
                ? 'progress-step--completed'
                : !filters.school
                ? 'progress-step--disabled'
                : 'progress-step--current'
            }`}
          >
            <span className="step-number">3</span>
            <span className="step-label">學年</span>
          </div>
          <div
            className={`progress-step ${
              filters.currentGrade
                ? 'progress-step--completed'
                : !filters.academicYear
                ? 'progress-step--disabled'
                : 'progress-step--current'
            }`}
          >
            <span className="step-number">4</span>
            <span className="step-label">年級</span>
          </div>
          <div
            className={`progress-step ${
              filters.student
                ? 'progress-step--completed'
                : !canSelectStudent
                ? 'progress-step--disabled'
                : 'progress-step--current'
            }`}
          >
            <span className="step-number">5</span>
            <span className="step-label">學生</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingFilters;
