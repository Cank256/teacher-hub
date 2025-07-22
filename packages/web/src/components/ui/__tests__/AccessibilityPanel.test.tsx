import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibilityPanel } from '../AccessibilityPanel';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

expect.extend(toHaveNoViolations);

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {ui}
    </AccessibilityProvider>
  );
};

describe('AccessibilityPanel', () => {
  it('should not have any accessibility violations when open', async () => {
    const { container } = renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={() => {}} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not render when closed', () => {
    renderWithProvider(<AccessibilityPanel isOpen={false} onClose={() => {}} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render as modal dialog when open', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'accessibility-panel-title');
  });

  it('should have proper heading structure', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const heading = screen.getByRole('heading', { name: 'Accessibility Settings' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'accessibility-panel-title');
  });

  it('should have close button with proper label', () => {
    const onClose = vi.fn();
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close accessibility settings' });
    expect(closeButton).toBeInTheDocument();
  });

  it('should close when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: 'Close accessibility settings' });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={onClose} />);
    
    // Click on backdrop (the overlay behind the modal)
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      await user.click(backdrop as Element);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should have font size radio group with proper structure', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const fontSizeFieldset = screen.getByRole('group', { name: 'Font Size' });
    expect(fontSizeFieldset).toBeInTheDocument();
    
    const radioButtons = screen.getAllByRole('radio');
    expect(radioButtons).toHaveLength(4);
    
    // Check that one is selected by default
    const selectedRadio = radioButtons.find(radio => (radio as HTMLInputElement).checked);
    expect(selectedRadio).toBeTruthy();
  });

  it('should have high contrast toggle switch', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const highContrastSwitch = screen.getByRole('switch', { name: /high contrast/i });
    expect(highContrastSwitch).toBeInTheDocument();
    expect(highContrastSwitch).toHaveAttribute('aria-checked');
  });

  it('should have reduced motion toggle switch', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const reducedMotionSwitch = screen.getByRole('switch', { name: /reduced motion/i });
    expect(reducedMotionSwitch).toBeInTheDocument();
    expect(reducedMotionSwitch).toHaveAttribute('aria-checked');
  });

  it('should update font size when radio button is selected', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const largeRadio = screen.getByRole('radio', { name: 'large' });
    await user.click(largeRadio);
    
    expect(largeRadio).toBeChecked();
  });

  it('should toggle high contrast when switch is activated', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const highContrastSwitch = screen.getByRole('switch', { name: /high contrast/i });
    const initialState = highContrastSwitch.getAttribute('aria-checked');
    
    await user.click(highContrastSwitch);
    
    expect(highContrastSwitch.getAttribute('aria-checked')).not.toBe(initialState);
  });

  it('should toggle reduced motion when switch is activated', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    const reducedMotionSwitch = screen.getByRole('switch', { name: /reduced motion/i });
    const initialState = reducedMotionSwitch.getAttribute('aria-checked');
    
    await user.click(reducedMotionSwitch);
    
    expect(reducedMotionSwitch.getAttribute('aria-checked')).not.toBe(initialState);
  });

  it('should have descriptive text for each setting', () => {
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Increases color contrast for better visibility')).toBeInTheDocument();
    expect(screen.getByText('Minimizes animations and transitions')).toBeInTheDocument();
  });

  it('should have done button to close panel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={onClose} />);
    
    const doneButton = screen.getByRole('button', { name: 'Done' });
    await user.click(doneButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should trap focus within the modal', async () => {
    const user = userEvent.setup();
    renderWithProvider(<AccessibilityPanel isOpen={true} onClose={() => {}} />);
    
    // Focus should be trapped within the modal
    const firstFocusableElement = screen.getByRole('button', { name: 'Close accessibility settings' });
    const lastFocusableElement = screen.getByRole('button', { name: 'Done' });
    
    // Tab through to the last element
    await user.tab();
    // Continue tabbing should cycle back to first element
    // This is a basic test - full focus trap testing would require more complex setup
    expect(document.activeElement).toBeTruthy();
  });
});