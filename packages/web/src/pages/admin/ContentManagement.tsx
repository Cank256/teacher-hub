import React from 'react';
import { useTranslation } from 'react-i18next';

export const ContentManagement: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.content.title')}</h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">{t('admin.content.overview')}</h2>
        <p className="text-gray-600">
          {t('admin.content.description')}
        </p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Total Resources</h3>
            <p className="text-2xl font-bold text-purple-600">1,234</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="font-medium text-indigo-900">Published</h3>
            <p className="text-2xl font-bold text-indigo-600">987</p>
          </div>
          <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="font-medium text-pink-900">Pending Review</h3>
            <p className="text-2xl font-bold text-pink-600">45</p>
          </div>
        </div>
      </div>
    </div>
  );
};