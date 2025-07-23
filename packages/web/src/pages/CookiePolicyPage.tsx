import React from 'react';
import { useTranslation } from 'react-i18next';

export const CookiePolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('cookies.title')}
            </h1>
            <p className="text-gray-600">
              {t('cookies.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.introduction.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('cookies.introduction.content')}
              </p>
            </section>

            {/* What are Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.whatAreCookies.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('cookies.whatAreCookies.content')}
              </p>
            </section>

            {/* Types of Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.typesOfCookies.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('cookies.typesOfCookies.essential.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('cookies.typesOfCookies.essential.description')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('cookies.typesOfCookies.essential.authentication')}</li>
                <li>{t('cookies.typesOfCookies.essential.security')}</li>
                <li>{t('cookies.typesOfCookies.essential.preferences')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('cookies.typesOfCookies.functional.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('cookies.typesOfCookies.functional.description')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('cookies.typesOfCookies.functional.language')}</li>
                <li>{t('cookies.typesOfCookies.functional.accessibility')}</li>
                <li>{t('cookies.typesOfCookies.functional.layout')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('cookies.typesOfCookies.analytics.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('cookies.typesOfCookies.analytics.description')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('cookies.typesOfCookies.analytics.usage')}</li>
                <li>{t('cookies.typesOfCookies.analytics.performance')}</li>
                <li>{t('cookies.typesOfCookies.analytics.errors')}</li>
              </ul>
            </section>

            {/* Managing Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.managingCookies.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('cookies.managingCookies.content')}
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('cookies.managingCookies.browserSettings.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('cookies.managingCookies.browserSettings.chrome')}</li>
                <li>{t('cookies.managingCookies.browserSettings.firefox')}</li>
                <li>{t('cookies.managingCookies.browserSettings.safari')}</li>
                <li>{t('cookies.managingCookies.browserSettings.edge')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('cookies.managingCookies.platformSettings.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('cookies.managingCookies.platformSettings.content')}
              </p>
            </section>

            {/* Third-party Cookies */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.thirdParty.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('cookies.thirdParty.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('cookies.thirdParty.analytics')}</li>
                <li>{t('cookies.thirdParty.social')}</li>
                <li>{t('cookies.thirdParty.cdn')}</li>
              </ul>
            </section>

            {/* Updates */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.updates.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('cookies.updates.content')}
              </p>
            </section>

            {/* Contact */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('cookies.contact.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('cookies.contact.content')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Teacher Hub Uganda</strong><br />
                  Email: privacy@teacherhub.ug<br />
                  Phone: +256 700 123 456<br />
                  Address: Plot 123, Education Street, Kampala, Uganda
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};