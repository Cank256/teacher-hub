import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, clearError } from '../../store/slices/authSlice';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear Redux error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    if (!formData.email) {
      newErrors.email = t('errors.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('errors.required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clear any previous errors
    setErrors({});
    dispatch(clearError());

    try {
      await dispatch(loginUser({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      })).unwrap();
      
      // Navigation will be handled by the useEffect hook
    } catch (error) {
      // Error is handled by Redux state, but we can also show local errors
      setErrors({
        general: error as string || t('errors.generic')
      });
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field as keyof LoginFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Hub
          </h1>
          <h2 className="text-xl text-gray-600">
            {t('auth.login')}
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t('auth.loginButton')}
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errors.general && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {errors.general}
              </div>
            )}

            <Input
              label={t('auth.email')}
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={errors.email}
              required
              autoComplete="email"
              autoFocus
              placeholder="teacher@example.com"
            />

            <Input
              label={t('auth.password')}
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              error={errors.password}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange('rememberMe')}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  {t('auth.rememberMe')}
                </label>
              </div>

              <Link
                to="/auth/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isLoading}
              loadingText={t('common.loading')}
            >
              {t('auth.loginButton')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.dontHaveAccount')}{' '}
              <Link
                to="/auth/register"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};