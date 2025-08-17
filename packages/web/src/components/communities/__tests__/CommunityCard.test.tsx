import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { CommunityCard } from '../CommunityCard';
import { communitiesSlice } from '../../../store/slices/communitiesSlice';
import { authSlice } from '../../../store/slices/authSlice';

// Mock the community service
vi.mock('../../../services/communityService', () => ({
  communityService: {
    joinCommunity: vi.fn(),
    leaveCommunity: vi.fn(),
  }
}));

const mockStore = configureStore({
  reducer: {
    communities: communitiesSlice.reducer,
    auth: authSlice.reducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: 'user-123',
        fullName: 'Test User',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
    },
    communities: {
      communities: [],
      userCommunities: [],
      loading: false,
      error: null,
    },
  },
});

const mockCommunity = {
  id: 'community-123',
  name: 'Math Teachers',
  description: 'A community for mathematics educators to share resources and discuss teaching strategies.',
  type: 'subject' as const,
  ownerId: 'user-456',
  isPrivate: false,
  requiresApproval: false,
  memberCount: 25,
  postCount: 15,
  isActive: true,
  imageUrl: '/communities/math-teachers.jpg',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
  owner: {
    id: 'user-456',
    fullName: 'John Doe',
    email: 'john@example.com',
    profileImageUrl: '/profiles/john.jpg',
  },
  userMembership: null,
};

const renderCommunityCard = (community = mockCommunity, props = {}) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        <CommunityCard community={community} {...props} />
      </BrowserRouter>
    </Provider>
  );
};

describe('CommunityCard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render community information correctly', () => {
      renderCommunityCard();

      expect(screen.getByText('Math Teachers')).toBeInTheDocument();
      expect(screen.getByText(/A community for mathematics educators/)).toBeInTheDocument();
      expect(screen.getByText('25 members')).toBeInTheDocument();
      expect(screen.getByText('15 posts')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render community image', () => {
      renderCommunityCard();

      const communityImage = screen.getByAltText('Math Teachers');
      expect(communityImage).toBeInTheDocument();
      expect(communityImage).toHaveAttribute('src', '/communities/math-teachers.jpg');
    });

    it('should render owner profile image', () => {
      renderCommunityCard();

      const ownerImage = screen.getByAltText('John Doe');
      expect(ownerImage).toBeInTheDocument();
      expect(ownerImage).toHaveAttribute('src', '/profiles/john.jpg');
    });

    it('should render community type badge', () => {
      renderCommunityCard();

      expect(screen.getByText('Subject')).toBeInTheDocument();
    });

    it('should render private badge for private communities', () => {
      const privateCommunity = { ...mockCommunity, isPrivate: true };
      renderCommunityCard(privateCommunity);

      expect(screen.getByText('Private')).toBeInTheDocument();
    });

    it('should render approval required badge', () => {
      const approvalCommunity = { ...mockCommunity, requiresApproval: true };
      renderCommunityCard(approvalCommunity);

      expect(screen.getByText('Approval Required')).toBeInTheDocument();
    });

    it('should render default image when no community image', () => {
      const communityWithoutImage = { ...mockCommunity, imageUrl: undefined };
      renderCommunityCard(communityWithoutImage);

      const defaultImage = screen.getByAltText('Math Teachers');
      expect(defaultImage).toHaveAttribute('src', '/default-community.png');
    });
  });

  describe('Membership Status', () => {
    it('should show join button for non-members', () => {
      renderCommunityCard();

      expect(screen.getByText('Join')).toBeInTheDocument();
    });

    it('should show member status for active members', () => {
      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('Leave')).toBeInTheDocument();
    });

    it('should show pending status for pending members', () => {
      const pendingCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'pending' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(pendingCommunity);

      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    });

    it('should show owner status for community owners', () => {
      const ownedCommunity = {
        ...mockCommunity,
        ownerId: 'user-123', // Current user is owner
        userMembership: {
          id: 'membership-123',
          role: 'owner' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(ownedCommunity);

      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    it('should show moderator status for moderators', () => {
      const moderatedCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'moderator' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(moderatedCommunity);

      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle join community', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.joinCommunity).mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      renderCommunityCard();

      const joinButton = screen.getByText('Join');
      await user.click(joinButton);

      await waitFor(() => {
        expect(communityService.joinCommunity).toHaveBeenCalledWith('community-123');
      });
    });

    it('should handle leave community', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.leaveCommunity).mockResolvedValue(undefined);

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      const leaveButton = screen.getByText('Leave');
      await user.click(leaveButton);

      // Confirm leave action
      const confirmButton = screen.getByText('Confirm Leave');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(communityService.leaveCommunity).toHaveBeenCalledWith('community-123');
      });
    });

    it('should navigate to community page on card click', async () => {
      renderCommunityCard();

      const communityLink = screen.getByRole('link', { name: /Math Teachers/ });
      expect(communityLink).toHaveAttribute('href', '/communities/community-123');
    });

    it('should handle share community', async () => {
      const onShare = vi.fn();
      renderCommunityCard(mockCommunity, { onShare });

      const shareButton = screen.getByLabelText('Share community');
      await user.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockCommunity);
    });

    it('should show more options menu', async () => {
      renderCommunityCard();

      const moreButton = screen.getByLabelText('More options');
      await user.click(moreButton);

      expect(screen.getByText('Report Community')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when joining', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.joinCommunity).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderCommunityCard();

      const joinButton = screen.getByText('Join');
      await user.click(joinButton);

      expect(screen.getByText('Joining...')).toBeInTheDocument();
      expect(joinButton).toBeDisabled();
    });

    it('should show loading state when leaving', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.leaveCommunity).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      const leaveButton = screen.getByText('Leave');
      await user.click(leaveButton);

      const confirmButton = screen.getByText('Confirm Leave');
      await user.click(confirmButton);

      expect(screen.getByText('Leaving...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle join error', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.joinCommunity).mockRejectedValue(new Error('Join failed'));

      renderCommunityCard();

      const joinButton = screen.getByText('Join');
      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to join community/)).toBeInTheDocument();
      });
    });

    it('should handle leave error', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.leaveCommunity).mockRejectedValue(new Error('Leave failed'));

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      const leaveButton = screen.getByText('Leave');
      await user.click(leaveButton);

      const confirmButton = screen.getByText('Confirm Leave');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to leave community/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderCommunityCard();

      expect(screen.getByLabelText('Share community')).toBeInTheDocument();
      expect(screen.getByLabelText('More options')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderCommunityCard();

      const joinButton = screen.getByText('Join');
      joinButton.focus();
      expect(joinButton).toHaveFocus();

      await user.keyboard('{Tab}');
      const shareButton = screen.getByLabelText('Share community');
      expect(shareButton).toHaveFocus();
    });

    it('should handle Enter key for button activation', async () => {
      const { communityService } = await import('../../../services/communityService');
      vi.mocked(communityService.joinCommunity).mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      renderCommunityCard();

      const joinButton = screen.getByText('Join');
      joinButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(communityService.joinCommunity).toHaveBeenCalledWith('community-123');
      });
    });

    it('should have proper heading structure', () => {
      renderCommunityCard();

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Math Teachers');
    });

    it('should have descriptive alt text for images', () => {
      renderCommunityCard();

      const communityImage = screen.getByAltText('Math Teachers');
      expect(communityImage).toBeInTheDocument();

      const ownerImage = screen.getByAltText('John Doe');
      expect(ownerImage).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to compact view', () => {
      renderCommunityCard(mockCommunity, { compact: true });

      // In compact view, description should be truncated
      const description = screen.getByText(/A community for mathematics educators/);
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should show full content in expanded view', () => {
      renderCommunityCard(mockCommunity, { compact: false });

      const description = screen.getByText(/A community for mathematics educators to share resources and discuss teaching strategies./);
      expect(description).not.toHaveClass('line-clamp-2');
    });
  });

  describe('Community Statistics', () => {
    it('should format large member counts', () => {
      const largeCommunity = { ...mockCommunity, memberCount: 1250 };
      renderCommunityCard(largeCommunity);

      expect(screen.getByText('1.3K members')).toBeInTheDocument();
    });

    it('should format large post counts', () => {
      const activeCommunity = { ...mockCommunity, postCount: 2500 };
      renderCommunityCard(activeCommunity);

      expect(screen.getByText('2.5K posts')).toBeInTheDocument();
    });

    it('should show activity indicator for active communities', () => {
      const activeCommunity = { ...mockCommunity, postCount: 100, memberCount: 50 };
      renderCommunityCard(activeCommunity);

      expect(screen.getByLabelText('Active community')).toBeInTheDocument();
    });
  });

  describe('Confirmation Dialogs', () => {
    it('should show confirmation dialog before leaving community', async () => {
      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      const leaveButton = screen.getByText('Leave');
      await user.click(leaveButton);

      expect(screen.getByText('Leave Community?')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to leave/)).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm Leave')).toBeInTheDocument();
    });

    it('should cancel leave action', async () => {
      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      renderCommunityCard(memberCommunity);

      const leaveButton = screen.getByText('Leave');
      await user.click(leaveButton);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByText('Leave Community?')).not.toBeInTheDocument();
    });
  });
});