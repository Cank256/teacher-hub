import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes when disabled', () => {
    render(<Button disabled>Disabled button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled button' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeDisabled();
  });

  it('should have proper ARIA attributes when loading', () => {
    render(<Button loading loadingText="Processing...">Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeDisabled();
    
    // Check for loading announcement
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should support custom aria-label', () => {
    render(<Button aria-label="Custom label">Icon only</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom label' });
    expect(button).toBeInTheDocument();
  });

  it('should have minimum touch target size', () => {
    render(<Button size="sm">Small button</Button>);
    
    const button = screen.getByRole('button', { name: 'Small button' });
    
    // Check minimum height is set
    expect(button).toHaveClass('min-h-[32px]');
  });

  it('should announce loading state to screen readers', () => {
    render(<Button loading loadingText="Saving changes...">Save</Button>);
    
    // Check that loading text is displayed
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not be activatable when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled' });
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should have focus styles', () => {
    render(<Button>Focus me</Button>);
    
    const button = screen.getByRole('button', { name: 'Focus me' });
    expect(button).toHaveClass('focus:ring-2', 'focus:ring-primary-500', 'focus-visible:ring-2');
  });
});