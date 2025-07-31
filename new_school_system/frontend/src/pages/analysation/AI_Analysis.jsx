// File: src/pages/integration/AI_Analysis.jsx
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Download, 
  Eye,
  Users,
  School,
  BookOpen,
  Brain,
  Zap,
  X,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers, studentHelpers, handleApiError } from '../../services/api';
import { HK_GRADES, getCurrentAcademicYear } from '../../utils/constants';
import { toast } from 'react-hot-toast';

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

  // Load schools data
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        setSchools(Array.isArray(schoolsData) ? schoolsData : []);
      } catch (error) {
        console.error('Failed to load schools:', error);
        toast.error('載入學校資料失敗');
      }
    };

    loadSchools();
  }, []);

  // File selection handler
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('不支援的檔案格式。請上傳 Excel、CSV、PDF 或 Word 檔案。');
      return;
    }

    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      toast.error('檔案大小超過限制（最大 25MB）');
      return;
    }

    setSelectedFile(file);
    setExtractedData(null);
    setPreviewData([]);
    setCurrentStep(2);
    toast.success(`已選擇檔案：${file.name}`);
  };

  // AI analysis handler
  const handleAnalyzeFile = async () => {
    if (!selectedFile || !selectedSchool) {
      toast.error('請選擇檔案和學校');
      return;
    }

    try {
      setAnalyzing(true);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('schoolId', selectedSchool);
      formData.append('academicYear', getCurrentAcademicYear());

      const response = await fetch('/api/ai-analysis/extract', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('AI 分析失敗');
      }

      const result = await response.json();
      
      if (result.success) {
        setExtractedData(result.data);
        setPreviewData(result.data.students || []);
        setMappingErrors(result.data.errors || []);
        setCurrentStep(3);
        toast.success(`成功提取 ${result.data.students?.length || 0} 名學生資料`);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      const errorInfo = handleApiError(error);
      toast.error(errorInfo.message || 'AI 分析失敗');
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

      // Clean the data before sending - remove null/undefined/empty values and set defaults
      const cleanedStudentsData = previewData.map((student, index) => {
        const cleanedStudent = {};
        
        // Only include fields that have actual values
        Object.keys(student).forEach(key => {
          const value = student[key];
          if (value !== null && value !== undefined && value !== '') {
            cleanedStudent[key] = value;
          }
        });
        
        // Ensure we have at least one name field
        if (!cleanedStudent.name && !cleanedStudent.nameEn && !cleanedStudent.nameCh) {
          cleanedStudent.name = `學生 ${index + 1}`;
        }
        
        // Set default gender if missing (required by Student model)
        if (!cleanedStudent.gender) {
          cleanedStudent.gender = 'other';
        }
        
        // Ensure existsInDB flag is preserved
        cleanedStudent.existsInDB = student.existsInDB;
        
        return cleanedStudent;
      });

      console.log('🚀 Starting import with cleaned data:', {
        schoolId: selectedSchool,
        studentsCount: cleanedStudentsData.length,
        newStudentsCount: cleanedStudentsData.filter(s => !s.existsInDB).length,
        sampleStudent: cleanedStudentsData[0]
      });

      const response = await fetch('/api/ai-analysis/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId: selectedSchool,
          studentsData: cleanedStudentsData,
          academicYear: getCurrentAcademicYear()
        }),
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);
      
      const result = await response.json();
      console.log('📄 Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (result.success) {
        toast.success(`成功匯入 ${result.data.imported} 名學生，跳過 ${result.data.skipped} 名已存在學生`);
        
        // Show any import errors
        if (result.data.errors && result.data.errors.length > 0) {
          console.log('⚠️ Import warnings:', result.data.errors);
          result.data.errors.forEach(error => {
            toast.error(error, { duration: 5000 });
          });
        }
        
        setCurrentStep(4);
      } else {
        throw new Error(result.message || '匯入失敗');
      }
    } catch (error) {
      console.error('💥 Import failed:', error);
      
      // Provide more specific error messages
      let errorMessage = '資料匯入失敗';
      if (error.message.includes('Network')) {
        errorMessage = '網路連接失敗，請檢查網路連接';
      } else if (error.message.includes('403')) {
        errorMessage = '沒有權限執行此操作';
      } else if (error.message.includes('401')) {
        errorMessage = '請重新登入後再試';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setImportingData(false);
    }
  };

  // Reset handler
  const handleReset = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setPreviewData([]);
    setMappingErrors([]);
    setCurrentStep(1);
    document.getElementById('file-input').value = '';
  };

  // Edit student data handler
  const handleEditStudent = (index, field, value) => {
    const updatedData = [...previewData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setPreviewData(updatedData);
  };

  // Remove student handler
  const handleRemoveStudent = (index) => {
    const updatedData = previewData.filter((_, i) => i !== index);
    setPreviewData(updatedData);
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return '📊';
    if (fileType?.includes('csv')) return '📄';
    if (fileType?.includes('pdf')) return '📕';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    return '📄';
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
        </div>
        {selectedFile && (
          <button 
            onClick={handleReset}
            className="btn btn--secondary btn--small"
          >
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
                <span className="ai-analysis__file-icon">
                  {getFileIcon(selectedFile.type)}
                </span>
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
                onChange={(e) => setSelectedSchool(e.target.value)}
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
                disabled={analyzing || !selectedSchool}
                className="btn btn--primary btn--large"
              >
                {analyzing ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    AI 分析中...
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
                <p>正在使用 Google AI 分析檔案內容，請稍候...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Preview Data */}
      {currentStep === 3 && previewData.length > 0 && (
        <div className="ai-analysis__section">
          <div className="ai-analysis__card">
            <div className="ai-analysis__card-header">
              <Eye size={24} />
              <h2>預覽提取的學生資料</h2>
              <div className="ai-analysis__card-actions">
                <span className="ai-analysis__count">
                  找到 {previewData.length} 名學生
                </span>
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
                      <th>中文姓名</th>
                      <th>學號</th>
                      <th>年級</th>
                      <th>班別</th>
                      <th>性別</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((student, index) => (
                      <tr key={index} className={student.existsInDB ? 'ai-analysis__row--exists' : ''}>
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
                            onChange={(e) => handleEditStudent(index, 'name', e.target.value)}
                            className="ai-analysis__input"
                            disabled={student.existsInDB}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.nameEn || ''}
                            onChange={(e) => handleEditStudent(index, 'nameEn', e.target.value)}
                            className="ai-analysis__input"
                            disabled={student.existsInDB}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.nameCh || ''}
                            onChange={(e) => handleEditStudent(index, 'nameCh', e.target.value)}
                            className="ai-analysis__input"
                            disabled={student.existsInDB}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.studentId || ''}
                            onChange={(e) => handleEditStudent(index, 'studentId', e.target.value)}
                            className="ai-analysis__input"
                            disabled={student.existsInDB}
                          />
                        </td>
                        <td>
                          <select
                            value={student.grade || ''}
                            onChange={(e) => handleEditStudent(index, 'grade', e.target.value)}
                            className="ai-analysis__select ai-analysis__select--small"
                            disabled={student.existsInDB}
                          >
                            <option value="">選擇年級</option>
                            {HK_GRADES.ALL.map(grade => (
                              <option key={grade} value={grade}>{grade}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={student.class || ''}
                            onChange={(e) => handleEditStudent(index, 'class', e.target.value)}
                            className="ai-analysis__input"
                            disabled={student.existsInDB}
                          />
                        </td>
                        <td>
                          <select
                            value={student.gender || ''}
                            onChange={(e) => handleEditStudent(index, 'gender', e.target.value)}
                            className="ai-analysis__select ai-analysis__select--small"
                            disabled={student.existsInDB}
                          >
                            <option value="">選擇性別</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                            <option value="other">其他</option>
                          </select>
                        </td>
                        <td>
                          {!student.existsInDB && (
                            <button
                              onClick={() => handleRemoveStudent(index)}
                              className="btn btn--danger btn--small"
                              title="移除此學生"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ai-analysis__import-summary">
              <div className="ai-analysis__summary-stats">
                <div className="ai-analysis__stat">
                  <span className="ai-analysis__stat-number">
                    {previewData.filter(s => !s.existsInDB).length}
                  </span>
                  <span className="ai-analysis__stat-label">新學生</span>
                </div>
                <div className="ai-analysis__stat">
                  <span className="ai-analysis__stat-number">
                    {previewData.filter(s => s.existsInDB).length}
                  </span>
                  <span className="ai-analysis__stat-label">已存在</span>
                </div>
                <div className="ai-analysis__stat">
                  <span className="ai-analysis__stat-number">
                    {previewData.length}
                  </span>
                  <span className="ai-analysis__stat-label">總計</span>
                </div>
              </div>
            </div>

            <div className="ai-analysis__actions">
              <button
                onClick={handleImportData}
                disabled={importingData || previewData.filter(s => !s.existsInDB).length === 0}
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
              <button
                onClick={handleReset}
                className="btn btn--primary btn--large"
              >
                <Plus size={20} />
                匯入更多檔案
              </button>
              <a
                href="/students"
                className="btn btn--secondary btn--large"
              >
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
                注意：AI 會自動識別學生姓名、學號、年級等資訊。已存在於系統中的學生將被標記為「已存在」。
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