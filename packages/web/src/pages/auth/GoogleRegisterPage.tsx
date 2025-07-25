import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { googleRegister, clearError } from '../../store/slices/authSlice';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';

interface GoogleRegisterFormData {
  subjects: string[];
  gradeLevels: string[];
  district: string;
  region: string;
  yearsExperience: string;
  credentialFiles: File[];
  bio: string;
  agreeToTerms: boolean;
}

interface GoogleRegisterFormErrors {
  subjects?: string;
  gradeLevels?: string;
  district?: string;
  region?: string;
  yearsExperience?: string;
  credentialFiles?: string;
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

const UGANDAN_REGIONS = [
  'Central',
  'Eastern',
  'Northern',
  'Western'
];

const DISTRICTS_BY_REGION: Record<string, string[]> = {
  'Central': ['Kampala', 'Wakiso', 'Mukono', 'Mpigi', 'Luwero', 'Nakasongola', 'Masaka', 'Rakai'],
  'Eastern': ['Jinja', 'Mbale', 'Soroti', 'Tororo', 'Busia', 'Iganga', 'Kamuli', 'Pallisa'],
  'Northern': ['Gulu', 'Lira', 'Arua', 'Kitgum', 'Pader', 'Apac', 'Nebbi', 'Yumbe'],
  'Western': ['Mbarara', 'Kasese', 'Kabale', 'Hoima', 'Masindi', 'Bundibugyo', 'Rukungiri', 'Ntungamo']
};

export const GoogleRegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const authCode = (location.state as any)?.authCode;
  const from = (location.state as any)?.from;

  const [formData, setFormData] = useState<GoogleRegisterFormData>({
    subjects: [],
    gradeLevels: [],
    district: '',
    region: '',
    yearsExperience: '',
    credentialFiles: [],
    bio: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<GoogleRegisterFormErrors>({});

  // Redirect if no auth code or already authenticated
  useEffect(() => {
    if (!authCode) {
      navigate('/auth/login', { replace: true });
      return;
    }

    if (isAuthenticated) {
      const redirectTo = from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [authCode, isAuthenticated, navigate, from]);

  // Clear Redux error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const validateForm = (): boolean => {
    const newErrors: GoogleRegisterFormErrors = {};

    if (formData.subjects.length === 0) {
      newErrors.subjects = t('errors.required');
    }

    if (formData.gradeLevels.length === 0) {
      newErrors.gradeLevels = t('errors.required');
    }

    if (!formData.region) {
      newErrors.region = t('errors.required');
    }

    if (!formData.district) {
      newErrors.district = t('errors.required');
    }

    if (!formData.yearsExperience) {
      newErrors.yearsExperience = t('errors.required');
    }

    if (formData.credentialFiles.length === 0) {
      newErrors.credentialFiles = t('errors.required');
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

    // Clear any previous errors
    setErrors({});
    dispatch(clearError());

    try {
      await dispatch(googleRegister({
        authCode,
        subjects: formData.subjects,
        gradeLevels: formData.gradeLevels,
        schoolLocation: {
          district: formData.district,
          region: formData.region
        },
        yearsExperience: parseInt(formData.yearsExperience),
        credentials: formData.credentialFiles,
        bio: formData.bio || undefined,
      })).unwrap();
      
      // Navigation will be handled by the useEffect hook
    } catch (error) {
      setErrors({
        general: error as string || t('errors.generic')
      });
    }
  };

  const handleInputChange = (field: keyof GoogleRegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = field === 'agreeToTerms' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field as keyof GoogleRegisterFormErrors]) {
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
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      credentialFiles: files
    }));
    
    // Clear file error
    if (errors.credentialFiles) {
      setErrors(prev => ({
        ...prev,
        credentialFiles: undefined
      }));
    }
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const region = e.target.value;
    setFormData(prev => ({
      ...prev,
      region,
      district: '' // Reset district when region changes
    }));
    
    // Clear region error
    if (errors.region) {
      setErrors(prev => ({
        ...prev,
        region: undefined
      }));
    }
  };

  const availableDistricts = formData.region ? DISTRICTS_BY_REGION[formData.region] || [] : [];

  if (!authCode) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Hub
          </h1>
          <h2 className="text-xl text-gray-600">
            Complete Your Profile
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Please provide additional information to complete your registration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Teaching Profile Information
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

            {/* Teaching Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Teaching Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subjects <span className="text-red-500">*</span>
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
                  Grade Levels <span className="text-red-500">*</span>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.region}
                    onChange={handleRegionChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.region ? 'border-red-300' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.region ? 'region-error' : undefined}
                  >
                    <option value="">Select Region</option>
                    {UGANDAN_REGIONS.map(region => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                  {errors.region && (
                    <p id="region-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.region}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.district}
                    onChange={handleInputChange('district')}
                    disabled={!formData.region}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.district ? 'border-red-300' : 'border-gray-300'
                    }`}
                    aria-describedby={errors.district ? 'district-error' : undefined}
                  >
                    <option value="">Select District</option>
                    {availableDistricts.map(district => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p id="district-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.district}
                    </p>
                  )}
                </div>
              </div>

              <Input
                label="Years of Teaching Experience"
                type="number"
                value={formData.yearsExperience}
                onChange={handleInputChange('yearsExperience')}
                error={errors.yearsExperience}
                required
                min="0"
                max="50"
                placeholder="Years of teaching experience"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio (Optional)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={handleInputChange('bio')}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell us about yourself and your teaching experience..."
                />
              </div>
            </div>

            {/* Credential Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Teaching Credentials
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Teaching Certificates <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 ${
                    errors.credentialFiles ? 'border-red-300' : ''
                  }`}
                  aria-describedby={errors.credentialFiles ? 'credential-error' : 'credential-help'}
                />
                {errors.credentialFiles && (
                  <p id="credential-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.credentialFiles}
                  </p>
                )}
                <p id="credential-help" className="mt-1 text-sm text-gray-500">
                  Upload your teaching certificates or diplomas (PDF, JPG, PNG - Max 5MB each)
                </p>
                {formData.credentialFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Selected files:</p>
                    <ul className="text-sm text-gray-500">
                      {formData.credentialFiles.map((file, index) => (
                        <li key={index}>• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  <a
                    href="/terms"
                    className="text-primary-600 hover:text-primary-500 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a
                    href="/privacy"
                    className="text-primary-600 hover:text-primary-500 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>
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
              loadingText="Completing Registration..."
            >
              Complete Registration
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};