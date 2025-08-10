import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUser } from '../store/slices/authSlice';
import { profileService } from '../services/profileService';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  school: string;
  subjects: string[];
  gradeLevels: string[];
  yearsExperience: number;
  location: string;
  bio: string;
  profilePicture?: string;
}

interface Credential {
  id: string;
  type: 'teaching_certificate' | 'degree' | 'employment_letter' | 'other';
  title: string;
  institution: string;
  dateIssued: string;
  fileUrl: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const credentialFileRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize profile from Redux store
  const [profile, setProfile] = useState<ProfileData>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    school: user?.school || '',
    subjects: user?.subjects || [],
    gradeLevels: user?.gradeLevels || [],
    yearsExperience: user?.yearsExperience || 0,
    location: user?.location || '',
    bio: user?.bio || '',
    profilePicture: user?.profilePicture || ''
  });

  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile(prevProfile => ({
        fullName: user.fullName || prevProfile.fullName || '',
        email: user.email || prevProfile.email || '',
        phone: user.phone || prevProfile.phone || '',
        school: user.school || prevProfile.school || '',
        subjects: user.subjects || prevProfile.subjects || [],
        gradeLevels: user.gradeLevels || prevProfile.gradeLevels || [],
        yearsExperience: user.yearsExperience ?? prevProfile.yearsExperience ?? 0,
        location: user.location || prevProfile.location || '',
        bio: user.bio || prevProfile.bio || '',
        profilePicture: user.profilePicture || prevProfile.profilePicture || ''
      }));
    }
  }, [user]);

  const [credentials, setCredentials] = useState<Credential[]>([
    {
      id: '1',
      type: 'teaching_certificate',
      title: 'Primary Teaching Certificate',
      institution: 'Kyambogo University',
      dateIssued: '2016-06-15',
      fileUrl: '/documents/teaching-cert.pdf',
      verificationStatus: 'verified'
    },
    {
      id: '2',
      type: 'degree',
      title: 'Bachelor of Education (Primary)',
      institution: 'Makerere University',
      dateIssued: '2015-11-20',
      fileUrl: '/documents/degree.pdf',
      verificationStatus: 'verified'
    },
    {
      id: '3',
      type: 'employment_letter',
      title: 'Employment Letter - Kampala Primary School',
      institution: 'Kampala Primary School',
      dateIssued: '2023-01-10',
      fileUrl: '/documents/employment.pdf',
      verificationStatus: 'pending'
    }
  ]);

  const [newCredential, setNewCredential] = useState({
    type: 'teaching_certificate' as const,
    title: '',
    institution: '',
    dateIssued: '',
    file: null as File | null
  });

  const verificationStatus = user?.verificationStatus || 'pending';

  const handleSave = async () => {
    if (!user) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Prepare update data
      const updateData: any = {
        fullName: profile.fullName,
        email: profile.email,
        school: profile.school,
        subjects: profile.subjects,
        gradeLevels: profile.gradeLevels,
        yearsExperience: profile.yearsExperience,
        location: profile.location,
      };
      
      if (profile.bio) {
        updateData.bio = profile.bio;
      }
      
      if (profile.phone) {
        updateData.phone = profile.phone;
      }
      
      // Add profile image if changed (base64 to file conversion)
      if (profile.profilePicture && profile.profilePicture.startsWith('data:')) {
        const response = await fetch(profile.profilePicture);
        const blob = await response.blob();
        updateData.profileImage = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      }

      const updatedUser = await profileService.updateProfile(user.id, updateData);

      // Update Redux store with new user data
      dispatch(updateUser(updatedUser));
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({ ...prev, profilePicture: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !profile.subjects.includes(newSubject.trim())) {
      setProfile(prev => ({
        ...prev,
        subjects: [...prev.subjects, newSubject.trim()]
      }));
      setNewSubject('');
      setShowAddSubject(false);
    }
  };

  const handleRemoveSubject = (index: number) => {
    setProfile(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleAddGradeLevel = () => {
    if (newGradeLevel.trim() && !profile.gradeLevels.includes(newGradeLevel.trim())) {
      setProfile(prev => ({
        ...prev,
        gradeLevels: [...prev.gradeLevels, newGradeLevel.trim()]
      }));
      setNewGradeLevel('');
      setShowAddGrade(false);
    }
  };

  const handleRemoveGradeLevel = (index: number) => {
    setProfile(prev => ({
      ...prev,
      gradeLevels: prev.gradeLevels.filter((_, i) => i !== index)
    }));
  };

  const handleCredentialFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setNewCredential(prev => ({ ...prev, file }));
    }
  };

  const handleAddCredential = async () => {
    if (newCredential.title && newCredential.institution && newCredential.dateIssued && newCredential.file) {
      try {
        setIsUploading(true);
        // Upload file and create credential logic would go here
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        const credential: Credential = {
          id: Date.now().toString(),
          type: newCredential.type,
          title: newCredential.title,
          institution: newCredential.institution,
          dateIssued: newCredential.dateIssued,
          fileUrl: `/documents/${newCredential.file.name}`,
          verificationStatus: 'pending'
        };
        
        setCredentials(prev => [...prev, credential]);
        setNewCredential({
          type: 'teaching_certificate',
          title: '',
          institution: '',
          dateIssued: '',
          file: null
        });
        setShowAddCredential(false);
      } catch (error) {
        console.error('Failed to upload credential:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getVerificationBadge = (status: string) => {
    const badges = {
      verified: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {t(`user.${status}`)}
      </span>
    );
  };

  const getCredentialTypeLabel = (type: string) => {
    const types = {
      teaching_certificate: 'Teaching Certificate',
      degree: 'Academic Degree',
      employment_letter: 'Employment Letter',
      other: 'Other Document'
    };
    return types[type as keyof typeof types] || type;
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
          <Link to="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Ensure we have stable profile data before rendering
  if (!profile.fullName || !profile.email) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your teacher profile and credentials
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link to="/preferences">
            <Button variant="outline">
              {t('profile.preferences')}
            </Button>
          </Link>
          <Button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            loading={isUploading}
            loadingText="Saving..."
          >
            {isEditing ? t('common.save') : t('profile.editProfile')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <Card>
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.fullName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-600">
                    {profile.fullName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Change profile picture"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
            <h3 className="text-lg font-semibold text-gray-900">{profile.fullName}</h3>
            <p className="text-sm text-gray-600">{profile.school}</p>
            <div className="mt-2">
              {getVerificationBadge(verificationStatus)}
            </div>
          </div>
        </Card>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo')}</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('profile.fullName')}
                value={profile.fullName}
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                disabled={!isEditing}
                required
              />
              <Input
                label={t('auth.email')}
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                disabled={!isEditing}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label={t('profile.school')}
                value={profile.school}
                onChange={(e) => setProfile({...profile, school: e.target.value})}
                disabled={!isEditing}
                required
              />
              <div className="md:col-span-2">
                <Input
                  label={t('profile.location')}
                  value={profile.location}
                  onChange={(e) => setProfile({...profile, location: e.target.value})}
                  disabled={!isEditing}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('profile.bio')}
                </label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  disabled={!isEditing}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Tell other teachers about yourself, your teaching philosophy, and interests..."
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('profile.teachingInfo')}</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.subjects')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {subject}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveSubject(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none"
                          aria-label={`Remove ${subject}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && !showAddSubject && (
                    <button
                      onClick={() => setShowAddSubject(true)}
                      className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 text-sm rounded-full hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      + Add Subject
                    </button>
                  )}
                  {showAddSubject && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Subject name"
                        autoFocus
                      />
                      <button
                        onClick={handleAddSubject}
                        className="text-green-600 hover:text-green-800 focus:outline-none"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSubject(false);
                          setNewSubject('');
                        }}
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('profile.gradeLevels')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.gradeLevels.map((level, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {level}
                      {isEditing && (
                        <button
                          onClick={() => handleRemoveGradeLevel(index)}
                          className="ml-2 text-green-600 hover:text-green-800 focus:outline-none"
                          aria-label={`Remove ${level}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditing && !showAddGrade && (
                    <button
                      onClick={() => setShowAddGrade(true)}
                      className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 text-sm rounded-full hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      + Add Grade Level
                    </button>
                  )}
                  {showAddGrade && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newGradeLevel}
                        onChange={(e) => setNewGradeLevel(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddGradeLevel()}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Grade level"
                        autoFocus
                      />
                      <button
                        onClick={handleAddGradeLevel}
                        className="text-green-600 hover:text-green-800 focus:outline-none"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setShowAddGrade(false);
                          setNewGradeLevel('');
                        }}
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Input
                label={t('profile.experience')}
                type="number"
                value={profile.yearsExperience.toString()}
                onChange={(e) => setProfile({...profile, yearsExperience: parseInt(e.target.value) || 0})}
                disabled={!isEditing}
                min="0"
                max="50"
              />
            </div>
          </Card>

          {/* Credentials Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Teaching Credentials</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCredential(true)}
                >
                  Add Credential
                </Button>
              </div>
            </CardHeader>
            <div className="space-y-4">
              {credentials.map((credential) => (
                <div key={credential.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{credential.title}</h4>
                        {getVerificationBadge(credential.verificationStatus)}
                      </div>
                      <p className="text-sm text-gray-600">{credential.institution}</p>
                      <p className="text-sm text-gray-500">
                        {getCredentialTypeLabel(credential.type)} • Issued: {new Date(credential.dateIssued).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={credential.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {showAddCredential && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-4">Add New Credential</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credential Type
                      </label>
                      <select
                        value={newCredential.type}
                        onChange={(e) => setNewCredential(prev => ({ ...prev, type: e.target.value as any }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="teaching_certificate">Teaching Certificate</option>
                        <option value="degree">Academic Degree</option>
                        <option value="employment_letter">Employment Letter</option>
                        <option value="other">Other Document</option>
                      </select>
                    </div>
                    <Input
                      label="Document Title"
                      value={newCredential.title}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                    <Input
                      label="Issuing Institution"
                      value={newCredential.institution}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, institution: e.target.value }))}
                      required
                    />
                    <Input
                      label="Date Issued"
                      type="date"
                      value={newCredential.dateIssued}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, dateIssued: e.target.value }))}
                      required
                    />
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Document
                      </label>
                      <input
                        ref={credentialFileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleCredentialFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: PDF, JPG, PNG (max 5MB)
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddCredential(false);
                        setNewCredential({
                          type: 'teaching_certificate',
                          title: '',
                          institution: '',
                          dateIssued: '',
                          file: null
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddCredential}
                      loading={isUploading}
                      loadingText="Uploading..."
                    >
                      Add Credential
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">24</p>
                <p className="text-sm text-gray-600">Resources Shared</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">156</p>
                <p className="text-sm text-gray-600">Downloads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">3</p>
                <p className="text-sm text-gray-600">Communities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">4.8</p>
                <p className="text-sm text-gray-600">Rating</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};