import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { googleLogin } from '../../store/slices/authSlice';
import { googleAuthService } from '../../services/googleAuthService';

interface GoogleSignInButtonProps {
  onRegistrationRequired?: (authCode: string) => void;
  onError?: (error: string) => void;
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: string;
  disabled?: boolean;
  className?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onRegistrationRequired,
  onError,
  theme = 'outline',
  size = 'large',
  text = 'signin_with',
  shape = 'rectangular',
  width = '100%',
  disabled = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        if (!googleAuthService.isConfigured()) {
          setInitError('Google Sign-In is not configured');
          return;
        }

        await googleAuthService.initialize();
        setIsInitialized(true);
        setInitError(null);
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        setInitError('Failed to load Google Sign-In');
      }
    };

    initializeGoogleAuth();
  }, []);

  const handleGoogleSignIn = async () => {
    if (disabled || isLoading || !isInitialized) {
      return;
    }

    try {
      const authCode = await googleAuthService.getAuthorizationCode();
      
      const result = await dispatch(googleLogin(authCode));
      
      if (googleLogin.rejected.match(result)) {
        const error = result.payload as any;
        
        if (error?.type === 'REGISTRATION_REQUIRED') {
          // User needs to complete registration
          if (onRegistrationRequired) {
            onRegistrationRequired(error.authCode || authCode);
          }
        } else {
          // Handle other errors
          const errorMessage = typeof error === 'string' ? error : 'Google sign-in failed';
          if (onError) {
            onError(errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google sign-in failed';
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Custom button fallback if Google Identity Services fails to load
  if (initError || !isInitialized) {
    return (
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={disabled || isLoading || !!initError}
        className={`
          w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm
          text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2
          focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        aria-label={t('auth.signInWithGoogle')}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {initError ? t('auth.googleSignInUnavailable') : t('auth.signInWithGoogle')}
      </button>
    );
  }

  return (
    <div className={className}>
      <div
        ref={buttonRef}
        onClick={handleGoogleSignIn}
        className={disabled || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        style={{ width }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGoogleSignIn();
          }
        }}
        aria-label={t('auth.signInWithGoogle')}
      />
    </div>
  );
};