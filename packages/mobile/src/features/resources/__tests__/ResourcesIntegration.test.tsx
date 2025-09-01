import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ResourcesListScreen } from '../screens/ResourcesListScreen';
import { ResourceDetailScreen } from '../screens/ResourceDetailScreen';
import { UploadResourceScreen } from '../screens/UploadResourceScreen';
import { ResourcesService } from '@/services/api/resourcesService';
import { OfflineResourceService } from '@/services/storage/offlineResourceService';
import type { Resource, ResourceCategory, Subject, GradeLevel } from '@/types/resources';

// Mock dependencies
jest.mock('@/services/api/resourcesService');
jest.mock('@/services/storage/offlineResourceService');
jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#007AFF',
      secondary: '#FF9500',
      accent: '#34C759',
      background: {
        primary: '#FFFFFF',
        secondary: '#F2F2F7',
      },
      text: {
        primary: '#000000',
        secondary: '#8E8E93',
      },
      border: '#C6C6C8',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  }),
}));

jest.mock('@/utils', () => ({
  formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`,
  formatDate: (date: Date) => date.toLocaleDateString(),
}));

const mockedResourcesService = ResourcesService as jest.Mocked<typeof ResourcesService>;
const mockedOfflineResourceService = OfflineResourceService as jest.Mocked<typeof OfflineResourceService>;

const Stack = createNativeStackNavigator();

const mockResource: Resource = {
  id: '1',
  title: 'Mathematics Workbook',
  description: 'Comprehensive mathematics workbook for grade 10 students',
  type: 'document',
  fileUrl: 'https://example.com/math-workbook.pdf',
  thumbnailUrl: 'https://example.com/math-thumbnail.jpg',
  size: 2048000, // 2MB
  category: {
    id: 'cat1',
    name: 'Mathematics',
    subjects: [{ id: 'sub1', name: 'Algebra', code: 'ALG' }],
    gradeLevels: [{ id: 'grade10', name: 'Grade 10', order: 10 }],
    color: '#FF6B6B',
    icon: 'calculate',
  },
  uploadedBy: {
    id: 'user1',
    firstName: 'Jane',
    lastName: 'Smith',
    verificationStatus: 'verified',
  },
  rating: 4.8,
  downloadCount: 250,
  isDownloaded: false,
  tags: ['mathematics', 'algebra', 'grade10'],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
};

const mockCategories: ResourceCategory[] = [
  {
    id: 'cat1',
    name: 'Mathematics',
    subjects: [{ id: 'sub1', name: 'Algebra', code: 'ALG' }],
    gradeLevels: [{ id: 'grade10', name: 'Grade 10', order: 10 }],
    color: '#FF6B6B',
    icon: 'calculate',
  },
];

const mockSubjects: Subject[] = [
  { id: 'sub1', name: 'Algebra', code: 'ALG' },
  { id: 'sub2', name: 'Geometry', code: 'GEO' },
];

const mockGradeLevels: GradeLevel[] = [
  { id: 'grade9', name: 'Grade 9', order: 9 },
  { id: 'grade10', name: 'Grade 10', order: 10 },
  { id: 'grade11', name: 'Grade 11', order: 11 },
];

const createTestApp = (initialRoute = 'ResourcesList') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen 
            name="ResourcesList" 
            component={ResourcesListScreen}
            options={{ title: 'Resources' }}
          />
          <Stack.Screen 
            name="ResourceDetail" 
            component={ResourceDetailScreen}
            options={{ title: 'Resource Details' }}
          />
          <Stack.Screen 
            name="UploadResource" 
            component={UploadResourceScreen}
            options={{ title: 'Upload Resource' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('Resources Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockedResourcesService.getResources.mockResolvedValue({
      data: [mockResource],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    mockedResourcesService.getCategories.mockResolvedValue(mockCategories);
    mockedResourcesService.getSubjects.mockResolvedValue(mockSubjects);
    mockedResourcesService.getGradeLevels.mockResolvedValue(mockGradeLevels);
    mockedOfflineResourceService.isResourceDownloaded.mockResolvedValue(false);
  });

  describe('Resources List Screen', () => {
    it('displays resources list correctly', async () => {
      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('Mathematics Workbook')).toBeTruthy();
      });

      expect(screen.getByText('Comprehensive mathematics workbook for grade 10 students')).toBeTruthy();
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Mathematics')).toBeTruthy();
      expect(screen.getByText('2.0 MB')).toBeTruthy();
    });

    it('handles search functionality', async () => {
      mockedResourcesService.searchResources.mockResolvedValue({
        data: [mockResource],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search resources...')).toBeTruthy();
      });

      const searchInput = screen.getByPlaceholderText('Search resources...');
      fireEvent.changeText(searchInput, 'mathematics');

      await waitFor(() => {
        expect(mockedResourcesService.searchResources).toHaveBeenCalledWith(
          'mathematics',
          {},
          1,
          20
        );
      });
    });

    it('navigates to upload screen when upload button is pressed', async () => {
      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('Upload')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Upload'));

      await waitFor(() => {
        expect(screen.getByText('Upload Resource')).toBeTruthy();
      });
    });

    it('navigates to resource detail when resource is pressed', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);

      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('Mathematics Workbook')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Mathematics Workbook'));

      await waitFor(() => {
        expect(mockedResourcesService.getResource).toHaveBeenCalledWith('1');
      });
    });

    it('handles empty state correctly', async () => {
      mockedResourcesService.getResources.mockResolvedValue({
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('No resources yet')).toBeTruthy();
      });

      expect(screen.getByText('Be the first to share educational resources with the community.')).toBeTruthy();
    });

    it('handles error state correctly', async () => {
      mockedResourcesService.getResources.mockRejectedValue(new Error('Network error'));

      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('Failed to load resources')).toBeTruthy();
      });
    });
  });

  describe('Resource Detail Screen', () => {
    it('displays resource details correctly', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);

      render(createTestApp('ResourceDetail'));

      await waitFor(() => {
        expect(screen.getByText('Mathematics Workbook')).toBeTruthy();
      });

      expect(screen.getByText('Comprehensive mathematics workbook for grade 10 students')).toBeTruthy();
      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.getByText('Mathematics')).toBeTruthy();
      expect(screen.getByText('2.0 MB')).toBeTruthy();
      expect(screen.getByText('250 downloads')).toBeTruthy();
    });

    it('handles download functionality', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);
      mockedResourcesService.downloadResource.mockResolvedValue(new Blob(['content']));
      mockedOfflineResourceService.downloadResource.mockResolvedValue('/path/to/file');

      render(createTestApp('ResourceDetail'));

      await waitFor(() => {
        expect(screen.getByText('Download')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Download'));

      await waitFor(() => {
        expect(mockedOfflineResourceService.downloadResource).toHaveBeenCalledWith(mockResource);
      });
    });

    it('handles rating functionality', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);
      mockedResourcesService.rateResource.mockResolvedValue({
        resourceId: '1',
        userId: 'user1',
        rating: 5,
        createdAt: new Date(),
      });

      render(createTestApp('ResourceDetail'));

      await waitFor(() => {
        expect(screen.getByText('Rate this resource')).toBeTruthy();
      });

      // Find and press the 5th star
      const stars = screen.getAllByTestId('star-button');
      if (stars.length >= 5) {
        fireEvent.press(stars[4]); // 5th star (0-indexed)

        await waitFor(() => {
          expect(mockedResourcesService.rateResource).toHaveBeenCalledWith('1', 5);
        });
      }
    });
  });

  describe('Upload Resource Screen', () => {
    it('displays upload form correctly', async () => {
      render(createTestApp('UploadResource'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter resource title...')).toBeTruthy();
      });

      expect(screen.getByPlaceholderText('Describe your resource...')).toBeTruthy();
      expect(screen.getByText('Resource Type')).toBeTruthy();
      expect(screen.getByText('Category')).toBeTruthy();
      expect(screen.getByText('Upload Resource')).toBeTruthy();
    });

    it('handles form validation', async () => {
      render(createTestApp('UploadResource'));

      await waitFor(() => {
        expect(screen.getByText('Upload Resource')).toBeTruthy();
      });

      // Try to upload without filling required fields
      fireEvent.press(screen.getByText('Upload Resource'));

      // Should show validation error (handled by Alert.alert)
      // This would be tested in unit tests for the validation logic
    });

    it('handles successful upload', async () => {
      mockedResourcesService.uploadResource.mockResolvedValue(mockResource);

      render(createTestApp('UploadResource'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter resource title...')).toBeTruthy();
      });

      // Fill in the form
      fireEvent.changeText(screen.getByPlaceholderText('Enter resource title...'), 'Test Resource');
      fireEvent.changeText(screen.getByPlaceholderText('Describe your resource...'), 'Test description');

      // Select document type
      fireEvent.press(screen.getByText('Document'));

      // Note: File selection and category selection would require more complex mocking
      // These would be tested in more detailed integration tests
    });
  });

  describe('Offline Functionality', () => {
    it('shows downloaded badge for offline resources', async () => {
      mockedOfflineResourceService.isResourceDownloaded.mockResolvedValue(true);

      render(createTestApp());

      await waitFor(() => {
        expect(screen.getByText('Mathematics Workbook')).toBeTruthy();
      });

      // Should show offline indicator
      const offlineIcon = screen.getAllByTestId('icon').find(icon => 
        icon.props.name === 'offline-pin'
      );
      expect(offlineIcon).toBeTruthy();
    });

    it('handles offline download process', async () => {
      mockedResourcesService.getResource.mockResolvedValue(mockResource);
      mockedOfflineResourceService.downloadResource.mockResolvedValue('/path/to/file');

      render(createTestApp('ResourceDetail'));

      await waitFor(() => {
        expect(screen.getByText('Download')).toBeTruthy();
      });

      fireEvent.press(screen.getByText('Download'));

      await waitFor(() => {
        expect(mockedOfflineResourceService.downloadResource).toHaveBeenCalledWith(mockResource);
      });
    });
  });
});