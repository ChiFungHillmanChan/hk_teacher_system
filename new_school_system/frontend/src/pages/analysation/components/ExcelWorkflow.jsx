// src/pages/analysation/components/ExcelWorkflow.jsx - Complete Excel Processing Component
import {
  AlertCircle,
  CheckCircle,
  Database,
  Eye,
  FileSpreadsheet,
  Loader,
  Plus,
  School,
  Upload,
  Users,
  X,
} from 'lucide-react';
import IdentityResolution from '../IdentityResolution';

const ExcelWorkflow = ({
  currentStep,
  selectedFile,
  excelProcessing,
  previewModel,
  duplicateCheckResults,
  userDecisions,
  schoolConfirmations,
  importProgress,
  handleFlowSelection,
  handleExcelProcessing,
  handleImportData,
  handleSchoolConfirmation,
  handleDuplicateDecision,
  checkImportReadiness,
  setSelectedFile,
}) => {
  // Get all warnings from the preview model
  const getAllWarnings = () => {
    if (!previewModel || !previewModel.schools) return [];

    const warnings = [];

    previewModel.schools.forEach((school, schoolIndex) => {
      // School-level warnings
      if (school.validation?.warnings) {
        school.validation.warnings.forEach(warning => {
          warnings.push({
            type: 'school',
            schoolIndex,
            schoolName: school.name,
            message: warning,
            severity: 'warning',
          });
        });
      }

      // Student-level warnings
      if (school.students) {
        school.students.forEach((student, studentIndex) => {
          if (student.validation?.warnings) {
            student.validation.warnings.forEach(warning => {
              warnings.push({
                type: 'student',
                schoolIndex,
                studentIndex,
                schoolName: school.name,
                studentName: student.name,
                message: warning,
                severity: 'warning',
              });
            });
          }
        });
      }
    });

    return warnings;
  };

  // Render global warning panel
  const renderGlobalWarningPanel = () => {
    const allWarnings = getAllWarnings();

    if (allWarnings.length === 0) return null;

    return (
      <div className="ai-analysis__global-warnings">
        <div className="ai-analysis__warning-header">
          <AlertCircle size={20} />
          <h3>資料警告總覽 ({allWarnings.length})</h3>
        </div>

        <div className="ai-analysis__warning-list">
          {allWarnings.slice(0, 10).map((warning, index) => (
            <div key={index} className="ai-analysis__warning-item">
              <div className="ai-analysis__warning-source">
                {warning.type === 'school' ? <School size={16} /> : <Users size={16} />}
                <span className="ai-analysis__warning-location">
                  {warning.type === 'school'
                    ? `學校: ${warning.schoolName}`
                    : `學生: ${warning.studentName} (${warning.schoolName})`}
                </span>
              </div>
              <div className="ai-analysis__warning-message">{warning.message}</div>
            </div>
          ))}

          {allWarnings.length > 10 && (
            <div className="ai-analysis__warning-more">
              還有 {allWarnings.length - 10} 個警告項目...
            </div>
          )}
        </div>

        <div className="ai-analysis__warning-footer">
          <p>請檢查上述警告項目，確認無誤後再進行匯入。警告不會阻止匯入，但建議先行確認。</p>
        </div>
      </div>
    );
  };

  // Render duplicate resolution interface
  const renderDuplicateResolution = () => {
    if (!duplicateCheckResults) return null;

    const duplicateSummary = IdentityResolution.generateDuplicateSummary(duplicateCheckResults);
    const globalWarningPanel = renderGlobalWarningPanel();

    if (!duplicateSummary.requiresUserAction) {
      return (
        <div className="ai-analysis__no-duplicates">
          <CheckCircle className="ai-analysis__success-icon" size={48} />
          <h3>沒有發現重複項目</h3>
          <p>請確認上述資料正確後開始匯入</p>

          {globalWarningPanel}

          {/* Validation Summary */}
          {previewModel && (
            <div className="ai-analysis__validation-summary">
              {(() => {
                const totalErrors = previewModel.schools.reduce(
                  (total, school) =>
                    total +
                    (school.validation?.errors?.length || 0) +
                    (school.students?.reduce(
                      (studentTotal, student) =>
                        studentTotal + (student.validation?.errors?.length || 0),
                      0
                    ) || 0),
                  0
                );

                const totalWarnings = previewModel.schools.reduce(
                  (total, school) =>
                    total +
                    (school.validation?.warnings?.length || 0) +
                    (school.students?.reduce(
                      (studentTotal, student) =>
                        studentTotal + (student.validation?.warnings?.length || 0),
                      0
                    ) || 0),
                  0
                );

                return (
                  <div className="ai-analysis__validation-stats">
                    {totalErrors > 0 && (
                      <div className="ai-analysis__validation-stat ai-analysis__validation-stat--error">
                        <span className="ai-analysis__validation-count">{totalErrors}</span>
                        <span className="ai-analysis__validation-label">錯誤</span>
                      </div>
                    )}
                    {totalWarnings > 0 && (
                      <div className="ai-analysis__validation-stat ai-analysis__validation-stat--warning">
                        <span className="ai-analysis__validation-count">{totalWarnings}</span>
                        <span className="ai-analysis__validation-label">警告</span>
                      </div>
                    )}
                    {totalErrors === 0 && totalWarnings === 0 && (
                      <div className="ai-analysis__validation-stat ai-analysis__validation-stat--success">
                        <span className="ai-analysis__validation-label">所有資料驗證通過</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* School confirmations */}
          {previewModel && (
            <div className="ai-analysis__schools-confirmation">
              <h4>學校確認狀態</h4>
              {previewModel.schools.map((school, index) => (
                <div key={index} className="ai-analysis__school-confirmation-item">
                  <div className="ai-analysis__school-info">
                    <School size={16} />
                    <span>{school.name}</span>
                    <span className="ai-analysis__student-count">
                      ({school.students?.length || 0} 名學生)
                    </span>
                  </div>

                  {schoolConfirmations[index] ? (
                    <div className="ai-analysis__confirmation-status ai-analysis__confirmation-status--confirmed">
                      <CheckCircle size={16} />
                      <span>已確認</span>
                      <button
                        onClick={() => handleSchoolConfirmation(index, false)}
                        className="ai-analysis__button ai-analysis__button--small ai-analysis__button--secondary"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSchoolConfirmation(index, true)}
                      className="ai-analysis__button ai-analysis__button--small ai-analysis__button--primary"
                    >
                      確認此學校
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="ai-analysis__import-actions">
            {checkImportReadiness() && (
              <button
                onClick={handleImportData}
                className="ai-analysis__button ai-analysis__button--primary ai-analysis__button--large"
              >
                <Upload size={20} />
                開始匯入資料
              </button>
            )}
            {!checkImportReadiness() && (
              <p className="ai-analysis__import-notice">請先確認所有學校後才能開始匯入</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="ai-analysis__duplicate-resolution">
        {globalWarningPanel}

        <div className="ai-analysis__duplicate-header">
          <AlertCircle size={24} />
          <h3>發現重複項目</h3>
          <div className="ai-analysis__duplicate-stats">
            <span>{duplicateSummary.schoolDuplicates} 所學校重複</span>
            <span>{duplicateSummary.studentDuplicates} 名學生重複</span>
          </div>
        </div>

        {/* Schools with potential duplicates */}
        {duplicateCheckResults.map((school, index) => (
          <div key={index} className="ai-analysis__school-section">
            <div className="ai-analysis__school-header">
              <School size={20} />
              <h4>{school.name}</h4>
              <span className="ai-analysis__school-type">{school.schoolType}</span>
              {school.hasDuplicates && (
                <div className="ai-analysis__duplicate-badge">
                  <AlertCircle size={16} />
                  有重複
                </div>
              )}
            </div>

            {/* School duplicate resolution */}
            {school.hasDuplicates && (
              <div className="ai-analysis__duplicate-section">
                <h5>學校重複處理</h5>
                <div className="ai-analysis__duplicate-options">
                  <button
                    onClick={() =>
                      handleDuplicateDecision('school', school.name, {
                        action: 'create_new',
                        schoolId: null,
                      })
                    }
                    className={`ai-analysis__duplicate-option ${
                      userDecisions[school.name]?.action === 'create_new' ? 'selected' : ''
                    }`}
                  >
                    建立新學校
                  </button>
                  <button
                    onClick={() =>
                      handleDuplicateDecision('school', school.name, {
                        action: 'use_existing',
                        schoolId: school.duplicates[0]?._id,
                      })
                    }
                    className={`ai-analysis__duplicate-option ${
                      userDecisions[school.name]?.action === 'use_existing' ? 'selected' : ''
                    }`}
                  >
                    使用既有學校
                  </button>
                  <button
                    onClick={() =>
                      handleDuplicateDecision('school', school.name, {
                        action: 'merge_update',
                        schoolId: school.duplicates[0]?._id,
                      })
                    }
                    className={`ai-analysis__duplicate-option ${
                      userDecisions[school.name]?.action === 'merge_update' ? 'selected' : ''
                    }`}
                  >
                    合併更新
                  </button>
                </div>
              </div>
            )}

            {/* Students table */}
            {school.students && school.students.length > 0 && (
              <div className="ai-analysis__students-table">
                <h5>學生名單 ({school.students.length})</h5>
                <table className="ai-analysis__table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>年級</th>
                      <th>班別</th>
                      <th>狀態</th>
                      <th>驗證</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.students.map((student, studentIndex) => (
                      <tr key={studentIndex}>
                        <td>{student.name}</td>
                        <td>{student.grade}</td>
                        <td>{student.class}</td>
                        <td>
                          {student.hasDuplicates ? (
                            <span className="ai-analysis__status ai-analysis__status--duplicate">
                              <AlertCircle size={14} />
                              重複
                            </span>
                          ) : (
                            <span className="ai-analysis__status ai-analysis__status--new">
                              <Plus size={14} />
                              新增
                            </span>
                          )}
                        </td>
                        <td>
                          {student.validation && (
                            <div className="ai-analysis__validation-details">
                              {student.validation.errors?.map((error, idx) => (
                                <div
                                  key={idx}
                                  className="ai-analysis__validation-detail ai-analysis__validation-detail--error"
                                >
                                  {error}
                                </div>
                              ))}
                              {student.validation.warnings?.map((warning, idx) => (
                                <div
                                  key={idx}
                                  className="ai-analysis__validation-detail ai-analysis__validation-detail--warning"
                                >
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Student duplicate resolution for individual students */}
            {school.students && school.students.some(student => student.hasDuplicates) && (
              <div className="ai-analysis__student-duplicates">
                <h5>學生重複處理</h5>
                {school.students
                  .filter(student => student.hasDuplicates)
                  .map((student, studentIndex) => (
                    <div key={studentIndex} className="ai-analysis__student-duplicate-item">
                      <div className="ai-analysis__student-duplicate-header">
                        <Users size={16} />
                        <span>{student.name}</span>
                        <span className="ai-analysis__duplicate-count">
                          ({student.duplicates?.length || 0} 個重複)
                        </span>
                      </div>

                      <div className="ai-analysis__duplicate-options">
                        <button
                          onClick={() =>
                            handleDuplicateDecision('student', `${school.name}-${student.name}`, {
                              action: 'create_new',
                              studentId: null,
                            })
                          }
                          className={`ai-analysis__duplicate-option ${
                            userDecisions[`${school.name}-${student.name}`]?.action === 'create_new'
                              ? 'selected'
                              : ''
                          }`}
                        >
                          建立新學生
                        </button>
                        <button
                          onClick={() =>
                            handleDuplicateDecision('student', `${school.name}-${student.name}`, {
                              action: 'merge',
                              studentId: student.duplicates[0]?._id,
                            })
                          }
                          className={`ai-analysis__duplicate-option ${
                            userDecisions[`${school.name}-${student.name}`]?.action === 'merge'
                              ? 'selected'
                              : ''
                          }`}
                        >
                          合併記錄
                        </button>
                        <button
                          onClick={() =>
                            handleDuplicateDecision('student', `${school.name}-${student.name}`, {
                              action: 'skip',
                              studentId: null,
                            })
                          }
                          className={`ai-analysis__duplicate-option ${
                            userDecisions[`${school.name}-${student.name}`]?.action === 'skip'
                              ? 'selected'
                              : ''
                          }`}
                        >
                          跳過匯入
                        </button>
                      </div>

                      {/* Show duplicate matches */}
                      {student.duplicates && student.duplicates.length > 0 && (
                        <div className="ai-analysis__duplicate-matches">
                          <h6>可能的重複項目:</h6>
                          {student.duplicates.slice(0, 3).map((duplicate, dupIndex) => (
                            <div key={dupIndex} className="ai-analysis__duplicate-match">
                              <span className="ai-analysis__duplicate-match-name">
                                {duplicate.name}
                              </span>
                              <span className="ai-analysis__duplicate-match-school">
                                {duplicate.schoolName}
                              </span>
                              <span className="ai-analysis__duplicate-match-similarity">
                                {Math.round((duplicate.similarity || 0) * 100)}% 相似
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* School confirmation section */}
            <div className="ai-analysis__school-confirmation">
              <div className="ai-analysis__confirmation-header">
                <h4>學校確認</h4>
                <p>請確認此學校的資料無誤後，點擊確認按鈕</p>
              </div>

              {schoolConfirmations[index] ? (
                <div className="ai-analysis__confirmation-status ai-analysis__confirmation-status--confirmed">
                  <CheckCircle size={20} />
                  <span>已確認</span>
                  <button
                    onClick={() => handleSchoolConfirmation(index, false)}
                    className="ai-analysis__button ai-analysis__button--small ai-analysis__button--secondary"
                  >
                    取消確認
                  </button>
                </div>
              ) : (
                <div className="ai-analysis__confirmation-status">
                  <button
                    onClick={() => handleSchoolConfirmation(index, true)}
                    className="ai-analysis__button ai-analysis__button--primary"
                  >
                    <CheckCircle size={20} />
                    確認此學校
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Action Buttons */}
        <div className="ai-analysis__action-buttons">
          <button
            onClick={() => {
              const validation = IdentityResolution.validateResolutions(duplicateCheckResults);
              if (validation.isValid) {
                console.log('[使用者決定] ✅ 所有重複項目已解決');
              } else {
                console.log(
                  `[使用者決定] ⚠️ 尚有 ${
                    validation.unresolved.schools.length + validation.unresolved.students.length
                  } 個未解決項目`
                );
              }
            }}
            className="ai-analysis__button ai-analysis__button--secondary"
          >
            <CheckCircle size={20} />
            檢查決定完整性
          </button>

          {checkImportReadiness() && (
            <button
              onClick={handleImportData}
              className="ai-analysis__button ai-analysis__button--primary"
            >
              <Upload size={20} />
              開始匯入資料
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render import progress
  const renderImportProgress = () => {
    if (!importProgress) return null;

    return (
      <div className="ai-analysis__import-progress">
        <div className="ai-analysis__progress-header">
          <Database size={24} />
          <h3>匯入進度</h3>
        </div>

        <div className="ai-analysis__progress-content">
          {importProgress.stage === 'starting' && (
            <div className="ai-analysis__progress-stage">
              <Loader className="ai-analysis__spinner" size={20} />
              <span>準備開始匯入...</span>
            </div>
          )}

          {importProgress.stage === 'processing_school' && (
            <div className="ai-analysis__progress-stage">
              <School size={20} />
              <span>處理學校: {importProgress.currentSchool}</span>
              <div className="ai-analysis__progress-bar">
                <div
                  className="ai-analysis__progress-fill"
                  style={{
                    width: `${((importProgress.current + 1) / importProgress.total) * 100}%`,
                  }}
                />
              </div>
              <span className="ai-analysis__progress-text">
                {importProgress.current + 1} / {importProgress.total}
              </span>
            </div>
          )}

          {importProgress.stage === 'processing_student' && (
            <div className="ai-analysis__progress-stage">
              <Users size={20} />
              <span>處理學生: {importProgress.currentStudent}</span>
              <div className="ai-analysis__progress-detail">
                學校: {importProgress.currentSchool} ({importProgress.studentIndex + 1}/
                {importProgress.totalStudents})
              </div>
            </div>
          )}

          {importProgress.stage === 'completed' && (
            <div className="ai-analysis__progress-completed">
              <CheckCircle size={48} className="ai-analysis__success-icon" />
              <h4>匯入完成</h4>
              <div className="ai-analysis__import-summary">
                <div className="ai-analysis__summary-stat">
                  <span className="ai-analysis__summary-number">
                    {importProgress.summary?.successCount || 0}
                  </span>
                  <span className="ai-analysis__summary-label">成功</span>
                </div>
                <div className="ai-analysis__summary-stat">
                  <span className="ai-analysis__summary-number">
                    {importProgress.summary?.failureCount || 0}
                  </span>
                  <span className="ai-analysis__summary-label">失敗</span>
                </div>
              </div>
            </div>
          )}

          {importProgress.stage === 'error' && (
            <div className="ai-analysis__progress-error">
              <AlertCircle size={48} className="ai-analysis__error-icon" />
              <h4>匯入失敗</h4>
              <p>{importProgress.message}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 1: File Upload
  if (currentStep === 1) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">
          <div className="ai-analysis__card-header">
            <Upload size={24} />
            <h2>上傳 Excel / CSV 檔案</h2>
          </div>

          <div className="ai-analysis__upload-area">
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={e => setSelectedFile(e.target.files[0])}
              className="ai-analysis__file-input"
            />
            <label htmlFor="file-input" className="ai-analysis__upload-label">
              <div className="ai-analysis__upload-icon">
                <FileSpreadsheet size={48} />
              </div>
              <div className="ai-analysis__upload-text">
                <h3>點擊選擇 Excel 或 CSV 檔案</h3>
                <p>支援 .xlsx, .xls, .csv 格式，檔案大小限制 25MB</p>
              </div>
            </label>

            {selectedFile && (
              <div className="ai-analysis__file-info">
                <div className="ai-analysis__file-details">
                  <FileSpreadsheet size={20} />
                  <span className="ai-analysis__file-name">{selectedFile.name}</span>
                  <span className="ai-analysis__file-size">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="ai-analysis__remove-file">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="ai-analysis__upload-actions">
            <button
              onClick={() => handleFlowSelection('selection')}
              className="ai-analysis__button ai-analysis__button--secondary"
            >
              返回選擇
            </button>
            <button
              onClick={handleExcelProcessing}
              disabled={!selectedFile || excelProcessing}
              className="ai-analysis__button ai-analysis__button--primary"
            >
              {excelProcessing ? (
                <>
                  <Loader className="ai-analysis__spinner" size={20} />
                  處理中...
                </>
              ) : (
                <>
                  <Eye size={20} />
                  解析並預覽
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Processing
  if (currentStep === 2 && excelProcessing) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">
          <div className="ai-analysis__processing">
            <Loader className="ai-analysis__spinner ai-analysis__spinner--large" size={48} />
            <h3>正在處理檔案...</h3>
            <p>解析 Excel 資料並檢查重複項目</p>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirmation
  if (currentStep === 3 && !excelProcessing) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">
          <div className="ai-analysis__card-header">
            <CheckCircle size={24} />
            <h2>確認資料並處理重複項目</h2>
            <div className="ai-analysis__summary">
              {previewModel && (
                <span>
                  {previewModel.schools.length} 所學校，
                  {previewModel.schools.reduce(
                    (total, school) => total + (school.students?.length || 0),
                    0
                  )}{' '}
                  名學生
                </span>
              )}
            </div>
          </div>

          {/* Show data preview table first */}
          {previewModel && (
            <div className="ai-analysis__data-preview">
              <h3>📊 解析結果預覽</h3>
              <div className="ai-analysis__preview-summary">
                <div className="ai-analysis__summary-stats">
                  <div className="ai-analysis__stat">
                    <span className="ai-analysis__stat-number">{previewModel.schools.length}</span>
                    <span className="ai-analysis__stat-label">學校</span>
                  </div>
                  <div className="ai-analysis__stat">
                    <span className="ai-analysis__stat-number">
                      {previewModel.schools.reduce(
                        (total, school) => total + (school.students?.length || 0),
                        0
                      )}
                    </span>
                    <span className="ai-analysis__stat-label">學生</span>
                  </div>
                </div>
              </div>

              <div className="ai-analysis__preview-content">
                {previewModel.schools.map((school, index) => (
                  <div key={index} className="ai-analysis__preview-school">
                    <div className="ai-analysis__school-preview-header">
                      <School size={20} />
                      <h4>{school.name}</h4>
                      <span className="ai-analysis__school-type">{school.schoolType}</span>
                      <span className="ai-analysis__student-count">
                        {school.students?.length || 0} 名學生
                      </span>
                    </div>

                    {school.students && school.students.length > 0 && (
                      <div className="ai-analysis__students-preview">
                        <table className="ai-analysis__preview-table">
                          <thead>
                            <tr>
                              <th>姓名</th>
                              <th>年級</th>
                              <th>班別</th>
                              <th>驗證狀態</th>
                            </tr>
                          </thead>
                          <tbody>
                            {school.students.map((student, studentIndex) => (
                              <tr key={studentIndex}>
                                <td>{student.name}</td>
                                <td>{student.grade}</td>
                                <td>{student.class}</td>
                                <td>
                                  {student.validation && (
                                    <div className="ai-analysis__validation-preview">
                                      {student.validation.errors?.map((error, idx) => (
                                        <div
                                          key={idx}
                                          className="ai-analysis__validation-detail ai-analysis__validation-detail--error"
                                        >
                                          {error}
                                        </div>
                                      ))}
                                      {student.validation.warnings?.map((warning, idx) => (
                                        <div
                                          key={idx}
                                          className="ai-analysis__validation-detail ai-analysis__validation-detail--warning"
                                        >
                                          {warning}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Resolution Section */}
          {renderDuplicateResolution()}
        </div>
      </div>
    );
  }

  // Step 4: Import Progress
  if (currentStep === 4) {
    return (
      <div className="ai-analysis__section">
        <div className="ai-analysis__card">{renderImportProgress()}</div>
      </div>
    );
  }

  return null;
};

export default ExcelWorkflow;
