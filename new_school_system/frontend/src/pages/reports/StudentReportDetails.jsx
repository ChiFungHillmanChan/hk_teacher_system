import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Edit, Save, X, Trash2, User, School, Calendar, 
  Clock, AlertTriangle, CheckCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentReportHelpers } from '../../services/api';
import Loading from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

const StudentReportDetails = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const reportId = params.id || params.recordId;
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load report data
  useEffect(() => {
    const loadReport = async () => {
      if (!reportId) {
        toast.error('找不到報告ID');
        navigate('/reports');
        return;
      }
      
      try {
        setLoading(true);
        console.log('🔍 Loading report with ID:', reportId);
        
        const reportData = await studentReportHelpers.getById(reportId);
        console.log('📋 Loaded report data:', reportData);

        if (!reportData) {
          toast.error('找不到報告');
          navigate('/reports');
          return;
        }

        setReport(reportData);
        setEditData({ ...reportData }); // Shallow copy like SchoolDetail
        
      } catch (err) {
        console.error('❌ Error loading report:', err);
        if (err.status === 404) {
          toast.error('找不到報告');
          navigate('/reports');
        } else if (err.status === 403) {
          toast.error('您沒有權限查看此報告');
          navigate('/reports');
        } else {
          toast.error('載入報告失敗: ' + (err.message || '未知錯誤'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId, navigate]);

  const canEditReport = () => {
    if (!user?.id || !report) return false;
    if (user.role === 'admin') return true;
    
    const isCreator = report.createdBy?._id === user.id || report.createdBy === user.id;
    const isSubjectTeacher = report.subject?.teacher?._id === user.id || report.subject?.teacher === user.id;
    
    if (report.status === 'approved' && user.role !== 'admin') return false;
    
    return isCreator || isSubjectTeacher;
  };

  const canDeleteReport = () => {
    if (!user?.id || !report) return false;
    if (user.role === 'admin') return true;
    
    const isCreator = report.createdBy?._id === user.id || report.createdBy === user.id;
    if (report.status === 'approved' && user.role !== 'admin') return false;
    
    return isCreator;
  };

  // Handle input changes - similar to SchoolDetail pattern
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parentField, childField, subField, value) => {
    setEditData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: subField ? {
          ...prev[parentField]?.[childField],
          [subField]: value
        } : value
      }
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...report }); // Simple shallow copy like SchoolDetail
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ ...report }); // Reset to original data
  };

  // Save function - similar to SchoolDetail pattern
  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Starting save with editData:', editData);

      // Basic validation - only for truly required fields
      if (!editData.subjectDetails?.topic?.trim()) {
        toast.error('課題名稱為必填項目');
        return;
      }

      // Create update payload - only include changed/meaningful fields
      const updateData = {};

      // Subject Details
      if (editData.subjectDetails) {
        updateData.subjectDetails = {
          topic: editData.subjectDetails.topic?.trim() || '',
          duration: editData.subjectDetails.duration || 60,
          learningObjectives: editData.subjectDetails.learningObjectives || [],
          materials: editData.subjectDetails.materials || [],
          activities: editData.subjectDetails.activities || []
        };
      }

      // Performance
      if (editData.performance) {
        updateData.performance = {
          attendance: {
            status: editData.performance.attendance?.status || 'present',
            punctuality: editData.performance.attendance?.punctuality || 'good'
          },
          participation: {
            level: editData.performance.participation?.level || 'good',
            engagement: editData.performance.participation?.engagement || 'active',
            contribution: editData.performance.participation?.contribution || ''
          },
          understanding: {
            level: editData.performance.understanding?.level || 'satisfactory',
            concepts_mastered: editData.performance.understanding?.concepts_mastered || [],
            concepts_struggling: editData.performance.understanding?.concepts_struggling || [],
            comprehension_notes: editData.performance.understanding?.comprehension_notes || ''
          },
          skills: {
            academic_skills: editData.performance.skills?.academic_skills || [],
            social_skills: editData.performance.skills?.social_skills || [],
            communication: editData.performance.skills?.communication || {}
          },
          assessment: {
            type: editData.performance.assessment?.type || 'observation',
            score: editData.performance.assessment?.score !== null && 
                   editData.performance.assessment?.score !== undefined && 
                   editData.performance.assessment?.score !== '' 
                   ? Math.max(0, Math.min(100, parseFloat(editData.performance.assessment.score)))
                   : undefined,
            grade: editData.performance.assessment?.grade || undefined,
            feedback: editData.performance.assessment?.feedback || '',
            rubric_scores: editData.performance.assessment?.rubric_scores || []
          }
        };
      }

      // Homework
      if (editData.homework) {
        updateData.homework = {
          assigned: Boolean(editData.homework.assigned),
          details: {
            description: editData.homework.details?.description || '',
            due_date: editData.homework.details?.due_date || undefined,
            estimated_time: editData.homework.details?.estimated_time || undefined,
            materials_needed: editData.homework.details?.materials_needed || [],
            instructions: editData.homework.details?.instructions || []
          },
          completion: {
            status: editData.homework.completion?.status || 'pending',
            quality: editData.homework.completion?.quality || undefined,
            timeliness: editData.homework.completion?.timeliness || undefined,
            effort: editData.homework.completion?.effort || 'satisfactory'
          }
        };
      }

      // Behavior
      if (editData.behavior) {
        updateData.behavior = {
          conduct: editData.behavior.conduct || 'satisfactory',
          cooperation: editData.behavior.cooperation || 'satisfactory',
          respect: editData.behavior.respect || 'satisfactory',
          following_instructions: editData.behavior.following_instructions || 'satisfactory',
          notes: editData.behavior.notes || '',
          incidents: editData.behavior.incidents || []
        };
      }

      // Remarks
      if (editData.remarks) {
        updateData.remarks = {
          strengths: editData.remarks.strengths || [],
          areas_for_improvement: editData.remarks.areas_for_improvement || [],
          recommendations: editData.remarks.recommendations || [],
          next_steps: editData.remarks.next_steps || [],
          teacher_comments: editData.remarks.teacher_comments || '',
          parent_feedback_requested: Boolean(editData.remarks.parent_feedback_requested),
          follow_up_meeting: editData.remarks.follow_up_meeting || undefined
        };
      }

      // Other fields
      if (editData.tags !== undefined) updateData.tags = editData.tags;
      if (editData.isPrivate !== undefined) updateData.isPrivate = Boolean(editData.isPrivate);

      // Remove undefined values to keep payload clean
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      console.log('📤 Sending update payload:', JSON.stringify(updateData, null, 2));

      // Send update request
      const updatedReport = await studentReportHelpers.update(reportId, updateData);
      console.log('✅ Update response received:', updatedReport);

      // Update local state with response data - like SchoolDetail
      setReport(updatedReport);
      setEditData({ ...updatedReport });
      setIsEditing(false);
      
      toast.success('報告已成功更新');
      
    } catch (error) {
      console.error('❌ Error updating report:', error);
      
      // Handle specific error types
      if (error.response?.status === 403) {
        toast.error('您沒有權限修改此報告');
      } else if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map(err => err.message || err.msg).join(', ');
        toast.error(`驗證錯誤: ${errorMessages}`);
      } else if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.message || err.msg).join(', ');
        toast.error(`驗證錯誤: ${errorMessages}`);
      } else {
        toast.error('更新失敗，請稍後再試');
      }
      
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await studentReportHelpers.delete(reportId);
      toast.success('報告已刪除');
      navigate('/reports');
    } catch (err) {
      console.error('Error deleting report:', err);
      if (err.status === 403) {
        toast.error('您沒有權限刪除此報告');
      } else {
        toast.error('刪除失敗: ' + (err.message || '未知錯誤'));
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      draft: { text: '草稿', color: '#95a5a6', bgColor: '#ecf0f1' },
      submitted: { text: '已提交', color: '#3498db', bgColor: '#ebf3fd' },
      reviewed: { text: '已審閱', color: '#f39c12', bgColor: '#fef9e7' },
      approved: { text: '已批准', color: '#27ae60', bgColor: '#eafaf1' },
      archived: { text: '已歸檔', color: '#7f8c8d', bgColor: '#f8f9fa' }
    };
    return statusMap[status] || { text: status, color: '#95a5a6', bgColor: '#ecf0f1' };
  };

  const getPerformanceDisplay = (level) => {
    const levelMap = {
      excellent: { text: '優秀', color: '#27ae60' },
      good: { text: '良好', color: '#3498db' },
      satisfactory: { text: '一般', color: '#f39c12' },
      needs_improvement: { text: '需改進', color: '#e74c3c' },
      poor: { text: '差', color: '#95a5a6' },
      fair: { text: '一般', color: '#f39c12' }
    };
    return levelMap[level] || { text: level, color: '#95a5a6' };
  };

  const formatDate = (date) => {
    if (!date) return '未設定';
    return new Date(date).toLocaleDateString('zh-HK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column'
      }}>
        <Loading message="載入報告中..." />
        <p style={{ marginTop: '1rem', color: '#666' }}>
          正在載入報告 ID: {reportId}
        </p>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>找不到報告</h2>
          <p>報告 ID: {reportId}</p>
          <button onClick={() => navigate('/reports')} className="btn btn--primary">
            返回報告列表
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(report.status);

  return (
    <div className="school-detail">
      {/* Header */}
      <div className="school-detail__header">
        <div className="school-detail__header-content">
          <div className="school-detail__title-section">
            <div className="school-detail__icon">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="school-detail__title">
                學生報告詳情
              </h1>
              <div className="school-detail__subtitle" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span 
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: statusDisplay.color,
                    backgroundColor: statusDisplay.bgColor,
                    border: `1px solid ${statusDisplay.color}`
                  }}
                >
                  {statusDisplay.text}
                </span>
                {report.isPrivate && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#e74c3c', fontSize: '14px' }}>
                    <EyeOff size={16} />
                    私人報告
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="school-detail__actions">
            {isEditing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn btn--primary">
                  {saving ? <Loading size="small" /> : <Save size={20} />}
                  保存
                </button>
                <button onClick={handleCancelEdit} className="btn btn--secondary">
                  <X size={20} /> 取消
                </button>
              </>
            ) : (
              <>
                {canEditReport() && (
                  <button onClick={handleEdit} className="btn btn--primary">
                    <Edit size={20} /> 編輯
                  </button>
                )}
                {canDeleteReport() && (
                  <button 
                    onClick={() => setShowDeleteModal(true)}
                    className="btn btn--danger"
                  >
                    <Trash2 size={20} /> 刪除
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="school-detail__content">
        {/* Basic Information (Read-only) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">基本資訊</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>學生</label>
              <span>
                <User size={16} />
                {report.student?.name || '未知學生'}
                {report.student?.nameEn && ` (${report.student.nameEn})`}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>學校</label>
              <span>
                <School size={16} />
                {report.school?.name || '未知學校'}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>學年</label>
              <span>
                <Calendar size={16} />
                {report.academicYear}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>報告日期</label>
              <span>
                <Calendar size={16} />
                {formatDate(report.reportDate)}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>科目</label>
              <span>{report.subject?.name || '未設定'}</span>
            </div>

            <div className="school-detail__info-item">
              <label>教師</label>
              <span>{report.subject?.teacher?.name || '未設定'}</span>
            </div>
          </div>
        </div>

        {/* Subject Details (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">課程詳情</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>課題 *</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.subjectDetails?.topic || ''}
                  onChange={(e) => handleNestedChange('subjectDetails', 'topic', null, e.target.value)}
                  className="form-input"
                  placeholder="課題名稱"
                  required
                  maxLength={200}
                />
              ) : (
                <span>{report.subjectDetails?.topic || '未設定'}</span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>課程時長 (分鐘)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.subjectDetails?.duration || 60}
                  onChange={(e) => handleNestedChange('subjectDetails', 'duration', null, parseInt(e.target.value) || 60)}
                  className="form-input"
                  min="1"
                  max="300"
                />
              ) : (
                <span>
                  <Clock size={16} />
                  {report.subjectDetails?.duration || 60} 分鐘
                </span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>課程內容</label>
              {isEditing ? (
                <textarea
                   value={editData.subjectDetails?.topic || ''}
                  onChange={(e) => handleNestedChange('subjectDetails', 'topic', null, e.target.value)}
                  className="form-textarea"
                  placeholder="課程內容描述"
                  rows={4}
                  maxLength={1000}
                  required
                />
              ) : (
                <span>{report.content || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Performance (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">學習表現</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>參與程度</label>
              {isEditing ? (
                <select
                  value={editData.performance?.participation?.level || 'good'}
                  onChange={(e) => handleNestedChange('performance', 'participation', 'level', e.target.value)}
                  className="form-input"
                >
                  <option value="excellent">優秀</option>
                  <option value="good">良好</option>
                  <option value="fair">一般</option>
                  <option value="poor">差</option>
                  <option value="not_applicable">不適用</option>
                </select>
              ) : (
                <span style={{ color: getPerformanceDisplay(report.performance?.participation?.level).color }}>
                  {getPerformanceDisplay(report.performance?.participation?.level).text}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>理解程度</label>
              {isEditing ? (
                <select
                  value={editData.performance?.understanding?.level || 'satisfactory'}
                  onChange={(e) => handleNestedChange('performance', 'understanding', 'level', e.target.value)}
                  className="form-input"
                >
                  <option value="excellent">優秀</option>
                  <option value="good">良好</option>
                  <option value="satisfactory">一般</option>
                  <option value="needs_improvement">需改進</option>
                  <option value="poor">差</option>
                </select>
              ) : (
                <span style={{ color: getPerformanceDisplay(report.performance?.understanding?.level).color }}>
                  {getPerformanceDisplay(report.performance?.understanding?.level).text}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>評估分數 (0-100)</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editData.performance?.assessment?.score ?? ''}
                  onChange={(e) => handleNestedChange('performance', 'assessment', 'score', e.target.value ? Math.max(0, Math.min(100, parseInt(e.target.value))) : null)}
                  className="form-input"
                  min="0"
                  max="100"
                  placeholder="0-100"
                />
              ) : (
                <span>{report.performance?.assessment?.score !== null && report.performance?.assessment?.score !== undefined ? report.performance?.assessment?.score : '未設定'}</span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>理解備註</label>
              {isEditing ? (
                <textarea
                  value={editData.performance?.understanding?.comprehension_notes || ''}
                  onChange={(e) => handleNestedChange('performance', 'understanding', 'comprehension_notes', e.target.value)}
                  className="form-textarea"
                  placeholder="理解程度相關備註"
                  rows={3}
                  maxLength={500}
                />
              ) : (
                <span>{report.performance?.understanding?.comprehension_notes || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Behavior (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">行為表現</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>品行</label>
              {isEditing ? (
                <select
                  value={editData.behavior?.conduct || 'satisfactory'}
                  onChange={(e) => handleNestedChange('behavior', 'conduct', null, e.target.value)}
                  className="form-input"
                >
                  <option value="excellent">優秀</option>
                  <option value="good">良好</option>
                  <option value="satisfactory">一般</option>
                  <option value="needs_improvement">需改進</option>
                  <option value="poor">差</option>
                </select>
              ) : (
                <span style={{ color: getPerformanceDisplay(report.behavior?.conduct).color }}>
                  {getPerformanceDisplay(report.behavior?.conduct).text}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>合作性</label>
              {isEditing ? (
                <select
                  value={editData.behavior?.cooperation || 'satisfactory'}
                  onChange={(e) => handleNestedChange('behavior', 'cooperation', null, e.target.value)}
                  className="form-input"
                >
                  <option value="excellent">優秀</option>
                  <option value="good">良好</option>
                  <option value="satisfactory">一般</option>
                  <option value="needs_improvement">需改進</option>
                  <option value="poor">差</option>
                </select>
              ) : (
                <span style={{ color: getPerformanceDisplay(report.behavior?.cooperation).color }}>
                  {getPerformanceDisplay(report.behavior?.cooperation).text}
                </span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>行為備註</label>
              {isEditing ? (
                <textarea
                  value={editData.behavior?.notes || ''}
                  onChange={(e) => handleNestedChange('behavior', 'notes', null, e.target.value)}
                  className="form-textarea"
                  placeholder="行為表現相關備註"
                  rows={3}
                  maxLength={500}
                />
              ) : (
                <span>{report.behavior?.notes || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Remarks (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">評語及建議</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item school-detail__info-item--full">
              <label>教師評語</label>
              {isEditing ? (
                <textarea
                  value={editData.remarks?.teacher_comments || ''}
                  onChange={(e) => handleNestedChange('remarks', 'teacher_comments', null, e.target.value)}
                  className="form-textarea"
                  placeholder="教師評語和建議"
                  rows={4}
                  maxLength={1000}
                />
              ) : (
                <span>{report.remarks?.teacher_comments || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="school-detail__info-section">
          <h2 className="section-title">建立資訊</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>建立者</label>
              <span>{report.createdBy?.name || '未知'}</span>
            </div>

            <div className="school-detail__info-item">
              <label>建立時間</label>
              <span>{formatDate(report.createdAt)}</span>
            </div>

            {report.lastModifiedBy && (
              <div className="school-detail__info-item">
                <label>最後修改者</label>
                <span>{report.lastModifiedBy.name}</span>
              </div>
            )}

            {report.updatedAt && report.updatedAt !== report.createdAt && (
              <div className="school-detail__info-item">
                <label>最後修改時間</label>
                <span>{formatDate(report.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            fontFamily: 'Arial, sans-serif'
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              border: '2px solid #dc3545',
              boxShadow: '0 0 30px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{color: '#dc3545', marginBottom: '20px', textAlign: 'center'}}>
              ⚠️ 確認刪除報告
            </h2>
            
            <p style={{fontSize: '16px', marginBottom: '10px', textAlign: 'center'}}>
              您確定要刪除此學生報告嗎？
            </p>
            <p style={{fontSize: '14px', marginBottom: '20px', textAlign: 'center', color: '#666'}}>
              學生：{report.student?.name} | 科目：{report.subject?.name} | 日期：{formatDate(report.reportDate)}
            </p>
            
            <p style={{color: '#dc3545', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center'}}>
              此操作無法復原！
            </p>
            
            <div style={{textAlign: 'center'}}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  marginRight: '15px',
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                取消
              </button>
              
              <button 
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '12px 24px',
                  backgroundColor: deleting ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReportDetails;