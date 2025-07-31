// File: src/pages/schools/SchoolDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  School, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  Users, 
  Filter, 
  Search,
  MapPin,
  Phone,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers, studentHelpers, handleApiError } from '../../services/api';
import { 
  HK_DISTRICTS_CHINESE, 
  SCHOOL_TYPES, 
  HK_GRADES,
  getGradeChinese,
  getCurrentAcademicYear 
} from '../../utils/constants';
import Loading from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

const SchoolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // School data
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Students data
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  
  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load school data
  useEffect(() => {
    const loadSchool = async () => {
      try {
        setLoading(true);
        const schoolData = await schoolHelpers.getById(id);
        setSchool(schoolData);
        setEditData(schoolData);
      } catch (err) {
        console.error('Failed to load school:', err);
        setError(handleApiError(err));
        toast.error('載入學校資料失敗');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadSchool();
    }
  }, [id]);

  // Load students data
  useEffect(() => {
    const loadStudents = async () => {
      if (!school) return;
      
      try {
        setStudentsLoading(true);
        const studentsData = await studentHelpers.getAll({ 
          school: school._id,
          limit: 1000 
        });
        const students = Array.isArray(studentsData) ? studentsData : [];
        setStudents(students);
        setFilteredStudents(students);
      } catch (err) {
        console.error('Failed to load students:', err);
        toast.error('載入學生資料失敗');
      } finally {
        setStudentsLoading(false);
      }
    };

    loadStudents();
  }, [school]);

  // Apply filters
  useEffect(() => {
    let filtered = students;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(term) ||
        (student.nameEn && student.nameEn.toLowerCase().includes(term)) ||
        (student.nameCh && student.nameCh.toLowerCase().includes(term)) ||
        (student.studentId && student.studentId.toLowerCase().includes(term))
      );
    }

    if (selectedGrade) {
      filtered = filtered.filter(student => student.grade === selectedGrade);
    }

    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }

    setFilteredStudents(filtered);
  }, [students, searchTerm, selectedGrade, selectedClass]);

  // Get unique classes
  const getUniqueClasses = () => {
    const classes = students
      .map(student => student.class)
      .filter(cls => cls && cls.trim())
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return classes;
  };

  // Get available grades based on school type
  const getAvailableGrades = () => {
    if (!school) return [];
    
    switch (school.schoolType) {
      case 'primary':
        return HK_GRADES.PRIMARY;
      case 'secondary':
        return HK_GRADES.SECONDARY;
      case 'both':
      default:
        return HK_GRADES.ALL;
    }
  };

  // Handle edit
  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...school });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ ...school });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedSchool = await schoolHelpers.update(id, editData);
      setSchool(updatedSchool);
      setIsEditing(false);
      toast.success('學校資料已更新');
    } catch (err) {
      console.error('Failed to update school:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await schoolHelpers.delete(id);
      toast.success('學校已刪除');
      navigate('/schools');
    } catch (err) {
      console.error('Failed to delete school:', err);
      const errorInfo = handleApiError(err);
      toast.error(errorInfo.message || '刪除失敗');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedGrade('');
  };

  if (loading) {
    return <Loading message="載入學校資料中..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>載入失敗</h2>
          <p>{error.message}</p>
          <button onClick={() => navigate('/schools')} className="btn btn--primary">
            返回學校列表
          </button>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>找不到學校</h2>
          <p>請檢查網址是否正確</p>
          <button onClick={() => navigate('/schools')} className="btn btn--primary">
            返回學校列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="school-detail">
      {/* Header */}
      <div className="school-detail__header">
        <div className="school-detail__header-content">
          <div className="school-detail__title-section">
            <div className="school-detail__icon">
              <School size={32} />
            </div>
            <div>
              <h1 className="school-detail__title">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="form-input"
                    placeholder="學校名稱"
                  />
                ) : (
                  school.name
                )}
              </h1>
              <p className="school-detail__subtitle">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.nameEn || ''}
                    onChange={(e) => setEditData({ ...editData, nameEn: e.target.value })}
                    className="form-input"
                    placeholder="英文名稱"
                  />
                ) : (
                  school.nameEn
                )}
              </p>
            </div>
          </div>
          
          <div className="school-detail__actions">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn--primary"
                >
                  {saving ? <Loading size="small" /> : <Save size={20} />}
                  保存
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn--secondary"
                >
                  <X size={20} />
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEdit}
                  className="btn btn--primary"
                >
                  <Edit size={20} />
                  編輯
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn--danger"
                >
                  <Trash2 size={20} />
                  刪除
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* School Information */}
      <div className="school-detail__content">
        <div className="school-detail__info-section">
          <h2 className="section-title">學校資訊</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>學校類型</label>
              {isEditing ? (
                <select
                  value={editData.schoolType || ''}
                  onChange={(e) => setEditData({ ...editData, schoolType: e.target.value })}
                  className="form-input"
                >
                  {SCHOOL_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{SCHOOL_TYPES.find(t => t.value === school.schoolType)?.label}</span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>地區</label>
              {isEditing ? (
                <select
                  value={editData.district || ''}
                  onChange={(e) => setEditData({ ...editData, district: e.target.value })}
                  className="form-input"
                >
                  <option value="">選擇地區</option>
                  {Object.entries(HK_DISTRICTS_CHINESE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>
                  <MapPin size={16} />
                  {HK_DISTRICTS_CHINESE[school.district] || school.district}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>電話</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="form-input"
                  placeholder="電話號碼"
                />
              ) : (
                <span>
                  <Phone size={16} />
                  {school.phone || '未設定'}
                </span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>電子郵件</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="form-input"
                  placeholder="電子郵件"
                />
              ) : (
                <span>
                  <Mail size={16} />
                  {school.email || '未設定'}
                </span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>地址</label>
              {isEditing ? (
                <textarea
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="form-input"
                  placeholder="學校地址"
                  rows={2}
                />
              ) : (
                <span>{school.address || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="school-detail__students-section">
          <div className="section-header">
            <h2 className="section-title">
              <Users size={24} />
              學生列表 ({filteredStudents.length})
            </h2>
          </div>

          {/* Filters */}
          <div className="school-detail__filters">
            <div className="filters-row">
              <div className="filter-group">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="搜尋學生姓名或學號..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input form-input--small"
                />
              </div>

              <div className="filter-group">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="form-input form-input--small"
                >
                  <option value="">所有年級</option>
                  {getAvailableGrades().map(grade => (
                    <option key={grade} value={grade}>
                      {getGradeChinese(grade)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="form-input form-input--small"
                >
                  <option value="">所有班級</option>
                  {getUniqueClasses().map(cls => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || selectedGrade || selectedClass) && (
                <button
                  onClick={clearFilters}
                  className="btn btn--secondary btn--small"
                >
                  <X size={16} />
                  清除篩選
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          {studentsLoading ? (
            <Loading message="載入學生資料中..." />
          ) : filteredStudents.length > 0 ? (
            <div className="students-table-container">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>學生</th>
                    <th>學號</th>
                    <th>年級</th>
                    <th>班級</th>
                    <th>學年</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student._id}>
                      <td>
                        <div className="student-info">
                          <div className="student-info__avatar">
                            {student.name.charAt(0)}
                          </div>
                          <div className="student-info__details">
                            <div className="student-info__name">{student.name}</div>
                            {student.nameEn && (
                              <div className="student-info__name-en">{student.nameEn}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{student.studentId || '-'}</td>
                      <td>{getGradeChinese(student.grade)}</td>
                      <td>{student.class || '-'}</td>
                      <td>{student.academicYear}</td>
                      <td>
                        <button
                          onClick={() => navigate(`/students/${student._id}`)}
                          className="btn btn--small btn--primary"
                        >
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <h3>沒有學生</h3>
              <p>
                {searchTerm || selectedGrade || selectedClass
                  ? '沒有符合篩選條件的學生'
                  : '此學校尚未有學生資料'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--danger">
            <div className="modal-header">
              <AlertTriangle size={24} />
              <h3>確認刪除學校</h3>
            </div>
            <div className="modal-body">
              <p>
                您確定要刪除學校 <strong>「{school.name}」</strong> 嗎？
              </p>
              <div className="warning-box">
                <AlertTriangle size={20} />
                <div>
                  <strong>警告：此操作無法復原！</strong>
                  <p>刪除學校將會同時刪除該學校的所有學生資料（共 {students.length} 名學生）。</p>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn--secondary"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="btn btn--danger"
                disabled={deleting}
              >
                {deleting ? <Loading size="small" /> : <Trash2 size={16} />}
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolDetail;