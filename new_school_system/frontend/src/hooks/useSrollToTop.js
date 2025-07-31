// Custom hook for auto-scroll functionality
// File: src/hooks/useScrollToTop.js

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook that automatically scrolls to top when component mounts
 * or when specified dependencies change
 * 
 * @param {Array} deps - Optional dependencies to trigger scroll
 * @param {Object} options - Scroll options
 */
export const useScrollToTop = (deps = [], options = {}) => {
  const {
    behavior = 'smooth',
    delay = 0,
    target = null, // 'main', 'window', or specific selector
    focus = false, // Whether to focus the target element
  } = options;

  useEffect(() => {
    const scrollToTop = () => {
      let targetElement;

      // Determine scroll target
      if (target === 'main') {
        targetElement = document.querySelector('.layout__main');
      } else if (target === 'window' || !target) {
        targetElement = null; // Will use window.scrollTo
      } else if (typeof target === 'string') {
        targetElement = document.querySelector(target);
      }

      // Perform scroll
      if (targetElement) {
        targetElement.scrollTo({
          top: 0,
          behavior
        });

        // Focus for accessibility if requested
        if (focus) {
          targetElement.focus({ preventScroll: true });
        }
      } else {
        window.scrollTo({
          top: 0,
          behavior
        });

        // Focus document body if no specific target
        if (focus) {
          document.body.focus({ preventScroll: true });
        }
      }
    };

    // Apply delay if specified
    if (delay > 0) {
      const timeoutId = setTimeout(scrollToTop, delay);
      return () => clearTimeout(timeoutId);
    } else {
      scrollToTop();
    }
  }, deps);
};

/**
 * Hook that scrolls to top on route changes
 * 
 * @param {Object} options - Scroll options
 */
export const useScrollToTopOnRouteChange = (options = {}) => {
  const location = useLocation();
  
  useScrollToTop([location.pathname], {
    delay: 100, // Small delay to ensure page has rendered
    target: 'main',
    focus: true,
    ...options
  });
};

/**
 * Hook that scrolls to top when component mounts
 * 
 * @param {Object} options - Scroll options
 */
export const useScrollToTopOnMount = (options = {}) => {
  useScrollToTop([], {
    delay: 0,
    target: 'main',
    ...options
  });
};

// Example usage in components:

// 1. In CreateStudent.jsx
/*
import { useScrollToTopOnMount } from '../hooks/useScrollToTop';

const CreateStudent = () => {
  // Auto-scroll to top when form loads
  useScrollToTopOnMount();
  
  // ... rest of component
};
*/

// 2. In CreateSchool.jsx
/*
import { useScrollToTopOnMount } from '../hooks/useScrollToTop';

const CreateSchool = () => {
  // Auto-scroll to top when form loads
  useScrollToTopOnMount();
  
  // ... rest of component
};
*/

// 3. In Dashboard.jsx (already implemented in the component above)
/*
import { useScrollToTopOnMount } from '../hooks/useScrollToTop';

const Dashboard = () => {
  // Auto-scroll to top when dashboard loads
  useScrollToTopOnMount();
  
  // ... rest of component
};
*/

// 4. Custom usage with specific options
/*
import { useScrollToTop } from '../hooks/useScrollToTop';

const SomeComponent = () => {
  const [data, setData] = useState(null);
  
  // Scroll to top when data changes
  useScrollToTop([data], {
    behavior: 'smooth',
    delay: 200,
    target: '.specific-container',
    focus: true
  });
  
  // ... rest of component
};
*/