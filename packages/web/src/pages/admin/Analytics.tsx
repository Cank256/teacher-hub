import React from 'react';
import { useTranslation } from 'react-i18next';

export const Analytics: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.analytics.title')}</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.analytics.overview')}</h2>
        <p className="text-gray-600">
          {t('admin.analytics.description')}
        </p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Page Views</h3>
            <p className="text-2xl font-bold text-blue-600">45,231</p>
            <p className="text-sm text-blue-600">+12% from last month</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Unique Visitors</h3>
            <p className="text-2xl font-bold text-green-600">12,543</p>
            <p className="text-sm text-green-600">+8% from last month</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-900">Bounce Rate</h3>
            <p className="text-2xl font-bold text-yellow-600">23.4%</p>
            <p className="text-sm text-yellow-600">-3% from last month</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Avg. Session</h3>
            <p className="text-2xl font-bold text-purple-600">4m 32s</p>
            <p className="text-sm text-purple-600">+15% from last month</p>
          </div>
        </div>
      </div>
    </div>
  );
};