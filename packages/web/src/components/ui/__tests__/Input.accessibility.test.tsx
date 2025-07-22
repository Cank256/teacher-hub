import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Input } from '../Input';

expect.extend(toHaveNoViolations);

describe('Input Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<Input label="Email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should associate label with input', () => {
    render(<Input label="Email address" />);
    
    const input = screen.getByLabelText('Email address');
    expect(input).toBeInTheDocument();
  });

  it('should mark required fields appropriately', () => {
    render(<Input label="Email" required />);
    
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should associate error messages with input', () => {
    render(<Input label="Email" error="Please enter a valid email" />);
    
    const input = screen.getByLabelText('Email');
    const errorMessage = screen.getByRole('alert');
    
    expect(errorMessage).toHaveTextContent('Please enter a valid email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('should associate helper text with input', () => {
    render(<Input label="Password" helperText="Must be at least 8 characters" />);
    
    const input = screen.getByLabelText('Password');
    const helperText = screen.getByText('Must be at least 8 characters');
    
    expect(input).toHaveAttribute('aria-describedby');
    expect(helperText).toBeInTheDocument();
  });

  it('should prioritize error over helper text', () => {
    render(
      <Input 
        label="Email" 
        helperText="Enter your email address" 
        error="Invalid email format" 
      />
    );
    
    const input = screen.getByLabelText('Email');
    
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email format');
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should be focusable with keyboard', async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);
    
    const input = screen.getByLabelText('Name');
    await user.click(input);
    
    expect(input).toHaveClass('focus:ring-2', 'focus:ring-primary-500');
  });

  it('should support disabled state', () => {
    render(<Input label="Disabled field" disabled />);
    
    const input = screen.getByLabelText('Disabled field');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-gray-50');
  });

  it('should generate unique IDs for multiple inputs', () => {
    render(
      <div>
        <Input label="First Name" />
        <Input label="Last Name" />
      </div>
    );
    
    const firstInput = screen.getByLabelText('First Name');
    const lastInput = screen.getByLabelText('Last Name');
    
    expect(firstInput.id).not.toBe(lastInput.id);
    expect(firstInput.id).toBeTruthy();
    expect(lastInput.id).toBeTruthy();
  });

  it('should announce errors to screen readers', () => {
    render(<Input label="Email" error="This field is required" />);
    
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });

  it('should handle custom aria-describedby', () => {
    render(
      <div>
        <Input label="Password" aria-describedby="password-help" />
        <div id="password-help">Password requirements</div>
      </div>
    );
    
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('password-help'));
  });

  it('should combine multiple describedby values', () => {
    render(
      <div>
        <Input 
          label="Email" 
          helperText="We'll never share your email" 
          aria-describedby="external-help" 
        />
        <div id="external-help">External help text</div>
      </div>
    );
    
    const input = screen.getByLabelText('Email');
    const describedBy = input.getAttribute('aria-describedby');
    
    expect(describedBy).toContain('external-help');
    expect(describedBy?.split(' ').length).toBeGreaterThan(1);
  });
});