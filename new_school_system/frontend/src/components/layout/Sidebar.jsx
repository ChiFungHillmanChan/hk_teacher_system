import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  School, 
  BookOpen, 
  BarChart3, 
  Settings, 
  User,
  X,
  Shield,
  GraduationCap,
  FileText, // Added for Integration icon
  Brain // Added for AI Analysis icon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  // Navigation items based on user role - Translated to Traditional Chinese
  const navigationItems = [
    {
      id: 'dashboard',
      label: '控制台',
      icon: <Home size={20} />,
      path: '/dashboard',
      available: true
    },
    {
      id: 'schools',
      label: '學校管理',
      icon: <School size={20} />,
      path: '/schools',
      available: true,
      badge: isAdmin() ? '管理員' : null
    },
    {
      id: 'students',
      label: '學生管理',
      icon: <Users size={20} />,
      path: '/students',
      available: true
    },
    {
      id: 'reports',
      label: '學生報告記錄',
      icon: <BookOpen size={20} />,
      path: '/reports',
      available: true
    }
  ];

  // Integration items - NEW section for integration features
  const integrationItems = [
    {
      id: 'integration-divider',
      type: 'divider',
      label: '整合功能',
      available: true
    },
    {
      id: 'integration',
      label: 'PDF 報告生成',
      icon: <FileText size={20} />,
      path: '/integration',
      available: true
    },
    {
      id: 'ai-analysis',
      label: 'AI 智能分析',
      icon: <Brain size={20} />,
      path: '/ai-analysis',
      available: true,
      badge: 'NEW'
    }
  ];

  // Analytics items - Updated to separate from AI Analysis
  const analyticsItems = [
    {
      id: 'analytics-divider',
      type: 'divider',
      label: '分析功能',
      available: true
    },
    {
      id: 'analytics',
      label: '數據分析',
      icon: <BarChart3 size={20} />,
      path: '/analytics',
      available: true,
      comingSoon: true
    }
  ];

  // Admin-only items - Translated to Traditional Chinese
  const adminItems = [
    {
      id: 'admin-divider',
      type: 'divider',
      label: '管理功能',
      available: isAdmin()
    },
    {
      id: 'admin-users',
      label: '用戶管理',
      icon: <Shield size={20} />,
      path: '/admin/users',
      available: isAdmin(),
      comingSoon: true
    },
    {
      id: 'admin-system',
      label: '系統設定',
      icon: <Settings size={20} />,
      path: '/admin/system',
      available: isAdmin(),
      comingSoon: true
    }
  ];

  // Account items - Translated to Traditional Chinese
  const accountItems = [
    {
      id: 'account-divider',
      type: 'divider',
      label: '帳戶',
      available: true
    },
    {
      id: 'profile',
      label: '我的個人檔案',
      icon: <User size={20} />,
      path: '/profile',
      available: true,
      comingSoon: true
    },
    {
      id: 'settings',
      label: '設定',
      icon: <Settings size={20} />,
      path: '/settings',
      available: true,
      comingSoon: true
    }
  ];

  const allItems = [
    ...navigationItems, 
    ...integrationItems, 
    ...analyticsItems, 
    ...adminItems, 
    ...accountItems
  ].filter(item => item.available);

  const isActivePath = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleItemClick = (item) => {
    if (item.comingSoon) {
      // For now, just close sidebar for coming soon items
      onClose?.();
      return;
    }
    onClose?.();
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Desktop Header - Centered Logo */}
        <div className="sidebar__header">
          <Link to="/dashboard" className="sidebar__logo">
            <GraduationCap size={24} />
            <span className="sidebar__logo-text">香港教師系統</span>
          </Link>
        </div>

        {/* Mobile Header - Logo with Close Button */}
        <div className="sidebar__mobile-header">
          <Link to="/dashboard" className="sidebar__logo">
            <GraduationCap size={24} />
            <span className="sidebar__logo-text">香港教師系統</span>
          </Link>
          <button
            className="sidebar__close-btn"
            onClick={onClose}
            aria-label="關閉選單"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.name}</div>
            <div className="sidebar__user-role">
              {user?.role === 'admin' ? '管理員' : '教師'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          <ul className="sidebar__nav-list">
            {allItems.map((item) => {
              if (item.type === 'divider') {
                return (
                  <li key={item.id} className="sidebar__divider">
                    <span className="sidebar__divider-text">{item.label}</span>
                  </li>
                );
              }

              return (
                <li key={item.id} className="sidebar__nav-item">
                  {item.comingSoon ? (
                    <div 
                      className="sidebar__nav-link sidebar__nav-link--disabled"
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="sidebar__nav-icon">
                        {item.icon}
                      </span>
                      <span className="sidebar__nav-text">
                        {item.label}
                      </span>
                      <span className="sidebar__nav-badge sidebar__nav-badge--coming-soon">
                        即將推出
                      </span>
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      className={`sidebar__nav-link ${
                        isActivePath(item.path) ? 'sidebar__nav-link--active' : ''
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="sidebar__nav-icon">
                        {item.icon}
                      </span>
                      <span className="sidebar__nav-text">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`sidebar__nav-badge ${
                          item.badge === 'NEW' ? 'sidebar__nav-badge--new' : 
                          item.badge === '管理員' ? 'sidebar__nav-badge--admin' : ''
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <div className="sidebar__footer-content">
            <p className="sidebar__footer-text">
              © 2025 香港教師系統
            </p>
            <p className="sidebar__footer-subtext">
              為香港教育工作者而設
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;