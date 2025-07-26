import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadUserFromStorage } from '../../store/slices/authSlice';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectIfAuthenticated?: boolean;
  redirectPath?: string;
}

/**
 * Component for routes that should be accessible to non-authenticated users
 * Can optionally redirect authenticated users away from auth pages
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ 
  children, 
  redirectIfAuthenticated = false,
  redirectPath = '/dashboard'
}) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Initialize authentication check
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isAuthenticated && !isLoading && !authCheckComplete) {
        try {
          await dispatch(loadUserFromStorage()).unwrap();
        } catch (error) {
          // Silent fail - user is not authenticated
          console.debug('No stored authentication found:', error);
        } finally {
          setAuthCheckComplete(true);
          setIsInitializing(false);
        }
      } else if (isAuthenticated) {
        setAuthCheckComplete(true);
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch, isAuthenticated, isLoading, authCheckComplete]);

  // Show loading while checking authentication
  if (isLoading || isInitializing || !authCheckComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center max-w-md mx-auto px-4">
          <div 
            className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"
            aria-hidden="true"
          ></div>
          <p className="text-gray-600 text-sm">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users if specified
  if (redirectIfAuthenticated && isAuthenticated) {
    const state = location.state as any;
    let finalRedirectPath = redirectPath;
    
    // Check for return URL in state
    if (state?.returnUrl && !state.returnUrl.startsWith('/auth/')) {
      finalRedirectPath = state.returnUrl;
    } else if (state?.from?.pathname && !state.from.pathname.startsWith('/auth/')) {
      finalRedirectPath = state.from.pathname + (state.from.search || '');
    }
    
    return <Navigate to={finalRedirectPath} replace />;
  }

  return <>{children}</>;
};