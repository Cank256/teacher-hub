import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';

import { CommunitiesListScreen } from '../screens/CommunitiesListScreen';
import { CommunityDetailScreen } from '../screens/CommunityDetailScreen';
import { ThemeProvider } from '@/theme/ThemeContext';
import { CommunitiesService } from '@/services/api/communitiesService';
import type { Community, CommunityFilters } from '@/types';

// Mock the CommunitiesService
jest.mock('@/services/api/communitiesService');
const mockCommunitiesService = CommunitiesService as jest.Mocked<typeof CommunitiesService>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock theme
const mockTheme = {
  colors: {
    background: '#ffffff',
    surface: '#ffffff',
    onSurface: '#000000',
    onSurfaceVariant: '#666666',
    surfaceVariant: '#f5f5f5',
    primary: '#007bff',
    onPrimary: '#ffffff',
    primaryContainer: '#e3f2fd',
    onPrimaryContainer: '#0d47a1',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    textSecondary: '#6c757d',
    outline: '#e0e0e0',
  },
  typography: {},
};

// Create test navigation stack
const Stack = createNativeStackNavigator();

const TestNavigator: React.FC<{ initialRouteName?: string; initialParams?: any }> = ({
  initialRouteName = 'CommunitiesList',
  initialParams,
}) => (
  <Stack.Navigator initialRouteName={initialRouteName}>
    <Stack.Screen
      name="CommunitiesList"
      component={CommunitiesListScreen}
      options={{ title: 'Communities' }}
    />
    <Stack.Screen
      name="CommunityDetail"
      component={CommunityDetailScreen}
      options={{ title: 'Community Detail' }}
      initialParams={initialParams}
    />
  </Stack.Navigator>
);

const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialRouteName?: string;
  initialParams?: any;
}> = ({ children, initialRouteName, initialParams }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={mockTheme as any}>
        <NavigationContainer>
          <TestNavigator initialRouteName={initialRouteName} initialParams={initialParams} />
        </NavigationContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'Math Teachers Uganda',
    description: 'A community for mathematics teachers',
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
    subjects: [{ id: '1', name: 'Mathematics', code: 'MATH' }],
    gradeLevels: [{ id: '1', name: 'Primary 1-3', order: 1 }],
    activityLevel: 'high' as any,
    lastActivityAt: new Date('2023-12-01'),
  },
  {
    id: '2',
    name: 'Science Teachers Network',
    description: 'Connecting science educators',
    category: {
      id: '1',
      name: 'Subject Communities',
      description: 'Communities organized by subject',
      color: '#28a745',
      icon: '🔬',
    },
    memberCount: 89,
    isPublic: true,
    isJoined: true,
    moderators: [],
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01'),
    subjects: [{ id: '2', name: 'Science', code: 'SCI' }],
    gradeLevels: [{ id: '2', name: 'Primary 4-7', order: 2 }],
    activityLevel: 'medium' as any,
    lastActivityAt: new Date('2023-11-15'),
  },
];

describe('Communities Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CommunitiesListScreen', () => {
    it('should display list of communities', async () => {
      const mockResponse = {
        data: mockCommunities,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
        expect(screen.getByText('Science Teachers Network')).toBeTruthy();
      });

      expect(screen.getByText('150 members')).toBeTruthy();
      expect(screen.getByText('89 members')).toBeTruthy();
    });

    it('should handle search functionality', async () => {
      const mockResponse = {
        data: [mockCommunities[0]], // Only math community
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      // Find and interact with search input
      const searchInput = screen.getByPlaceholderText('Search communities...');
      fireEvent.changeText(searchInput, 'math');

      await waitFor(() => {
        expect(mockCommunitiesService.getCommunities).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'math',
          })
        );
      });
    });

    it('should handle join community action', async () => {
      const mockResponse = {
        data: mockCommunities,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);
      mockCommunitiesService.joinCommunity.mockResolvedValue();

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
      });

      // Find and press join button for the first community
      const joinButtons = screen.getAllByText('Join');
      fireEvent.press(joinButtons[0]);

      await waitFor(() => {
        expect(mockCommunitiesService.joinCommunity).toHaveBeenCalledWith({
          communityId: '1',
          message: undefined,
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'You have successfully joined the community!'
      );
    });

    it('should handle leave community action', async () => {
      const mockResponse = {
        data: mockCommunities,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);
      mockCommunitiesService.leaveCommunity.mockResolvedValue();

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Science Teachers Network')).toBeTruthy();
      });

      // Find and press leave button for the joined community
      const leaveButton = screen.getByText('Leave');
      fireEvent.press(leaveButton);

      // Confirm leave action in alert
      expect(Alert.alert).toHaveBeenCalledWith(
        'Leave Community',
        'Are you sure you want to leave "Science Teachers Network"?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Leave' }),
        ])
      );
    });

    it('should display empty state when no communities found', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Communities Found')).toBeTruthy();
        expect(screen.getByText('Try adjusting your search or filters to find communities.')).toBeTruthy();
      });
    });

    it('should handle error state', async () => {
      const mockError = new Error('Failed to fetch communities');
      mockCommunitiesService.getCommunities.mockRejectedValue(mockError);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={null as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Communities')).toBeTruthy();
        expect(screen.getByText('Failed to fetch communities')).toBeTruthy();
      });
    });
  });

  describe('CommunityDetailScreen', () => {
    it('should display community details', async () => {
      const mockCommunity = mockCommunities[0];
      mockCommunitiesService.getCommunity.mockResolvedValue(mockCommunity);
      mockCommunitiesService.getCommunityMembers.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      render(
        <TestWrapper initialRouteName="CommunityDetail" initialParams={{ communityId: '1' }}>
          <CommunityDetailScreen
            navigation={null as any}
            route={{ params: { communityId: '1' } } as any}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
        expect(screen.getByText('A community for mathematics teachers')).toBeTruthy();
        expect(screen.getByText('150')).toBeTruthy(); // Member count
        expect(screen.getByText('Mathematics')).toBeTruthy(); // Subject tag
      });
    });

    it('should handle join community from detail screen', async () => {
      const mockCommunity = mockCommunities[0];
      mockCommunitiesService.getCommunity.mockResolvedValue(mockCommunity);
      mockCommunitiesService.getCommunityMembers.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
      mockCommunitiesService.joinCommunity.mockResolvedValue();

      render(
        <TestWrapper initialRouteName="CommunityDetail" initialParams={{ communityId: '1' }}>
          <CommunityDetailScreen
            navigation={null as any}
            route={{ params: { communityId: '1' } } as any}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
      });

      const joinButton = screen.getByText('Join');
      fireEvent.press(joinButton);

      await waitFor(() => {
        expect(mockCommunitiesService.joinCommunity).toHaveBeenCalledWith({
          communityId: '1',
          message: undefined,
        });
      });
    });

    it('should display error state for invalid community', async () => {
      const mockError = new Error('Community not found');
      mockCommunitiesService.getCommunity.mockRejectedValue(mockError);

      render(
        <TestWrapper initialRouteName="CommunityDetail" initialParams={{ communityId: 'invalid' }}>
          <CommunityDetailScreen
            navigation={null as any}
            route={{ params: { communityId: 'invalid' } } as any}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Community')).toBeTruthy();
        expect(screen.getByText('Community not found')).toBeTruthy();
      });
    });
  });

  describe('End-to-End Community Flow', () => {
    it('should navigate from list to detail screen', async () => {
      const mockResponse = {
        data: [mockCommunities[0]],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockCommunitiesService.getCommunities.mockResolvedValue(mockResponse);
      mockCommunitiesService.getCommunityCategories.mockResolvedValue([]);
      mockCommunitiesService.getCommunity.mockResolvedValue(mockCommunities[0]);
      mockCommunitiesService.getCommunityMembers.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const mockNavigation = {
        navigate: jest.fn(),
        goBack: jest.fn(),
      };

      render(
        <TestWrapper>
          <CommunitiesListScreen navigation={mockNavigation as any} route={null as any} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Math Teachers Uganda')).toBeTruthy();
      });

      // Press on community card to navigate to detail
      fireEvent.press(screen.getByText('Math Teachers Uganda'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CommunityDetail', {
        communityId: '1',
      });
    });
  });
});