import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

interface AuthRedirectHandlerProps {
  children: React.ReactNode;
}

/**
 * Component that handles authentication-based redirects
 * Centralizes the logic for redirecting users based on their auth state
 */
export const AuthRedirectHandler: React.FC<AuthRedirectHandlerProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Don't redirect while authentication is still loading
    if (isLoading) return;

    const currentPath = location.pathname;
    const isAuthPage = currentPath.startsWith('/auth/');
    const isPublicPage = [
      '/', '/contact', '/help', '/privacy', '/terms', 
      '/cookies', '/status', '/accessibility', '/community', '/blog'
    ].includes(currentPath);

    // If user is authenticated and on auth pages, redirect to dashboard
    if (isAuthenticated && isAuthPage) {
      const state = location.state as any;
      let redirectPath = '/dashboard';
      
      // Check for return URL in state
      if (state?.returnUrl && !state.returnUrl.startsWith('/auth/')) {
        redirectPath = state.returnUrl;
      } else if (state?.from?.pathname && !state.from.pathname.startsWith('/auth/')) {
        redirectPath = state.from.pathname + (state.from.search || '');
      }
      
      navigate(redirectPath, { replace: true });
    }
    
    // If user is not authenticated and trying to access protected content
    if (!isAuthenticated && !isAuthPage && !isPublicPage) {
      const redirectState = {
        from: location,
        returnUrl: location.pathname + location.search,
        timestamp: Date.now()
      };
      
      navigate('/auth/login', { state: redirectState, replace: true });
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  return <>{children}</>;
};