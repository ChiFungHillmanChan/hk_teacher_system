import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  Edit,
  MapPin,
  Plus,
  Save,
  School,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import { useAuth } from '../../context/AuthContext';
import { meetingRecordHelpers } from '../../services/api';

const MeetingRecordDetail = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const meetingId = params.id;

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Participants management
  const [participantInput, setParticipantInput] = useState('');

  // Load meeting data
  useEffect(() => {
    const loadMeeting = async () => {
      if (!meetingId) {
        toast.error('找不到會議記錄ID');
        navigate('/meetings');
        return;
      }

      try {
        setLoading(true);

        const response = await meetingRecordHelpers.getById(meetingId);

        // Handle different possible response structures
        let meetingData;
        if (response?.data) {
          meetingData = response.data;
        } else if (response?.success && response?.data) {
          meetingData = response.data;
        } else {
          meetingData = response;
        }

        if (!meetingData) {
          toast.error('找不到會議記錄');
          navigate('/meetings');
          return;
        }

        // Ensure senCategories is always an array
        if (!meetingData.senCategories) {
          meetingData.senCategories = [];
        }

        // Ensure participants is always a string
        if (!meetingData.participants) {
          meetingData.participants = '';
        }

        setMeeting(meetingData);

        // FIXED: Create editData with proper ID extraction for populated fields
        const editDataWithIds = {
          ...meetingData,
          // Extract IDs from populated objects for form editing
          student: meetingData.student?._id || meetingData.student,
          school: meetingData.school?._id || meetingData.school,
          createdBy: meetingData.createdBy?._id || meetingData.createdBy,
          lastModifiedBy: meetingData.lastModifiedBy?._id || meetingData.lastModifiedBy,
        };

        setEditData(editDataWithIds);
      } catch (err) {
        console.error('❌ Error loading meeting:', err);
        if (err.status === 404) {
          toast.error('找不到會議記錄');
          navigate('/meetings');
        } else if (err.status === 403) {
          toast.error('您沒有權限查看此會議記錄');
          navigate('/meetings');
        } else {
          toast.error('載入會議記錄失敗: ' + (err.message || '未知錯誤'));
        }
      } finally {
        setLoading(false);
      }
    };

    loadMeeting();
  }, [meetingId, navigate]);

  const canEditMeeting = () => {
    if (!user?.id || !meeting) return false;
    if (user.role === 'admin') return true;

    const isCreator = meeting.createdBy?._id === user.id || meeting.createdBy === user.id;

    if (meeting.status === 'archived' && user.role !== 'admin') return false;

    return isCreator;
  };

  const canDeleteMeeting = () => {
    if (!user?.id || !meeting) return false;
    if (user.role === 'admin') return true;

    const isCreator = meeting.createdBy?._id === user.id || meeting.createdBy === user.id;
    if (meeting.status === 'archived' && user.role !== 'admin') return false;

    return isCreator;
  };

  // Handle input changes - similar to SchoolDetail pattern
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // Handle participants management
  const getParticipantsList = participantsString => {
    if (!participantsString) return [];
    return participantsString
      .split('|')
      .filter(p => p.trim())
      .map(p => p.trim());
  };

  const setParticipantsList = participantsList => {
    const participantsString = participantsList.join('|');
    handleInputChange('participants', participantsString);
  };

  const handleAddParticipant = () => {
    if (!participantInput.trim()) return;

    const currentParticipants = getParticipantsList(editData.participants || '');

    // Check for duplicates
    if (currentParticipants.includes(participantInput.trim())) {
      toast.error('該參與者已存在');
      return;
    }

    const newParticipants = [...currentParticipants, participantInput.trim()];
    setParticipantsList(newParticipants);
    setParticipantInput('');
  };

  const handleRemoveParticipant = indexToRemove => {
    const currentParticipants = getParticipantsList(editData.participants || '');
    const newParticipants = currentParticipants.filter((_, index) => index !== indexToRemove);
    setParticipantsList(newParticipants);
  };

  // Handle SEN categories
  const handleSenCategoryChange = (category, checked) => {
    const currentCategories = editData.senCategories || [];
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(c => c !== category);

    handleInputChange('senCategories', newCategories);
  };

  const handleEdit = () => {
    setIsEditing(true);
    const editDataWithIds = {
      ...meeting,
      student: meeting.student?._id || meeting.student,
      school: meeting.school?._id || meeting.school,
      createdBy: meeting.createdBy?._id || meeting.createdBy,
      lastModifiedBy: meeting.lastModifiedBy?._id || meeting.lastModifiedBy,
    };
    setEditData(editDataWithIds);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // FIXED: Reset to original data with proper ID extraction
    const resetDataWithIds = {
      ...meeting,
      student: meeting.student?._id || meeting.student,
      school: meeting.school?._id || meeting.school,
      createdBy: meeting.createdBy?._id || meeting.createdBy,
      lastModifiedBy: meeting.lastModifiedBy?._id || meeting.lastModifiedBy,
    };
    setEditData(resetDataWithIds);
    setParticipantInput('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Basic validation
      if (!editData.meetingTitle?.trim()) {
        toast.error('會議名稱為必填項目');
        return;
      }

      if (!editData.senCategories || editData.senCategories.length === 0) {
        toast.error('請至少選擇一個SEN類別');
        return;
      }

      if (editData.meetingType === 'iep' && !editData.supportLevel) {
        toast.error('IEP會議需要選擇學校支援層級');
        return;
      }

      // Create update payload - editData should now have proper IDs
      const updateData = {
        // Required fields (should now be IDs, not objects)
        student: editData.student,
        school: editData.school,
        academicYear: editData.academicYear,
        meetingType: editData.meetingType,

        // Editable fields
        meetingTitle: editData.meetingTitle?.trim() || '',
        meetingDate: editData.meetingDate || meeting.meetingDate,
        endTime: editData.endTime || meeting.endTime,
        participants: editData.participants || '',
        meetingLocation: editData.meetingLocation?.trim() || '',
        senCategories: editData.senCategories || [],
        meetingContent: editData.meetingContent?.trim() || '',
        senCategoriesOther: editData.senCategoriesOther?.trim() || '',
        remarks: editData.remarks?.trim() || '',
      };

      // Add IEP-specific fields if needed
      if (editData.meetingType === 'iep') {
        updateData.supportLevel = editData.supportLevel || '';
        updateData.currentLearningStatus = editData.currentLearningStatus?.trim() || '';
        updateData.curriculumAdaptation = editData.curriculumAdaptation?.trim() || '';
        updateData.teachingAdaptation = editData.teachingAdaptation?.trim() || '';
        updateData.peerSupport = editData.peerSupport?.trim() || '';
        updateData.teacherCollaboration = editData.teacherCollaboration?.trim() || '';
        updateData.classroomManagement = editData.classroomManagement?.trim() || '';
        updateData.assessmentAdaptation = editData.assessmentAdaptation?.trim() || '';
        updateData.homeworkAdaptation = editData.homeworkAdaptation?.trim() || '';
        updateData.teacherRecommendations = editData.teacherRecommendations?.trim() || '';
        updateData.parentRecommendations = editData.parentRecommendations?.trim() || '';
      }

      const updatedMeeting = await meetingRecordHelpers.update(meetingId, updateData);

      setMeeting(updatedMeeting);
      const newEditData = {
        ...updatedMeeting,
        student: updatedMeeting.student?._id || updatedMeeting.student,
        school: updatedMeeting.school?._id || updatedMeeting.school,
        createdBy: updatedMeeting.createdBy?._id || updatedMeeting.createdBy,
        lastModifiedBy: updatedMeeting.lastModifiedBy?._id || updatedMeeting.lastModifiedBy,
      };
      setEditData(newEditData);
      setIsEditing(false);

      toast.success('會議記錄已成功更新');
    } catch (error) {
      console.error('❌ Error updating meeting:', error);

      if (error.response?.status === 403) {
        toast.error('您沒有權限修改此會議記錄');
      } else if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map(err => err.message || err.msg).join(', ');
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
      await meetingRecordHelpers.delete(meetingId);
      toast.success('會議記錄已刪除');
      navigate('/meetings');
    } catch (err) {
      console.error('Error deleting meeting:', err);
      if (err.status === 403) {
        toast.error('您沒有權限刪除此會議記錄');
      } else {
        toast.error('刪除失敗: ' + (err.message || '未知錯誤'));
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      // Future implementation
      toast.info('PDF生成功能即將推出');
    } catch (error) {
      toast.error('PDF生成失敗');
    }
  };

  const getStatusDisplay = status => {
    const statusMap = {
      draft: { text: '草稿', color: '#95a5a6', bgColor: '#ecf0f1' },
      completed: { text: '已完成', color: '#27ae60', bgColor: '#eafaf1' },
      archived: { text: '已歸檔', color: '#7f8c8d', bgColor: '#f8f9fa' },
    };
    return statusMap[status] || { text: status, color: '#95a5a6', bgColor: '#ecf0f1' };
  };

  const formatDate = date => {
    if (!date) return '未設定';
    return new Date(date).toLocaleDateString('zh-HK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const senCategories = [
    '注意力不足/過度活躍症',
    '自閉症譜系障礙',
    '聽力障礙',
    '精神疾病',
    '肢體傷殘',
    '特殊學習困難',
    '言語障礙',
    '視覺障礙',
    '智力障礙',
    '其他',
    '沒有',
  ];

  const supportLevels = ['第一層', '第二層', '第三層', '其他', '沒有'];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          flexDirection: 'column',
        }}
      >
        <Loading message="載入會議記錄中..." />
        <p style={{ marginTop: '1rem', color: '#666' }}>正在載入會議記錄 ID: {meetingId}</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>找不到會議記錄</h2>
          <p>會議記錄 ID: {meetingId}</p>
          <button onClick={() => navigate('/meetings')} className="btn btn--primary">
            返回會議記錄列表
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(meeting.status);
  const isIEPMeeting = meeting.meetingType === 'iep';

  return (
    <div className="school-detail">
      {/* Header */}
      <div className="school-detail__header">
        <div className="school-detail__header-content">
          <div className="school-detail__title-section">
            <div className="school-detail__icon">
              {isIEPMeeting ? <UserCheck size={32} /> : <BookOpen size={32} />}
            </div>
            <div>
              <h1 className="school-detail__title">{isIEPMeeting ? 'IEP' : '普通'}會議記錄詳情</h1>
              <div
                className="school-detail__subtitle"
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: statusDisplay.color,
                    backgroundColor: statusDisplay.bgColor,
                    border: `1px solid ${statusDisplay.color}`,
                  }}
                >
                  {statusDisplay.text}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: isIEPMeeting ? '#8b5cf6' : '#3b82f6',
                    backgroundColor: isIEPMeeting ? '#f3e8ff' : '#dbeafe',
                    border: `1px solid ${isIEPMeeting ? '#8b5cf6' : '#3b82f6'}`,
                  }}
                >
                  {isIEPMeeting ? 'IEP會議' : '普通會議'}
                </span>
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
                <button onClick={handleGeneratePDF} className="btn btn--success">
                  <Download size={20} /> 生成PDF
                </button>
                {canEditMeeting() && (
                  <button onClick={handleEdit} className="btn btn--primary">
                    <Edit size={20} /> 編輯
                  </button>
                )}
                {canDeleteMeeting() && (
                  <button onClick={() => setShowDeleteModal(true)} className="btn btn--danger">
                    <Trash2 size={20} /> 刪除
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Meeting Content */}
      <div className="school-detail__content">
        {/* REDESIGNED: Basic Information (Read-only - Student and School only) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">基本資訊</h2>

          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>學生</label>
              <span>
                <User size={16} />
                {meeting.student?.name || '未知學生'}
                {meeting.student?.nameEn && ` (${meeting.student.nameEn})`}
                {meeting.student?.studentId && ` - ${meeting.student.studentId}`}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>學校</label>
              <span>
                <School size={16} />
                {meeting.school?.name || '未知學校'}
              </span>
            </div>

            <div className="school-detail__info-item">
              <label>學年</label>
              <span>
                <Calendar size={16} />
                {meeting.academicYear}
              </span>
            </div>
          </div>
        </div>

        {/* REDESIGNED: Meeting Information (Editable - Meeting details only) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">會議資訊</h2>

          <div className="school-detail__info-grid">
            <div className="school-detail__info-item school-detail__info-item--full">
              <label>會議名稱 *</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.meetingTitle || ''}
                  onChange={e => handleInputChange('meetingTitle', e.target.value)}
                  className="form-input"
                  placeholder="會議名稱"
                  required
                  maxLength={200}
                />
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                  {meeting.meetingTitle || '未設定'}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>會議日期</label>
              {isEditing ? (
                <input
                  type="date"
                  value={
                    editData.meetingDate
                      ? new Date(editData.meetingDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={e => handleInputChange('meetingDate', e.target.value)}
                  className="form-input"
                  required
                />
              ) : (
                <span>
                  <Calendar size={16} />
                  {formatDate(meeting.meetingDate)}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>散會時間</label>
              {isEditing ? (
                <input
                  type="time"
                  value={editData.endTime || ''}
                  onChange={e => handleInputChange('endTime', e.target.value)}
                  className="form-input"
                  required
                />
              ) : (
                <span>
                  <Clock size={16} />
                  {meeting.endTime || '未設定'}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>會議地點</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.meetingLocation || ''}
                  onChange={e => handleInputChange('meetingLocation', e.target.value)}
                  className="form-input"
                  placeholder="會議地點"
                  maxLength={200}
                  required
                />
              ) : (
                <span>
                  <MapPin size={16} />
                  {meeting.meetingLocation || '未設定'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Participants Section (Editable with special UI) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">與會人員</h2>

          {isEditing ? (
            <div>
              {/* Add participant input */}
              <div
                style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}
              >
                <input
                  type="text"
                  value={participantInput}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddParticipant()}
                  className="form-input"
                  placeholder="輸入參與者姓名"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="btn btn--secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} /> 加入
                </button>
              </div>

              {/* Participants list */}
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '12px',
                  minHeight: '80px',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getParticipantsList(editData.participants || '').map((participant, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '16px',
                        padding: '4px 8px',
                        fontSize: '14px',
                      }}
                    >
                      <Users size={14} />
                      <span>{participant}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#dc2626',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {getParticipantsList(editData.participants || '').length === 0 && (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                      尚未加入任何參與者
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {getParticipantsList(meeting.participants || '').map((participant, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '14px',
                  }}
                >
                  <Users size={14} />
                  <span>{participant}</span>
                </div>
              ))}
              {getParticipantsList(meeting.participants || '').length === 0 && (
                <span>未設定與會人員</span>
              )}
            </div>
          )}
        </div>

        {/* SEN Categories Section (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">學生特殊學習需要類別</h2>

          {isEditing ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
              }}
            >
              {senCategories.map(category => (
                <label
                  key={category}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={editData.senCategories?.includes(category) || false}
                    onChange={e => handleSenCategoryChange(category, e.target.checked)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(meeting.senCategories || []).map((category, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    color: '#92400e',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {category}
                </span>
              ))}
              {(!meeting.senCategories || meeting.senCategories.length === 0) && (
                <span>未設定SEN類別</span>
              )}
            </div>
          )}

          {/* SEN Categories Other */}
          {(isEditing
            ? editData.senCategories?.includes('其他')
            : meeting.senCategories?.includes('其他')) && (
            <div style={{ marginTop: '12px' }}>
              <label>其他類別說明</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.senCategoriesOther || ''}
                  onChange={e => handleInputChange('senCategoriesOther', e.target.value)}
                  className="form-input"
                  placeholder="請說明其他特殊學習需要"
                  maxLength={500}
                />
              ) : (
                <span>{meeting.senCategoriesOther || '未設定'}</span>
              )}
            </div>
          )}
        </div>

        {/* IEP-Specific Required Fields */}
        {isIEPMeeting && (
          <div className="school-detail__info-section">
            <h2 className="section-title">IEP 會議資訊</h2>

            <div className="school-detail__info-grid">
              <div className="school-detail__info-item">
                <label>學校支援層級 *</label>
                {isEditing ? (
                  <select
                    value={editData.supportLevel || ''}
                    onChange={e => handleInputChange('supportLevel', e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">請選擇支援層級</option>
                    {supportLevels.map(level => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    style={{
                      backgroundColor: '#e0f2fe',
                      border: '1px solid #0277bd',
                      color: '#01579b',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    {meeting.supportLevel || '未設定'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Meeting Content Section (Editable) */}
        <div className="school-detail__info-section">
          <h2 className="section-title">會議內容</h2>

          <div className="school-detail__info-grid">
            <div className="school-detail__info-item school-detail__info-item--full">
              <label>會議內容 *</label>
              {isEditing ? (
                <textarea
                  value={editData.meetingContent || ''}
                  onChange={e => handleInputChange('meetingContent', e.target.value)}
                  className="form-textarea"
                  placeholder="請詳細記錄會議討論的內容、決議事項等"
                  rows={6}
                  maxLength={5000}
                  required
                />
              ) : (
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                  }}
                >
                  {meeting.meetingContent || '未設定'}
                </div>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>備註</label>
              {isEditing ? (
                <textarea
                  value={editData.remarks || ''}
                  onChange={e => handleInputChange('remarks', e.target.value)}
                  className="form-textarea"
                  placeholder="其他需要記錄的事項"
                  rows={3}
                  maxLength={2000}
                />
              ) : (
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef',
                  }}
                >
                  {meeting.remarks || '未設定'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* IEP Optional Fields */}
        {isIEPMeeting && (
          <div className="school-detail__info-section">
            <h2 className="section-title">IEP 詳細資訊</h2>

            <div className="school-detail__info-grid">
              <div className="school-detail__info-item school-detail__info-item--full">
                <label>學生在校學習現況</label>
                {isEditing ? (
                  <textarea
                    value={editData.currentLearningStatus || ''}
                    onChange={e => handleInputChange('currentLearningStatus', e.target.value)}
                    className="form-textarea"
                    placeholder="描述學生目前的學習狀況"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.currentLearningStatus || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>課程調適</label>
                {isEditing ? (
                  <textarea
                    value={editData.curriculumAdaptation || ''}
                    onChange={e => handleInputChange('curriculumAdaptation', e.target.value)}
                    className="form-textarea"
                    placeholder="課程內容的調整和適應"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.curriculumAdaptation || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>教學調適</label>
                {isEditing ? (
                  <textarea
                    value={editData.teachingAdaptation || ''}
                    onChange={e => handleInputChange('teachingAdaptation', e.target.value)}
                    className="form-textarea"
                    placeholder="教學方法的調整和適應"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.teachingAdaptation || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>朋輩支援</label>
                {isEditing ? (
                  <textarea
                    value={editData.peerSupport || ''}
                    onChange={e => handleInputChange('peerSupport', e.target.value)}
                    className="form-textarea"
                    placeholder="同儕間的支援安排"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.peerSupport || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>教師協作</label>
                {isEditing ? (
                  <textarea
                    value={editData.teacherCollaboration || ''}
                    onChange={e => handleInputChange('teacherCollaboration', e.target.value)}
                    className="form-textarea"
                    placeholder="教師間的協作安排"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.teacherCollaboration || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>課堂管理</label>
                {isEditing ? (
                  <textarea
                    value={editData.classroomManagement || ''}
                    onChange={e => handleInputChange('classroomManagement', e.target.value)}
                    className="form-textarea"
                    placeholder="課堂管理的特殊安排"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.classroomManagement || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>評估調適</label>
                {isEditing ? (
                  <textarea
                    value={editData.assessmentAdaptation || ''}
                    onChange={e => handleInputChange('assessmentAdaptation', e.target.value)}
                    className="form-textarea"
                    placeholder="評估方式的調整"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.assessmentAdaptation || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>功課調適</label>
                {isEditing ? (
                  <textarea
                    value={editData.homeworkAdaptation || ''}
                    onChange={e => handleInputChange('homeworkAdaptation', e.target.value)}
                    className="form-textarea"
                    placeholder="功課安排的調整"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.homeworkAdaptation || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>老師建議</label>
                {isEditing ? (
                  <textarea
                    value={editData.teacherRecommendations || ''}
                    onChange={e => handleInputChange('teacherRecommendations', e.target.value)}
                    className="form-textarea"
                    placeholder="教師的建議和意見"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.teacherRecommendations || '未設定'}
                  </div>
                )}
              </div>

              <div className="school-detail__info-item school-detail__info-item--full">
                <label>家長建議</label>
                {isEditing ? (
                  <textarea
                    value={editData.parentRecommendations || ''}
                    onChange={e => handleInputChange('parentRecommendations', e.target.value)}
                    className="form-textarea"
                    placeholder="家長的建議和意見"
                    rows={4}
                    maxLength={2000}
                  />
                ) : (
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                    }}
                  >
                    {meeting.parentRecommendations || '未設定'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="school-detail__info-section">
          <h2 className="section-title">建立資訊</h2>

          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>建立者</label>
              <span>{meeting.createdBy?.name || '未知'}</span>
            </div>

            <div className="school-detail__info-item">
              <label>建立時間</label>
              <span>{formatDate(meeting.createdAt)}</span>
            </div>

            {meeting.lastModifiedBy && (
              <div className="school-detail__info-item">
                <label>最後修改者</label>
                <span>{meeting.lastModifiedBy.name}</span>
              </div>
            )}

            {meeting.updatedAt && meeting.updatedAt !== meeting.createdAt && (
              <div className="school-detail__info-item">
                <label>最後修改時間</label>
                <span>{formatDate(meeting.updatedAt)}</span>
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
            fontFamily: 'Arial, sans-serif',
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
              boxShadow: '0 0 30px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ color: '#dc3545', marginBottom: '20px', textAlign: 'center' }}>
              ⚠️ 確認刪除會議記錄
            </h2>

            <p style={{ fontSize: '16px', marginBottom: '10px', textAlign: 'center' }}>
              您確定要刪除此會議記錄嗎？
            </p>
            <p
              style={{ fontSize: '14px', marginBottom: '20px', textAlign: 'center', color: '#666' }}
            >
              會議：{meeting.meetingTitle} | 學生：{meeting.student?.name} | 日期：
              {formatDate(meeting.meetingDate)}
            </p>

            <p
              style={{
                color: '#dc3545',
                fontWeight: 'bold',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              此操作無法復原！
            </p>

            <div style={{ textAlign: 'center' }}>
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
                  cursor: deleting ? 'not-allowed' : 'pointer',
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
                  cursor: deleting ? 'not-allowed' : 'pointer',
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

export default MeetingRecordDetail;
