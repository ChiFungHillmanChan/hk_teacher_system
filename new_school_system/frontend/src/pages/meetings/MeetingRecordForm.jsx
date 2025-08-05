// pages/meetings/MeetingRecordForm.jsx - UPDATED WITH ENHANCED PARTICIPANTS UI
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Info,
  MapPin,
  Plus,
  Save,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { meetingRecordHelpers, studentHelpers } from '../../services/api';

const MeetingRecordForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Participants management
  const [participantInput, setParticipantInput] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    // Basic fields
    student: searchParams.get('student') || '',
    school: searchParams.get('school') || '',
    academicYear: searchParams.get('year') || '2025/26',
    meetingType: searchParams.get('type') || 'regular',
    meetingTitle: '',
    meetingDate: new Date().toISOString().split('T')[0],
    endTime: '',
    participants: '',
    meetingLocation: '',
    senCategories: [],
    meetingContent: '',

    // Optional fields
    senCategoriesOther: '',
    remarks: '',

    // IEP-specific required field
    supportLevel: '',

    // IEP optional fields
    currentLearningStatus: '',
    curriculumAdaptation: '',
    teachingAdaptation: '',
    peerSupport: '',
    teacherCollaboration: '',
    classroomManagement: '',
    assessmentAdaptation: '',
    homeworkAdaptation: '',
    teacherRecommendations: '',
    parentRecommendations: '',
  });

  const [studentInfo, setStudentInfo] = useState(null);

  // HK SEN Categories
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

  // Load existing meeting record if editing
  useEffect(() => {
    if (id) {
      loadMeetingRecord();
    }
  }, [id]);

  // Load student info
  useEffect(() => {
    if (formData.student) {
      loadStudentInfo();
    }
  }, [formData.student]);

  const loadMeetingRecord = async () => {
    try {
      setLoading(true);
      const data = await meetingRecordHelpers.getById(id);
      setFormData(data);
    } catch (error) {
      console.error('Error loading meeting record:', error);
      setError('載入會議紀錄失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentInfo = async () => {
    try {
      const data = await studentHelpers.getById(formData.student);
      setStudentInfo(data);
    } catch (error) {
      console.error('Error loading student info:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSenCategoryChange = (category, checked) => {
    setFormData(prev => ({
      ...prev,
      senCategories: checked
        ? [...prev.senCategories, category]
        : prev.senCategories.filter(c => c !== category),
    }));
  };

  // ENHANCED: Participants management functions (same as detail form)
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

    const currentParticipants = getParticipantsList(formData.participants || '');

    // Check for duplicates
    if (currentParticipants.includes(participantInput.trim())) {
      setError('該參與者已存在');
      return;
    }

    const newParticipants = [...currentParticipants, participantInput.trim()];
    setParticipantsList(newParticipants);
    setParticipantInput('');
    setError(null); // Clear any previous errors
  };

  const handleRemoveParticipant = indexToRemove => {
    const currentParticipants = getParticipantsList(formData.participants || '');
    const newParticipants = currentParticipants.filter((_, index) => index !== indexToRemove);
    setParticipantsList(newParticipants);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Validation
    if (!formData.meetingTitle.trim()) {
      setError('請輸入會議名稱');
      return;
    }

    if (formData.senCategories.length === 0) {
      setError('請至少選擇一個SEN類別');
      return;
    }

    if (formData.meetingType === 'iep' && !formData.supportLevel) {
      setError('IEP會議需要選擇學校支援層級');
      return;
    }

    // Check if at least one participant is added
    const participantsList = getParticipantsList(formData.participants);
    if (participantsList.length === 0) {
      setError('請至少加入一位與會人員');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (id) {
        // Update existing meeting record
        await meetingRecordHelpers.update(id, formData);
      } else {
        // Create new meeting record
        await meetingRecordHelpers.create(formData);
      }

      navigate('/meetings', {
        state: {
          message: `會議紀錄${id ? '更新' : '建立'}成功`,
          type: 'success',
        },
      });
    } catch (error) {
      console.error('Error saving meeting record:', error);
      setError(error.message || '儲存會議紀錄失敗');
    } finally {
      setSaving(false);
    }
  };

  const isIEPMeeting = formData.meetingType === 'iep';

  if (loading) {
    return (
      <div className="meeting-form__loading">
        <div className="loading-spinner"></div>
        <p>載入會議紀錄中...</p>
      </div>
    );
  }

  return (
    <div className="meeting-form">
      {/* Header */}
      <div className="meeting-form__header">
        <button onClick={() => navigate('/meetings')} className="btn btn--secondary btn--back">
          <ArrowLeft size={16} />
          返回會議紀錄
        </button>

        <div className="meeting-form__title-section">
          <h1 className="meeting-form__title">
            {isIEPMeeting ? <UserCheck size={28} /> : <BookOpen size={28} />}
            {id ? '編輯' : '建立'}
            {isIEPMeeting ? 'IEP' : '普通'}會議紀錄
          </h1>
          {studentInfo && (
            <div className="meeting-form__student-info">
              <span className="student-name">{studentInfo.name}</span>
              <span className="student-class">
                {studentInfo.currentGrade}
                {studentInfo.currentClass}
              </span>
              <span className="academic-year">{formData.academicYear} 學年</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="meeting-form__form">
        {/* Basic Information Section */}
        <div className="form-section">
          <div className="form-section__header">
            <h2>
              <Info size={20} />
              基本資訊
            </h2>
            <p>會議的基本資訊（所有會議類型必填）</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="meetingTitle" className="form-label required">
                會議名稱
              </label>
              <input
                type="text"
                id="meetingTitle"
                value={formData.meetingTitle}
                onChange={e => handleInputChange('meetingTitle', e.target.value)}
                className="form-input"
                placeholder="請輸入會議名稱"
                maxLength={200}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="meetingDate" className="form-label required">
                會議日期
              </label>
              <div className="input-with-icon">
                <Calendar size={16} className="input-icon" />
                <input
                  type="date"
                  id="meetingDate"
                  value={formData.meetingDate}
                  onChange={e => handleInputChange('meetingDate', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="endTime" className="form-label required">
                散會時間
              </label>
              <div className="input-with-icon">
                <Clock size={16} className="input-icon" />
                <input
                  type="time"
                  id="endTime"
                  value={formData.endTime}
                  onChange={e => handleInputChange('endTime', e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="meetingLocation" className="form-label required">
                會議地點
              </label>
              <div className="input-with-icon">
                <MapPin size={16} className="input-icon" />
                <input
                  type="text"
                  id="meetingLocation"
                  value={formData.meetingLocation}
                  onChange={e => handleInputChange('meetingLocation', e.target.value)}
                  className="form-input"
                  placeholder="請輸入會議地點"
                  maxLength={200}
                  required
                />
              </div>
            </div>

            {/* ENHANCED: Participants Section with Add/Remove UI */}
            <div className="form-group form-group--full">
              <label className="form-label required">
                <Users size={16} />
                與會人員
              </label>

              {/* Add participant input */}
              <div
                style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}
              >
                <input
                  type="text"
                  value={participantInput}
                  onChange={e => setParticipantInput(e.target.value)}
                  onKeyPress={e =>
                    e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())
                  }
                  className="form-input"
                  placeholder="輸入參與者姓名（例如：班主任、科任老師、家長）"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="btn btn--secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={!participantInput.trim()}
                >
                  <Plus size={16} /> 加入
                </button>
              </div>

              {/* Participants display area */}
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '12px',
                  minHeight: '80px',
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getParticipantsList(formData.participants || '').map((participant, index) => (
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
                  {getParticipantsList(formData.participants || '').length === 0 && (
                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                      請使用上方輸入框加入與會人員
                    </span>
                  )}
                </div>
              </div>

              <div className="form-help">
                已加入 {getParticipantsList(formData.participants || '').length} 位與會人員
                {isIEPMeeting ? '（最多 200 人）' : '（最多 50 人）'}
              </div>
            </div>
          </div>
        </div>

        {/* SEN Categories Section */}
        <div className="form-section">
          <div className="form-section__header">
            <h2>
              <UserCheck size={20} />
              學生特殊學習需要類別
            </h2>
            <p>請選擇適用的SEN類別（可多選）</p>
          </div>

          <div className="sen-categories-grid">
            {senCategories.map(category => (
              <label key={category} className="sen-category-item">
                <input
                  type="checkbox"
                  checked={formData.senCategories?.includes(category) || false}
                  onChange={e => handleSenCategoryChange(category, e.target.checked)}
                  className="sen-category-checkbox"
                />
                <span className="sen-category-label">{category}</span>
              </label>
            ))}
          </div>

          {formData.senCategories?.includes('其他') && (
            <div className="form-group">
              <label htmlFor="senCategoriesOther" className="form-label">
                其他類別說明
              </label>
              <input
                type="text"
                id="senCategoriesOther"
                value={formData.senCategoriesOther}
                onChange={e => handleInputChange('senCategoriesOther', e.target.value)}
                className="form-input"
                placeholder="請說明其他特殊學習需要"
                maxLength={500}
              />
            </div>
          )}
        </div>

        {/* IEP-Specific Required Fields */}
        {isIEPMeeting && (
          <div className="form-section form-section--iep">
            <div className="form-section__header">
              <h2>
                <UserCheck size={20} />
                IEP 會議必填資訊
              </h2>
              <p>個別化教育計劃會議的特定資訊</p>
            </div>

            <div className="form-group">
              <label htmlFor="supportLevel" className="form-label required">
                學校支援層級
              </label>
              <select
                id="supportLevel"
                value={formData.supportLevel}
                onChange={e => handleInputChange('supportLevel', e.target.value)}
                className="form-select"
                required
              >
                <option value="">請選擇支援層級</option>
                {supportLevels.map(level => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Meeting Content Section */}
        <div className="form-section">
          <div className="form-section__header">
            <h2>
              <FileText size={20} />
              會議內容
            </h2>
            <p>詳細記錄會議討論內容</p>
          </div>

          <div className="form-group">
            <label htmlFor="meetingContent" className="form-label required">
              會議內容
            </label>
            <textarea
              id="meetingContent"
              value={formData.meetingContent}
              onChange={e => handleInputChange('meetingContent', e.target.value)}
              className="form-textarea meeting-form-textarea form-textarea--large"
              placeholder="請詳細記錄會議討論的內容、決議事項等"
              rows={6}
              maxLength={5000}
              required
            />
            <div className="form-help">剩餘字數: {5000 - formData.meetingContent.length}</div>
          </div>

          <div className="form-group">
            <label htmlFor="remarks" className="form-label">
              備註
            </label>
            <textarea
              id="remarks"
              value={formData.remarks}
              onChange={e => handleInputChange('remarks', e.target.value)}
              className="form-textarea meeting-form-textarea"
              placeholder="其他需要記錄的事項"
              rows={3}
              maxLength={2000}
            />
          </div>
        </div>

        {/* IEP Optional Fields */}
        {isIEPMeeting && (
          <div className="form-section form-section--iep-details">
            <div className="form-section__header">
              <h2>
                <BookOpen size={20} />
                IEP 詳細資訊
              </h2>
              <p>個別化教育計劃的詳細內容（選填）</p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="currentLearningStatus" className="form-label">
                  學生在校學習現況
                </label>
                <textarea
                  id="currentLearningStatus"
                  value={formData.currentLearningStatus}
                  onChange={e => handleInputChange('currentLearningStatus', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="描述學生目前的學習狀況"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="curriculumAdaptation" className="form-label">
                  課程調適
                </label>
                <textarea
                  id="curriculumAdaptation"
                  value={formData.curriculumAdaptation}
                  onChange={e => handleInputChange('curriculumAdaptation', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="課程內容的調整和適應"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="teachingAdaptation" className="form-label">
                  教學調適
                </label>
                <textarea
                  id="teachingAdaptation"
                  value={formData.teachingAdaptation}
                  onChange={e => handleInputChange('teachingAdaptation', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="教學方法的調整和適應"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="peerSupport" className="form-label">
                  朋輩支援
                </label>
                <textarea
                  id="peerSupport"
                  value={formData.peerSupport}
                  onChange={e => handleInputChange('peerSupport', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="同儕間的支援安排"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="teacherCollaboration" className="form-label">
                  教師協作
                </label>
                <textarea
                  id="teacherCollaboration"
                  value={formData.teacherCollaboration}
                  onChange={e => handleInputChange('teacherCollaboration', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="教師間的協作安排"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="classroomManagement" className="form-label">
                  課堂管理
                </label>
                <textarea
                  id="classroomManagement"
                  value={formData.classroomManagement}
                  onChange={e => handleInputChange('classroomManagement', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="課堂管理的特殊安排"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="assessmentAdaptation" className="form-label">
                  評估調適
                </label>
                <textarea
                  id="assessmentAdaptation"
                  value={formData.assessmentAdaptation}
                  onChange={e => handleInputChange('assessmentAdaptation', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="評估方式的調整"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="homeworkAdaptation" className="form-label">
                  功課調適
                </label>
                <textarea
                  id="homeworkAdaptation"
                  value={formData.homeworkAdaptation}
                  onChange={e => handleInputChange('homeworkAdaptation', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="功課安排的調整"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="teacherRecommendations" className="form-label">
                  老師建議
                </label>
                <textarea
                  id="teacherRecommendations"
                  value={formData.teacherRecommendations}
                  onChange={e => handleInputChange('teacherRecommendations', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="教師的建議和意見"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              <div className="form-group">
                <label htmlFor="parentRecommendations" className="form-label">
                  家長建議
                </label>
                <textarea
                  id="parentRecommendations"
                  value={formData.parentRecommendations}
                  onChange={e => handleInputChange('parentRecommendations', e.target.value)}
                  className="form-textarea meeting-form-textarea"
                  placeholder="家長的建議和意見"
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="btn btn--secondary"
            disabled={saving}
          >
            取消
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? (
              <>
                <div className="loading-spinner loading-spinner--small"></div>
                儲存中...
              </>
            ) : (
              <>
                <Save size={16} />
                {id ? '更新' : '儲存'}會議紀錄
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MeetingRecordForm;
