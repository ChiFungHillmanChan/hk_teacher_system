import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ 
  children, 
  requireRole = null, 
  fallbackPath = '/login' 
}) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return <Loading />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role requirement
  if (requireRole && !hasRole(requireRole)) {
    return (
      <Navigate 
        to="/" 
        state={{ 
          from: location,
          message: `This page requires ${requireRole} role.` 
        }} 
        replace 
      />
    );
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;