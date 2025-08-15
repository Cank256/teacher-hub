import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PrivacySettings {
  profileVisibility: 'public' | 'teachers_only' | 'private';
  showLocation: boolean;
  showExperience: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  allowSearchByEmail: boolean;
}

interface PrivacyControlsProps {
  onClose: () => void;
  onSave: (settings: PrivacySettings) => void;
}

export const PrivacyControls: React.FC<PrivacyControlsProps> = ({
  onClose,
  onSave
}) => {
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'teachers_only',
    showLocation: true,
    showExperience: true,
    allowDirectMessages: true,
    showOnlineStatus: true,
    allowSearchByEmail: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      setLoading(true);
      
      // Load from localStorage for now
      // In a real implementation, this would come from the user's profile API
      const savedSettings = localStorage.getItem('privacySettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof PrivacySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Save to localStorage for now
      // In a real implementation, this would save to the user's profile API
      localStorage.setItem('privacySettings', JSON.stringify(settings));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSave(settings);
      onClose();
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading privacy settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Privacy & Discovery Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Profile Visibility */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Visibility</h3>
              <p className="text-sm text-gray-600 mb-4">
                Control who can find and view your profile in search results.
              </p>
              
              <div className="space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="public"
                    checked={settings.profileVisibility === 'public'}
                    onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Public</div>
                    <div className="text-sm text-gray-600">
                      Anyone can find and view your profile, including non-teachers.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="teachers_only"
                    checked={settings.profileVisibility === 'teachers_only'}
                    onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Teachers Only (Recommended)</div>
                    <div className="text-sm text-gray-600">
                      Only verified teachers can find and view your profile.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="profileVisibility"
                    value="private"
                    checked={settings.profileVisibility === 'private'}
                    onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Private</div>
                    <div className="text-sm text-gray-600">
                      Your profile won't appear in search results. Others can only find you if you share your profile directly.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Profile Information Display */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Profile Information Display</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose what information is visible to others when they view your profile.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Show Location</div>
                    <div className="text-sm text-gray-600">
                      Display your school district and region in search results and profile.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showLocation}
                    onChange={(e) => handleSettingChange('showLocation', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Show Experience</div>
                    <div className="text-sm text-gray-600">
                      Display your years of teaching experience.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showExperience}
                    onChange={(e) => handleSettingChange('showExperience', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Show Online Status</div>
                    <div className="text-sm text-gray-600">
                      Let others see when you're online and active.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showOnlineStatus}
                    onChange={(e) => handleSettingChange('showOnlineStatus', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Communication Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Communication Settings</h3>
              <p className="text-sm text-gray-600 mb-4">
                Control how others can contact you.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Allow Direct Messages</div>
                    <div className="text-sm text-gray-600">
                      Let other teachers send you direct messages.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowDirectMessages}
                    onChange={(e) => handleSettingChange('allowDirectMessages', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Allow Search by Email</div>
                    <div className="text-sm text-gray-600">
                      Let others find you by searching for your email address.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowSearchByEmail}
                    onChange={(e) => handleSettingChange('allowSearchByEmail', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Privacy Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Privacy Tips</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• We recommend "Teachers Only" visibility for the best balance of discoverability and privacy.</li>
                    <li>• Your email address is never displayed publicly, regardless of these settings.</li>
                    <li>• You can always change these settings later from your profile preferences.</li>
                    <li>• Blocking or reporting inappropriate users is always available regardless of these settings.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};