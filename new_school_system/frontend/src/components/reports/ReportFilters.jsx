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

const ReportFilters = ({ 
  filters, 
  onFilterChange, 
  schools = [], 
  students = [], 
  loading = false 
}) => {
  const { user, isAdmin } = useAuth();

  // Generate academic years (current year and next 3 years)
  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    for (let i = 0; i < 4; i++) {
      const year = currentYear + i;
      const nextYear = year + 1;
      years.push(`${year}/${nextYear.toString().slice(-2)}`);
    }
    
    return years;
  };

  const academicYears = generateAcademicYears();

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

  // Reset dependent filters when parent filter changes
  const handleAcademicYearChange = (academicYear) => {
    onFilterChange({
      academicYear,
      school: '',
      grade: '',
      student: ''
    });
  };

  const handleSchoolChange = (school) => {
    onFilterChange({
      school,
      grade: '',
      student: ''
    });
  };

  const handleGradeChange = (grade) => {
    onFilterChange({
      grade,
      student: ''
    });
  };

  const handleStudentChange = (student) => {
    onFilterChange({ student });
  };

  const resetFilters = () => {
    onFilterChange({
      academicYear: academicYears[0],
      school: '',
      grade: '',
      student: ''
    });
  };

  const availableSchools = schools;

  return (
    <div className="report-filters">
      <div className="filter-grid">
        {/* Academic Year Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <Calendar size={16} />
            學年
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.academicYear}
              onChange={(e) => handleAcademicYearChange(e.target.value)}
              className="filter-select"
              disabled={loading}
            >
              {academicYears.map(year => (
                <option key={year} value={year}>
                  {year}學年
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="filter-select-icon" />
          </div>
        </div>

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

        {/* Grade Filter */}
        <div className="filter-group">
          <label className="filter-label">
            <GraduationCap size={16} />
            年級
          </label>
          <div className="filter-select-wrapper">
            <select
              value={filters.grade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="filter-select"
              disabled={loading || !filters.school}
            >
              <option value="">所有年級</option>
              {availableGrades.map(grade => (
                <option key={grade} value={grade}>
                  {getGradeChinese(grade)}
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
              disabled={loading || !filters.school || students.length === 0}
            >
              <option value="">請選擇學生</option>
              {students.map(student => (
                <option key={student._id} value={student._id}>
                  {student.name} 
                  {student.studentId && ` (${student.studentId})`}
                  {student.class && ` - ${getGradeChinese(student.grade)}${student.class}班`}
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
          {filters.school && students.length === 0 && !loading && (
            <div className="filter-help">
              該學校/年級沒有學生記錄
            </div>
          )}
          {loading && filters.school && (
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