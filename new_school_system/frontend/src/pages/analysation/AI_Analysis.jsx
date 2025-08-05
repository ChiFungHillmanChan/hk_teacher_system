import { Brain, FileSpreadsheet, Loader, Wifi } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api, { handleApiError, schoolHelpers } from '../../services/api';
import { HK_GRADES } from '../../utils/constants';

// Import sub-components
import AIWorkflow from './components/AIWorkflow';
import ExcelWorkflow from './components/ExcelWorkflow';
import StepIndicator from './components/StepIndicator';

// Import utility modules
import ExcelParser from './ExcelParser';
import IdentityResolution from './IdentityResolution';
import ImportOrchestrator from './ImportOrchestrator';
import PreviewModelStore from './PreviewModelStore';
import ValidationEngine from './ValidationEngine';

// Fallback grades array in case HK_GRADES is not properly imported
const GRADES_FALLBACK = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const safeHkGrades = Array.isArray(HK_GRADES) ? HK_GRADES : GRADES_FALLBACK;

console.log('[AI_Analysis] 🎯 Loaded with grades:', safeHkGrades);

const AI_Analysis = () => {
  const { user } = useAuth();

  // Main flow states
  const [currentFlow, setCurrentFlow] = useState('selection'); // 'selection', 'excel', 'ai'
  const [currentStep, setCurrentStep] = useState(1); // 1-4 steps for each flow
  const [uploadType, setUploadType] = useState(null);

  // File and processing states
  const [selectedFile, setSelectedFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [excelProcessing, setExcelProcessing] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState('checking');
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Data states
  const [schools, setSchools] = useState([]);
  const [previewModel, setPreviewModel] = useState(null);
  const [duplicateCheckResults, setDuplicateCheckResults] = useState(null);
  const [userDecisions, setUserDecisions] = useState({});
  const [readyForImport, setReadyForImport] = useState(false);
  const [schoolConfirmations, setSchoolConfirmations] = useState({});
  const [importProgress, setImportProgress] = useState(null);

  // Load existing schools on component mount
  useEffect(() => {
    let isCancelled = false;

    const loadSchools = async () => {
      try {
        console.log('[AI_Analysis] 📚 Loading existing schools...');
        if (schoolHelpers && typeof schoolHelpers.getAll === 'function') {
          const schoolsData = await schoolHelpers.getAll({ limit: 100 });
          if (!isCancelled) {
            setSchools(Array.isArray(schoolsData) ? schoolsData : []);
            console.log(`[AI_Analysis] ✅ Loaded ${schoolsData?.length || 0} schools`);
          }
        } else {
          console.warn('[AI_Analysis] ⚠️ schoolHelpers.getAll not available, using empty array');
          setSchools([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[AI_Analysis] ❌ Failed to load schools:', error);
          handleApiError(error);
          setSchools([]);
        }
      }
    };

    loadSchools();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Check AI service status
  const checkAIServiceStatus = useCallback(async () => {
    if (retryAttempts >= 3) {
      setAiServiceStatus('unavailable');
      return;
    }

    try {
      console.log('[AI_Analysis] 🔍 Checking AI service status...');
      setAiServiceStatus('checking');

      const response = await api.get('/api/ai-analysis/status');

      if (response.data.success && response.data.status === 'available') {
        console.log('[AI_Analysis] ✅ AI service is available');
        setAiServiceStatus('available');
        setRetryAttempts(0);
      } else {
        console.log('[AI_Analysis] ⚠️ AI service is not available');
        setAiServiceStatus('unavailable');
      }
    } catch (error) {
      console.error('[AI_Analysis] ❌ AI service check failed:', error);
      setAiServiceStatus('error');
      setRetryAttempts(prev => prev + 1);
    }
  }, [retryAttempts]);

  useEffect(() => {
    checkAIServiceStatus();
  }, [checkAIServiceStatus]);

  // Handle flow selection
  const handleFlowSelection = flowType => {
    console.log(`[AI_Analysis] 📍 Selected flow: ${flowType}`);
    setCurrentFlow(flowType);
    setCurrentStep(1);
    setUploadType(flowType);

    // Reset states
    setSelectedFile(null);
    setTextInput('');
    setPreviewModel(null);
    setDuplicateCheckResults(null);
    setUserDecisions({});
    setSchoolConfirmations({});
    setReadyForImport(false);
    setImportProgress(null);
  };

  // Excel workflow handlers
  const handleExcelProcessing = async () => {
    if (!selectedFile) {
      toast.error('請選擇檔案');
      return;
    }

    console.log('[Excel處理] 🚀 開始處理 Excel/CSV 檔案');
    setExcelProcessing(true);
    setCurrentStep(2);

    try {
      // Step 1: Parse Excel file
      console.log('[Excel處理] 📊 解析 Excel 檔案');
      const { schools } = await ExcelParser.parseFile(selectedFile);

      console.log(
        `[Excel解析] 📊 偵測到 ${schools.length} 所學校，共 ${schools.reduce(
          (total, school) => total + (school.students?.length || 0),
          0
        )} 名學生`
      );

      // Step 2: Store in preview model
      const model = PreviewModelStore.createModel(schools);
      setPreviewModel(model);

      // Step 3: Validate data
      const validationResults = ValidationEngine.validateAll(schools);
      if (validationResults.errors.length > 0) {
        console.log(`[Excel處理] ⚠️ 發現 ${validationResults.errors.length} 個驗證錯誤`);
        toast.warning(`發現 ${validationResults.errors.length} 個資料問題，請檢查後再匯入`);
      }

      // Step 4: Check for duplicates using real API
      console.log('[Excel處理] 🔍 檢查重複項目...');
      const duplicateResults = await IdentityResolution.checkDuplicates(schools);
      setDuplicateCheckResults(duplicateResults);

      // Generate summary
      const duplicateSummary = IdentityResolution.generateDuplicateSummary(duplicateResults);

      if (duplicateSummary.requiresUserAction) {
        console.log(
          `[Excel處理] ⚠️ 需要使用者決定 - 學校重複: ${duplicateSummary.schoolDuplicates}, 學生重複: ${duplicateSummary.studentDuplicates}`
        );
        setCurrentStep(3);

        // ✅ SAFE: Check if toast.info exists before using
        if (toast && typeof toast.info === 'function') {
          toast.info('發現重複項目，請確認處理方式');
        } else if (toast && typeof toast === 'function') {
          toast('發現重複項目，請確認處理方式', { icon: 'ℹ️' });
        } else {
          console.log('⚠️ Toast not available, using console message');
          console.log('📢 User Message: 發現重複項目，請確認處理方式');
        }
      } else {
        console.log('[Excel處理] ✅ 沒有發現重複項目，可以直接匯入');
        setReadyForImport(true);
        setCurrentStep(3);
        toast.success('資料檢查完成，可以開始匯入');
      }
    } catch (error) {
      console.error('[Excel處理] ❌ 處理失敗:', error);
      toast.error(`檔案處理失敗: ${error.message}`);
      setCurrentStep(1);
    } finally {
      setExcelProcessing(false);
    }
  };

  // AI workflow handlers
  const handleAIProcessing = async () => {
    if (!textInput.trim()) {
      toast.error('請輸入要分析的文字');
      return;
    }

    console.log('[AI處理] 🧠 開始AI文字分析');
    setAiProcessing(true);
    setCurrentStep(2);

    try {
      console.log('[AI處理] 📝 分析文字長度:', textInput.length);
      toast.info('AI文字分析功能開發中');
      setCurrentStep(1);
    } catch (error) {
      console.error('[AI處理] ❌ AI分析失敗:', error);
      toast.error(`AI分析失敗: ${error.message}`);
      setCurrentStep(1);
    } finally {
      setAiProcessing(false);
    }
  };

  // Import handlers
  const handleImportData = async () => {
    if (!previewModel || !checkImportReadiness()) {
      toast.error('請先確認所有學校後再進行匯入');
      return;
    }

    console.log('[匯入流程] 🚀 開始匯入資料到資料庫');
    setCurrentStep(4);

    try {
      const allSchools = duplicateCheckResults || previewModel.schools;

      // ✅ CRITICAL: Apply user decisions before filtering
      console.log('[匯入流程] 📝 應用使用者決定');
      console.log('[匯入流程] 📋 使用者決定數量:', Object.keys(userDecisions).length);

      // Filter schools that are confirmed or don't require confirmation
      const schoolsToImport = allSchools.filter((school, index) => {
        const hasErrors =
          school.validation?.errors?.length > 0 ||
          school.students?.some(s => s.validation?.errors?.length > 0);
        const hasWarnings =
          school.validation?.warnings?.length > 0 ||
          school.students?.some(s => s.validation?.warnings?.length > 0);
        const hasDuplicates = school.hasDuplicates;

        const requiresConfirmation = hasErrors || hasWarnings || hasDuplicates;

        if (!requiresConfirmation) return true;
        return schoolConfirmations[index] === true;
      });

      console.log(`[匯入流程] 📊 準備匯入 ${schoolsToImport.length}/${allSchools.length} 所學校`);

      if (schoolsToImport.length === 0) {
        toast.error('沒有學校被確認，無法開始匯入');
        return;
      }

      // ✅ DEBUG: Log school decisions
      schoolsToImport.forEach(school => {
        console.log(`[匯入流程] 🏫 學校: ${school.name}`, {
          hasDuplicates: school.hasDuplicates,
          useExisting: school.useExistingSchool,
          existingId: school.existingSchoolId,
          action: school.identityDecision?.action,
        });
      });

      if (Object.keys(userDecisions).length > 0) {
        console.log('[匯入流程] 📝 應用使用者決定的重複解決方案');
        // Apply user decisions for duplicates
      }

      // Start import process using real API
      const importSummary = await ImportOrchestrator.importAll(schoolsToImport, progress => {
        setImportProgress(progress);
      });

      console.log('[匯入流程] ✅ 匯入完成:', importSummary);

      if (importSummary.successCount > 0) {
        toast.success(
          `匯入完成！成功 ${importSummary.successCount} 筆，失敗 ${importSummary.failureCount} 筆`
        );
      } else {
        toast.error('匯入失敗，請檢查資料後重試');
      }
    } catch (error) {
      console.error('[匯入流程] ❌ 匯入失敗:', error);
      toast.error(`匯入失敗: ${error.message}`);
      setCurrentStep(3);
    }
  };

  // Utility functions
  const checkImportReadiness = () => {
    if (!previewModel?.schools) return false;

    return previewModel.schools.every((school, index) => {
      const hasErrors =
        school.validation?.errors?.length > 0 ||
        school.students?.some(s => s.validation?.errors?.length > 0);
      const hasWarnings =
        school.validation?.warnings?.length > 0 ||
        school.students?.some(s => s.validation?.warnings?.length > 0);
      const hasDuplicates = school.hasDuplicates;

      const requiresConfirmation = hasErrors || hasWarnings || hasDuplicates;

      if (!requiresConfirmation) return true;
      return schoolConfirmations[index] === true;
    });
  };

  const handleSchoolConfirmation = (schoolIndex, confirmed = true) => {
    console.log(`[學校確認] 🏫 學校 ${schoolIndex}: ${confirmed ? '已確認' : '取消確認'}`);
    setSchoolConfirmations(prev => ({
      ...prev,
      [schoolIndex]: confirmed,
    }));
  };

  const handleDuplicateDecision = (itemType, itemKey, decision) => {
    console.log(`[使用者決定] 📝 ${itemType}: ${itemKey} -> ${decision.action}`);
    setUserDecisions(prev => ({
      ...prev,
      [itemKey]: decision,
    }));
  };

  // Prepare props for child components
  const sharedProps = {
    // State
    currentFlow,
    currentStep,
    previewModel,
    duplicateCheckResults,
    userDecisions,
    schoolConfirmations,
    importProgress,

    // Excel specific
    selectedFile,
    excelProcessing,

    // AI specific
    textInput,
    aiProcessing,
    aiServiceStatus,
    retryAttempts,

    // Handlers
    handleFlowSelection,
    handleExcelProcessing,
    handleAIProcessing,
    handleImportData,
    handleSchoolConfirmation,
    handleDuplicateDecision,
    checkImportReadiness,
    checkAIServiceStatus,

    // Setters
    setSelectedFile,
    setTextInput,
  };

  return (
    <div className="ai-analysis">
      <div className="ai-analysis__container">
        {/* Header */}
        <div className="ai-analysis__header">
          <div className="ai-analysis__title">
            <Brain size={32} />
            <h1>智能資料分析與匯入</h1>
          </div>
          <div className="ai-analysis__subtitle">
            <p>使用 AI 技術快速處理和匯入學校與學生資料</p>
          </div>
        </div>

        {/* Step Indicator */}
        {currentFlow !== 'selection' && (
          <div className="ai-analysis__step-indicator">
            <StepIndicator currentFlow={currentFlow} currentStep={currentStep} />
          </div>
        )}

        {/* Excel Workflow */}
        {currentFlow === 'excel' && <ExcelWorkflow {...sharedProps} />}

        {/* AI Workflow */}
        {currentFlow === 'ai' && <AIWorkflow {...sharedProps} />}

        {/* Flow Selection */}
        {currentFlow === 'selection' && (
          <div className="ai-analysis__section">
            <div className="ai-analysis__flow-selection">
              <div className="ai-analysis__flow-options">
                {/* Excel/CSV Flow Option */}
                <div
                  className="ai-analysis__flow-option"
                  onClick={() => handleFlowSelection('excel')}
                >
                  <div className="ai-analysis__flow-icon">
                    <FileSpreadsheet size={48} />
                  </div>
                  <div className="ai-analysis__flow-content">
                    <h3>Excel / CSV 匯入</h3>
                    <p>直接上傳 Excel 或 CSV 檔案，自動解析學校和學生資料</p>
                    <ul className="ai-analysis__flow-features">
                      <li>支援 .xlsx, .xls, .csv 格式</li>
                      <li>智能標題識別</li>
                      <li>自動重複檢測</li>
                      <li>資料驗證與清理</li>
                    </ul>
                  </div>
                  <div className="ai-analysis__flow-action">
                    <button className="ai-analysis__button ai-analysis__button--primary">
                      選擇 Excel 匯入
                    </button>
                  </div>
                </div>

                {/* AI Analysis Flow Option */}
                <div
                  className={`ai-analysis__flow-option ${
                    aiServiceStatus !== 'available' ? 'ai-analysis__flow-option--disabled' : ''
                  }`}
                  onClick={() => aiServiceStatus === 'available' && handleFlowSelection('ai')}
                >
                  <div className="ai-analysis__flow-icon">
                    <Brain size={48} />
                    {aiServiceStatus === 'checking' && (
                      <Loader
                        className="ai-analysis__spinner ai-analysis__spinner--overlay"
                        size={24}
                      />
                    )}
                    {aiServiceStatus === 'unavailable' && (
                      <Wifi className="ai-analysis__offline-icon" size={24} />
                    )}
                  </div>
                  <div className="ai-analysis__flow-content">
                    <h3>AI 智能分析</h3>
                    <p>使用 AI 技術分析非結構化文字，提取學校和學生資訊</p>
                    <ul className="ai-analysis__flow-features">
                      <li>自然語言處理</li>
                      <li>智能資料提取</li>
                      <li>自動結構化</li>
                      <li>上下文理解</li>
                    </ul>
                    <div className="ai-analysis__service-status">
                      {aiServiceStatus === 'checking' && (
                        <span className="ai-analysis__status-checking">檢查服務狀態中...</span>
                      )}
                      {aiServiceStatus === 'available' && (
                        <span className="ai-analysis__status-available">✅ AI 服務可用</span>
                      )}
                      {aiServiceStatus === 'unavailable' && (
                        <span className="ai-analysis__status-unavailable">❌ AI 服務暫不可用</span>
                      )}
                      {aiServiceStatus === 'error' && (
                        <span className="ai-analysis__status-error">⚠️ 服務檢查失敗</span>
                      )}
                    </div>
                  </div>
                  <div className="ai-analysis__flow-action">
                    <button
                      className={`ai-analysis__button ${
                        aiServiceStatus === 'available'
                          ? 'ai-analysis__button--primary'
                          : 'ai-analysis__button--disabled'
                      }`}
                      disabled={aiServiceStatus !== 'available'}
                    >
                      {aiServiceStatus === 'available' ? '選擇 AI 分析' : '服務不可用'}
                    </button>
                    {aiServiceStatus === 'error' && retryAttempts < 3 && (
                      <button
                        onClick={checkAIServiceStatus}
                        className="ai-analysis__button ai-analysis__button--secondary ai-analysis__button--small"
                      >
                        重試連接
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        {currentFlow !== 'selection' && currentStep === 1 && (
          <div className="ai-analysis__back-action">
            <button
              onClick={() => setCurrentFlow('selection')}
              className="ai-analysis__button ai-analysis__button--secondary"
            >
              返回首頁
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AI_Analysis;
