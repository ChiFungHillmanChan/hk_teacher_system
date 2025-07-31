import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useReducer } from 'react';
import { authService } from '../services/authService';

// Cookie configuration
const COOKIE_OPTIONS = {
  expires: 7, // 7 days
  secure: import.meta.env.PROD, // HTTPS only in production
  sameSite: 'strict',
  path: '/',
};

// Token management with cookies and localStorage fallback
const tokenManager = {
  getAccessToken: () => {
    return Cookies.get('accessToken') || localStorage.getItem('accessToken');
  },

  setAccessToken: token => {
    Cookies.set('accessToken', token, COOKIE_OPTIONS);
    localStorage.setItem('accessToken', token);
  },

  getRefreshToken: () => {
    return Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
  },

  setRefreshToken: token => {
    Cookies.set('refreshToken', token, { ...COOKIE_OPTIONS, expires: 30 });
    localStorage.setItem('refreshToken', token);
  },

  getUser: () => {
    const userCookie = Cookies.get('user');
    const userLocal = localStorage.getItem('user');
    const userData = userCookie || userLocal;
    return userData ? JSON.parse(userData) : null;
  },

  setUser: user => {
    const userData = JSON.stringify(user);
    Cookies.set('user', userData, COOKIE_OPTIONS);
    localStorage.setItem('user', userData);
  },

  clearTokens: () => {
    Cookies.remove('accessToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
    Cookies.remove('user', { path: '/' });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AuthActionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_ERROR: 'SET_ERROR',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_START:
    case AuthActionTypes.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AuthActionTypes.LOGIN_SUCCESS:
    case AuthActionTypes.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AuthActionTypes.LOGIN_FAILURE:
    case AuthActionTypes.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };

    case AuthActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AuthActionTypes.UPDATE_USER:
      return {
        ...state,
        user: action.payload.user,
      };

    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload.isLoading,
      };

    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AuthActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload.error,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      const user = tokenManager.getUser();

      if (token && user) {
        try {
          const response = await authService.getProfile();

          dispatch({
            type: AuthActionTypes.LOGIN_SUCCESS,
            payload: { user: response.user },
          });
        } catch (error) {
          // If token invalid, clear tokens and log out as fallback
          // But if the API call fails for another reason, fallback to local user
          if (error.response && error.response.status === 401) {
            // Token expired or invalid
            tokenManager.clearTokens();
            dispatch({ type: AuthActionTypes.LOGOUT });
          } else {
            // Network error or other reason, fallback to cached user
            console.error('Token validation failed, using cached user:', error);
            dispatch({
              type: AuthActionTypes.LOGIN_SUCCESS,
              payload: { user },
            });
          }
        }
      } else {
        dispatch({ type: AuthActionTypes.SET_LOADING, payload: { isLoading: false } });
      }
    };

    initializeAuth();

    const handleAuthLogout = () => {
      dispatch({ type: AuthActionTypes.LOGOUT });
    };

    const handleStorageChange = e => {
      if (e.key === 'accessToken' && !e.newValue) {
        dispatch({ type: AuthActionTypes.LOGOUT });
      }
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Login function
  const login = async credentials => {
    dispatch({ type: AuthActionTypes.LOGIN_START });

    try {
      const response = await authService.login(credentials);
      const payload = response; // API already returns { token, refreshToken, user }

      if (!payload?.token) {
        throw new Error('Invalid login response: token missing');
      }

      // Persist tokens and user
      tokenManager.setAccessToken(payload.token);
      tokenManager.setRefreshToken(payload.refreshToken);
      tokenManager.setUser(payload.user);

      dispatch({
        type: AuthActionTypes.LOGIN_SUCCESS,
        payload: { user: payload.user },
      });

      return response;
    } catch (error) {
      console.error('Login error in context:', error);

      const errorMessage = error.response?.data?.message || error.message || 'Login failed';

      dispatch({
        type: AuthActionTypes.LOGIN_FAILURE,
        payload: { error: errorMessage },
      });

      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = error.response?.status;

      throw enhancedError;
    }
  };

  // Register function
  const register = async userData => {
    dispatch({ type: AuthActionTypes.REGISTER_START });

    try {
      const response = await authService.register(userData);
      const payload = response;

      tokenManager.setAccessToken(payload.token);
      tokenManager.setRefreshToken(payload.refreshToken);
      tokenManager.setUser(payload.user);

      dispatch({
        type: AuthActionTypes.REGISTER_SUCCESS,
        payload: { user: payload.user },
      });

      return response;
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AuthActionTypes.REGISTER_FAILURE,
        payload: { error: errorMessage },
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
      dispatch({ type: AuthActionTypes.LOGOUT });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = role => {
    return state.user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Check if user is teacher
  const isTeacher = () => {
    return hasRole('teacher');
  };

  // Context value
  const contextValue = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    login,
    register,
    logout,
    clearError,

    // Utility functions
    hasRole,
    isAdmin,
    isTeacher,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthContext;
