import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const PublicFooter: React.FC = () => {
  const { t } = useTranslation();

  const footerLinks = {
    platform: [
      { name: t('footer.platform.about'), href: '/about' },
      { name: t('footer.platform.features'), href: '/#features' },
      { name: t('footer.platform.pricing'), href: '/pricing' },
      { name: t('footer.platform.blog'), href: '/blog' }
    ],
    support: [
      { name: t('footer.support.help'), href: '/help' },
      { name: t('footer.support.contact'), href: '/contact' },
      { name: t('footer.support.community'), href: '/community' },
      { name: t('footer.support.status'), href: '/status' }
    ],
    legal: [
      { name: t('footer.legal.privacy'), href: '/privacy' },
      { name: t('footer.legal.terms'), href: '/terms' },
      { name: t('footer.legal.cookies'), href: '/cookies' },
      { name: t('footer.legal.accessibility'), href: '/accessibility' }
    ],
    connect: [
      { name: 'Facebook', href: 'https://facebook.com/teacherhubug', external: true },
      { name: 'Twitter', href: 'https://twitter.com/teacherhubug', external: true },
      { name: 'LinkedIn', href: 'https://linkedin.com/company/teacherhubug', external: true },
      { name: 'YouTube', href: 'https://youtube.com/teacherhubug', external: true }
    ]
  };

  return (
    <footer className="bg-gray-900 text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand and description */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Teacher Hub</h2>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            
            {/* Contact info */}
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>support@teacherhub.ug</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+256 700 123 456</span>
              </div>
              <div className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Plot 123, Education Street<br />Kampala, Uganda</span>
              </div>
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.platform.title')}</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.support.title')}</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.legal.title')}</h3>
            <ul className="space-y-2 mb-6">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social links */}
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('footer.connect.title')}</h4>
              <div className="flex space-x-3">
                {footerLinks.connect.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
                    aria-label={`Follow us on ${link.name}`}
                  >
                    {link.name === 'Facebook' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    )}
                    {link.name === 'Twitter' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    )}
                    {link.name === 'LinkedIn' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" clipRule="evenodd" />
                      </svg>
                    )}
                    {link.name === 'YouTube' && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              <p>&copy; {new Date().getFullYear()} Teacher Hub Uganda. {t('footer.copyright')}</p>
            </div>
            
            {/* Government partnerships */}
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>{t('footer.partnerships')}</span>
              <div className="flex items-center space-x-4">
                <span className="px-2 py-1 bg-gray-800 rounded text-xs">MOE</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs">UNEB</span>
                <span className="px-2 py-1 bg-gray-800 rounded text-xs">NCDC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};