import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'getting-started', name: t('help.categories.gettingStarted') },
    { id: 'account', name: t('help.categories.account') },
    { id: 'resources', name: t('help.categories.resources') },
    { id: 'communities', name: t('help.categories.communities') },
    { id: 'technical', name: t('help.categories.technical') },
    { id: 'mobile', name: t('help.categories.mobile') }
  ];

  const faqs: FAQItem[] = [
    // Getting Started
    {
      id: 'what-is-teacher-hub',
      question: t('help.faqs.whatIsTeacherHub.question'),
      answer: t('help.faqs.whatIsTeacherHub.answer'),
      category: 'getting-started'
    },
    {
      id: 'how-to-register',
      question: t('help.faqs.howToRegister.question'),
      answer: t('help.faqs.howToRegister.answer'),
      category: 'getting-started'
    },
    {
      id: 'credential-verification',
      question: t('help.faqs.credentialVerification.question'),
      answer: t('help.faqs.credentialVerification.answer'),
      category: 'getting-started'
    },
    
    // Account
    {
      id: 'forgot-password',
      question: t('help.faqs.forgotPassword.question'),
      answer: t('help.faqs.forgotPassword.answer'),
      category: 'account'
    },
    {
      id: 'update-profile',
      question: t('help.faqs.updateProfile.question'),
      answer: t('help.faqs.updateProfile.answer'),
      category: 'account'
    },
    {
      id: 'privacy-settings',
      question: t('help.faqs.privacySettings.question'),
      answer: t('help.faqs.privacySettings.answer'),
      category: 'account'
    },
    
    // Resources
    {
      id: 'upload-resources',
      question: t('help.faqs.uploadResources.question'),
      answer: t('help.faqs.uploadResources.answer'),
      category: 'resources'
    },
    {
      id: 'download-offline',
      question: t('help.faqs.downloadOffline.question'),
      answer: t('help.faqs.downloadOffline.answer'),
      category: 'resources'
    },
    {
      id: 'government-content',
      question: t('help.faqs.governmentContent.question'),
      answer: t('help.faqs.governmentContent.answer'),
      category: 'resources'
    },
    
    // Communities
    {
      id: 'join-communities',
      question: t('help.faqs.joinCommunities.question'),
      answer: t('help.faqs.joinCommunities.answer'),
      category: 'communities'
    },
    {
      id: 'create-community',
      question: t('help.faqs.createCommunity.question'),
      answer: t('help.faqs.createCommunity.answer'),
      category: 'communities'
    },
    
    // Technical
    {
      id: 'offline-access',
      question: t('help.faqs.offlineAccess.question'),
      answer: t('help.faqs.offlineAccess.answer'),
      category: 'technical'
    },
    {
      id: 'sync-issues',
      question: t('help.faqs.syncIssues.question'),
      answer: t('help.faqs.syncIssues.answer'),
      category: 'technical'
    },
    
    // Mobile
    {
      id: 'mobile-app',
      question: t('help.faqs.mobileApp.question'),
      answer: t('help.faqs.mobileApp.answer'),
      category: 'mobile'
    },
    {
      id: 'install-pwa',
      question: t('help.faqs.installPWA.question'),
      answer: t('help.faqs.installPWA.answer'),
      category: 'mobile'
    }
  ];

  const filteredFAQs = faqs.filter(faq => 
    faq.category === activeCategory &&
    (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
     faq.answer.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('help.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('help.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t('help.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('help.categories.title')}
              </h2>
              <nav className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      activeCategory === category.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {categories.find(cat => cat.id === activeCategory)?.name}
                </h2>
                <p className="text-gray-600 mt-1">
                  {t('help.faqCount', { count: filteredFAQs.length })}
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredFAQs.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V7a2 2 0 01-2 2H9a2 2 0 01-2-2V6.306" />
                    </svg>
                    <p className="text-gray-500">
                      {searchTerm ? t('help.noSearchResults') : t('help.noFAQs')}
                    </p>
                  </div>
                ) : (
                  filteredFAQs.map((faq) => (
                    <div key={faq.id} className="p-6">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full text-left flex justify-between items-start focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
                      >
                        <h3 className="text-lg font-medium text-gray-900 pr-4">
                          {faq.question}
                        </h3>
                        <div className="flex-shrink-0">
                          <svg
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              expandedFAQ === faq.id ? 'transform rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <div className="mt-4 text-gray-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 bg-primary-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('help.quickLinks.title')}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <a
                  href="/contact"
                  className="flex items-center p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t('help.quickLinks.contact')}</div>
                    <div className="text-sm text-gray-600">{t('help.quickLinks.contactDesc')}</div>
                  </div>
                </a>

                <a
                  href="/auth/register"
                  className="flex items-center p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{t('help.quickLinks.register')}</div>
                    <div className="text-sm text-gray-600">{t('help.quickLinks.registerDesc')}</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};