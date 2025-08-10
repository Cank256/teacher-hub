import React from 'react';
import { useTranslation } from 'react-i18next';

export const SystemSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.settings.title')}</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.settings.overview')}</h2>
        <p className="text-gray-600">
          {t('admin.settings.description')}
        </p>
        
        <div className="mt-6 space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900">System Configuration</h3>
            <p className="text-sm text-gray-600">Manage system-wide settings and configurations</p>
          </div>
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900">Security Settings</h3>
            <p className="text-sm text-gray-600">Configure authentication and security policies</p>
          </div>
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900">Email Configuration</h3>
            <p className="text-sm text-gray-600">Set up email templates and SMTP settings</p>
          </div>
        </div>
      </div>
    </div>
  );
};