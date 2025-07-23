import React from 'react';
import { useTranslation } from 'react-i18next';

export const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('terms.title')}
            </h1>
            <p className="text-gray-600">
              {t('terms.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.introduction.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('terms.introduction.content')}
              </p>
            </section>

            {/* Acceptance of Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.acceptance.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('terms.acceptance.content')}
              </p>
            </section>

            {/* Eligibility */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.eligibility.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.eligibility.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.eligibility.age')}</li>
                <li>{t('terms.eligibility.teacher')}</li>
                <li>{t('terms.eligibility.credentials')}</li>
                <li>{t('terms.eligibility.compliance')}</li>
              </ul>
            </section>

            {/* Account Registration */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.registration.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.registration.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.registration.accurate')}</li>
                <li>{t('terms.registration.secure')}</li>
                <li>{t('terms.registration.responsible')}</li>
                <li>{t('terms.registration.notify')}</li>
              </ul>
            </section>

            {/* Platform Use */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.platformUse.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('terms.platformUse.permitted.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.platformUse.permitted.educational')}</li>
                <li>{t('terms.platformUse.permitted.collaboration')}</li>
                <li>{t('terms.platformUse.permitted.sharing')}</li>
                <li>{t('terms.platformUse.permitted.communication')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('terms.platformUse.prohibited.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.platformUse.prohibited.illegal')}</li>
                <li>{t('terms.platformUse.prohibited.harmful')}</li>
                <li>{t('terms.platformUse.prohibited.spam')}</li>
                <li>{t('terms.platformUse.prohibited.impersonation')}</li>
                <li>{t('terms.platformUse.prohibited.copyright')}</li>
                <li>{t('terms.platformUse.prohibited.malware')}</li>
                <li>{t('terms.platformUse.prohibited.interference')}</li>
              </ul>
            </section>

            {/* Content and Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.content.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('terms.content.userContent.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('terms.content.userContent.ownership')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('terms.content.userContent.license')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('terms.content.platformContent.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('terms.content.platformContent.ownership')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('terms.content.governmentContent.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('terms.content.governmentContent.ownership')}
              </p>
            </section>

            {/* Content Moderation */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.moderation.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.moderation.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.moderation.review')}</li>
                <li>{t('terms.moderation.remove')}</li>
                <li>{t('terms.moderation.suspend')}</li>
                <li>{t('terms.moderation.report')}</li>
              </ul>
            </section>

            {/* Privacy and Data Protection */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.privacy.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.privacy.content')}
              </p>
            </section>

            {/* Disclaimers */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.disclaimers.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.disclaimers.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.disclaimers.availability')}</li>
                <li>{t('terms.disclaimers.accuracy')}</li>
                <li>{t('terms.disclaimers.thirdParty')}</li>
                <li>{t('terms.disclaimers.educational')}</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.liability.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.liability.content')}
              </p>
            </section>

            {/* Indemnification */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.indemnification.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.indemnification.content')}
              </p>
            </section>

            {/* Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.termination.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.termination.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('terms.termination.violation')}</li>
                <li>{t('terms.termination.request')}</li>
                <li>{t('terms.termination.inactive')}</li>
                <li>{t('terms.termination.legal')}</li>
              </ul>
            </section>

            {/* Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.governingLaw.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.governingLaw.content')}
              </p>
            </section>

            {/* Changes to Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.changes.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.changes.content')}
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('terms.contact.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('terms.contact.content')}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Teacher Hub Uganda</strong><br />
                  Email: legal@teacherhub.ug<br />
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