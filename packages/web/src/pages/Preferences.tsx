import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface NotificationSettings {
  email: {
    newMessages: boolean;
    communityUpdates: boolean;
    resourceShares: boolean;
    governmentContent: boolean;
    weeklyDigest: boolean;
    systemUpdates: boolean;
  };
  push: {
    newMessages: boolean;
    communityUpdates: boolean;
    resourceShares: boolean;
    governmentContent: boolean;
    systemUpdates: boolean;
  };
  inApp: {
    newMessages: boolean;
    communityUpdates: boolean;
    resourceShares: boolean;
    governmentContent: boolean;
    systemUpdates: boolean;
  };
}

interface PrivacySettings {
  profileVisibility: 'public' | 'teachers_only' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  allowDirectMessages: 'everyone' | 'connections_only' | 'none';
  showOnlineStatus: boolean;
  allowResourceDownloadTracking: boolean;
  shareUsageAnalytics: boolean;
}

interface AccountSettings {
  language: string;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  theme: 'light' | 'dark' | 'system';
}

export const Preferences: React.FC = () => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'account'>('notifications');

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      newMessages: true,
      communityUpdates: true,
      resourceShares: false,
      governmentContent: true,
      weeklyDigest: true,
      systemUpdates: true,
    },
    push: {
      newMessages: true,
      communityUpdates: false,
      resourceShares: false,
      governmentContent: true,
      systemUpdates: true,
    },
    inApp: {
      newMessages: true,
      communityUpdates: true,
      resourceShares: true,
      governmentContent: true,
      systemUpdates: true,
    },
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'teachers_only',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    allowDirectMessages: 'connections_only',
    showOnlineStatus: true,
    allowResourceDownloadTracking: true,
    shareUsageAnalytics: true,
  });

  const [account, setAccount] = useState<AccountSettings>({
    language: 'en',
    timezone: 'Africa/Kampala',
    dateFormat: 'DD/MM/YYYY',
    theme: 'system',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save preferences logic would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      // Show success message
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateNotificationSetting = (
    category: keyof NotificationSettings,
    setting: string,
    value: boolean
  ) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));
  };

  const updatePrivacySetting = (setting: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const updateAccountSetting = (setting: keyof AccountSettings, value: any) => {
    setAccount(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const TabButton: React.FC<{ 
    id: 'notifications' | 'privacy' | 'account'; 
    label: string; 
    icon: React.ReactNode;
  }> = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === id
          ? 'bg-primary-100 text-primary-700 border border-primary-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }> = ({ checked, onChange, label, description }) => (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-primary-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`toggle-${label.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.preferences')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your notification settings, privacy controls, and account preferences
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link to="/profile">
            <Button variant="outline">
              Back to Profile
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            loading={isSaving}
            loadingText="Saving..."
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            <TabButton
              id="notifications"
              label="Notifications"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h8V9H4v2z" />
                </svg>
              }
            />
            <TabButton
              id="privacy"
              label="Privacy & Security"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <TabButton
              id="account"
              label="Account Settings"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-200">
                  <ToggleSwitch
                    checked={notifications.email.newMessages}
                    onChange={(value) => updateNotificationSetting('email', 'newMessages', value)}
                    label="New Messages"
                    description="Get notified when you receive new direct messages"
                  />
                  <ToggleSwitch
                    checked={notifications.email.communityUpdates}
                    onChange={(value) => updateNotificationSetting('email', 'communityUpdates', value)}
                    label="Community Updates"
                    description="Receive updates from communities you've joined"
                  />
                  <ToggleSwitch
                    checked={notifications.email.resourceShares}
                    onChange={(value) => updateNotificationSetting('email', 'resourceShares', value)}
                    label="Resource Shares"
                    description="Get notified when someone shares a resource with you"
                  />
                  <ToggleSwitch
                    checked={notifications.email.governmentContent}
                    onChange={(value) => updateNotificationSetting('email', 'governmentContent', value)}
                    label="Government Content"
                    description="Receive notifications about new official government content"
                  />
                  <ToggleSwitch
                    checked={notifications.email.weeklyDigest}
                    onChange={(value) => updateNotificationSetting('email', 'weeklyDigest', value)}
                    label="Weekly Digest"
                    description="Get a weekly summary of platform activity and updates"
                  />
                  <ToggleSwitch
                    checked={notifications.email.systemUpdates}
                    onChange={(value) => updateNotificationSetting('email', 'systemUpdates', value)}
                    label="System Updates"
                    description="Important system announcements and maintenance notifications"
                  />
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Push Notifications</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-200">
                  <ToggleSwitch
                    checked={notifications.push.newMessages}
                    onChange={(value) => updateNotificationSetting('push', 'newMessages', value)}
                    label="New Messages"
                    description="Push notifications for new direct messages"
                  />
                  <ToggleSwitch
                    checked={notifications.push.communityUpdates}
                    onChange={(value) => updateNotificationSetting('push', 'communityUpdates', value)}
                    label="Community Updates"
                    description="Push notifications for community activity"
                  />
                  <ToggleSwitch
                    checked={notifications.push.resourceShares}
                    onChange={(value) => updateNotificationSetting('push', 'resourceShares', value)}
                    label="Resource Shares"
                    description="Push notifications when resources are shared with you"
                  />
                  <ToggleSwitch
                    checked={notifications.push.governmentContent}
                    onChange={(value) => updateNotificationSetting('push', 'governmentContent', value)}
                    label="Government Content"
                    description="Push notifications for new official content"
                  />
                  <ToggleSwitch
                    checked={notifications.push.systemUpdates}
                    onChange={(value) => updateNotificationSetting('push', 'systemUpdates', value)}
                    label="System Updates"
                    description="Push notifications for important system updates"
                  />
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>In-App Notifications</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-200">
                  <ToggleSwitch
                    checked={notifications.inApp.newMessages}
                    onChange={(value) => updateNotificationSetting('inApp', 'newMessages', value)}
                    label="New Messages"
                    description="Show in-app notifications for new messages"
                  />
                  <ToggleSwitch
                    checked={notifications.inApp.communityUpdates}
                    onChange={(value) => updateNotificationSetting('inApp', 'communityUpdates', value)}
                    label="Community Updates"
                    description="Show in-app notifications for community activity"
                  />
                  <ToggleSwitch
                    checked={notifications.inApp.resourceShares}
                    onChange={(value) => updateNotificationSetting('inApp', 'resourceShares', value)}
                    label="Resource Shares"
                    description="Show in-app notifications for resource shares"
                  />
                  <ToggleSwitch
                    checked={notifications.inApp.governmentContent}
                    onChange={(value) => updateNotificationSetting('inApp', 'governmentContent', value)}
                    label="Government Content"
                    description="Show in-app notifications for government content"
                  />
                  <ToggleSwitch
                    checked={notifications.inApp.systemUpdates}
                    onChange={(value) => updateNotificationSetting('inApp', 'systemUpdates', value)}
                    label="System Updates"
                    description="Show in-app notifications for system updates"
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Visibility</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Who can see your profile?
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'public', label: 'Everyone', description: 'Your profile is visible to all users' },
                        { value: 'teachers_only', label: 'Verified Teachers Only', description: 'Only verified teachers can see your profile' },
                        { value: 'private', label: 'Private', description: 'Only you can see your profile' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value={option.value}
                            checked={privacy.profileVisibility === option.value}
                            onChange={(e) => updatePrivacySetting('profileVisibility', e.target.value)}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-200">
                  <ToggleSwitch
                    checked={privacy.showEmail}
                    onChange={(value) => updatePrivacySetting('showEmail', value)}
                    label="Show Email Address"
                    description="Allow other teachers to see your email address"
                  />
                  <ToggleSwitch
                    checked={privacy.showPhone}
                    onChange={(value) => updatePrivacySetting('showPhone', value)}
                    label="Show Phone Number"
                    description="Allow other teachers to see your phone number"
                  />
                  <ToggleSwitch
                    checked={privacy.showLocation}
                    onChange={(value) => updatePrivacySetting('showLocation', value)}
                    label="Show Location"
                    description="Allow other teachers to see your location"
                  />
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Communication Settings</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Who can send you direct messages?
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'everyone', label: 'Everyone', description: 'All verified teachers can message you' },
                        { value: 'connections_only', label: 'Connections Only', description: 'Only teachers you\'ve connected with can message you' },
                        { value: 'none', label: 'No One', description: 'Disable direct messages completely' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="allowDirectMessages"
                            value={option.value}
                            checked={privacy.allowDirectMessages === option.value}
                            onChange={(e) => updatePrivacySetting('allowDirectMessages', e.target.value)}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <ToggleSwitch
                      checked={privacy.showOnlineStatus}
                      onChange={(value) => updatePrivacySetting('showOnlineStatus', value)}
                      label="Show Online Status"
                      description="Let other teachers see when you're online"
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Analytics</CardTitle>
                </CardHeader>
                <div className="divide-y divide-gray-200">
                  <ToggleSwitch
                    checked={privacy.allowResourceDownloadTracking}
                    onChange={(value) => updatePrivacySetting('allowResourceDownloadTracking', value)}
                    label="Resource Download Tracking"
                    description="Allow tracking of your resource downloads for recommendations"
                  />
                  <ToggleSwitch
                    checked={privacy.shareUsageAnalytics}
                    onChange={(value) => updatePrivacySetting('shareUsageAnalytics', value)}
                    label="Share Usage Analytics"
                    description="Help improve the platform by sharing anonymous usage data"
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language
                    </label>
                    <select
                      value={account.language}
                      onChange={(e) => updateAccountSetting('language', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="en">English</option>
                      <option value="lug">Luganda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={account.timezone}
                      onChange={(e) => updateAccountSetting('timezone', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Africa/Kampala">East Africa Time (UTC+3)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select
                      value={account.dateFormat}
                      onChange={(e) => updateAccountSetting('dateFormat', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Theme
                    </label>
                    <select
                      value={account.theme}
                      onChange={(e) => updateAccountSetting('theme', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Password</h4>
                      <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Enable 2FA
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Active Sessions</h4>
                      <p className="text-sm text-gray-500">Manage devices that are signed in to your account</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Sessions
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Download Your Data</h4>
                      <p className="text-sm text-gray-500">Get a copy of your profile, messages, and shared resources</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Request Download
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Delete Account</h4>
                      <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};