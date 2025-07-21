import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle } from '../Card';

describe('Card', () => {
  it('renders card with children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies different padding classes', () => {
    const { rerender } = render(<Card padding="none">Content</Card>);
    let card = screen.getByText('Content').closest('div');
    expect(card).not.toHaveClass('p-4', 'p-6', 'p-8');

    rerender(<Card padding="sm">Content</Card>);
    card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-4');

    rerender(<Card padding="lg">Content</Card>);
    card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('p-8');
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Content</Card>);
    const card = screen.getByText('Content').closest('div');
    expect(card).toHaveClass('custom-card');
  });
});

describe('CardHeader', () => {
  it('renders header with border', () => {
    render(
      <CardHeader>
        <h2>Header</h2>
      </CardHeader>
    );
    const header = screen.getByText('Header').parentElement;
    expect(header).toHaveClass('border-b', 'border-gray-200');
  });
});

describe('CardTitle', () => {
  it('renders title with proper styling', () => {
    render(<CardTitle>Card Title</CardTitle>);
    const title = screen.getByText('Card Title');
    expect(title).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
  });
});