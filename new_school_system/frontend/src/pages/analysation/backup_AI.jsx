// Updated AI_Analysis.jsx with your custom field requirements
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Database,
  Eye,
  Loader,
  Plus,
  School,
  Trash2,
  Upload,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api, { handleApiError, schoolHelpers } from '../../services/api';
import { HK_GRADES, getCurrentAcademicYear } from '../../utils/constants';

// Fallback grades array in case HK_GRADES is not properly imported
const GRADES_FALLBACK = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const safeHkGrades = Array.isArray(HK_GRADES) ? HK_GRADES : GRADES_FALLBACK;

// Gender options for dropdown
const GENDER_OPTIONS = [
  { value: '', label: '選擇性別' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
];

const AI_Analysis = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schools, setSchools] = useState([]);
  const [mappingErrors, setMappingErrors] = useState([]);
  const [importingData, setImportingData] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [aiServiceStatus, setAiServiceStatus] = useState('checking');
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Load schools data with cleanup
  useEffect(() => {
    let isCancelled = false;

    const loadSchools = async () => {
      try {
        // Use your existing schoolHelpers
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });

        if (!isCancelled) {
          setSchools(Array.isArray(schoolsData) ? schoolsData : []);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load schools:', error);
          const errorInfo = handleApiError(error);
          toast.error(errorInfo.message || '載入學校資料失敗');
        }
      }
    };

    loadSchools();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Check AI service status on component mount
  useEffect(() => {
    checkAIServiceStatus();
  }, []);

  // Enhanced AI service status check
  const checkAIServiceStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking AI service status...');
      setAiServiceStatus('checking');

      // Use your API service - it returns the full axios response
      const response = await api.get('/api/ai-analysis/status');

      console.log('📡 Full response:', response);
      console.log('📊 Response data:', response.data);

      // The actual data is in response.data
      const result = response.data;

      if (result && result.success && result.data) {
        console.log('✅ Found valid response structure');
        console.log('📍 Available field:', result.data.available);

        const isAvailable = result.data.available === true;
        setAiServiceStatus(isAvailable ? 'available' : 'unavailable');

        console.log(`🤖 AI Service Status: ${isAvailable ? 'Available' : 'Unavailable'}`);

        if (!isAvailable) {
          toast.warning('AI 服務目前無法使用，請稍後再試');
        }

        return isAvailable;
      } else {
        console.error('❌ Invalid response structure:', result);
        setAiServiceStatus('unavailable');
        return false;
      }
    } catch (error) {
      console.error('❌ AI service status check failed:', error);
      setAiServiceStatus('unavailable');

      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || '無法檢查 AI 服務狀態');
      return false;
    }
  }, []);

  // Enhanced file selection handler
  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('不支援的檔案格式。請上傳 Excel、CSV、PDF 或 Word 檔案。');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('檔案大小超過限制（最大 25MB）');
      return;
    }

    setSelectedFile(file);
    setExtractedData(null);
    setPreviewData([]);
    setCurrentStep(2);
    setRetryAttempts(0);
    toast.success(`已選擇檔案：${file.name}`);

    if (aiServiceStatus !== 'available') {
      checkAIServiceStatus();
    }
  };

  // Enhanced AI analysis handler
  const handleAnalyzeFile = async () => {
    if (!selectedFile || !selectedSchool) {
      toast.error('請選擇檔案和學校');
      return;
    }

    if (aiServiceStatus !== 'available') {
      const isAvailable = await checkAIServiceStatus();
      if (!isAvailable) {
        toast.error('AI 服務目前無法使用，請稍後再試或聯絡管理員');
        return;
      }
    }

    try {
      setAnalyzing(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('schoolId', selectedSchool);
      formData.append('academicYear', getCurrentAcademicYear());

      console.log('🚀 Starting AI analysis...');

      // Use axios api - returns full response object
      const response = await api.post('/api/ai-analysis/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minute timeout
      });

      console.log('📡 Analysis response:', response);

      // Extract the actual data from the response
      const result = response.data;

      if (result && result.success) {
        setExtractedData(result.data);
        setPreviewData(result.data.students || []);
        setMappingErrors(result.data.errors || []);
        setCurrentStep(3);
        setAiServiceStatus('available');
        toast.success(`成功提取 ${result.data.students?.length || 0} 名學生資料`);
      } else {
        throw new Error(result?.message || '分析失敗，請重試');
      }
    } catch (error) {
      console.error('AI analysis failed:', error);

      // Use your existing error handler
      const errorInfo = handleApiError(error);

      // Handle specific error types
      if (error.response?.status === 503) {
        setAiServiceStatus('unavailable');
        toast.error('AI 服務暫時無法使用，請稍後再試');
      } else if (error.response?.status === 500 && errorInfo.message?.includes('fetch failed')) {
        setAiServiceStatus('unavailable');
        if (retryAttempts < 2) {
          toast.error(`AI 服務連接失敗，正在重試... (${retryAttempts + 1}/3)`);
          setRetryAttempts(prev => prev + 1);
          setTimeout(() => handleAnalyzeFile(), 3000);
          return;
        } else {
          toast.error('AI 服務連接失敗，請檢查網路連接或聯絡系統管理員', { duration: 8000 });
        }
      } else if (error.response?.status === 429) {
        toast.error('請求過於頻繁，請稍後再試');
      } else if (errorInfo.isTimeout) {
        toast.error('分析超時，請確認檔案大小或重試');
      } else {
        toast.error(errorInfo.message || '分析失敗，請重試');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Import data handler
  const handleImportData = async () => {
    if (!previewData.length || !selectedSchool) {
      toast.error('沒有可匯入的資料');
      return;
    }

    try {
      setImportingData(true);

      // Clean the data before sending
      const cleanedStudentsData = previewData.map((student, index) => {
        const cleanedStudent = {};

        Object.keys(student).forEach(key => {
          const value = student[key];
          if (value !== null && value !== undefined && value !== '') {
            cleanedStudent[key] = value;
          }
        });

        if (!cleanedStudent.name && !cleanedStudent.nameEn) {
          cleanedStudent.name = `學生 ${index + 1}`;
        }

        if (!cleanedStudent.gender) {
          cleanedStudent.gender = 'other';
        }

        cleanedStudent.existsInDB = student.existsInDB;
        return cleanedStudent;
      });

      console.log('🚀 Starting import with cleaned data:', {
        schoolId: selectedSchool,
        studentsCount: cleanedStudentsData.length,
        newStudentsCount: cleanedStudentsData.filter(s => !s.existsInDB).length,
      });

      // Use axios api - returns full response object
      const response = await api.post('/api/ai-analysis/import', {
        schoolId: selectedSchool,
        studentsData: cleanedStudentsData,
        academicYear: getCurrentAcademicYear(),
      });

      console.log('📄 Import response:', response);

      // Extract the actual data from the response
      const result = response.data;

      if (result && result.success) {
        toast.success(
          `成功匯入 ${result.data.imported} 名學生，跳過 ${result.data.skipped} 名已存在學生`
        );

        if (result.data.errors && result.data.errors.length > 0) {
          console.log('⚠️ Import warnings:', result.data.errors);
          result.data.errors.forEach(error => {
            toast.error(error, { duration: 5000 });
          });
        }

        setCurrentStep(4);
      } else {
        throw new Error(result?.message || '匯入失敗');
      }
    } catch (error) {
      console.error('💥 Import failed:', error);

      // Use your existing error handler
      const errorInfo = handleApiError(error);

      let errorMessage = '資料匯入失敗';
      if (errorInfo.type === 'network') {
        errorMessage = '網路連接失敗，請檢查網路連接';
      } else if (error.response?.status === 403) {
        errorMessage = '沒有權限執行此操作';
      } else if (error.response?.status === 401) {
        errorMessage = '請重新登入後再試';
      } else {
        errorMessage = errorInfo.message || '匯入失敗';
      }

      toast.error(errorMessage);
    } finally {
      setImportingData(false);
    }
  };

  // Enhanced reset handler
  const handleReset = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setPreviewData([]);
    setMappingErrors([]);
    setCurrentStep(1);
    setRetryAttempts(0);

    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  // Edit student data handler with updated validation
  const handleEditStudent = useCallback(
    (index, field, value) => {
      if (index < 0 || index >= previewData.length) {
        console.warn('Invalid student index:', index);
        return;
      }

      let sanitizedValue = value;
      switch (field) {
        case 'name':
        case 'nameEn':
          sanitizedValue = value.trim().slice(0, 100);
          break;
        case 'classNumber':
          // Allow numbers and simple formats like "1", "01", "15", etc.
          sanitizedValue = value.trim().replace(/[^0-9]/g, '');
          if (sanitizedValue && (parseInt(sanitizedValue) < 1 || parseInt(sanitizedValue) > 50)) {
            toast.warning(`班內號碼應在 1-50 之間: ${sanitizedValue}`);
            return;
          }
          break;
        case 'grade':
          sanitizedValue = value.trim();
          if (!safeHkGrades.includes(sanitizedValue)) {
            toast.warning(`無效的年級: ${sanitizedValue}`);
            return;
          }
          break;
        case 'gender': {
          // Validate gender options
          const validGenders = ['male', 'female', 'other'];
          if (!validGenders.includes(value)) {
            toast.warning(`無效的性別: ${value}`);
            return;
          }
          break;
        }
        case 'class':
          sanitizedValue = value.trim().slice(0, 10);
          break;
      }

      const updatedData = [...previewData];
      updatedData[index] = {
        ...updatedData[index],
        [field]: sanitizedValue,
        _modified: true,
      };
      setPreviewData(updatedData);
    },
    [previewData]
  );

  // Remove student handler
  const handleRemoveStudent = index => {
    const updatedData = previewData.filter((_, i) => i !== index);
    setPreviewData(updatedData);
  };

  const getFileIcon = fileType => {
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    if (fileType?.includes('csv')) return '📄';
    if (fileType?.includes('pdf')) return '📕';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    return '📄';
  };

  // AI Service Status Indicator
  const renderAIServiceStatus = () => {
    return (
      <div className={`ai-status-indicator ai-status-indicator--${aiServiceStatus}`}>
        {aiServiceStatus === 'checking' ? (
          <>
            <Loader size={16} className="animate-spin" />
            <span>檢查服務狀態中...</span>
          </>
        ) : aiServiceStatus === 'available' ? (
          <>
            <CheckCircle size={16} />
            <span>AI 服務正常</span>
          </>
        ) : (
          <>
            <AlertCircle size={16} />
            <span>AI 服務暫時無法使用</span>
          </>
        )}
      </div>
    );
  };

  const renderStepIndicator = () => (
    <div className="ai-analysis__steps">
      <div className={`ai-analysis__step ${currentStep >= 1 ? 'ai-analysis__step--active' : ''}`}>
        <div className="ai-analysis__step-number">1</div>
        <span>選擇檔案</span>
      </div>
      <div className="ai-analysis__step-divider"></div>
      <div className={`ai-analysis__step ${currentStep >= 2 ? 'ai-analysis__step--active' : ''}`}>
        <div className="ai-analysis__step-number">2</div>
        <span>AI 分析</span>
      </div>
      <div className="ai-analysis__step-divider"></div>
      <div className={`ai-analysis__step ${currentStep >= 3 ? 'ai-analysis__step--active' : ''}`}>
        <div className="ai-analysis__step-number">3</div>
        <span>預覽資料</span>
      </div>
      <div className="ai-analysis__step-divider"></div>
      <div className={`ai-analysis__step ${currentStep >= 4 ? 'ai-analysis__step--active' : ''}`}>
        <div className="ai-analysis__step-number">4</div>
        <span>匯入完成</span>
      </div>
    </div>
  );

  return (
    <div className="ai-analysis-page">
      <div className="ai-analysis__header">
        <div className="ai-analysis__title-section">
          <h1 className="ai-analysis__title">
            <Brain size={32} />
            AI 智能分析功能
          </h1>
          <p className="ai-analysis__subtitle">
            使用 Google AI 自動分析 Excel、CSV、PDF 或 Word 檔案，智能提取學生資料並匯入系統
          </p>
          {renderAIServiceStatus()}
        </div>
        {selectedFile && (
          <button onClick={handleReset} className="btn btn--secondary btn--small">
            <X size={16} />
            重新開始
          </button>
        )}
      </div>

      {renderStepIndicator()}

      {/* Step 1: File Upload */}
      {currentStep === 1 && (
        <div className="ai-analysis__section">
          <div className="ai-analysis__card">
            <div className="ai-analysis__card-header">
              <Upload size={24} />
              <h2>選擇要分析的檔案</h2>
            </div>

            <div className="ai-analysis__upload-area">
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                onChange={handleFileSelect}
                className="ai-analysis__file-input"
              />
              <label htmlFor="file-input" className="ai-analysis__upload-label">
                <div className="ai-analysis__upload-icon">
                  <Upload size={48} />
                </div>
                <div className="ai-analysis__upload-text">
                  <h3>點擊或拖放檔案到此處</h3>
                  <p>支援 Excel (.xlsx, .xls)、CSV、PDF、Word (.docx, .doc)</p>
                  <p className="ai-analysis__file-limit">檔案大小限制：25MB</p>
                </div>
              </label>
            </div>

            {/* AI Service Warning */}
            {aiServiceStatus === 'unavailable' && (
              <div className="ai-analysis__service-warning">
                <AlertCircle size={20} />
                <div>
                  <h4>AI 服務暫時無法使用</h4>
                  <p>請檢查網路連接或稍後再試。如果問題持續，請聯絡系統管理員。</p>
                  <button
                    onClick={checkAIServiceStatus}
                    className="btn btn--secondary btn--small"
                    disabled={aiServiceStatus === 'checking'}
                  >
                    {aiServiceStatus === 'checking' ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        檢查中...
                      </>
                    ) : (
                      <>
                        <Wifi size={16} />
                        重新檢查服務狀態
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="ai-analysis__supported-formats">
              <h3>支援的檔案格式</h3>
              <div className="ai-analysis__format-grid">
                <div className="ai-analysis__format-item">
                  <span className="ai-analysis__format-icon">📊</span>
                  <div>
                    <strong>Excel 檔案</strong>
                    <p>結構化學生名單和成績資料</p>
                  </div>
                </div>
                <div className="ai-analysis__format-item">
                  <span className="ai-analysis__format-icon">📄</span>
                  <div>
                    <strong>CSV 檔案</strong>
                    <p>從其他系統匯出的學生資料</p>
                  </div>
                </div>
                <div className="ai-analysis__format-item">
                  <span className="ai-analysis__format-icon">📕</span>
                  <div>
                    <strong>PDF 檔案</strong>
                    <p>掃描的學生名單或表格</p>
                  </div>
                </div>
                <div className="ai-analysis__format-item">
                  <span className="ai-analysis__format-icon">📝</span>
                  <div>
                    <strong>Word 檔案</strong>
                    <p>文字格式的學生資料</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: AI Analysis */}
      {currentStep === 2 && selectedFile && (
        <div className="ai-analysis__section">
          <div className="ai-analysis__card">
            <div className="ai-analysis__card-header">
              <Brain size={24} />
              <h2>AI 智能分析</h2>
            </div>

            <div className="ai-analysis__file-info">
              <div className="ai-analysis__file-preview">
                <span className="ai-analysis__file-icon">{getFileIcon(selectedFile.type)}</span>
                <div className="ai-analysis__file-details">
                  <h3>{selectedFile.name}</h3>
                  <p>大小: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>類型: {selectedFile.type.split('/').pop().toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="ai-analysis__school-selection">
              <label className="ai-analysis__label">
                <School size={20} />
                選擇目標學校
              </label>
              <select
                value={selectedSchool}
                onChange={e => setSelectedSchool(e.target.value)}
                className="ai-analysis__select"
                required
              >
                <option value="">請選擇學校</option>
                {schools.map(school => (
                  <option key={school._id} value={school._id}>
                    {school.name} ({school.nameEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="ai-analysis__actions">
              <button
                onClick={handleAnalyzeFile}
                disabled={analyzing || !selectedSchool || aiServiceStatus === 'unavailable'}
                className="btn btn--primary btn--large"
              >
                {analyzing ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    AI 分析中...
                    {retryAttempts > 0 && ` (重試 ${retryAttempts}/3)`}
                  </>
                ) : aiServiceStatus === 'unavailable' ? (
                  <>
                    <AlertCircle size={20} />
                    AI 服務無法使用
                  </>
                ) : aiServiceStatus === 'checking' ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    檢查服務狀態中...
                  </>
                ) : (
                  <>
                    <Zap size={20} />
                    開始 AI 分析
                  </>
                )}
              </button>
            </div>

            {analyzing && (
              <div className="ai-analysis__progress">
                <div className="ai-analysis__progress-bar">
                  <div className="ai-analysis__progress-fill"></div>
                </div>
                <p>
                  正在使用 Google AI 分析檔案內容，請稍候...
                  {retryAttempts > 0 && ` (重試 ${retryAttempts}/3)`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview Data - UPDATED FIELD STRUCTURE */}
      {currentStep === 3 && previewData.length > 0 && (
        <div className="ai-analysis__section">
          <div className="ai-analysis__card">
            <div className="ai-analysis__card-header">
              <Eye size={24} />
              <h2>預覽提取的學生資料</h2>
              <div className="ai-analysis__card-actions">
                <span className="ai-analysis__count">找到 {previewData.length} 名學生</span>
              </div>
            </div>

            {mappingErrors.length > 0 && (
              <div className="ai-analysis__errors">
                <h3>
                  <AlertCircle size={20} />
                  資料映射警告
                </h3>
                <ul>
                  {mappingErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ai-analysis__preview-table">
              <div className="ai-analysis__table-wrapper">
                <table className="ai-analysis__table">
                  <thead>
                    <tr>
                      <th>狀態</th>
                      <th>姓名</th>
                      <th>英文姓名</th>
                      <th>學號</th>
                      <th>年級</th>
                      <th>班別</th>
                      <th>性別</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((student, index) => (
                      <tr
                        key={index}
                        className={student.existsInDB ? 'ai-analysis__row--exists' : ''}
                      >
                        <td>
                          {student.existsInDB ? (
                            <span className="ai-analysis__status ai-analysis__status--exists">
                              已存在
                            </span>
                          ) : (
                            <span className="ai-analysis__status ai-analysis__status--new">
                              新增
                            </span>
                          )}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.name || ''}
                            onChange={e => handleEditStudent(index, 'name', e.target.value)}
                            className="ai-analysis__input"
                            placeholder="姓名"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.nameEn || ''}
                            onChange={e => handleEditStudent(index, 'nameEn', e.target.value)}
                            className="ai-analysis__input"
                            placeholder="English Name"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.classNumber || ''}
                            onChange={e => handleEditStudent(index, 'classNumber', e.target.value)}
                            className="ai-analysis__input"
                            placeholder="學號"
                            maxLength="2"
                          />
                        </td>
                        <td>
                          <select
                            value={student.grade || ''}
                            onChange={e => handleEditStudent(index, 'grade', e.target.value)}
                            className="ai-analysis__select ai-analysis__select--small"
                          >
                            <option value="">選擇年級</option>
                            {safeHkGrades.map(grade => (
                              <option key={grade} value={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.class || ''}
                            onChange={e => handleEditStudent(index, 'class', e.target.value)}
                            className="ai-analysis__input"
                            placeholder="班別"
                          />
                        </td>
                        <td>
                          <select
                            value={student.gender || ''}
                            onChange={e => handleEditStudent(index, 'gender', e.target.value)}
                            className="ai-analysis__select ai-analysis__select--small"
                          >
                            {GENDER_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveStudent(index)}
                            className="btn btn--danger btn--small"
                            title="移除此學生"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ai-analysis__actions">
              <button
                onClick={handleImportData}
                disabled={importingData || !previewData.length}
                className="btn btn--primary btn--large"
              >
                {importingData ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    匯入中...
                  </>
                ) : (
                  <>
                    <Database size={20} />
                    匯入學生資料
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Import Complete */}
      {currentStep === 4 && (
        <div className="ai-analysis__section">
          <div className="ai-analysis__card ai-analysis__card--success">
            <div className="ai-analysis__success-icon">
              <CheckCircle size={64} />
            </div>
            <h2>匯入完成！</h2>
            <p>學生資料已成功匯入到系統中</p>

            <div className="ai-analysis__actions">
              <button onClick={handleReset} className="btn btn--primary btn--large">
                <Plus size={20} />
                匯入更多檔案
              </button>
              <a href="/students" className="btn btn--secondary btn--large">
                <Users size={20} />
                查看學生管理
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {currentStep === 1 && (
        <div className="ai-analysis__instructions">
          <div className="instruction-card">
            <div className="instruction-card__icon">
              <Brain size={48} />
            </div>
            <div className="instruction-card__content">
              <h3 className="instruction-card__title">AI 智能分析如何運作</h3>
              <div className="instruction-card__steps">
                <div className="instruction-step">
                  <Upload size={20} />
                  <span>上傳包含學生資料的檔案</span>
                </div>
                <div className="instruction-step">
                  <Brain size={20} />
                  <span>Google AI 自動識別和提取學生資訊</span>
                </div>
                <div className="instruction-step">
                  <Eye size={20} />
                  <span>預覽提取的資料並進行必要修改</span>
                </div>
                <div className="instruction-step">
                  <Database size={20} />
                  <span>批量匯入到香港教師系統資料庫</span>
                </div>
              </div>
              <p className="instruction-card__note">
                注意：AI
                會自動識別學生姓名、學號、年級等資訊。已存在於系統中的學生將被標記為「已存在」。
                匯入前請仔細檢查 AI 提取的資料是否準確。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AI_Analysis;
