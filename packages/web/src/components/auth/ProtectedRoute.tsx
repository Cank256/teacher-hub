import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadUserFromStorage, updateLastActivity } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireVerification = false 
}) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Try to load user from storage if not authenticated
    if (!isAuthenticated && !isLoading) {
      dispatch(loadUserFromStorage());
    }
  }, [dispatch, isAuthenticated, isLoading]);

  useEffect(() => {
    // Update last activity when user navigates
    if (isAuthenticated) {
      dispatch(updateLastActivity());
    }
  }, [dispatch, isAuthenticated, location.pathname]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check verification requirement
  if (requireVerification && user?.verificationStatus !== 'verified') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Account Verification Required
            </h2>
            <p className="text-gray-600 mb-4">
              Your teaching credentials are currently being verified. You'll receive an email once the verification is complete.
            </p>
            <p className="text-sm text-gray-500">
              Status: <span className="capitalize font-medium">{user?.verificationStatus}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};