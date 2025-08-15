import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface NavigationItem {
  name: string;
  href: string;
  translationKey: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    translationKey: 'navigation.dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
      </svg>
    ),
  },
  {
    name: 'Posts',
    href: '/posts',
    translationKey: 'navigation.posts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
      </svg>
    ),
  },
  {
    name: 'Resources',
    href: '/resources',
    translationKey: 'navigation.resources',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Communities',
    href: '/communities',
    translationKey: 'navigation.communities',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    name: 'Messages',
    href: '/messages',
    translationKey: 'navigation.messages',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: 'Profile',
    href: '/profile',
    translationKey: 'navigation.profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

// Admin-only navigation items
const adminNavigationItems: NavigationItem[] = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    translationKey: 'navigation.admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    roles: ['admin', 'moderator'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isMobile, setIsMobile] = useState(false);

  // Check if current path is active
  const isActive = (href: string) => location.pathname === href;

  // Check if user has required role
  const hasRole = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    // For now, we'll assume all verified users can access admin features
    // In a real app, you'd check user.roles or similar
    return user?.verificationStatus === 'verified';
  };

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (isMobile && isOpen) {
      onToggle();
    }
  };

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isOpen) {
        onToggle();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobile, isOpen, onToggle]);

  // Filter navigation items based on user roles
  const allNavigationItems = [
    ...navigationItems,
    ...adminNavigationItems.filter(item => hasRole(item.roles)),
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:transition-none ${
          !isOpen && !isMobile ? 'md:w-16' : 'md:w-64'
        }`}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link
            to="/dashboard"
            className={`flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md ${
              !isOpen && !isMobile ? 'justify-center' : ''
            }`}
            onClick={handleLinkClick}
            aria-label="Teacher Hub - Go to dashboard"
          >
            <div className="flex-shrink-0 w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TH</span>
            </div>
            {(isOpen || isMobile) && (
              <span className="text-lg font-semibold text-gray-900">Teacher Hub</span>
            )}
          </Link>

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={t('navigation.closeSidebar')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" role="menu">
          {allNavigationItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                role="menuitem"
                onClick={handleLinkClick}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  active
                    ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } ${!isOpen && !isMobile ? 'justify-center px-3' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={!isOpen && !isMobile ? t(item.translationKey) : undefined}
              >
                <span
                  className={`flex-shrink-0 ${
                    active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  } ${!isOpen && !isMobile ? '' : 'mr-3'}`}
                >
                  {item.icon}
                </span>
                {(isOpen || isMobile) && (
                  <span className="truncate">{t(item.translationKey)}</span>
                )}
                {active && (isOpen || isMobile) && (
                  <span className="sr-only">{t('navigation.currentPage')}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info section */}
        {user && (isOpen || isMobile) && (
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {user.profilePicture ? (
                  <img
                    className="w-8 h-8 rounded-full"
                    src={user.profilePicture}
                    alt={user.fullName}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.verificationStatus === 'verified' && (
                    <span className="inline-flex items-center">
                      <svg className="w-3 h-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('user.verified')}
                    </span>
                  )}
                  {user.verificationStatus === 'pending' && (
                    <span className="text-yellow-600">{t('user.pending')}</span>
                  )}
                  {user.verificationStatus === 'rejected' && (
                    <span className="text-red-600">{t('user.rejected')}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle for desktop */}
        {!isMobile && (
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={onToggle}
              className={`w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                !isOpen ? 'justify-center' : ''
              }`}
              aria-label={isOpen ? t('navigation.collapseSidebar') : t('navigation.expandSidebar')}
              title={!isOpen ? (isOpen ? t('navigation.collapseSidebar') : t('navigation.expandSidebar')) : undefined}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${
                  !isOpen ? '' : 'mr-3'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {isOpen && <span>{t('navigation.collapse')}</span>}
            </button>
          </div>
        )}
      </div>
    </>
  );
};