import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { AccessibilityProvider } from '../../../contexts/AccessibilityContext';

// Create a test i18n instance
const testI18n = i18n.createInstance();
testI18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          'language.selectLanguage': 'Select Language',
          'language.languageChanged': 'Language changed to {{language}}',
        },
      },
      lug: {
        translation: {
          'language.selectLanguage': 'Londa olulimi',
          'language.languageChanged': 'Olulimi lukyusiddwa okudda ku {{language}}',
        },
      },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={testI18n}>
      <AccessibilityProvider>
        {ui}
      </AccessibilityProvider>
    </I18nextProvider>
  );
};

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    testI18n.changeLanguage('en');
  });

  it('should render with current language', () => {
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('English');
  });

  it('should open dropdown when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /luganda/i })).toBeInTheDocument();
  });

  it('should close dropdown when escape is pressed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should change language when option is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    const lugandaOption = screen.getByRole('option', { name: /luganda/i });
    await user.click(lugandaOption);
    
    await waitFor(() => {
      expect(testI18n.language).toBe('lug');
    });
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    const lugandaOption = screen.getByRole('option', { name: /luganda/i });
    lugandaOption.focus();
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(testI18n.language).toBe('lug');
    });
  });

  it('should handle space key activation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    const lugandaOption = screen.getByRole('option', { name: /luganda/i });
    lugandaOption.focus();
    await user.keyboard(' ');
    
    await waitFor(() => {
      expect(testI18n.language).toBe('lug');
    });
  });

  it('should show current language as selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    const englishOption = screen.getByRole('option', { name: /english/i });
    expect(englishOption).toHaveAttribute('aria-selected', 'true');
    
    const lugandaOption = screen.getByRole('option', { name: /luganda/i });
    expect(lugandaOption).toHaveAttribute('aria-selected', 'false');
  });

  it('should close dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <LanguageSwitcher />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    
    const outsideElement = screen.getByTestId('outside');
    await user.click(outsideElement);
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('should have proper ARIA attributes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    
    await user.click(button);
    
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Select Language');
  });

  it('should display native language names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    const button = screen.getByRole('button', { name: /select language/i });
    await user.click(button);
    
    // Check that both English and native names are displayed
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Oluganda')).toBeInTheDocument();
    expect(screen.getByText('Luganda')).toBeInTheDocument();
  });

  it('should update button text when language changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    
    let button = screen.getByRole('button', { name: /select language/i });
    expect(button).toHaveTextContent('English');
    
    await user.click(button);
    const lugandaOption = screen.getByRole('option', { name: /luganda/i });
    await user.click(lugandaOption);
    
    await waitFor(() => {
      button = screen.getByRole('button');
      expect(button).toHaveTextContent('Oluganda');
    });
  });
});