import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  School, Edit, Save, X, Trash2, Users, Search, MapPin, Phone, Mail, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { schoolHelpers, studentHelpers } from '../../services/api';
import { 
  HK_DISTRICTS_CHINESE, SCHOOL_TYPES, HK_GRADES, getGradeChinese
} from '../../utils/constants';
import Loading from '../../components/common/Loading';
import { toast } from 'react-hot-toast';

const SchoolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const schoolData = await schoolHelpers.getById(id);
        setSchool(schoolData);
        setEditData(schoolData);
        
        setStudentsLoading(true);
        const studentsData = await studentHelpers.getAll({ 
          school: schoolData._id, limit: 1000 
        });
        const studentsList = Array.isArray(studentsData) ? studentsData : [];
        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (err) {
        toast.error('載入資料失敗');
      } finally {
        setLoading(false);
        setStudentsLoading(false);
      }
    };

    loadData();
  }, [id]);

  useEffect(() => {
    let filtered = students;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(term) ||
        student.nameEn?.toLowerCase().includes(term) ||
        student.nameCh?.toLowerCase().includes(term) ||
        student.studentId?.toLowerCase().includes(term)
      );
    }

    if (selectedGrade) filtered = filtered.filter(s => s.currentGrade === selectedGrade);
    if (selectedClass) filtered = filtered.filter(s => s.currentClass === selectedClass);

    setFilteredStudents(filtered);
  }, [students, searchTerm, selectedGrade, selectedClass]);

  const canDeleteSchool = () => {
    if (!user?.id || !school) return false;
    if (user.role === 'admin') return true;
    
    return school.teachers?.some(teacher => {
      const teacherId = teacher.user._id || teacher.user;
      return teacherId === user.id && 
             ['teacher', 'head_teacher'].includes(teacher.role) && 
             teacher.isActive !== false;
    });
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

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
      
      if (!editData.name?.trim()) {
        toast.error('學校名稱為必填項目');
        return;
      }
      
      const updateData = {
        name: editData.name.trim(),
        nameEn: editData.nameEn?.trim() || '',
        district: editData.district,
        address: editData.address?.trim() || '',
        contactPerson: editData.contactPerson?.trim() || '',
        email: editData.email?.trim() || '',
        phone: editData.phone?.trim() || '',
        description: editData.description?.trim() || ''
      };
      
      Object.keys(updateData).forEach(key => {
        if (!updateData[key]) delete updateData[key];
      });
      
      if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
        toast.error('請輸入有效的電子郵件地址');
        return;
      }
      
      const updatedSchool = await schoolHelpers.update(id, updateData);
      setSchool(updatedSchool);
      setEditData(updatedSchool);
      setIsEditing(false);
      toast.success('學校資料已更新');
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('您沒有權限修改此學校資料');
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
      await schoolHelpers.delete(id);
      toast.success('學校已刪除');
      navigate('/schools');
    } catch (err) {
      if (err.response?.status === 400 && err.response.data?.studentCount) {
        toast.error(`無法刪除學校：還有 ${err.response.data.studentCount} 位學生。`);
      } else if (err.response?.status === 403) {
        toast.error('只有管理員和授權教師可以刪除學校');
      } else {
        toast.error('刪除失敗');
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getAvailableGrades = () => {
    if (!school) return [];
    switch (school.schoolType) {
      case 'primary': return HK_GRADES.PRIMARY;
      case 'secondary': return HK_GRADES.SECONDARY;
      default: return HK_GRADES.ALL;
    }
  };

  const getUniqueClasses = () => {
    return [...new Set(students
      .map(s => s.currentClass)
      .filter(cls => cls?.trim())
    )].sort();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedGrade('');
  };

  if (loading) return <Loading message="載入學校資料中..." />;
  
  if (!school) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>找不到學校</h2>
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
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="form-input"
                    placeholder="學校名稱"
                  />
                ) : school.name}
              </h1>
              <p className="school-detail__subtitle">
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.nameEn || ''}
                    onChange={(e) => handleInputChange('nameEn', e.target.value)}
                    className="form-input"
                    placeholder="英文名稱"
                  />
                ) : school.nameEn}
              </p>
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
                <button onClick={handleEdit} className="btn btn--primary">
                  <Edit size={20} /> 編輯
                </button>
                {canDeleteSchool() && (
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

      {/* School Information */}
      <div className="school-detail__content">
        <div className="school-detail__info-section">
          <h2 className="section-title">學校資訊</h2>
          
          <div className="school-detail__info-grid">
            <div className="school-detail__info-item">
              <label>學校類型</label>
              <span>{SCHOOL_TYPES.find(t => t.value === school.schoolType)?.label}</span>
              {isEditing && <small className="form-help">學校類型不可修改</small>}
            </div>

            <div className="school-detail__info-item">
              <label>地區</label>
              {isEditing ? (
                <select
                  value={editData.district || ''}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="form-input"
                >
                  <option value="">選擇地區</option>
                  {Object.entries(HK_DISTRICTS_CHINESE).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
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
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="form-input"
                  placeholder="電話號碼"
                />
              ) : (
                <span><Phone size={16} /> {school.phone || '未設定'}</span>
              )}
            </div>

            <div className="school-detail__info-item">
              <label>電子郵件</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="form-input"
                  placeholder="電子郵件"
                />
              ) : (
                <span><Mail size={16} /> {school.email || '未設定'}</span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>地址</label>
              {isEditing ? (
                <textarea
                  value={editData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="form-textarea"
                  placeholder="學校地址"
                  rows={2}
                  maxLength={500}
                />
              ) : (
                <span>{school.address || '未設定'}</span>
              )}
            </div>

            <div className="school-detail__info-item school-detail__info-item--full">
              <label>學校描述</label>
              {isEditing ? (
                <div>
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="form-textarea"
                    placeholder="學校描述、辦學理念等"
                    rows={4}
                    maxLength={1000}
                  />
                  <small className="form-help">
                    {(editData.description || '').length}/1000
                  </small>
                </div>
              ) : (
                <span>{school.description || '未設定'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Students Section */}
        <div className="school-detail__students-section">
          <div className="section-header">
            <h2 className="section-title">
              <Users size={24} /> 學生列表 ({filteredStudents.length})
            </h2>
          </div>

          {/* Filters */}
          <div className="school-detail__filters">
            <div className="filters-row">
              <div className="filter-group">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="搜尋學生..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input form-input--small"
                />
              </div>

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

              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="form-input form-input--small"
              >
                <option value="">所有班級</option>
                {getUniqueClasses().map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              {(searchTerm || selectedGrade || selectedClass) && (
                <button onClick={clearFilters} className="btn btn--secondary btn--small">
                  <X size={16} /> 清除
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
                    <th>學年</th>
                    <th>年級</th>
                    <th>班級</th>
                    <th>學號</th>
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
                      <td>{student.currentAcademicYear}</td>
                      <td>{getGradeChinese(student.currentGrade)}</td>
                      <td>{student.currentClassNumber || '-'}</td>
                      <td>{student.currentClass || '-'}</td>
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

      {/* Delete Confirmation Modal - Visible Debug Version */}
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
              ⚠️ 確認刪除學校
            </h2>
            
            <p style={{fontSize: '16px', marginBottom: '10px', textAlign: 'center'}}>
              您確定要刪除學校：
            </p>
            <p style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center'}}>
              「{school?.name}」
            </p>
            
            <p style={{color: '#dc3545', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center'}}>
              此操作無法復原！
            </p>
            
            {students.length > 0 && (
              <div style={{
                background: '#fff3cd',
                border: '2px solid #ffc107',
                padding: '15px',
                borderRadius: '5px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <p style={{color: '#856404', margin: 0, fontWeight: 'bold'}}>
                  ⚠️ 警告：此學校有 {students.length} 名學生！
                </p>
                <p style={{color: '#856404', margin: '5px 0 0 0', fontSize: '14px'}}>
                  請先轉移或刪除所有學生才能刪除學校
                </p>
              </div>
            )}
            
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
                disabled={students.length > 0 || deleting}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (students.length > 0 || deleting) ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '16px',
                  cursor: (students.length > 0 || deleting) ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? '刪除中...' : students.length > 0 ? '無法刪除' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolDetail;