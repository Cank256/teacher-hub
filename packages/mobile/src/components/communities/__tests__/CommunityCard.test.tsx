import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CommunityCard } from '../CommunityCard';
import { communitiesSlice } from '../../../store/slices/communitiesSlice';
import { authSlice } from '../../../store/slices/authSlice';

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios),
    },
    Alert: {
      alert: jest.fn(),
    },
    Haptics: {
      impactAsync: jest.fn(),
      notificationAsync: jest.fn(),
    },
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock community service
jest.mock('../../../services/communityService', () => ({
  communityService: {
    joinCommunity: jest.fn(),
    leaveCommunity: jest.fn(),
  },
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
  name: 'Mobile Math Teachers',
  description: 'A community for mathematics educators using mobile technology in their teaching.',
  type: 'subject' as const,
  ownerId: 'user-456',
  isPrivate: false,
  requiresApproval: false,
  memberCount: 150,
  postCount: 75,
  isActive: true,
  imageUrl: '/communities/mobile-math.jpg',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T00:00:00Z'),
  owner: {
    id: 'user-456',
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    profileImageUrl: '/profiles/jane.jpg',
  },
  userMembership: null,
};

const renderCommunityCard = (community = mockCommunity, props = {}) => {
  return render(
    <Provider store={mockStore}>
      <CommunityCard community={community} {...props} />
    </Provider>
  );
};

describe('Mobile CommunityCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render community information correctly', () => {
      const { getByText, getByTestId } = renderCommunityCard();

      expect(getByText('Mobile Math Teachers')).toBeTruthy();
      expect(getByText(/A community for mathematics educators/)).toBeTruthy();
      expect(getByText('150 members')).toBeTruthy();
      expect(getByText('75 posts')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    it('should render community image', () => {
      const { getByTestId } = renderCommunityCard();

      const communityImage = getByTestId('community-image');
      expect(communityImage).toBeTruthy();
      expect(communityImage.props.source.uri).toBe('/communities/mobile-math.jpg');
    });

    it('should render owner profile image', () => {
      const { getByTestId } = renderCommunityCard();

      const ownerImage = getByTestId('owner-profile-image');
      expect(ownerImage).toBeTruthy();
      expect(ownerImage.props.source.uri).toBe('/profiles/jane.jpg');
    });

    it('should render community type badge', () => {
      const { getByText } = renderCommunityCard();

      expect(getByText('Subject')).toBeTruthy();
    });

    it('should render private badge for private communities', () => {
      const privateCommunity = { ...mockCommunity, isPrivate: true };
      const { getByTestId } = renderCommunityCard(privateCommunity);

      expect(getByTestId('private-badge')).toBeTruthy();
    });

    it('should render approval required badge', () => {
      const approvalCommunity = { ...mockCommunity, requiresApproval: true };
      const { getByTestId } = renderCommunityCard(approvalCommunity);

      expect(getByTestId('approval-required-badge')).toBeTruthy();
    });

    it('should render default image when no community image', () => {
      const communityWithoutImage = { ...mockCommunity, imageUrl: undefined };
      const { getByTestId } = renderCommunityCard(communityWithoutImage);

      const defaultImage = getByTestId('community-image');
      expect(defaultImage.props.source).toEqual(require('../../../assets/default-community.png'));
    });
  });

  describe('Membership Status', () => {
    it('should show join button for non-members', () => {
      const { getByTestId } = renderCommunityCard();

      expect(getByTestId('join-button')).toBeTruthy();
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
      const { getByTestId, getByText } = renderCommunityCard(memberCommunity);

      expect(getByText('Member')).toBeTruthy();
      expect(getByTestId('leave-button')).toBeTruthy();
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
      const { getByText } = renderCommunityCard(pendingCommunity);

      expect(getByText('Pending')).toBeTruthy();
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
      const { getByText, getByTestId } = renderCommunityCard(ownedCommunity);

      expect(getByText('Owner')).toBeTruthy();
      expect(getByTestId('manage-button')).toBeTruthy();
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
      const { getByText, getByTestId } = renderCommunityCard(moderatedCommunity);

      expect(getByText('Moderator')).toBeTruthy();
      expect(getByTestId('moderate-button')).toBeTruthy();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle join community', async () => {
      const { communityService } = require('../../../services/communityService');
      communityService.joinCommunity.mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      await waitFor(() => {
        expect(communityService.joinCommunity).toHaveBeenCalledWith('community-123');
      });
    });

    it('should handle leave community with confirmation', async () => {
      const { communityService } = require('../../../services/communityService');
      const { Alert } = require('react-native');
      
      communityService.leaveCommunity.mockResolvedValue(undefined);
      Alert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user confirming
        buttons[1].onPress();
      });

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      const { getByTestId } = renderCommunityCard(memberCommunity);

      const leaveButton = getByTestId('leave-button');
      fireEvent.press(leaveButton);

      expect(Alert.alert).toHaveBeenCalled();
      await waitFor(() => {
        expect(communityService.leaveCommunity).toHaveBeenCalledWith('community-123');
      });
    });

    it('should navigate to community page on card press', () => {
      const { useNavigation } = require('@react-navigation/native');
      const navigate = jest.fn();
      useNavigation.mockReturnValue({ navigate });

      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      fireEvent.press(communityCard);

      expect(navigate).toHaveBeenCalledWith('CommunityPage', { 
        communityId: 'community-123' 
      });
    });

    it('should handle share community', () => {
      const onShare = jest.fn();
      const { getByTestId } = renderCommunityCard(mockCommunity, { onShare });

      const shareButton = getByTestId('share-button');
      fireEvent.press(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockCommunity);
    });

    it('should show action sheet for more options', () => {
      const { getByTestId } = renderCommunityCard();

      const moreButton = getByTestId('more-options-button');
      fireEvent.press(moreButton);

      expect(getByTestId('action-sheet')).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback on join', async () => {
      const { Haptics } = require('react-native');
      const { communityService } = require('../../../services/communityService');
      
      communityService.joinCommunity.mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
      });
    });

    it('should provide haptic feedback on long press', () => {
      const { Haptics } = require('react-native');
      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      fireEvent(communityCard, 'onLongPress');

      expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when joining', async () => {
      const { communityService } = require('../../../services/communityService');
      communityService.joinCommunity.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      expect(getByTestId('join-loading-indicator')).toBeTruthy();
      expect(joinButton.props.disabled).toBe(true);
    });

    it('should show loading state when leaving', async () => {
      const { communityService } = require('../../../services/communityService');
      const { Alert } = require('react-native');
      
      communityService.leaveCommunity.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      Alert.alert.mockImplementation((title, message, buttons) => {
        buttons[1].onPress();
      });

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      const { getByTestId } = renderCommunityCard(memberCommunity);

      const leaveButton = getByTestId('leave-button');
      fireEvent.press(leaveButton);

      expect(getByTestId('leave-loading-indicator')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle join error gracefully', async () => {
      const { communityService } = require('../../../services/communityService');
      communityService.joinCommunity.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      await waitFor(() => {
        expect(getByText('Failed to join community')).toBeTruthy();
      });
    });

    it('should handle leave error gracefully', async () => {
      const { communityService } = require('../../../services/communityService');
      const { Alert } = require('react-native');
      
      communityService.leaveCommunity.mockRejectedValue(new Error('Leave failed'));
      Alert.alert.mockImplementation((title, message, buttons) => {
        buttons[1].onPress();
      });

      const memberCommunity = {
        ...mockCommunity,
        userMembership: {
          id: 'membership-123',
          role: 'member' as const,
          status: 'active' as const,
          joinedAt: new Date(),
        },
      };
      const { getByTestId, getByText } = renderCommunityCard(memberCommunity);

      const leaveButton = getByTestId('leave-button');
      fireEvent.press(leaveButton);

      await waitFor(() => {
        expect(getByText('Failed to leave community')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = renderCommunityCard();

      expect(getByLabelText('Join Mobile Math Teachers community')).toBeTruthy();
      expect(getByLabelText('Share community')).toBeTruthy();
      expect(getByLabelText('More options')).toBeTruthy();
    });

    it('should have proper accessibility hints', () => {
      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      expect(joinButton.props.accessibilityHint).toBe('Tap to join this community');
    });

    it('should support VoiceOver navigation', () => {
      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      expect(communityCard.props.accessible).toBe(true);
      expect(communityCard.props.accessibilityRole).toBe('button');
    });

    it('should announce membership status changes', () => {
      const { getByTestId } = renderCommunityCard();

      const statusIndicator = getByTestId('membership-status');
      expect(statusIndicator.props.accessibilityLiveRegion).toBe('polite');
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large member counts', () => {
      const largeCommunity = {
        ...mockCommunity,
        memberCount: 50000,
        postCount: 25000,
      };

      const startTime = Date.now();
      renderCommunityCard(largeCommunity);
      const renderTime = Date.now() - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('should handle rapid interactions without lag', async () => {
      const { communityService } = require('../../../services/communityService');
      communityService.joinCommunity.mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      
      // Rapid taps
      for (let i = 0; i < 5; i++) {
        fireEvent.press(joinButton);
      }

      // Should only call service once due to debouncing
      await waitFor(() => {
        expect(communityService.joinCommunity).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Device-specific Features', () => {
    it('should handle iOS-specific styling', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'ios';

      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      expect(communityCard.props.style).toContainEqual(
        expect.objectContaining({ shadowOpacity: expect.any(Number) })
      );
    });

    it('should handle Android-specific styling', () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'android';

      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      expect(communityCard.props.style).toContainEqual(
        expect.objectContaining({ elevation: expect.any(Number) })
      );
    });

    it('should adapt to different screen sizes', () => {
      const Dimensions = require('react-native').Dimensions;
      
      // Test small screen
      Dimensions.get.mockReturnValue({ width: 320, height: 568 });

      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      expect(communityCard.props.style).toContainEqual(
        expect.objectContaining({ padding: expect.any(Number) })
      );
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline state gracefully', () => {
      const { getByTestId, getByText } = renderCommunityCard(mockCommunity, { 
        isOffline: true 
      });

      expect(getByText('Offline')).toBeTruthy();
      
      const joinButton = getByTestId('join-button');
      expect(joinButton.props.disabled).toBe(true);
    });

    it('should queue actions when offline', async () => {
      const { getByTestId } = renderCommunityCard(mockCommunity, { 
        isOffline: true 
      });

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      // Should show queued indicator
      expect(getByTestId('action-queued-indicator')).toBeTruthy();
    });
  });

  describe('Animation and Transitions', () => {
    it('should animate membership status changes', async () => {
      const { communityService } = require('../../../services/communityService');
      communityService.joinCommunity.mockResolvedValue({
        id: 'membership-123',
        communityId: 'community-123',
        userId: 'user-123',
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });

      const { getByTestId } = renderCommunityCard();

      const joinButton = getByTestId('join-button');
      fireEvent.press(joinButton);

      await waitFor(() => {
        const statusIndicator = getByTestId('membership-status');
        expect(statusIndicator.props.style).toContainEqual(
          expect.objectContaining({ opacity: expect.any(Number) })
        );
      });
    });

    it('should animate card press feedback', () => {
      const { getByTestId } = renderCommunityCard();

      const communityCard = getByTestId('community-card');
      fireEvent(communityCard, 'onPressIn');

      expect(communityCard.props.style).toContainEqual(
        expect.objectContaining({ transform: expect.any(Array) })
      );
    });
  });
});