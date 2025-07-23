import React from 'react';
import { useTranslation } from 'react-i18next';

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('privacy.title')}
            </h1>
            <p className="text-gray-600">
              {t('privacy.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.introduction.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacy.introduction.content')}
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.informationCollected.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationCollected.personalInfo.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.informationCollected.personalInfo.name')}</li>
                <li>{t('privacy.informationCollected.personalInfo.email')}</li>
                <li>{t('privacy.informationCollected.personalInfo.phone')}</li>
                <li>{t('privacy.informationCollected.personalInfo.school')}</li>
                <li>{t('privacy.informationCollected.personalInfo.subjects')}</li>
                <li>{t('privacy.informationCollected.personalInfo.credentials')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationCollected.usageData.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.informationCollected.usageData.activity')}</li>
                <li>{t('privacy.informationCollected.usageData.device')}</li>
                <li>{t('privacy.informationCollected.usageData.location')}</li>
                <li>{t('privacy.informationCollected.usageData.preferences')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationCollected.content.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.informationCollected.content.resources')}</li>
                <li>{t('privacy.informationCollected.content.messages')}</li>
                <li>{t('privacy.informationCollected.content.comments')}</li>
                <li>{t('privacy.informationCollected.content.ratings')}</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.howWeUse.title')}
              </h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.howWeUse.provideServices')}</li>
                <li>{t('privacy.howWeUse.verifyCredentials')}</li>
                <li>{t('privacy.howWeUse.personalizeContent')}</li>
                <li>{t('privacy.howWeUse.facilitateCommunication')}</li>
                <li>{t('privacy.howWeUse.improveServices')}</li>
                <li>{t('privacy.howWeUse.sendNotifications')}</li>
                <li>{t('privacy.howWeUse.ensureSecurity')}</li>
                <li>{t('privacy.howWeUse.complyLegal')}</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.informationSharing.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationSharing.withUsers.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('privacy.informationSharing.withUsers.content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationSharing.withGovernment.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('privacy.informationSharing.withGovernment.content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationSharing.withServiceProviders.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('privacy.informationSharing.withServiceProviders.content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('privacy.informationSharing.legalRequirements.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('privacy.informationSharing.legalRequirements.content')}
              </p>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.dataSecurity.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.dataSecurity.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.dataSecurity.encryption')}</li>
                <li>{t('privacy.dataSecurity.accessControls')}</li>
                <li>{t('privacy.dataSecurity.regularAudits')}</li>
                <li>{t('privacy.dataSecurity.secureStorage')}</li>
                <li>{t('privacy.dataSecurity.staffTraining')}</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.yourRights.title')}
              </h2>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.yourRights.access')}</li>
                <li>{t('privacy.yourRights.correction')}</li>
                <li>{t('privacy.yourRights.deletion')}</li>
                <li>{t('privacy.yourRights.portability')}</li>
                <li>{t('privacy.yourRights.restriction')}</li>
                <li>{t('privacy.yourRights.objection')}</li>
                <li>{t('privacy.yourRights.withdraw')}</li>
              </ul>
              <p className="text-gray-700 mb-4">
                {t('privacy.yourRights.exerciseRights')}
              </p>
            </section>

            {/* Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.dataRetention.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.dataRetention.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('privacy.dataRetention.accountData')}</li>
                <li>{t('privacy.dataRetention.contentData')}</li>
                <li>{t('privacy.dataRetention.usageData')}</li>
                <li>{t('privacy.dataRetention.legalRequirements')}</li>
              </ul>
            </section>

            {/* International Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.internationalTransfers.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.internationalTransfers.content')}
              </p>
            </section>

            {/* Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.childrensPrivacy.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.childrensPrivacy.content')}
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.changes.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.changes.content')}
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('privacy.contact.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('privacy.contact.content')}
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