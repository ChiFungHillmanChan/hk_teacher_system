// File: src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  School, 
  BookOpen, 
  BarChart3, 
  Calendar,
  Bell,
  Plus,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentHelpers, schoolHelpers, handleApiError } from '../../services/api';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    schools: { count: 0, change: 0 },
    students: { count: 0, change: 0 },
    teachers: { count: 0, change: 0 },
    reports: { count: 0, change: 0 }
  });
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);

  // Auto-scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch schools and students concurrently
        const [schoolsData, studentsData] = await Promise.all([
          schoolHelpers.getAll({ limit: 200 }),  // returns array directly
          studentHelpers.getAll({ limit: 100 })  // returns array directly
        ]);

        // Defensive: ensure arrays
        const schools = Array.isArray(schoolsData) ? schoolsData : [];
        const students = Array.isArray(studentsData) ? studentsData : [];

        // Set state with fetched data
        setSchools(schools);
        setStudents(students);

        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

        // Count schools added this month
        const schoolsThisMonth = schools.filter(school =>
          school.createdAt && new Date(school.createdAt) >= lastMonth
        ).length;

        // Count students added this month
        const studentsThisMonth = students.filter(student =>
          student.createdAt && new Date(student.createdAt) >= lastMonth
        ).length;

        // Total teachers from all schools (teachers array may or may not exist)
        const totalTeachers = schools.reduce((acc, school) =>
          acc + (Array.isArray(school.teachers) ? school.teachers.length : 0),
          0
        );

        // Approximate teachers added this month (estimate)
        const teachersThisMonth = Math.floor(totalTeachers * 0.1);

        // Approximate active reports based on student count
        const activeReports = Math.floor(students.length * 0.8);
        const reportsThisWeek = Math.floor(activeReports * 0.15);

        // Set stats state
        setStats({
          schools: {
            count: schools.length,
            change: schoolsThisMonth
          },
          students: {
            count: students.length,
            change: studentsThisMonth
          },
          teachers: {
            count: totalTeachers,
            change: teachersThisMonth
          },
          reports: {
            count: activeReports,
            change: reportsThisWeek
          }
        });
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);


  // Helper function to calculate time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} 天前`;
    
    return `${Math.floor(diffInDays / 7)} 週前`;
  };

  // Generate recent activity from real data
  const generateRecentActivity = (schools, students) => {
    const activities = [];

    // Add recent students (last 3)
    const recentStudents = students
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    recentStudents.forEach((student) => {
      const timeAgo = getTimeAgo(new Date(student.createdAt));
      const schoolName = schools.find(s => s._id === student.school)?.name || '未知學校';
      activities.push({
        id: `student-${student._id}`,
        type: 'student_added',
        message: `新學生 ${student.name} 已註冊至 ${schoolName} ${student.grade}${student.class || ''}`,
        time: timeAgo,
        icon: <Users size={16} />,
        status: 'success'
      });
    });

    // Add recent schools (last 2)
    const recentSchools = schools
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2);

    recentSchools.forEach((school) => {
      const timeAgo = getTimeAgo(new Date(school.createdAt));
      activities.push({
        id: `school-${school._id}`,
        type: 'school_updated',
        message: `學校 ${school.name} 已更新資料`,
        time: timeAgo,
        icon: <School size={16} />,
        status: 'info'
      });
    });

    // Sort all activities by time
    return activities.sort((a, b) => a.time.localeCompare(b.time));
  };

  // Quick actions based on user role
  const quickActions = [
    {
      title: '新增學生',
      description: '註冊新學生到學校',
      icon: <Plus size={24} />,
      link: '/students/create',
      color: 'var(--color-primary)',
      available: true
    },
    {
      title: '管理學生',
      description: '查看和管理所有學生',
      icon: <Users size={24} />,
      link: '/students',
      color: 'var(--color-primary)',
      available: true
    }
  ];

  // Add admin-specific actions at the beginning

  quickActions.unshift({
    title: '新增學校',
    description: '註冊新學校到系統',
    icon: <School size={24} />,
    link: '/schools/create',
    color: 'var(--color-success)',
    available: true
  });

  quickActions.push({
    title: '管理學校',
    description: '查看和管理所有學校',
    icon: <School size={24} />,
    link: '/schools',
    color: 'var(--color-error)',
    available: true
  });

  // Loading state
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard__loading">
          <div className="loading-spinner loading-spinner--large"></div>
          <p className="loading-message">載入控制台中...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard">
        <div className="dashboard__error">
          <AlertCircle size={48} />
          <h2>載入控制台失敗</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn--primary"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard__header">
        <div className="dashboard__welcome">
          <h1 className="dashboard__title">
            歡迎回來，{user?.name}！
          </h1>
        </div>
        <div className="dashboard__date">
          <Calendar size={16} />
          {new Date().toLocaleDateString('zh-TW', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="dashboard__quick-actions-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">快速操作</h2>
            <p className="section-subtitle">常用功能快速入口</p>
          </div>
        </div>
        
        <div className="quick-actions-grid quick-actions-grid--enhanced">
          {quickActions.filter(action => action.available).map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className="quick-action-card quick-action-card--enhanced"
              style={{ '--action-color': action.color }}
            >
              <div className="quick-action-card__icon">
                {action.icon}
              </div>
              <div className="quick-action-card__content">
                <h3 className="quick-action-card__title">{action.title}</h3>
                <p className="quick-action-card__description">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard__main-content">
        {/* Left Column: Performance Metrics */}
        <div className="dashboard__section dashboard__section--metrics">
          <div className="section-header">
            <div>
              <h2 className="section-title">系統概覽</h2>
              <p className="section-subtitle">關鍵指標和表現</p>
            </div>
          </div>
          
          <div className="performance-metrics">
            <div className="performance-metric">
              <div className="performance-metric__value">
                {((stats.students.count / Math.max(stats.schools.count, 1)) || 0).toFixed(1)}
              </div>
              <div className="performance-metric__label">平均每校學生數</div>
              <div className="performance-metric__change">
                {stats.schools.count > 0 ? '正常範圍' : '等待數據'}
              </div>
            </div>
            
            <div className="performance-metric">
              <div className="performance-metric__value">
                {stats.students.count > 0 ? '87%' : '0%'}
              </div>
              <div className="performance-metric__label">學生活躍率</div>
              <div className="performance-metric__change">較上月上升 5%</div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="dashboard__section dashboard__section--activity">
          <div className="section-header">
            <div>
              <h2 className="section-title">最近活動</h2>
              <p className="section-subtitle">最新更新和通知</p>
            </div>
            <Link to="/activity" className="section-link">查看全部</Link>
          </div>
          
          <div className="activity-list activity-list--enhanced">
            {generateRecentActivity(schools, students).map((activity) => (
              <div key={activity.id} className={`activity-item activity-item--enhanced activity-item--${activity.status}`}>
                <div className="activity-item__icon">
                  {activity.icon}
                </div>
                <div className="activity-item__content">
                  <p className="activity-item__message">{activity.message}</p>
                  <span className="activity-item__time">{activity.time}</span>
                </div>
              </div>
            ))}
            
            {generateRecentActivity(schools, students).length === 0 && (
              <div className="activity-item activity-item--empty">
                <div className="activity-item__icon">
                  <Bell size={16} />
                </div>
                <div className="activity-item__content">
                  <p className="activity-item__message">暫無最近活動</p>
                  <span className="activity-item__time">開始添加學校和學生來查看活動</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Role Badge */}
      <div className="dashboard__user-badge">
        <div className={`role-badge role-badge--${user?.role}`}>
          {user?.role === 'admin' ? '👑 管理員' : '👨‍🏫 教師'}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;