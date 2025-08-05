// src/pages/analysation/components/AIWorkflow.jsx - AI Processing Component
import {
  FileText,
  Loader,
  Zap,
} from 'lucide-react';

const AIWorkflow = ({
  currentStep,
  textInput,
  aiProcessing,
  handleFlowSelection,
  handleAIProcessing,
  setTextInput,
}) => {

  // Step 1: Text Input
  if (currentStep === 1) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">
          <div className="ai-analysis__card-header">
            <FileText size={24} />
            <h2>AI 文字分析</h2>
          </div>

          <div className="ai-analysis__text-input-area">
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="請貼上或輸入包含學校和學生資訊的文字內容..."
              className="ai-analysis__text-input"
              rows={12}
            />
            <div className="ai-analysis__text-info">
              <span className="ai-analysis__char-count">
                {textInput.length} 字符
              </span>
              <span className="ai-analysis__text-limit">最多 10,000 字符</span>
            </div>
          </div>

          <div className="ai-analysis__upload-actions">
            <button
              onClick={() => handleFlowSelection('selection')}
              className="ai-analysis__button ai-analysis__button--secondary"
            >
              返回選擇
            </button>
            <button
              onClick={handleAIProcessing}
              disabled={!textInput.trim() || aiProcessing}
              className="ai-analysis__button ai-analysis__button--primary"
            >
              {aiProcessing ? (
                <>
                  <Loader className="ai-analysis__spinner" size={20} />
                  分析中...
                </>
              ) : (
                <>
                  <Zap size={20} />
                  開始 AI 分析
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Processing
  if (currentStep === 2 && aiProcessing) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">
          <div className="ai-analysis__processing">
            <Loader className="ai-analysis__spinner ai-analysis__spinner--large" size={48} />
            <h3>AI 正在分析文字...</h3>
            <p>提取學校和學生資訊，並進行結構化處理</p>
          </div>
        </div>
      </div>
    );
  }

  // Placeholder for future AI workflow steps
  return (
    <div className="ai-analysis__section">
      <div className="ai-analysis__card">
        <div className="ai-analysis__placeholder">
          <h3>AI 工作流程開發中</h3>
          <p>此功能正在開發，敬請期待</p>
          <button
            onClick={() => handleFlowSelection('selection')}
            className="ai-analysis__button ai-analysis__button--secondary"
          >
            返回選擇
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIWorkflow;
