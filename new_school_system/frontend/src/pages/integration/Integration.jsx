import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Filter,
  GraduationCap,
  Loader,
  RefreshCw,
  School,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  handleApiError,
  schoolHelpers,
  studentHelpers,
  studentReportHelpers,
} from '../../services/api';
import { HK_GRADES, getGradeChinese } from '../../utils/constants';

const Integration = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Updated filter state to match ReportFilters
  const [filters, setFilters] = useState({
    school: '',
    currentAcademicYear: '',
    currentGrade: '',
    student: '',
    month: new Date().getMonth() + 1, // Current month (1-12)
    year: new Date().getFullYear(),
  });

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

  const months = [
    { value: 1, label: '1月' },
    { value: 2, label: '2月' },
    { value: 3, label: '3月' },
    { value: 4, label: '4月' },
    { value: 5, label: '5月' },
    { value: 6, label: '6月' },
    { value: 7, label: '7月' },
    { value: 8, label: '8月' },
    { value: 9, label: '9月' },
    { value: 10, label: '10月' },
    { value: 11, label: '11月' },
    { value: 12, label: '12月' },
  ];

  // Load schools on component mount
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoading(true);
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        const schools = Array.isArray(schoolsData) ? schoolsData : [];
        setSchools(schools);
      } catch (error) {
        console.error('Failed to load schools:', error);
        toast.error('載入學校列表失敗');
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
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

  // Load students when school/academic year/grade changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!filters.school || !filters.currentAcademicYear) {
        setStudents([]);
        return;
      }

      try {
        setLoading(true);
        const params = {
          school: filters.school,
          currentAcademicYear: filters.currentAcademicYear,
          limit: 200,
        };

        // Only add grade filter if a specific grade is selected
        if (filters.currentGrade) {
          params.currentGrade = filters.currentGrade;
        }

        console.log('🔍 Loading students with params:', params);

        const studentsData = await studentHelpers.getAll(params);
        let students = Array.isArray(studentsData) ? studentsData : [];

        console.log('📊 Raw students from API:', students.length);

        // Additional client-side filtering to ensure grade matching
        if (filters.currentGrade) {
          students = students.filter(student => {
            const matches = student.currentGrade === filters.currentGrade;
            if (!matches) {
              console.log(
                `❌ Student ${student.name} grade mismatch: ${student.currentGrade} !== ${filters.currentGrade}`
              );
            }
            return matches;
          });
          console.log('✅ Filtered students by grade:', students.length);
        }

        setStudents(students);
      } catch (error) {
        console.error('Failed to load students:', error);
        toast.error('載入學生列表失敗');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [filters.school, filters.currentAcademicYear, filters.currentGrade]);

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

  const handleFilterChange = newFilters => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSchoolChange = school => {
    handleFilterChange({
      school,
      currentAcademicYear: '',
      currentGrade: '',
      student: '',
    });
  };

  const handleAcademicYearChange = currentAcademicYear => {
    handleFilterChange({
      currentAcademicYear,
      currentGrade: '',
      student: '',
    });
  };

  const handleGradeChange = currentGrade => {
    handleFilterChange({
      currentGrade,
      student: '',
    });
  };

  const handleStudentChange = student => {
    handleFilterChange({ student });
  };

  const resetFilters = () => {
    handleFilterChange({
      school: '',
      currentAcademicYear: '',
      currentGrade: '',
      student: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const generateMonthlyPDF = async () => {
    if (!filters.student) {
      toast.error('請選擇學生');
      return;
    }

    try {
      setGenerating(true);

      const selectedStudent = students.find(s => s._id === filters.student);
      const selectedSchool = schools.find(s => s._id === filters.school);

      if (!selectedStudent) {
        toast.error('找不到學生資料');
        return;
      }

      const records = await studentReportHelpers.getByStudent(filters.student, {
        currentAcademicYear: filters.currentAcademicYear,
        page: 1,
        limit: 100,
      });

      const monthlyRecords = records.filter(record => {
        const recordDate = new Date(record.reportDate || record.createdAt);
        const recordMonth = recordDate.getMonth() + 1;
        const recordYear = recordDate.getFullYear();

        return recordMonth === filters.month && recordYear === filters.year;
      });

      if (monthlyRecords.length === 0) {
        toast.error(`這學生 ${filters.year}年${filters.month}月沒有報告`);
        return;
      }

      monthlyRecords.sort((a, b) => {
        const dateA = new Date(a.reportDate || a.createdAt);
        const dateB = new Date(b.reportDate || b.createdAt);
        return dateA - dateB;
      });

      await createHTMLToPDF(
        selectedStudent,
        selectedSchool,
        monthlyRecords,
        filters.month,
        filters.year
      );

      toast.success('PDF 已成功生成並下載');
    } catch (error) {
      console.error('PDF generation failed:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || 'PDF 生成失敗');
    } finally {
      setGenerating(false);
    }
  };

  const createHTMLToPDF = async (student, school, records, month, year) => {
    const htmlContent = generateHTMLContent(student, school, records, month, year);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };

  const generateHTMLContent = (student, school, records, month, year) => {
    const monthNames = [
      '',
      '一月',
      '二月',
      '三月',
      '四月',
      '五月',
      '六月',
      '七月',
      '八月',
      '九月',
      '十月',
      '十一月',
      '十二月',
    ];

    return `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${student.name} - ${year}年${month}月學習記錄</title>
        <style>
            @media print {
                @page {
                    margin: 1in;
                    size: A4;
                }
                .page-break {
                    page-break-before: always;
                }
            }

            body {
                font-family: "Microsoft YaHei", "SimHei", serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }

            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }

            .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 20px;
            }

            .info-item {
                padding: 5px 0;
            }

            .day-section {
                margin: 30px 0;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 20px;
                page-break-inside: avoid;
            }

            .day-header {
                font-size: 18px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 5px;
            }

            .record-section {
                margin: 15px 0;
            }

            .section-title {
                font-weight: bold;
                color: #374151;
                margin-bottom: 5px;
            }

            .section-content {
                margin-left: 10px;
                color: #6b7280;
            }

            .performance-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 10px;
                margin-left: 10px;
            }

            .no-data {
                color: #9ca3af;
                font-style: italic;
            }

            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">${student.name} - ${year}年${monthNames[month]}學習記錄</div>
            <div class="info-grid">
                <div class="info-item"><strong>學生姓名：</strong>${student.name}</div>
                <div class="info-item"><strong>學校：</strong>${school?.name || '未知'}</div>
                <div class="info-item"><strong>年級：</strong>${getGradeChinese(
                  student.currentGrade
                )}${student.currentClass ? ` ${student.currentClass}班` : ''}</div>
                <div class="info-item"><strong>學年：</strong>${filters.currentAcademicYear}</div>
                <div class="info-item"><strong>月份：</strong>${year}年${monthNames[month]}</div>
                <div class="info-item"><strong>總記錄數：</strong>${records.length}</div>
            </div>
        </div>

        <div class="content">
            ${records
              .map((record, index) => {
                const recordDate = new Date(record.reportDate || record.createdAt);
                const day = recordDate.getDate();

                return `
                    <div class="day-section ${index > 0 ? 'page-break' : ''}">
                        <div class="day-header">${month}月${day}日 (${year}年${month}月${day}日)</div>

                        <div class="record-section">
                            <div class="section-title">課程資訊</div>
                            <div class="section-content">
                                <div><strong>科目：</strong>${
                                  record.subject?.name ||
                                  record.subjectDetails?.subject ||
                                  '<span class="no-data">教師未填寫</span>'
                                }</div>
                                <div><strong>課題：</strong>${
                                  record.subjectDetails?.topic ||
                                  record.topic ||
                                  '<span class="no-data">教師未填寫</span>'
                                }</div>
                                <div><strong>課時：</strong>${
                                  record.subjectDetails?.duration
                                    ? `${record.subjectDetails.duration}分鐘`
                                    : '<span class="no-data">教師未填寫</span>'
                                }</div>
                            </div>
                        </div>

                        <div class="record-section">
                            <div class="section-title">課堂內容</div>
                            <div class="section-content">
                                ${
                                  record.content ||
                                  record.subjectDetails?.content ||
                                  '<span class="no-data">教師未填寫</span>'
                                }
                            </div>
                        </div>

                        ${
                          record.performance
                            ? `
                        <div class="record-section">
                            <div class="section-title">學習表現</div>
                            <div class="performance-grid">
                                <div><strong>出勤：</strong>${
                                  record.performance.attendance?.status
                                    ? {
                                        present: '出席',
                                        absent: '缺席',
                                        late: '遲到',
                                        early_leave: '早退',
                                      }[record.performance.attendance.status] ||
                                      record.performance.attendance.status
                                    : '<span class="no-data">未填寫</span>'
                                }</div>
                                 <div><strong>參與程度：</strong>${
                                   record.performance.participation?.level
                                     ? translatePerformanceLevel(
                                         record.performance.participation.level
                                       )
                                     : '<span class="no-data">未填寫</span>'
                                 }</div>
                                <div><strong>理解程度：</strong>${
                                  record.performance.understanding?.level
                                    ? translatePerformanceLevel(
                                        record.performance.understanding.level
                                      )
                                    : '<span class="no-data">未填寫</span>'
                                }</div>
                            </div>
                        </div>
                        `
                            : `
                        <div class="record-section">
                            <div class="section-title">學習表現</div>
                            <div class="section-content">
                                <span class="no-data">教師未填寫</span>
                            </div>
                        </div>
                        `
                        }

                        <div class="record-section">
                            <div class="section-title">備註</div>
                            <div class="section-content">
                                ${(() => {
                                  if (!record.remarks) {
                                    return '<span class="no-data">教師未填寫</span>';
                                  }

                                  if (typeof record.remarks === 'string') {
                                    return record.remarks;
                                  }

                                  if (typeof record.remarks === 'object') {
                                    let remarkHtml = '';

                                    if (record.remarks.teacher_comments) {
                                      remarkHtml += `<div><strong>教師評語：</strong>${record.remarks.teacher_comments}</div>`;
                                    } else {
                                      remarkHtml += `<div><strong>教師評語：</strong><span class="no-data">未填寫</span></div>`;
                                    }

                                    if (
                                      record.remarks.strengths &&
                                      record.remarks.strengths.length > 0
                                    ) {
                                      remarkHtml += `<div><strong>優點：</strong>${record.remarks.strengths.join(
                                        '、'
                                      )}</div>`;
                                    }

                                    if (
                                      record.remarks.areas_for_improvement &&
                                      record.remarks.areas_for_improvement.length > 0
                                    ) {
                                      remarkHtml += `<div><strong>改進方向：</strong>${record.remarks.areas_for_improvement.join(
                                        '、'
                                      )}</div>`;
                                    }

                                    if (
                                      record.remarks.recommendations &&
                                      record.remarks.recommendations.length > 0
                                    ) {
                                      remarkHtml += `<div><strong>建議：</strong>${record.remarks.recommendations.join(
                                        '、'
                                      )}</div>`;
                                    }

                                    return remarkHtml || '<span class="no-data">教師未填寫</span>';
                                  }

                                  return '<span class="no-data">教師未填寫</span>';
                                })()}
                            </div>
                        </div>
                    </div>
                `;
              })
              .join('')}
        </div>

        <div class="footer">
            <div>生成時間：${new Date().toLocaleString('zh-TW')}</div>
            <div>香港教師系統 - 學習記錄報告</div>
        </div>
    </body>
    </html>
    `;
  };

  const selectedStudent = students.find(s => s._id === filters.student);
  const selectedSchool = schools.find(s => s._id === filters.school);
  const availableGrades = getAvailableGrades();

  return (
    <div className="integration-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__content">
          <div className="page-header__icon">
            <FileText size={32} />
          </div>
          <div>
            <h1 className="page-title">整合報告</h1>
            <p className="page-subtitle">生成學生的月度學習記錄 PDF 報告</p>
          </div>
        </div>

        <div className="page-header__actions">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn--secondary">
            <Filter size={20} />
            {showFilters ? '隱藏篩選' : '顯示篩選'}
          </button>
        </div>
      </div>

      {/* Updated Filters to match ReportFilters */}
      {showFilters && (
        <div className="reports-filters-section">
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
                    onChange={e => handleSchoolChange(e.target.value)}
                    className="filter-select"
                    disabled={loading || schools.length === 0}
                  >
                    <option value="">請選擇學校</option>
                    {schools.map(school => (
                      <option key={school._id} value={school._id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="filter-select-icon" />
                </div>
                {schools.length === 0 && <div className="filter-help">沒有可用的學校</div>}
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
                    onChange={e => handleAcademicYearChange(e.target.value)}
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
                {!filters.school && <div className="filter-help">請先選擇學校</div>}
                {filters.school && academicYears.length === 0 && !loadingAcademicYears && (
                  <div className="filter-help">該學校沒有學年記錄</div>
                )}
                {loadingAcademicYears && <div className="filter-help">載入學年中...</div>}
              </div>

              {/* Grade Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <GraduationCap size={16} />
                  年級
                </label>
                <div className="filter-select-wrapper">
                  <select
                    value={filters.currentGrade}
                    onChange={e => handleGradeChange(e.target.value)}
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
                {!filters.school && <div className="filter-help">請先選擇學校</div>}
                {!filters.currentAcademicYear && filters.school && (
                  <div className="filter-help">請先選擇學年</div>
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
                    onChange={e => handleStudentChange(e.target.value)}
                    className="filter-select"
                    disabled={
                      loading ||
                      !filters.school ||
                      !filters.currentAcademicYear ||
                      students.length === 0
                    }
                  >
                    <option value="">請選擇學生</option>
                    {students.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name}
                        {student.studentId && ` (${student.studentId})`}
                        {student.currentGrade && ` - ${getGradeChinese(student.currentGrade)}`}
                        {student.currentClass && `${student.currentClass}班`}
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && ` [${student.currentGrade}]`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="filter-select-icon" />
                </div>
                {!filters.school && <div className="filter-help">請先選擇學校</div>}
                {!filters.currentAcademicYear && filters.school && (
                  <div className="filter-help">請先選擇學年</div>
                )}
                {filters.school &&
                  filters.currentAcademicYear &&
                  students.length === 0 &&
                  !loading && (
                    <div className="filter-help">
                      {filters.currentGrade
                        ? `該學校/學年/${getGradeChinese(filters.currentGrade)}沒有學生記錄`
                        : '該學校/學年沒有學生記錄'}
                    </div>
                  )}
                {loading && filters.school && filters.currentAcademicYear && (
                  <div className="filter-help">載入學生列表中...</div>
                )}
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && students.length > 0 && (
                  <div className="filter-help" style={{ fontSize: '12px', color: '#666' }}>
                    找到 {students.length} 位學生
                    {filters.currentGrade && ` (年級: ${filters.currentGrade})`}
                  </div>
                )}
              </div>

              {/* Year Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  年份
                </label>
                <div className="filter-select-wrapper">
                  <select
                    value={filters.year}
                    onChange={e => handleFilterChange({ year: parseInt(e.target.value) })}
                    className="filter-select"
                  >
                    <option value={new Date().getFullYear()}>{new Date().getFullYear()}年</option>
                    <option value={new Date().getFullYear() - 1}>
                      {new Date().getFullYear() - 1}年
                    </option>
                    <option value={new Date().getFullYear() + 1}>
                      {new Date().getFullYear() + 1}年
                    </option>
                  </select>
                  <ChevronDown size={16} className="filter-select-icon" />
                </div>
              </div>

              {/* Month Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  月份
                </label>
                <div className="filter-select-wrapper">
                  <select
                    value={filters.month}
                    onChange={e => handleFilterChange({ month: parseInt(e.target.value) })}
                    className="filter-select"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="filter-select-icon" />
                </div>
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
                    <strong>{students.find(s => s._id === filters.student)?.name}</strong>
                  </span>
                ) : (
                  <span className="filter-summary__text filter-summary__text--muted">
                    請選擇學生以生成報告
                  </span>
                )}
              </div>
            </div>
          </div>
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
                <span className="student-card__school">{selectedSchool?.name}</span>
                <span className="student-card__year">{filters.currentAcademicYear}學年</span>
                <span className="student-card__month">
                  {filters.year}年{filters.month}月
                </span>
              </div>
            </div>
            <div className="student-card__actions">
              <button
                onClick={generateMonthlyPDF}
                disabled={!filters.student || generating}
                className="btn btn--primary"
              >
                {generating ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    生成 PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Reports Message */}
      {selectedStudent && !generating && (
        <div className="no-reports-check">
          <NoReportsMessage
            student={selectedStudent}
            filters={filters}
            onGeneratePDF={generateMonthlyPDF}
            generating={generating}
          />
        </div>
      )}

      {/* Instructions */}
      {!selectedStudent && (
        <div className="integration-instructions">
          <div className="instruction-card">
            <div className="instruction-card__icon">
              <AlertCircle size={48} />
            </div>
            <div className="instruction-card__content">
              <h3 className="instruction-card__title">如何生成月度報告</h3>
              <div className="instruction-card__steps">
                <div className="instruction-step">
                  <CheckCircle size={20} />
                  <span>選擇學校和學年</span>
                </div>
                <div className="instruction-step">
                  <CheckCircle size={20} />
                  <span>選擇年級和學生</span>
                </div>
                <div className="instruction-step">
                  <CheckCircle size={20} />
                  <span>選擇要生成報告的年份和月份</span>
                </div>
                <div className="instruction-step">
                  <CheckCircle size={20} />
                  <span>點擊"生成 PDF"按鈕下載報告</span>
                </div>
              </div>
              <p className="instruction-card__note">
                注意：PDF 報告將包含該學生在選定月份的所有學習記錄，每日記錄將分別顯示在不同頁面。
                如果某些欄位未填寫，報告中會註明"教師未填寫"。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component to check and display no reports message
const NoReportsMessage = ({ student, filters, onGeneratePDF, generating }) => {
  const [checkingReports, setCheckingReports] = useState(false);
  const [hasReports, setHasReports] = useState(null);

  useEffect(() => {
    const checkForReports = async () => {
      if (!student || !filters.currentAcademicYear) {
        setHasReports(null);
        return;
      }

      try {
        setCheckingReports(true);
        const records = await studentReportHelpers.getByStudent(student._id, {
          currentAcademicYear: filters.currentAcademicYear,
          page: 1,
          limit: 100,
        });

        const monthlyRecords = records.filter(record => {
          const recordDate = new Date(record.reportDate || record.createdAt);
          const recordMonth = recordDate.getMonth() + 1;
          const recordYear = recordDate.getFullYear();

          return recordMonth === filters.month && recordYear === filters.year;
        });

        setHasReports(monthlyRecords.length > 0);
      } catch (error) {
        console.error('Error checking for reports:', error);
        setHasReports(false);
      } finally {
        setCheckingReports(false);
      }
    };

    checkForReports();
  }, [student._id, filters.currentAcademicYear, filters.month, filters.year]);

  if (checkingReports) {
    return (
      <div className="reports-status-card">
        <div className="reports-status-card__content">
          <Loader size={20} className="animate-spin" />
          <span>檢查報告中...</span>
        </div>
      </div>
    );
  }

  if (hasReports === false) {
    return (
      <div className="reports-status-card reports-status-card--warning">
        <div className="reports-status-card__icon">
          <AlertCircle size={24} />
        </div>
        <div className="reports-status-card__content">
          <h4 className="reports-status-card__title">沒有找到報告</h4>
          <p className="reports-status-card__message">
            這學生 {filters.year}年{filters.month}月沒有報告
          </p>
          <p className="reports-status-card__suggestion">
            請選擇其他月份，或確認該學生在此期間是否有學習記錄。
          </p>
        </div>
      </div>
    );
  }

  if (hasReports === true) {
    return (
      <div className="reports-status-card reports-status-card--success">
        <div className="reports-status-card__icon">
          <CheckCircle size={24} />
        </div>
        <div className="reports-status-card__content">
          <h4 className="reports-status-card__title">找到報告</h4>
          <p className="reports-status-card__message">
            {student.name} 在 {filters.year}年{filters.month}月有學習記錄
          </p>
          <button onClick={onGeneratePDF} disabled={generating} className="btn btn--primary">
            {generating ? (
              <>
                <Loader size={20} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download size={20} />
                生成 PDF
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Integration;
