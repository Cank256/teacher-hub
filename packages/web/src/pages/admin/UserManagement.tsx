import React from 'react';
import { useTranslation } from 'react-i18next';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.users.title')}</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.users.overview')}</h2>
        <p className="text-gray-600">
          {t('admin.users.description')}
        </p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Total Users</h3>
            <p className="text-2xl font-bold text-blue-600">2,543</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Active Users</h3>
            <p className="text-2xl font-bold text-green-600">1,892</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-900">Pending Verification</h3>
            <p className="text-2xl font-bold text-yellow-600">127</p>
          </div>
        </div>
      </div>
    </div>
  );
};