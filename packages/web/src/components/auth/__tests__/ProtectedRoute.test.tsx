import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import authReducer, { AuthState } from '../../../store/slices/authSlice';
import { ProtectedRoute } from '../ProtectedRoute';

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

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders enhanced loading state when authentication is loading', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { isLoading: true }
    );

    expect(screen.getByText('Verifying Authentication')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we verify your login status...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { isAuthenticated: false }
    );

    // Should not render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: mockUser,
      }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows verification required message when requireVerification is true and user is not verified', () => {
    const unverifiedUser = {
      ...mockUser,
      verificationStatus: 'pending' as const,
    };

    renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: unverifiedUser,
      }
    );

    expect(screen.getByText('Account Verification Required')).toBeInTheDocument();
    expect(screen.getByText(/your teaching credentials are currently being verified/i)).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when requireVerification is true and user is verified', () => {
    renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: mockUser,
      }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Account Verification Required')).not.toBeInTheDocument();
  });

  it('shows verification required message for rejected verification status', () => {
    const rejectedUser = {
      ...mockUser,
      verificationStatus: 'rejected' as const,
    };

    renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: rejectedUser,
      }
    );

    expect(screen.getByText('Account Verification Required')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('does not require verification when requireVerification is false', () => {
    const unverifiedUser = {
      ...mockUser,
      verificationStatus: 'pending' as const,
    };

    renderWithProviders(
      <ProtectedRoute requireVerification={false}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: unverifiedUser,
      }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Account Verification Required')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes in loading state', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      { isLoading: true }
    );

    const loadingContainer = screen.getByRole('status');
    expect(loadingContainer).toHaveAttribute('aria-live', 'polite');
    
    const loadingSpinner = screen.getByText('Verifying Authentication').previousElementSibling;
    expect(loadingSpinner).toHaveClass('animate-spin');
    expect(loadingSpinner).toHaveAttribute('aria-hidden', 'true');
  });

  it('has proper accessibility attributes in verification required state', () => {
    const unverifiedUser = {
      ...mockUser,
      verificationStatus: 'pending' as const,
    };

    renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: unverifiedUser,
      }
    );

    const alertContainer = screen.getByRole('alert');
    expect(alertContainer).toBeInTheDocument();
    
    const heading = screen.getByRole('heading', { name: /account verification required/i });
    expect(heading).toBeInTheDocument();
    
    const icon = screen.getByRole('img', { hidden: true });
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports custom fallback path for unauthenticated users', () => {
    renderWithProviders(
      <ProtectedRoute fallbackPath="/custom-login">
        <TestComponent />
      </ProtectedRoute>,
      { isAuthenticated: false }
    );

    // Should not render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows resubmit button for rejected verification status', () => {
    const rejectedUser = {
      ...mockUser,
      verificationStatus: 'rejected' as const,
    };

    renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: rejectedUser,
      }
    );

    expect(screen.getByText('Account Verification Required')).toBeInTheDocument();
    expect(screen.getByText(/your teaching credentials could not be verified/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resubmit credentials/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('displays appropriate status badge colors for different verification states', () => {
    const pendingUser = {
      ...mockUser,
      verificationStatus: 'pending' as const,
    };

    const { rerender } = renderWithProviders(
      <ProtectedRoute requireVerification={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        isAuthenticated: true,
        user: pendingUser,
      }
    );

    // Check pending status styling
    const pendingStatus = screen.getByText('pending');
    expect(pendingStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');

    // Test rejected status
    const rejectedUser = {
      ...mockUser,
      verificationStatus: 'rejected' as const,
    };

    rerender(
      <Provider store={createTestStore({
        isAuthenticated: true,
        user: rejectedUser,
      })}>
        <MemoryRouter>
          <ProtectedRoute requireVerification={true}>
            <TestComponent />
          </ProtectedRoute>
        </MemoryRouter>
      </Provider>
    );

    const rejectedStatus = screen.getByText('rejected');
    expect(rejectedStatus).toHaveClass('bg-red-100', 'text-red-800');
  });
});