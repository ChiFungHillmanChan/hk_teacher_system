import React, { useState, useEffect } from 'react';
import { 
  Calendar,
  School,
  GraduationCap,
  User,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { HK_GRADES, getGradeChinese } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers } from '../../services/api';

const ReportFilters = ({ 
  filters, 
  onFilterChange, 
  schools = [], 
  students = [], 
  loading = false 
}) => {
  const { user, isAdmin } = useAuth();
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);

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
        // Fallback to generated years if API fails
        const currentYear = new Date().getFullYear();
        const fallbackYears = [];
        for (let i = 0; i < 4; i++) {
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


  const handleSchoolChange = (school) => {
    onFilterChange({
      school,
      currentAcademicYear: '', 
      currentGrade: '',
      student: ''
    });
  };

  const handleAcademicYearChange = (currentAcademicYear) => {
    onFilterChange({
      currentAcademicYear,
      currentGrade: '', 
      student: ''
    });
  };

  const handleGradeChange = (currentGrade) => {
    onFilterChange({
      currentGrade,
      student: ''
    });
  };

  const handleStudentChange = (student) => {
    onFilterChange({ student });
  };

  const resetFilters = () => {
    onFilterChange({
      currentAcademicYear: '',
      school: '',
      currentGrade: '',
      student: ''
    });
  };

  const availableSchools = schools;

  return (
    <div className="report-filters">
      <div className="filter-grid">
        {/* School Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <School size={16} />
            學校
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.school}
              onChange={(e) => handleSchoolChange(e.target.value)}
              className="filter-select"
              disabled={loading || availableSchools.length === 0}
            >
              <option value="">請選擇學校</option>
              {availableSchools.map(school => (
                <option key={school._id} value={school._id}>
                  {school.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-select-icon" />
          </div>
          {availableSchools.length === 0 && (
            <div className="filter-help">
              沒有可用的學校
            </div>
          )}
        </div>

        {/* Academic Year Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <Calendar size={16} />
            學年
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.currentAcademicYear}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
              className="filter-select"
              disabled={loading || loadingAcademicYears || !filters.school}
            >
              <option value="">請選擇學年</option>
              {academicYears.map(year => (
                <option key={year} value={year}>
                  {year}學年
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-select-icon" />
          </div>
          {!filters.school && (
            <div className="filter-help">
              請先選擇學校
            </div>
          )}
          {filters.school && academicYears.length === 0 && !loadingAcademicYears && (
            <div className="filter-help">
              該學校沒有學年記錄
            </div>
          )}
          {loadingAcademicYears && (
            <div className="filter-help">
              載入學年中...
            </div>
          )}
        </div>

        {/* currentGrade Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <GraduationCap size={16} />
            年級
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.currentGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="filter-select"
              disabled={loading || !filters.school || !filters.currentAcademicYear}
            >
              <option value="">所有年級</option>
              {availableGrades.map(currentGrade => (
                <option key={currentGrade} value={currentGrade}>
                  {getGradeChinese(currentGrade)}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-select-icon" />
          </div>
          {!filters.school && (
            <div className="filter-help">
              請先選擇學校
            </div>
          )}
          {!filters.currentAcademicYear && filters.school && (
            <div className="filter-help">
              請先選擇學年
            </div>
          )}
        </div>

        {/* Student Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <User size={16} />
            學生
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.student}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="filter-select"
              disabled={loading || !filters.school || !filters.currentAcademicYear || students.length === 0}
            >
              <option value="">請選擇學生</option>
              {students.map(student => (
                <option key={student._id} value={student._id}>
                  {student.name} 
                  {student.studentId && ` (${student.studentId})`}
                  {student.currentClass && ` - ${getGradeChinese(student.currentGrade)}${student.currentClass}班`}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-select-icon" />
          </div>
          {!filters.school && (
            <div className="filter-help">
              請先選擇學校
            </div>
          )}
          {!filters.currentAcademicYear && filters.school && (
            <div className="filter-help">
              請先選擇學年
            </div>
          )}
          {filters.school && filters.currentAcademicYear && students.length === 0 && !loading && (
            <div className="filter-help">
              該學校/學年/年級沒有學生記錄
            </div>
          )}
          {loading && filters.school && filters.currentAcademicYear && (
            <div className="filter-help">
              載入學生列表中...
            </div>
          )}
        </div>
      </div>

      {/* Filter Actions */}
      <div className="filter-actions">
        <button
          onClick={resetFilters}
          className="btn btn--small btn--secondary"
          disabled={loading}
        >
          <RefreshCw size={16} />
          重置篩選
        </button>
        
        <div className="filter-summary">
          {filters.student ? (
            <span className="filter-summary__text">
              已選擇學生：
              <strong>
                {students.find(s => s._id === filters.student)?.name}
              </strong>
            </span>
          ) : (
            <span className="filter-summary__text filter-summary__text--muted">
              請選擇學生以查看記錄
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;