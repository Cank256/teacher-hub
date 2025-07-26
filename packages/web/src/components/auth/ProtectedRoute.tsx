import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadUserFromStorage, updateLastActivity, refreshAuthToken } from '../../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireVerification = false,
  fallbackPath = '/auth/login'
}) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, user, isLoading, token, lastActivity } = useAppSelector((state) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Enhanced authentication initialization
  useEffect(() => {
    const initializeAuth = async () => {
      if (!isAuthenticated && !isLoading && !authCheckComplete) {
        try {
          await dispatch(loadUserFromStorage()).unwrap();
        } catch (error) {
          // Silent fail - user will be redirected to login
          console.debug('Failed to load user from storage:', error);
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

  // Token refresh logic
  useEffect(() => {
    if (isAuthenticated && token && lastActivity) {
      const tokenAge = Date.now() - lastActivity;
      const REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes

      if (tokenAge > REFRESH_THRESHOLD) {
        dispatch(refreshAuthToken()).catch((error) => {
          console.debug('Token refresh failed:', error);
        });
      }
    }
  }, [dispatch, isAuthenticated, token, lastActivity]);

  // Update last activity when user navigates
  useEffect(() => {
    if (isAuthenticated && authCheckComplete) {
      dispatch(updateLastActivity());
    }
  }, [dispatch, isAuthenticated, location.pathname, authCheckComplete]);

  // Show enhanced loading state during authentication check
  if (isLoading || isInitializing || !authCheckComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center max-w-md mx-auto px-4">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
            aria-hidden="true"
          ></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Verifying Authentication
          </h2>
          <p className="text-gray-600 text-sm">
            Please wait while we verify your login status...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated with enhanced state preservation
  if (!isAuthenticated) {
    const redirectState = {
      from: location,
      returnUrl: location.pathname + location.search,
      timestamp: Date.now()
    };
    
    return <Navigate to={fallbackPath} state={redirectState} replace />;
  }

  // Enhanced verification requirement check
  if (requireVerification && user?.verificationStatus !== 'verified') {
    const getVerificationMessage = (status: string) => {
      switch (status) {
        case 'pending':
          return 'Your teaching credentials are currently being verified. You\'ll receive an email once the verification is complete.';
        case 'rejected':
          return 'Your teaching credentials could not be verified. Please contact support or resubmit your credentials.';
        default:
          return 'Account verification is required to access this content.';
      }
    };

    const isRejected = user?.verificationStatus === 'rejected';
    const isPending = user?.verificationStatus === 'pending';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="alert">
        <div className="max-w-md mx-auto text-center px-4">
          <div className={`${isRejected ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-6`}>
            <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-4 ${isRejected ? 'bg-red-100' : 'bg-yellow-100'} rounded-full`}>
              <svg
                className={`w-6 h-6 ${isRejected ? 'text-red-600' : 'text-yellow-600'}`}
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
              {getVerificationMessage(user?.verificationStatus || '')}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm mb-4">
              <span className="text-gray-500">Status:</span>
              <span className={`capitalize font-medium px-2 py-1 rounded-full text-xs ${
                isRejected ? 'bg-red-100 text-red-800' : 
                isPending ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'
              }`}>
                {user?.verificationStatus}
              </span>
            </div>
            {isRejected && (
              <div className="mt-4">
                <button
                  onClick={() => window.location.href = '/profile?tab=verification'}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Resubmit Credentials
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};