import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CommunityPage: React.FC = () => {
  const { t } = useTranslation();

  const communityStats = [
    { label: t('communityPage.stats.teachers'), value: '5,000+' },
    { label: t('communityPage.stats.resources'), value: '15,000+' },
    { label: t('communityPage.stats.communities'), value: '200+' },
    { label: t('communityPage.stats.districts'), value: '50+' }
  ];

  const featuredCommunities = [
    {
      name: t('communityPage.featured.primaryEducation.name'),
      description: t('communityPage.featured.primaryEducation.description'),
      members: 1250,
      category: 'Grade Level'
    },
    {
      name: t('communityPage.featured.mathematics.name'),
      description: t('communityPage.featured.mathematics.description'),
      members: 890,
      category: 'Subject'
    },
    {
      name: t('communityPage.featured.kampala.name'),
      description: t('communityPage.featured.kampala.description'),
      members: 650,
      category: 'Regional'
    },
    {
      name: t('communityPage.featured.science.name'),
      description: t('communityPage.featured.science.description'),
      members: 720,
      category: 'Subject'
    }
  ];

  const communityGuidelines = [
    t('communityPage.guidelines.respectful'),
    t('communityPage.guidelines.educational'),
    t('communityPage.guidelines.constructive'),
    t('communityPage.guidelines.authentic'),
    t('communityPage.guidelines.supportive'),
    t('communityPage.guidelines.professional')
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('communityPage.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('communityPage.subtitle')}
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {communityStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-3xl font-bold text-primary-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Join Community CTA */}
        <div className="bg-primary-600 rounded-lg p-8 text-center text-white mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('communityPage.joinCta.title')}
          </h2>
          <p className="text-xl mb-6 text-primary-100">
            {t('communityPage.joinCta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/register"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            >
              {t('communityPage.joinCta.register')}
            </Link>
            <Link
              to="/auth/login"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            >
              {t('communityPage.joinCta.login')}
            </Link>
          </div>
        </div>

        {/* Featured Communities */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('communityPage.featured.title')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredCommunities.map((community, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {community.name}
                    </h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                      {community.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {community.members.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('communityPage.featured.members')}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  {community.description}
                </p>
                <Link
                  to="/auth/register"
                  className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  {t('communityPage.featured.joinCommunity')}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Community Benefits */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('communityPage.benefits.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('communityPage.benefits.shareResources.title')}
              </h3>
              <p className="text-gray-600">
                {t('communityPage.benefits.shareResources.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('communityPage.benefits.collaborate.title')}
              </h3>
              <p className="text-gray-600">
                {t('communityPage.benefits.collaborate.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('communityPage.benefits.grow.title')}
              </h3>
              <p className="text-gray-600">
                {t('communityPage.benefits.grow.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Community Guidelines */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            {t('communityPage.guidelines.title')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('communityPage.guidelines.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {communityGuidelines.map((guideline, index) => (
              <div key={index} className="flex items-start">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                  <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700">{guideline}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              <strong>{t('communityPage.guidelines.note.title')}</strong> {t('communityPage.guidelines.note.content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};