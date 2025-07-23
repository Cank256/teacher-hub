import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { ForgotPasswordPage } from '../ForgotPasswordPage';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    // Reset i18n to English for consistent testing
    i18n.changeLanguage('en');
  });

  it('renders forgot password form', () => {
    renderWithProviders(<ForgotPasswordPage />);
    
    expect(screen.getByRole('heading', { name: /teacher hub/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
  });

  it('shows validation error for empty email field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    
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

  it('shows success message after form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/we've sent a password reset link to/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it('allows user to try again from success screen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    
    // Submit form to get to success screen
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    
    // Click try again button
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    await user.click(tryAgainButton);
    
    // Should be back to the form
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const form = screen.getByRole('form');
    
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoFocus');
    expect(form).toHaveAttribute('noValidate');
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('has link back to login page', () => {
    renderWithProviders(<ForgotPasswordPage />);
    
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/auth/login');
  });
});