import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormErrors {
  email?: string;
  general?: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ForgotPasswordFormErrors = {};

    if (!formData.email) {
      newErrors.email = t('errors.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // TODO: Implement actual password reset logic
      console.log('Password reset request:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      
    } catch (error) {
      setErrors({
        general: t('errors.generic')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      email: e.target.value
    });
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({
        ...prev,
        email: undefined
      }));
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Teacher Hub
            </h1>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Check your email
              </h2>
              
              <p className="text-sm text-gray-600 mb-6">
                We've sent a password reset link to <strong>{formData.email}</strong>
              </p>
              
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ email: '' });
                  }}
                >
                  Try again
                </Button>
                
                <Link
                  to="/auth/login"
                  className="block w-full text-center text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded py-2"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Hub
          </h1>
          <h2 className="text-xl text-gray-600">
            Reset your password
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t('auth.forgotPassword')}
            </CardTitle>
            <p className="text-sm text-gray-600 text-center mt-2">
              Enter your email address and we'll send you a link to reset your password.
            </p>
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
              onChange={handleInputChange}
              error={errors.email}
              required
              autoComplete="email"
              autoFocus
              placeholder="teacher@example.com"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isLoading}
              loadingText="Sending..."
            >
              Send reset link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            >
              Back to login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};