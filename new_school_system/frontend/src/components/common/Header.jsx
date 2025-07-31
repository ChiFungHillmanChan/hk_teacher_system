import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(prev => !prev);
    setNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setNotificationsOpen(prev => !prev);
    setUserMenuOpen(false);
  };

  // Mock notifications in Chinese
  const notifications = [
    {
      id: 1,
      title: '新學生註冊',
      message: '陳大文已註冊至中一甲班',
      time: '5分鐘前',
      unread: true
    },
    {
      id: 2,
      title: '報告已提交',
      message: '小三乙班數學評估已完成',
      time: '1小時前',
      unread: true
    }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="header">
      <div className="header__content">
        {/* Left Section */}
        <div className="header__left">
          <button
            className="header__menu-btn"
            onClick={onToggleSidebar}
            aria-label="切換側邊欄"
          >
            <Menu size={20} />
          </button>

          <Link to="/dashboard" className="header__logo">
            <GraduationCap size={28} />
            <span className="header__logo-text">香港教師系統</span>
          </Link>
        </div>

        {/* Right Section */}
        <div className="header__right">
          {/* Notifications */}
          <div className="header__notifications" ref={notificationsRef}>
            <button
              className="header__notification-btn"
              onClick={toggleNotifications}
              aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount}則未讀)` : '(無未讀)'}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="header__notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="header__notifications-dropdown">
                <div className="header__notifications-header">
                  <h3>通知</h3>
                  {unreadCount > 0 && (
                    <span className="header__notifications-count">
                      {unreadCount}則未讀
                    </span>
                  )}
                </div>
                
                <div className="header__notifications-list">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`header__notification-item ${notification.unread ? 'header__notification-item--unread' : ''}`}
                      >
                        <div className="header__notification-content">
                          <h4 className="header__notification-title">
                            {notification.title}
                          </h4>
                          <p className="header__notification-message">
                            {notification.message}
                          </p>
                          <span className="header__notification-time">
                            {notification.time}
                          </span>
                        </div>
                        {notification.unread && (
                          <div className="header__notification-dot"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="header__notifications-empty">
                      <p>暫無通知</p>
                    </div>
                  )}
                </div>
                
                <div className="header__notifications-footer">
                  <Link
                    to="/notifications"
                    className="header__notifications-view-all"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    查看全部通知
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="header__user" ref={userMenuRef}>
            <button
              className="header__user-btn"
              onClick={toggleUserMenu}
              aria-label="用戶選單"
            >
              <div className="header__user-avatar">
                <User size={20} />
              </div>
              <div className="header__user-info">
                <span className="header__user-name">
                  {user?.name}
                </span>
                <span className="header__user-role">
                  {user?.role === 'admin' ? '管理員' : '教師'}
                </span>
              </div>
              <ChevronDown 
                size={16} 
                className={`header__chevron ${userMenuOpen ? 'header__chevron--rotated' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="header__user-dropdown">
                <div className="header__user-dropdown-header">
                  <div className="header__user-avatar-large">
                    <User size={24} />
                  </div>
                  <div className="header__user-details-large">
                    <span className="header__user-name-large">{user?.name}</span>
                    <span className="header__user-email">{user?.email}</span>
                  </div>
                </div>
                
                <div className="header__user-dropdown-menu">
                  <Link
                    to="/profile"
                    className="header__menu-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={16} />
                    <span>我的個人檔案</span>
                  </Link>
                  
                  <Link
                    to="/settings"
                    className="header__menu-item"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={16} />
                    <span>設定</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="header__menu-item header__menu-item--logout"
                  >
                    <LogOut size={16} />
                    <span>登出</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;