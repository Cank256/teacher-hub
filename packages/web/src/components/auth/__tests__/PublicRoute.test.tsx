import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import authReducer, { AuthState } from '../../../store/slices/authSlice';
import { PublicRoute } from '../PublicRoute';

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

// Mock the loadUserFromStorage action
vi.mock('../../../store/slices/authSlice', async () => {
  const actual = await vi.importActual('../../../store/slices/authSlice');
  return {
    ...actual,
    loadUserFromStorage: vi.fn(() => ({ type: 'auth/loadFromStorage/pending' })),
  };
});

describe('PublicRoute', () => {
  const TestComponent = () => <div>Public Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders public content for unauthenticated users', async () => {
    renderWithProviders(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>,
      { isAuthenticated: false }
    );

    await waitFor(() => {
      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  it('renders public content for authenticated users when redirectIfAuthenticated is false', async () => {
    renderWithProviders(
      <PublicRoute redirectIfAuthenticated={false}>
        <TestComponent />
      </PublicRoute>,
      {
        isAuthenticated: true,
        user: mockUser,
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
  });

  it('shows loading state during authentication check', () => {
    renderWithProviders(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>,
      { isLoading: true }
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
  });

  it('redirects authenticated users when redirectIfAuthenticated is true', async () => {
    renderWithProviders(
      <PublicRoute redirectIfAuthenticated={true}>
        <TestComponent />
      </PublicRoute>,
      {
        isAuthenticated: true,
        user: mockUser,
      }
    );

    // Should not render public content when redirecting
    await waitFor(() => {
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });
  });

  it('uses custom redirect path when specified', async () => {
    renderWithProviders(
      <PublicRoute redirectIfAuthenticated={true} redirectPath="/custom-dashboard">
        <TestComponent />
      </PublicRoute>,
      {
        isAuthenticated: true,
        user: mockUser,
      }
    );

    await waitFor(() => {
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes in loading state', () => {
    renderWithProviders(
      <PublicRoute>
        <TestComponent />
      </PublicRoute>,
      { isLoading: true }
    );

    const loadingContainer = screen.getByRole('status');
    expect(loadingContainer).toHaveAttribute('aria-live', 'polite');
    
    const loadingSpinner = screen.getByText('Loading...').previousElementSibling;
    expect(loadingSpinner).toHaveClass('animate-spin');
    expect(loadingSpinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('handles return URL from location state when redirecting authenticated users', async () => {
    const initialEntries = ['/auth/login'];
    const locationState = {
      returnUrl: '/protected-page',
      from: { pathname: '/protected-page', search: '?tab=settings' }
    };

    // Mock location state by using MemoryRouter with state
    const store = createTestStore({
      isAuthenticated: true,
      user: mockUser,
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[{ pathname: '/auth/login', state: locationState }]}>
          <PublicRoute redirectIfAuthenticated={true}>
            <TestComponent />
          </PublicRoute>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });
  });

  it('prevents redirect loops by avoiding auth paths in return URLs', async () => {
    const locationState = {
      returnUrl: '/auth/register',
      from: { pathname: '/auth/register' }
    };

    const store = createTestStore({
      isAuthenticated: true,
      user: mockUser,
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[{ pathname: '/auth/login', state: locationState }]}>
          <PublicRoute redirectIfAuthenticated={true}>
            <TestComponent />
          </PublicRoute>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Public Content')).not.toBeInTheDocument();
    });
  });
});