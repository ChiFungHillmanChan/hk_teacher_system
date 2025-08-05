// pages/meetings/MeetingRecords.jsx - UPDATED VERSION
import { AlertCircle, Calendar, FileText, Filter, Plus, School, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers } from '../../services/api';
import MeetingFilters from './MeeetingFilters';

const MeetingRecords = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    meetingType: '',
    school: '',
    academicYear: '',
    currentGrade: '',
    student: '',
  });

  // Data states
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [meetings, setMeetings] = useState([]);

  // Load initial data
  useEffect(() => {
    loadSchools();
  }, []);

  // Load meetings when student is selected
  useEffect(() => {
    if (filters.student && filters.meetingType && filters.academicYear) {
      loadMeetings();
    } else {
      setMeetings([]);
    }
  }, [filters.student, filters.meetingType, filters.academicYear]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const data = await schoolHelpers.getAll({ limit: 200 });
      const schools = Array.isArray(data) ? data : [];
      setSchools(schools);
    } catch (error) {
      console.error('Error loading schools:', error);
      setError('載入學校資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Improved meeting loading with better response handling
  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading meetings for:', {
        student: filters.student,
        meetingType: filters.meetingType,
        academicYear: filters.academicYear,
      });

      const params = {
        meetingType: filters.meetingType,
        academicYear: filters.academicYear,
        limit: 100,
      };

      console.log('📤 API params:', params);

      // Use direct fetch call to avoid unwrap issues
      const response = await fetch(
        `/api/meeting-records/student/${filters.student}?${new URLSearchParams(params).toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${
              localStorage.getItem('accessToken') || localStorage.getItem('token')
            }`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Raw API response:', data);

      // Handle the correct response structure
      let meetingsData = [];

      if (data.success && data.data) {
        if (data.data.meetings) {
          if (data.data.meetings.all && Array.isArray(data.data.meetings.all)) {
            meetingsData = data.data.meetings.all;
            console.log('✅ Using meetings.all array');
          } else if (Array.isArray(data.data.meetings)) {
            meetingsData = data.data.meetings;
            console.log('✅ Using direct meetings array');
          } else {
            const allMeetings = [
              ...(data.data.meetings.regular || []),
              ...(data.data.meetings.iep || []),
            ];
            meetingsData = allMeetings.filter(
              meeting => meeting.meetingType === filters.meetingType
            );
            console.log('✅ Using filtered meetings from regular/iep arrays');
          }
        } else if (Array.isArray(data.data)) {
          meetingsData = data.data;
          console.log('✅ Using direct data array');
        }
      } else if (Array.isArray(data)) {
        meetingsData = data;
        console.log('✅ Using root array response');
      }

      // Additional filtering to ensure correct meeting type and academic year
      const filteredMeetings = meetingsData.filter(
        meeting =>
          meeting.meetingType === filters.meetingType &&
          meeting.academicYear === filters.academicYear
      );

      console.log('📋 Final filtered meetings:', filteredMeetings);
      console.log('📊 Meetings count:', filteredMeetings.length);

      setMeetings(filteredMeetings);
    } catch (error) {
      console.error('❌ Error in loadMeetings:', error);
      setError('載入會議紀錄失敗: ' + error.message);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = newFilters => {
    console.log('🔄 Filter change:', newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
    setError(null);
  };

  const canCreateMeeting =
    filters.meetingType && filters.academicYear && filters.school && filters.student;

  return (
    <div className="meeting-records">
      {/* Simplified Header - No Stats */}
      <div className="meeting-records__header">
        <div className="meeting-records__title-section">
          <h1 className="meeting-records__title">
            <FileText className="meeting-records__title-icon" />
            會議紀錄管理
          </h1>
          <p className="meeting-records__subtitle">
            管理學生的普通會議紀錄和個別化教育計劃 (IEP) 會議紀錄
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="meeting-records__filters">
        <div className="filter-section">
          <div className="filter-section__header">
            <h2>
              <Filter size={20} />
              選擇會議記錄
            </h2>
            <p>請依序完成所有步驟以查看學生的會議紀錄</p>
          </div>

          <MeetingFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            schools={schools}
            students={students}
            loading={loading}
          />
        </div>
      </div>

      {/* Create Meeting Button - Only show when student is selected */}
      {canCreateMeeting && (
        <div className="create-meeting-section">
          <Link
            to={`/meetings/create?type=${filters.meetingType}&student=${filters.student}&year=${filters.academicYear}&school=${filters.school}`}
            className="btn btn--primary btn--large"
          >
            <Plus size={16} />
            新增{filters.meetingType === 'regular' ? '普通' : 'IEP'}會議紀錄
          </Link>
        </div>
      )}

      {/* Meeting Records List */}
      {canCreateMeeting && (
        <div className="meeting-records__content">
          <div className="meeting-records__list-header">
            <h2>
              {filters.meetingType === 'regular' ? '普通會議紀錄' : 'IEP 會議紀錄'}
              <span className="meeting-count">({meetings.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="meeting-records__loading">
              <div className="loading-spinner"></div>
              <p>載入會議紀錄中...</p>
            </div>
          ) : meetings.length > 0 ? (
            <div className="meetings-list">
              {meetings.map(meeting => (
                <div key={meeting._id} className="meeting-card">
                  <div className="meeting-card__header">
                    <div className="meeting-card__title">
                      <h3>{meeting.meetingTitle}</h3>
                      <span
                        className={`meeting-type-badge meeting-type-badge--${meeting.meetingType}`}
                      >
                        {meeting.meetingType === 'regular' ? '普通' : 'IEP'}
                      </span>
                    </div>
                    <div className="meeting-card__date">
                      {new Date(meeting.meetingDate).toLocaleDateString('zh-HK')}
                    </div>
                  </div>

                  <div className="meeting-card__content">
                    <div className="meeting-card__info">
                      <div className="meeting-info-item">
                        <Calendar size={14} />
                        <span>散會時間: {meeting.endTime}</span>
                      </div>
                      <div className="meeting-info-item">
                        <Users size={14} />
                        <span>與會人員: {meeting.participants?.substring(0, 50)}...</span>
                      </div>
                      <div className="meeting-info-item">
                        <School size={14} />
                        <span>地點: {meeting.meetingLocation}</span>
                      </div>
                    </div>

                    <div className="meeting-card__sen-categories">
                      <strong>SEN 類別:</strong>
                      <div className="sen-tags">
                        {(meeting.senCategories || []).map((category, index) => (
                          <span key={index} className="sen-tag">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>

                    {meeting.meetingType === 'iep' && meeting.supportLevel && (
                      <div className="meeting-card__support-level">
                        <strong>支援層級:</strong>
                        <span
                          className={`support-level-badge support-level--${meeting.supportLevel}`}
                        >
                          {meeting.supportLevel}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="meeting-card__actions">
                    <Link to={`/meetings/${meeting._id}`} className="btn btn--secondary btn--small">
                      查看詳情
                    </Link>
                    <Link
                      to={`/meetings/${meeting._id}/edit`}
                      className="btn btn--primary btn--small"
                    >
                      編輯
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="meeting-records__empty">
              <FileText size={48} />
              <h3>暫無會議紀錄</h3>
              <p>
                此學生在 {filters.academicYear} 學年還沒有
                {filters.meetingType === 'regular' ? '普通' : 'IEP'}會議紀錄
              </p>
              <Link
                to={`/meetings/create?type=${filters.meetingType}&student=${filters.student}&year=${filters.academicYear}&school=${filters.school}`}
                className="btn btn--primary"
              >
                <Plus size={16} />
                建立第一個會議紀錄
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Help Section - Show when filters not complete */}
      {!canCreateMeeting && (
        <div className="meeting-records__help">
          <div className="help-card">
            <AlertCircle size={24} />
            <h3>開始使用會議紀錄</h3>
            <p>請依照以下步驟選擇要管理的會議紀錄:</p>
            <ol>
              <li>選擇會議類型 (普通會議 或 IEP 會議)</li>
              <li>選擇學校</li>
              <li>選擇學年</li>
              <li>選擇年級</li>
              <li>搜尋或選擇學生</li>
            </ol>
            <p>完成所有步驟後，您就可以查看和建立該學生的會議紀錄。</p>
            <div className="help-tip">
              💡 <strong>提示:</strong> 您可以使用鎖定功能來保存常用的選擇組合
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
};

export default MeetingRecords;
