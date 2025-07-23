import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { RegisterPage } from '../RegisterPage';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        {component}
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    // Reset i18n to English for consistent testing
    i18n.changeLanguage('en');
  });

  it('renders registration form with all required sections', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByRole('heading', { name: /teacher hub/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    expect(screen.getByText(/teaching information/i)).toBeInTheDocument();
    expect(screen.getByText(/teaching credentials/i)).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    renderWithProviders(<RegisterPage />);
    
    // Personal information fields
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    
    // Teaching information fields
    expect(screen.getByLabelText(/subjects/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grade levels/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/school/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/years of teaching experience/i)).toBeInTheDocument();
    
    // Credential upload
    expect(screen.getByLabelText(/upload teaching certificate/i)).toBeInTheDocument();
    
    // Terms and conditions
    expect(screen.getByLabelText(/i agree to the/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      const requiredErrors = screen.getAllByText(/required/i);
      expect(requiredErrors.length).toBeGreaterThan(5); // Multiple required fields
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'different-password');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(passwordInput, '123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('allows multi-selection for subjects and grade levels', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    const subjectsSelect = screen.getByLabelText(/subjects/i);
    const gradeLevelsSelect = screen.getByLabelText(/grade levels/i);
    
    expect(subjectsSelect).toHaveAttribute('multiple');
    expect(gradeLevelsSelect).toHaveAttribute('multiple');
    
    // Check that options are available
    expect(screen.getByRole('option', { name: /mathematics/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /primary 1-3/i })).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<RegisterPage />);
    
    const form = screen.getByRole('form');
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const fileInput = screen.getByLabelText(/upload teaching certificate/i);
    
    expect(form).toHaveAttribute('noValidate');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
    expect(fileInput).toHaveAttribute('accept', '.pdf,.jpg,.jpeg,.png');
  });

  it('has link to login page', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/auth/login');
  });

  it('shows loading state when form is submitted with valid data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    
    // Fill in required fields
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    
    // Select subjects and grade levels
    const subjectsSelect = screen.getByLabelText(/subjects/i);
    await user.selectOptions(subjectsSelect, ['Mathematics']);
    
    const gradeLevelsSelect = screen.getByLabelText(/grade levels/i);
    await user.selectOptions(gradeLevelsSelect, ['Primary 1-3']);
    
    await user.type(screen.getByLabelText(/school/i), 'Test School');
    await user.type(screen.getByLabelText(/location/i), 'Kampala');
    await user.type(screen.getByLabelText(/years of teaching experience/i), '5');
    
    // Upload file
    const file = new File(['test'], 'certificate.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/upload teaching certificate/i);
    await user.upload(fileInput, file);
    
    // Agree to terms
    await user.click(screen.getByLabelText(/i agree to the/i));
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);
    
    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});