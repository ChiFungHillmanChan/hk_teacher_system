// src/pages/analysation/components/StepIndicator.jsx - Step Progress Component
import { CheckCircle } from 'lucide-react';

const StepIndicator = ({ currentFlow, currentStep }) => {
  const steps =
    currentFlow === 'excel'
      ? ['選擇檔案', '解析檔案', '確認資料', '匯入完成']
      : ['選擇檔案', 'AI 分析', '預覽資料', '匯入完成'];

  return (
    <div className="ai-analysis__steps">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`ai-analysis__step ${
            index + 1 === currentStep ? 'active' : index + 1 < currentStep ? 'completed' : ''
          }`}
        >
          <div className="ai-analysis__step-number">
            {index + 1 < currentStep ? <CheckCircle size={16} /> : index + 1}
          </div>
          <span className="ai-analysis__step-label">{step}</span>
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
