// Updated Layout.jsx with auto-scroll functionality
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // IMPROVEMENT 2: Auto-scroll to top on route change
  useEffect(() => {
    const scrollToTop = () => {
      // Get the main content area
      const mainContent = document.querySelector('.layout__main');
      
      if (mainContent) {
        // Smooth scroll to top of main content
        mainContent.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        // Fallback to window scroll
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }

      // Also focus the main content for accessibility
      const mainElement = document.querySelector('.layout__content');
      if (mainElement) {
        mainElement.focus({ preventScroll: true });
      }
    };

    // Add a small delay to ensure the new page has rendered
    const timeoutId = setTimeout(scrollToTop, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]); // Trigger on route change

  // Handle sidebar toggle
  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className={`layout ${sidebarOpen ? 'layout--sidebar-open' : ''}`}>
      <Header onToggleSidebar={handleToggleSidebar} />
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={handleCloseSidebar}
      />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="layout__overlay layout__overlay--active"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}
      
      <main 
        className="layout__main"
        role="main"
        tabIndex="-1" // Make focusable for accessibility
      >
        <div className="layout__content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;