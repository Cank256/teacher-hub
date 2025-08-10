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
}

const adminNavigationItems: NavigationItem[] = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    translationKey: 'admin.navigation.dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'User Management',
    href: '/admin/users',
    translationKey: 'admin.navigation.users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
  },
  {
    name: 'Content Management',
    href: '/admin/content',
    translationKey: 'admin.navigation.content',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'System Settings',
    href: '/admin/settings',
    translationKey: 'admin.navigation.settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    translationKey: 'admin.navigation.analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    translationKey: 'admin.navigation.reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onToggle }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isMobile, setIsMobile] = useState(false);

  // Check if current path is active
  const isActive = (href: string) => location.pathname === href;

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-red-900 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:transition-none ${
          !isOpen && !isMobile ? 'md:w-16' : 'md:w-64'
        }`}
        role="navigation"
        aria-label="Admin sidebar navigation"
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-red-800">
          <div className={`flex items-center space-x-3 ${!isOpen && !isMobile ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            {(isOpen || isMobile) && (
              <span className="text-lg font-semibold text-white">{t('admin.title')}</span>
            )}
          </div>

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md text-red-300 hover:text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label={t('navigation.closeSidebar')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Exit Admin Mode Button */}
        <div className="px-2 py-4 border-b border-red-800">
          <Link
            to="/dashboard"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-900 text-red-200 hover:bg-red-800 hover:text-white ${
              !isOpen && !isMobile ? 'justify-center px-3' : ''
            }`}
            onClick={handleLinkClick}
            title={!isOpen && !isMobile ? t('admin.exitMode') : undefined}
          >
            <span className="flex-shrink-0 text-red-300 group-hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </span>
            {(isOpen || isMobile) && (
              <span className="ml-3">{t('admin.exitMode')}</span>
            )}
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" role="menu">
          {adminNavigationItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                role="menuitem"
                onClick={handleLinkClick}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-900 ${
                  active
                    ? 'bg-red-800 text-white border-r-2 border-red-400'
                    : 'text-red-200 hover:bg-red-800 hover:text-white'
                } ${!isOpen && !isMobile ? 'justify-center px-3' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={!isOpen && !isMobile ? t(item.translationKey) : undefined}
              >
                <span
                  className={`flex-shrink-0 ${
                    active ? 'text-white' : 'text-red-300 group-hover:text-white'
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
          <div className="border-t border-red-800 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {user.profilePicture ? (
                  <img
                    className="w-8 h-8 rounded-full"
                    src={user.profilePicture}
                    alt={user.fullName}
                  />
                ) : (
                  <div className="w-8 h-8 bg-red-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-red-200 truncate">
                  {t('admin.role')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse toggle for desktop */}
        {!isMobile && (
          <div className="border-t border-red-800 p-2">
            <button
              onClick={onToggle}
              className={`w-full flex items-center px-2 py-2 text-sm font-medium text-red-200 rounded-md hover:bg-red-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-900 transition-colors ${
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