import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  subjects: string[];
  gradeLevels: string[];
  school: string;
  location: string;
  yearsExperience: string;
  credentialFile: File | null;
  agreeToTerms: boolean;
}

interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  subjects?: string;
  gradeLevels?: string;
  school?: string;
  location?: string;
  yearsExperience?: string;
  credentialFile?: string;
  agreeToTerms?: string;
  general?: string;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'Religious Education',
  'Physical Education',
  'Art',
  'Music',
  'Computer Studies',
  'Agriculture'
];

const GRADE_LEVELS = [
  'Nursery',
  'Primary 1-3',
  'Primary 4-7',
  'Secondary 1-4',
  'Secondary 5-6',
  'Tertiary'
];

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    subjects: [],
    gradeLevels: [],
    school: '',
    location: '',
    yearsExperience: '',
    credentialFile: null,
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t('errors.required');
    }

    if (!formData.email) {
      newErrors.email = t('errors.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('errors.invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('errors.required');
    } else if (formData.password.length < 8) {
      newErrors.password = t('errors.passwordTooShort', { minLength: 8 });
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.required');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('errors.passwordsDoNotMatch');
    }

    if (formData.subjects.length === 0) {
      newErrors.subjects = t('errors.required');
    }

    if (formData.gradeLevels.length === 0) {
      newErrors.gradeLevels = t('errors.required');
    }

    if (!formData.school.trim()) {
      newErrors.school = t('errors.required');
    }

    if (!formData.location.trim()) {
      newErrors.location = t('errors.required');
    }

    if (!formData.yearsExperience) {
      newErrors.yearsExperience = t('errors.required');
    }

    if (!formData.credentialFile) {
      newErrors.credentialFile = t('errors.required');
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = t('errors.required');
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
      // TODO: Implement actual registration logic
      console.log('Registration attempt:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Handle successful registration (redirect, show success message, etc.)
      
    } catch (error) {
      setErrors({
        general: t('errors.generic')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = field === 'agreeToTerms' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field as keyof RegisterFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleMultiSelectChange = (field: 'subjects' | 'gradeLevels') => (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      [field]: selectedOptions
    }));
    
    // Clear field error
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      credentialFile: file
    }));
    
    // Clear file error
    if (errors.credentialFile) {
      setErrors(prev => ({
        ...prev,
        credentialFile: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Hub
          </h1>
          <h2 className="text-xl text-gray-600">
            {t('auth.register')}
          </h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t('auth.registerButton')}
            </CardTitle>
            <p className="text-sm text-gray-600 text-center mt-2">
              {t('auth.verificationRequired')}
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

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('profile.personalInfo')}
              </h3>
              
              <Input
                label={t('profile.fullName')}
                type="text"
                value={formData.fullName}
                onChange={handleInputChange('fullName')}
                error={errors.fullName}
                required
                autoComplete="name"
                placeholder="Enter your full name"
              />

              <Input
                label={t('auth.email')}
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                error={errors.email}
                required
                autoComplete="email"
                placeholder="teacher@example.com"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('auth.password')}
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  error={errors.password}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                />

                <Input
                  label={t('auth.confirmPassword')}
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  error={errors.confirmPassword}
                  required
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            {/* Teaching Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('profile.teachingInfo')}
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.subjects')} <span className="text-red-500">*</span>
                </label>
                <select
                  multiple
                  value={formData.subjects}
                  onChange={handleMultiSelectChange('subjects')}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.subjects ? 'border-red-300' : 'border-gray-300'
                  }`}
                  size={4}
                  aria-describedby={errors.subjects ? 'subjects-error' : undefined}
                >
                  {SUBJECTS.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                {errors.subjects && (
                  <p id="subjects-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.subjects}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Hold Ctrl (Cmd on Mac) to select multiple subjects
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.gradeLevels')} <span className="text-red-500">*</span>
                </label>
                <select
                  multiple
                  value={formData.gradeLevels}
                  onChange={handleMultiSelectChange('gradeLevels')}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.gradeLevels ? 'border-red-300' : 'border-gray-300'
                  }`}
                  size={4}
                  aria-describedby={errors.gradeLevels ? 'grade-levels-error' : undefined}
                >
                  {GRADE_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                {errors.gradeLevels && (
                  <p id="grade-levels-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.gradeLevels}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Hold Ctrl (Cmd on Mac) to select multiple grade levels
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('profile.school')}
                  type="text"
                  value={formData.school}
                  onChange={handleInputChange('school')}
                  error={errors.school}
                  required
                  placeholder="School name"
                />

                <Input
                  label={t('profile.location')}
                  type="text"
                  value={formData.location}
                  onChange={handleInputChange('location')}
                  error={errors.location}
                  required
                  placeholder="District, Region"
                />
              </div>

              <Input
                label={t('profile.experience')}
                type="number"
                value={formData.yearsExperience}
                onChange={handleInputChange('yearsExperience')}
                error={errors.yearsExperience}
                required
                min="0"
                max="50"
                placeholder="Years of teaching experience"
              />
            </div>

            {/* Credential Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('auth.teachingCredentials')}
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Teaching Certificate <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 ${
                    errors.credentialFile ? 'border-red-300' : ''
                  }`}
                  aria-describedby={errors.credentialFile ? 'credential-error' : 'credential-help'}
                />
                {errors.credentialFile && (
                  <p id="credential-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.credentialFile}
                  </p>
                )}
                <p id="credential-help" className="mt-1 text-sm text-gray-500">
                  Upload your teaching certificate or diploma (PDF, JPG, PNG - Max 5MB)
                </p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={handleInputChange('agreeToTerms')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                aria-describedby={errors.agreeToTerms ? 'terms-error' : undefined}
              />
              <div className="ml-3">
                <label htmlFor="agree-terms" className="text-sm text-gray-900">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    className="text-primary-600 hover:text-primary-500 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy"
                    className="text-primary-600 hover:text-primary-500 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </label>
                {errors.agreeToTerms && (
                  <p id="terms-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.agreeToTerms}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isLoading}
              loadingText={t('common.loading')}
            >
              {t('auth.registerButton')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                to="/auth/login"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};