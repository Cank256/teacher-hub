import React from 'react';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '../Dashboard';

describe('Dashboard', () => {
  it('renders dashboard title and description', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your Teacher Hub dashboard')).toBeInTheDocument();
  });

  it('renders dashboard cards', () => {
    render(<Dashboard />);
    expect(screen.getByText('Recent Resources')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
  });

  it('renders government updates section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Government Updates')).toBeInTheDocument();
    expect(screen.getByText('New Curriculum Guidelines')).toBeInTheDocument();
    expect(screen.getByText('UNEB Examination Updates')).toBeInTheDocument();
  });

  it('renders quick actions section', () => {
    render(<Dashboard />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Upload Resource')).toBeInTheDocument();
    expect(screen.getByText('Join Community')).toBeInTheDocument();
  });

  it('has proper responsive grid layout', () => {
    render(<Dashboard />);
    const gridContainers = screen.getAllByText('Recent Resources')[0].closest('.grid');
    expect(gridContainers).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });
});