import React from 'react';
import { useTranslation } from 'react-i18next';

export const AccessibilityPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('accessibilityPage.title')}
            </h1>
            <p className="text-xl text-gray-600">
              {t('accessibilityPage.subtitle')}
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* Our Commitment */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.commitment.title')}
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('accessibilityPage.commitment.content')}
              </p>
            </section>

            {/* Accessibility Features */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.features.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.features.keyboard.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.features.keyboard.navigation')}</li>
                <li>{t('accessibilityPage.features.keyboard.shortcuts')}</li>
                <li>{t('accessibilityPage.features.keyboard.focus')}</li>
                <li>{t('accessibilityPage.features.keyboard.skipLinks')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.features.visual.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.features.visual.contrast')}</li>
                <li>{t('accessibilityPage.features.visual.fontSize')}</li>
                <li>{t('accessibilityPage.features.visual.colorBlind')}</li>
                <li>{t('accessibilityPage.features.visual.reducedMotion')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.features.screenReader.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.features.screenReader.labels')}</li>
                <li>{t('accessibilityPage.features.screenReader.headings')}</li>
                <li>{t('accessibilityPage.features.screenReader.landmarks')}</li>
                <li>{t('accessibilityPage.features.screenReader.announcements')}</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.features.language.title')}
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.features.language.multilingual')}</li>
                <li>{t('accessibilityPage.features.language.localLanguage')}</li>
                <li>{t('accessibilityPage.features.language.culturalContext')}</li>
              </ul>
            </section>

            {/* Standards Compliance */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.standards.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.standards.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.standards.wcag')}</li>
                <li>{t('accessibilityPage.standards.section508')}</li>
                <li>{t('accessibilityPage.standards.aria')}</li>
                <li>{t('accessibilityPage.standards.html')}</li>
              </ul>
            </section>

            {/* How to Use Accessibility Features */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.howToUse.title')}
              </h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.howToUse.accessibilityPanel.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.howToUse.accessibilityPanel.content')}
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.howToUse.keyboardShortcuts.title')}
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <ul className="space-y-2 text-gray-700">
                  <li><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Tab</kbd> - {t('accessibilityPage.howToUse.keyboardShortcuts.tab')}</li>
                  <li><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Shift + Tab</kbd> - {t('accessibilityPage.howToUse.keyboardShortcuts.shiftTab')}</li>
                  <li><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Enter</kbd> - {t('accessibilityPage.howToUse.keyboardShortcuts.enter')}</li>
                  <li><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Space</kbd> - {t('accessibilityPage.howToUse.keyboardShortcuts.space')}</li>
                  <li><kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Escape</kbd> - {t('accessibilityPage.howToUse.keyboardShortcuts.escape')}</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {t('accessibilityPage.howToUse.screenReaders.title')}
              </h3>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.howToUse.screenReaders.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>{t('accessibilityPage.howToUse.screenReaders.nvda')}</li>
                <li>{t('accessibilityPage.howToUse.screenReaders.jaws')}</li>
                <li>{t('accessibilityPage.howToUse.screenReaders.voiceOver')}</li>
                <li>{t('accessibilityPage.howToUse.screenReaders.talkback')}</li>
              </ul>
            </section>

            {/* Known Issues */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.knownIssues.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.knownIssues.content')}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">
                  {t('accessibilityPage.knownIssues.note')}
                </p>
              </div>
            </section>

            {/* Feedback */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.feedback.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.feedback.content')}
              </p>
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="font-semibold text-primary-900 mb-2">
                  {t('accessibilityPage.feedback.contactTitle')}
                </h4>
                <p className="text-primary-800 mb-2">
                  Email: accessibility@teacherhub.ug
                </p>
                <p className="text-primary-800 mb-2">
                  Phone: +256 700 123 456
                </p>
                <p className="text-primary-800">
                  {t('accessibilityPage.feedback.responseTime')}
                </p>
              </div>
            </section>

            {/* Resources */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('accessibilityPage.resources.title')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('accessibilityPage.resources.content')}
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>
                  <a href="https://www.w3.org/WAI/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                    {t('accessibilityPage.resources.wai')}
                  </a>
                </li>
                <li>
                  <a href="https://webaim.org/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                    {t('accessibilityPage.resources.webaim')}
                  </a>
                </li>
                <li>
                  <a href="https://www.nvaccess.org/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                    {t('accessibilityPage.resources.nvda')}
                  </a>
                </li>
                <li>
                  <a href="https://support.apple.com/accessibility/" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                    {t('accessibilityPage.resources.appleAccessibility')}
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};