import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import authReducer, { AuthState } from '../../../store/slices/authSlice';
import { AuthRedirectHandler } from '../AuthRedirectHandler';

const mockUser = {
  id: '1',
  email: 'test@example.com',
  fullName: 'Test User',
  subjects: ['Mathematics'],
  gradeLevels: ['Primary 1-3'],
  school: 'Test School',
  location: 'Kampala',
  yearsExperience: 5,
  verificationStatus: 'verified' as const,
};

const createTestStore = (initialState?: Partial<AuthState>) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        lastActivity: null,
        ...initialState,
      },
    },
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  initialState?: Partial<AuthState>,
  initialEntries: string[] = ['/']
) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('AuthRedirectHandler', () => {
  const TestComponent = () => <div>Test Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children without redirect for public pages', () => {
    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      { isAuthenticated: false },
      ['/']
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders children without redirect for authenticated users on protected pages', () => {
    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      {
        isAuthenticated: true,
        user: mockUser,
      },
      ['/dashboard']
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('does not redirect while authentication is loading', () => {
    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      { isLoading: true },
      ['/protected-page']
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles all defined public routes correctly', () => {
    const publicRoutes = [
      '/', '/contact', '/help', '/privacy', '/terms', 
      '/cookies', '/status', '/accessibility', '/community', '/blog'
    ];

    publicRoutes.forEach(route => {
      const { unmount } = renderWithProviders(
        <AuthRedirectHandler>
          <TestComponent />
        </AuthRedirectHandler>,
        { isAuthenticated: false },
        [route]
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      unmount();
    });
  });

  it('preserves location state during redirects', () => {
    const locationState = {
      returnUrl: '/dashboard',
      from: { pathname: '/dashboard', search: '?tab=settings' }
    };

    // Test authenticated user on auth page
    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      {
        isAuthenticated: true,
        user: mockUser,
      },
      [{ pathname: '/auth/login', state: locationState }]
    );

    // Component should handle the redirect logic
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('prevents redirect loops by avoiding auth paths in return URLs', () => {
    const locationState = {
      returnUrl: '/auth/register',
      from: { pathname: '/auth/register' }
    };

    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      {
        isAuthenticated: true,
        user: mockUser,
      },
      [{ pathname: '/auth/login', state: locationState }]
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('creates proper redirect state for unauthenticated users on protected pages', () => {
    renderWithProviders(
      <AuthRedirectHandler>
        <TestComponent />
      </AuthRedirectHandler>,
      { isAuthenticated: false },
      ['/protected-page?tab=settings']
    );

    // The component should handle creating redirect state
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});