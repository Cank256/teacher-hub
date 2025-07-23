import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { LoginPage } from '../LoginPage';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    // Reset i18n to English for consistent testing
    i18n.changeLanguage('en');
  });

  it('renders login form with all required fields', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('heading', { name: /teacher hub/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2);
    });
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Trigger validation error
    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
    
    // Start typing to clear error
    await user.type(emailInput, 'test@example.com');
    
    await waitFor(() => {
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const form = screen.getByRole('form');
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(emailInput).toHaveAttribute('required');
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    expect(passwordInput).toHaveAttribute('required');
    
    expect(form).toHaveAttribute('noValidate');
  });

  it('has links to registration and forgot password pages', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/auth/register');
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('shows loading state when form is submitted', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});