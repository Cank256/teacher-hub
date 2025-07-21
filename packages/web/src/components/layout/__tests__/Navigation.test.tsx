import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';

const NavigationWrapper = () => (
  <BrowserRouter>
    <Navigation />
  </BrowserRouter>
);

describe('Navigation', () => {
  it('renders brand logo', () => {
    render(<NavigationWrapper />);
    expect(screen.getByText('Teacher Hub')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    render(<NavigationWrapper />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('toggles mobile menu', () => {
    render(<NavigationWrapper />);
    
    // Mobile menu should be hidden initially
    const mobileMenu = screen.getByText('Dashboard').closest('div');
    expect(mobileMenu).toHaveClass('hidden');
    
    // Click hamburger menu
    const menuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(menuButton);
    
    // Mobile menu should be visible
    expect(mobileMenu).toHaveClass('block');
  });

  it('closes mobile menu when navigation item is clicked', () => {
    render(<NavigationWrapper />);
    
    // Open mobile menu
    const menuButton = screen.getByRole('button', { name: /open main menu/i });
    fireEvent.click(menuButton);
    
    // Click a navigation item
    const dashboardLinks = screen.getAllByText('Dashboard');
    const mobileLink = dashboardLinks.find(link => 
      link.closest('div')?.classList.contains('md:hidden')
    );
    
    if (mobileLink) {
      fireEvent.click(mobileLink);
      
      // Mobile menu should be hidden
      const mobileMenu = mobileLink.closest('div');
      expect(mobileMenu).toHaveClass('hidden');
    }
  });

  it('has proper accessibility attributes', () => {
    render(<NavigationWrapper />);
    
    const menuButton = screen.getByRole('button', { name: /open main menu/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });
});