import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Filter,
  Loader,
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
  const [showFilters, setShowFilters] = useState(true);

  // Filter state
  const [filters, setFilters] = useState({
    academicYear: generateAcademicYears()[0],
    school: '',
    grade: '',
    student: '',
    month: new Date().getMonth() + 1, // Current month (1-12)
    year: new Date().getFullYear(),
  });

  // Generate academic years (current year and next 3 years)
  function generateAcademicYears() {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = 0; i < 4; i++) {
      const year = currentYear + i;
      const nextYear = year + 1;
      years.push(`${year}/${nextYear.toString().slice(-2)}`);
    }

    return years;
  }

  const academicYears = generateAcademicYears();
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
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        const schools = Array.isArray(schoolsData) ? schoolsData : [];
        setSchools(schools);
      } catch (error) {
        console.error('Failed to load schools:', error);
        toast.error('載入學校列表失敗');
      }
    };

    loadSchools();
  }, []);

  // Load students when school/grade changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!filters.school) {
        setStudents([]);
        return;
      }

      try {
        const params = { school: filters.school, limit: 200 };
        if (filters.grade) {
          params.grade = filters.grade;
        }

        const studentsData = await studentHelpers.getAll(params);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      } catch (error) {
        console.error('Failed to load students:', error);
        toast.error('載入學生列表失敗');
      }
    };

    loadStudents();
  }, [filters.school, filters.grade]);

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

  const generateMonthlyPDF = async () => {
    if (!filters.student) {
      toast.error('請選擇學生');
      return;
    }

    try {
      setGenerating(true);

      // Get student info
      const selectedStudent = students.find(s => s._id === filters.student);
      const selectedSchool = schools.find(s => s._id === filters.school);

      if (!selectedStudent) {
        toast.error('找不到學生資料');
        return;
      }

      // Fetch all records for the student in the specified month/year
      const records = await studentReportHelpers.getByStudent(filters.student, {
        academicYear: filters.academicYear,
        page: 1,
        limit: 100,
      });

      console.log('All records fetched:', records);

      // Filter records by selected month and year
      const monthlyRecords = records.filter(record => {
        const recordDate = new Date(record.reportDate || record.createdAt);
        const recordMonth = recordDate.getMonth() + 1;
        const recordYear = recordDate.getFullYear();

        console.log(`Record date: ${recordDate}, Month: ${recordMonth}, Year: ${recordYear}`);
        console.log(`Filter month: ${filters.month}, Filter year: ${filters.year}`);

        return recordMonth === filters.month && recordYear === filters.year;
      });

      console.log('Filtered monthly records:', monthlyRecords);

      if (monthlyRecords.length === 0) {
        toast.error(`${filters.year}年${filters.month}月沒有找到任何記錄`);
        return;
      }

      // Sort records by date
      monthlyRecords.sort((a, b) => {
        const dateA = new Date(a.reportDate || a.createdAt);
        const dateB = new Date(b.reportDate || b.createdAt);
        return dateA - dateB;
      });

      // Generate PDF using HTML-to-PDF method
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
    // Create HTML content
    const htmlContent = generateHTMLContent(student, school, records, month, year);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait a bit for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      // Close the window after printing
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
                <div class="info-item"><strong>年級：</strong>${getGradeChinese(student.grade)}${
      student.class ? ` ${student.class}班` : ''
    }</div>
                <div class="info-item"><strong>學年：</strong>${filters.academicYear}</div>
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
                                <div><strong>參與：</strong>${
                                  record.performance.participation?.level
                                    ? {
                                        excellent: '優秀',
                                        good: '良好',
                                        average: '一般',
                                        needs_improvement: '需改進',
                                      }[record.performance.participation.level] ||
                                      record.performance.participation.level
                                    : '<span class="no-data">未填寫</span>'
                                }</div>
                                <div><strong>理解：</strong>${
                                  record.performance.understanding?.level ||
                                  '<span class="no-data">未填寫</span>'
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

      {/* Filters */}
      {showFilters && (
        <div className="reports-filters-section">
          <div className="report-filters">
            <div className="filter-grid">
              {/* Academic Year */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  學年
                </label>
                <select
                  value={filters.academicYear}
                  onChange={e =>
                    handleFilterChange({
                      academicYear: e.target.value,
                      school: '',
                      grade: '',
                      student: '',
                    })
                  }
                  className="filter-select"
                  disabled={loading}
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>
                      {year}學年
                    </option>
                  ))}
                </select>
              </div>

              {/* School */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  學校
                </label>
                <select
                  value={filters.school}
                  onChange={e =>
                    handleFilterChange({ school: e.target.value, grade: '', student: '' })
                  }
                  className="filter-select"
                  disabled={loading}
                >
                  <option value="">選擇學校</option>
                  {schools.map(school => (
                    <option key={school._id} value={school._id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  年級
                </label>
                <select
                  value={filters.grade}
                  onChange={e => handleFilterChange({ grade: e.target.value, student: '' })}
                  className="filter-select"
                  disabled={loading || !filters.school}
                >
                  <option value="">選擇年級</option>
                  {getAvailableGrades().map(grade => (
                    <option key={grade} value={grade}>
                      {getGradeChinese(grade)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student */}
              <div className="filter-group">
                <label className="filter-label">
                  <User size={16} />
                  學生
                </label>
                <select
                  value={filters.student}
                  onChange={e => handleFilterChange({ student: e.target.value })}
                  className="filter-select"
                  disabled={loading || !filters.school}
                >
                  <option value="">選擇學生</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>
                      {student.name}（{getGradeChinese(student.grade)}
                      {student.class ? ` ${student.class}班` : ''} - {student._id.slice(-4)}）
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  年份
                </label>
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
              </div>

              {/* Month */}
              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  月份
                </label>
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
                  {getGradeChinese(selectedStudent.grade)}
                  {selectedStudent.class && ` ${selectedStudent.class}班`}
                </span>
                <span className="student-card__school">{selectedSchool?.name}</span>
                <span className="student-card__year">{filters.academicYear}學年</span>
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
                  <span>選擇學年和學校</span>
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

export default Integration;
