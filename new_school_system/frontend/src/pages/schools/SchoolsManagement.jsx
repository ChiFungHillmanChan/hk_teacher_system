// File: src/pages/schools/SchoolsManagement.jsx - ENHANCED WITH DEBUG
import { AlertCircle, Mail, MapPin, Phone, Plus, School, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, handleApiError, schoolHelpers, studentHelpers } from '../../services/api';
import {
  HK_DISTRICTS,
  SCHOOL_TYPES,
  getDistrictChinese,
  getSchoolTypeChinese,
} from '../../utils/constants';

const SchoolsManagement = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schools, setSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ ENHANCED DEBUG LOGGING
        console.log('🔍 Starting school load...');
        console.log('👤 Current user:', {
          id: user?._id,
          email: user?.email,
          role: user?.role,
          isLoggedIn: !!user,
        });

        // Check auth status first
        console.log('🔐 Checking auth status...');
        try {
          const authCheck = await api.get('/auth/me');
          console.log('✅ Auth check passed:', authCheck.data);
        } catch (authError) {
          console.error('❌ Auth check failed:', authError);
          setError('請重新登入');
          return;
        }

        // Test direct API call first
        console.log('🧪 Testing direct API call...');
        try {
          const directResponse = await api.get('/schools', { params: { limit: 200 } });
          console.log('📥 Direct API response:', directResponse);
          console.log('📥 Direct response data:', directResponse.data);
          console.log('📥 Response structure:', {
            hasSuccess: 'success' in directResponse.data,
            hasData: 'data' in directResponse.data,
            dataType: typeof directResponse.data.data,
            isArray: Array.isArray(directResponse.data.data),
            dataLength: directResponse.data.data?.length,
          });
        } catch (directError) {
          console.error('❌ Direct API call failed:', directError);
          if (directError.status === 401) {
            setError('認證失敗，請重新登入');
            return;
          }
        }

        // Now try with helper
        console.log('🔧 Testing with schoolHelpers...');
        const schoolsData = await schoolHelpers.getAll({ limit: 200 });
        console.log('📥 SchoolHelpers response:', schoolsData);
        console.log('📥 SchoolHelpers type:', typeof schoolsData);
        console.log('📥 SchoolHelpers is array:', Array.isArray(schoolsData));

        const schools = Array.isArray(schoolsData) ? schoolsData : [];
        console.log('✅ Final schools array:', schools.length, 'schools');

        setSchools(schools);
        setFilteredSchools(schools);
      } catch (err) {
        console.error('❌ School loading failed:', err);

        // Enhanced error logging
        console.error('Error details:', {
          message: err.message,
          status: err.status,
          data: err.data,
          isNetworkError: err.isNetworkError,
        });

        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    // Only load if user exists
    if (user) {
      loadSchools();
    } else {
      console.log('⏳ Waiting for user authentication...');
      setLoading(false);
      setError('請先登入');
    }
  }, [user]); // Added user dependency

  useEffect(() => {
    const loadStudentCounts = async () => {
      try {
        console.log('📊 Loading student counts...');
        const studentsData = await studentHelpers.getAll({ limit: 1000 });
        console.log('📊 Students data:', studentsData?.length, 'students');

        const counts = studentsData.reduce((acc, student) => {
          const schoolId = student.school?._id || student.school;
          if (schoolId) acc[schoolId] = (acc[schoolId] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Student counts:', counts);
        setStudentCounts(counts);
      } catch (err) {
        console.error('❌ Failed to load student counts:', err);
      }
    };

    // Only load student counts if we have schools
    if (schools.length > 0) {
      loadStudentCounts();
    }
  }, [schools]); // Changed dependency to schools

  // Apply filters
  useEffect(() => {
    // Start filtering from the full school list (do NOT modify original array)
    let filtered = schools;

    // Search filter by school name (any language)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        school =>
          school.name.toLowerCase().includes(term) ||
          (school.nameEn && school.nameEn.toLowerCase().includes(term)) ||
          (school.nameCh && school.nameCh.toLowerCase().includes(term))
      );
    }

    // Filter by school type if selected
    if (selectedType) {
      filtered = filtered.filter(school => school.schoolType === selectedType);
    }

    // Filter by district if selected
    if (selectedDistrict) {
      filtered = filtered.filter(school => school.district === selectedDistrict);
    }

    // Update filtered schools only — NO student data modified here
    setFilteredSchools(filtered);

    // Reset pagination to first page whenever filter changes
    setCurrentPage(1);
  }, [schools, searchTerm, selectedType, selectedDistrict]);

  // Pagination calculations for displaying filtered schools
  const totalPages = Math.ceil(filteredSchools.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSchools = filteredSchools.slice(startIndex, endIndex);

  // Clear all filters function — resets filters without affecting students
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedDistrict('');
  };

  // Helper to get student count for a school (mocked or real)
  const getStudentCount = school => {
    return studentCounts[school._id] ?? 0;
  };

  // Helper to get teacher count safely for a school
  const getTeacherCount = school => {
    return Array.isArray(school.teachers) ? school.teachers.length : 0;
  };

  // ✅ ENHANCED ERROR DISPLAY
  if (loading) {
    return (
      <div className="schools-management">
        <div className="schools-management__loading">
          <div className="loading-spinner loading-spinner--large"></div>
          <p className="loading-message">載入學校資料中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schools-management">
        <div className="schools-management__error">
          <AlertCircle size={48} />
          <h2>載入學校資料失敗</h2>
          <p>{typeof error === 'string' ? error : error.message}</p>

          {/* Enhanced error debugging */}
          <div
            style={{
              background: '#f8f9fa',
              padding: '1rem',
              marginTop: '1rem',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'monospace',
              textAlign: 'left',
            }}
          >
            <strong>Debug Info:</strong>
            <br />
            User: {user ? `${user.email} (${user.role})` : 'Not logged in'}
            <br />
            Error: {typeof error === 'object' ? JSON.stringify(error, null, 2) : error}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn--primary"
              style={{ marginRight: '1rem' }}
            >
              重試
            </button>
            <Link to="/login" className="btn btn--secondary">
              重新登入
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schools-management">
      {/* Header */}
      <div className="schools-management__header">
        <div className="schools-management__title-section">
          <h1 className="schools-management__title">
            <School size={32} />
            學校管理
          </h1>
          <p className="schools-management__subtitle">管理系統內的所有學校資料</p>

          {/* Debug info in header */}
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '0.5rem',
              fontFamily: 'monospace',
            }}
          >
            🔍 Debug: {schools.length} schools loaded, User: {user?.email}
          </div>
        </div>

        <div className="schools-management__actions">
          <Link to="/schools/create" className="btn btn--primary">
            <Plus size={20} />
            新增學校
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="schools-management__controls">
        {/* Search Bar */}
        <div className="search-bar">
          <div className="search-bar__input">
            <Search size={20} />
            <input
              type="text"
              placeholder="搜尋學校名稱..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="search-bar__clear">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-panel__content">
            <div className="filter-group">
              <label className="filter-label">學校類型</label>
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="form-input form-input--small"
              >
                <option value="">所有類型</option>
                {SCHOOL_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">地區</label>
              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="form-input form-input--small"
              >
                <option value="">所有地區</option>
                {HK_DISTRICTS.map(district => (
                  <option key={district} value={district}>
                    {getDistrictChinese(district)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="schools-management__summary">
        <p className="results-summary">
          顯示 {filteredSchools.length} 間學校
          {searchTerm && ` · 搜尋 "${searchTerm}"`}
          {selectedType && ` · ${getSchoolTypeChinese(selectedType)}`}
          {selectedDistrict && ` · ${getDistrictChinese(selectedDistrict)}`}
        </p>
      </div>

      {/* Schools Grid */}
      {currentSchools.length > 0 ? (
        <div className="schools-grid">
          {currentSchools.map(school => (
            <div key={school._id} className="school-card">
              <div className="school-card__header">
                <div className="school-card__title">
                  <h3>{school.name}</h3>
                  {school.nameEn && <p className="school-card__title-en">{school.nameEn}</p>}
                </div>
                <div className="school-card__type">{getSchoolTypeChinese(school.schoolType)}</div>
              </div>

              <div className="school-card__content">
                <div className="school-card__info">
                  <div className="school-card__info-item">
                    <MapPin size={16} />
                    <span>{getDistrictChinese(school.district)}</span>
                  </div>

                  {school.phone && (
                    <div className="school-card__info-item">
                      <Phone size={16} />
                      <span>{school.phone}</span>
                    </div>
                  )}

                  {school.email && (
                    <div className="school-card__info-item">
                      <Mail size={16} />
                      <span>{school.email}</span>
                    </div>
                  )}
                </div>

                <div className="school-card__stats">
                  <div className="school-card__stat">
                    <span className="school-card__stat-value">{getStudentCount(school)}</span>
                    <span className="school-card__stat-label">學生</span>
                  </div>
                  <div className="school-card__stat">
                    <span className="school-card__stat-value">{getTeacherCount(school)}</span>
                    <span className="school-card__stat-label">教師</span>
                  </div>
                </div>
              </div>

              <div className="school-card__actions">
                <Link to={`/schools/${school._id}`} className="btn btn--secondary btn--small">
                  查看詳情
                </Link>
                {isAdmin() && (
                  <Link to={`/schools/${school._id}/edit`} className="btn btn--primary btn--small">
                    編輯
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="schools-management__empty">
          <School size={64} />
          <h3>找不到學校</h3>
          <p>
            {searchTerm || selectedType || selectedDistrict
              ? '請嘗試調整搜尋條件或篩選器'
              : '系統內暫無學校資料'}
          </p>
          {isAdmin() && !searchTerm && !selectedType && !selectedDistrict && (
            <Link to="/schools/create" className="btn btn--primary">
              <Plus size={16} />
              新增第一間學校
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination__btn pagination__btn--prev"
          >
            上一頁
          </button>

          <div className="pagination__info">
            第 {currentPage} 頁，共 {totalPages} 頁
          </div>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination__btn pagination__btn--next"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
};

export default SchoolsManagement;
