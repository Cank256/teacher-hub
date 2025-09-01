import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CommunityCard } from '../CommunityCard';
import { ThemeProvider } from '@/theme/ThemeContext';
import type { Community } from '@/types';

// Mock theme
const mockTheme = {
  colors: {
    surface: '#ffffff',
    onSurface: '#000000',
    onSurfaceVariant: '#666666',
    surfaceVariant: '#f5f5f5',
    primary: '#007bff',
    onPrimary: '#ffffff',
    success: '#28a745',
    warning: '#ffc107',
    textSecondary: '#6c757d',
    primaryContainer: '#e3f2fd',
    onPrimaryContainer: '#0d47a1',
  },
  typography: {},
};

const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider value={mockTheme as any}>{children}</ThemeProvider>
);

const mockCommunity: Community = {
  id: '1',
  name: 'Math Teachers Uganda',
  description: 'A community for mathematics teachers across Uganda to share resources and collaborate.',
  category: {
    id: '1',
    name: 'Subject Communities',
    description: 'Communities organized by subject',
    color: '#007bff',
    icon: '📚',
  },
  memberCount: 150,
  isPublic: true,
  isJoined: false,
  moderators: [],
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  subjects: [
    { id: '1', name: 'Mathematics', code: 'MATH' },
    { id: '2', name: 'Physics', code: 'PHYS' },
  ],
  gradeLevels: [
    { id: '1', name: 'Primary 1-3', order: 1 },
    { id: '2', name: 'Primary 4-7', order: 2 },
  ],
  activityLevel: 'high' as any,
  lastActivityAt: new Date('2023-12-01'),
};

describe('CommunityCard', () => {
  const mockOnPress = jest.fn();
  const mockOnJoin = jest.fn();
  const mockOnLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render community information correctly', () => {
    render(
      <ThemeWrapper>
        <CommunityCard
          community={mockCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
    expect(screen.getByText('A community for mathematics teachers across Uganda to share resources and collaborate.')).toBeTruthy();
    expect(screen.getByText('150 members')).toBeTruthy();
    expect(screen.getByText('Mathematics, Physics')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('should show singular member text for one member', () => {
    const singleMemberCommunity = {
      ...mockCommunity,
      memberCount: 1,
    };

    render(
      <ThemeWrapper>
        <CommunityCard
          community={singleMemberCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    expect(screen.getByText('1 member')).toBeTruthy();
  });

  it('should show private label for private communities', () => {
    const privateCommunity = {
      ...mockCommunity,
      isPublic: false,
    };

    render(
      <ThemeWrapper>
        <CommunityCard
          community={privateCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    expect(screen.getByText('Private')).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    render(
      <ThemeWrapper>
        <CommunityCard
          community={mockCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    fireEvent.press(screen.getByText('Math Teachers Uganda'));
    expect(mockOnPress).toHaveBeenCalledWith(mockCommunity);
  });

  it('should show Join button for non-joined communities', () => {
    render(
      <ThemeWrapper>
        <CommunityCard
          community={mockCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    const joinButton = screen.getByText('Join');
    expect(joinButton).toBeTruthy();

    fireEvent.press(joinButton);
    expect(mockOnJoin).toHaveBeenCalledWith(mockCommunity);
  });

  it('should show Leave button for joined communities', () => {
    const joinedCommunity = {
      ...mockCommunity,
      isJoined: true,
    };

    render(
      <ThemeWrapper>
        <CommunityCard
          community={joinedCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    const leaveButton = screen.getByText('Leave');
    expect(leaveButton).toBeTruthy();

    fireEvent.press(leaveButton);
    expect(mockOnLeave).toHaveBeenCalledWith(joinedCommunity);
  });

  it('should show Pending button for pending join requests', () => {
    const pendingCommunity = {
      ...mockCommunity,
      joinRequestPending: true,
    };

    render(
      <ThemeWrapper>
        <CommunityCard
          community={pendingCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('should display correct activity level colors and text', () => {
    const activityLevels = [
      { level: 'very_high' as any, text: 'Very Active' },
      { level: 'high' as any, text: 'Active' },
      { level: 'medium' as any, text: 'Moderate' },
      { level: 'low' as any, text: 'Quiet' },
    ];

    activityLevels.forEach(({ level, text }) => {
      const communityWithActivity = {
        ...mockCommunity,
        activityLevel: level,
      };

      const { unmount } = render(
        <ThemeWrapper>
          <CommunityCard
            community={communityWithActivity}
            onPress={mockOnPress}
            onJoin={mockOnJoin}
            onLeave={mockOnLeave}
          />
        </ThemeWrapper>
      );

      expect(screen.getByText(text)).toBeTruthy();
      unmount();
    });
  });

  it('should render placeholder image when no cover image is provided', () => {
    render(
      <ThemeWrapper>
        <CommunityCard
          community={mockCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    // Should show first letter of community name as placeholder
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('should handle communities with no subjects', () => {
    const communityWithoutSubjects = {
      ...mockCommunity,
      subjects: [],
    };

    render(
      <ThemeWrapper>
        <CommunityCard
          community={communityWithoutSubjects}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    // Should not crash and should not show subjects section
    expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
    expect(screen.queryByText('Mathematics, Physics')).toBeNull();
  });

  it('should prevent event bubbling when join/leave button is pressed', () => {
    render(
      <ThemeWrapper>
        <CommunityCard
          community={mockCommunity}
          onPress={mockOnPress}
          onJoin={mockOnJoin}
          onLeave={mockOnLeave}
        />
      </ThemeWrapper>
    );

    const joinButton = screen.getByText('Join');
    fireEvent.press(joinButton);

    expect(mockOnJoin).toHaveBeenCalledWith(mockCommunity);
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});