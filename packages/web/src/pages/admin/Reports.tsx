import React from 'react';
import { useTranslation } from 'react-i18next';

export const Reports: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.reports.title')}</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.reports.overview')}</h2>
        <p className="text-gray-600">
          {t('admin.reports.description')}
        </p>
        
        <div className="mt-6 space-y-4">
          <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">User Activity Report</h3>
                <p className="text-sm text-gray-600">Weekly summary of user engagement</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800">Download</button>
            </div>
          </div>
          <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">Content Performance</h3>
                <p className="text-sm text-gray-600">Analysis of most popular resources</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800">Download</button>
            </div>
          </div>
          <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-900">System Health Report</h3>
                <p className="text-sm text-gray-600">Technical performance metrics</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800">Download</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};