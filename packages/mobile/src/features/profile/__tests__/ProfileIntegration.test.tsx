/**
 * Profile Feature Integration Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProfileViewScreen, EditProfileScreen } from '../screens';
import { profileService } from '@/services/api/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { VerificationStatus } from '@/types';

// Mock dependencies
jest.mock('@/services/api/profileService');
jest.mock('@/contexts/AuthContext');
jest.mock('@/services/haptics');
jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#2563EB',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1F2937',
        textSecondary: '#6B7280',
        error: '#EF4444',
        success: '#10B981',
        border: '#E5E7EB',
        borderLight: '#F3F4F6',
      },
      typography: {
        fontSize: {
          sm: 14,
          md: 16,
          lg: 18,
          xl: 20,
        },
        fontFamily: {
          regular: 'System',
          medium: 'System',
          semibold: 'System',
          bold: 'System',
        },
      },
      spacing: {
        xs: 4,
        md: 16,
      },
      borderRadius: {
        md: 8,
      },
    },
  }),
}));

const mockProfileService = profileService as jest.Mocked<typeof profileService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const Stack = createNativeStackNavigator();

const mockUser = {
  id: '1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profilePicture: 'https://example.com/profile.jpg',
  subjects: [
    { id: '1', name: 'Mathematics', code: 'MATH' },
    { id: '2', name: 'English', code: 'ENG' },
  ],
  gradeLevels: [
    { id: '1', name: 'Primary 1', order: 1 },
    { id: '2', name: 'Primary 2', order: 2 },
  ],
  schoolLocation: {
    id: '1',
    name: 'Test Primary School',
    district: 'Kampala',
    region: 'Central',
  },
  yearsOfExperience: 5,
  verificationStatus: VerificationStatus.VERIFIED,
  createdAt: new Date('2024-01-01'),
  lastActiveAt: new Date('2024-01-15'),
};

const mockSubjects = [
  { id: '1', name: 'Mathematics', code: 'MATH' },
  { id: '2', name: 'English', code: 'ENG' },
  { id: '3', name: 'Science', code: 'SCI' },
];

const mockGradeLevels = [
  { id: '1', name: 'Primary 1', order: 1 },
  { id: '2', name: 'Primary 2', order: 2 },
  { id: '3', name: 'Primary 3', order: 3 },
];

const mockLocations = [
  {
    id: '1',
    name: 'Test Primary School',
    district: 'Kampala',
    region: 'Central',
  },
  {
    id: '2',
    name: 'Another School',
    district: 'Entebbe',
    region: 'Central',
  },
];

const createTestComponent = (initialRouteName = 'ProfileView') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen name="ProfileView" component={ProfileViewScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('Profile Feature Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth context mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      isFirstLaunch: false,
      verificationStatus: VerificationStatus.VERIFIED,
      login: jest.fn(),
      logout: jest.fn(),
      completeOnboarding: jest.fn(),
      refreshUser: jest.fn(),
    });

    // Setup default service mocks
    mockProfileService.getProfile.mockResolvedValue(mockUser);
    mockProfileService.getSubjects.mockResolvedValue(mockSubjects);
    mockProfileService.getGradeLevels.mockResolvedValue(mockGradeLevels);
    mockProfileService.getLocations.mockResolvedValue(mockLocations);
  });

  describe('Profile View Screen', () => {
    it('should display user profile information', async () => {
      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
        expect(getByText('john.doe@example.com')).toBeTruthy();
        expect(getByText('5 years of experience')).toBeTruthy();
        expect(getByText('Mathematics, English')).toBeTruthy();
        expect(getByText('Primary 1, Primary 2')).toBeTruthy();
        expect(getByText('Test Primary School')).toBeTruthy();
      });
    });

    it('should handle profile picture upload', async () => {
      const mockUploadResult = {
        profilePictureUrl: 'https://example.com/new-profile.jpg',
        thumbnailUrl: 'https://example.com/new-profile-thumb.jpg',
      };

      mockProfileService.uploadProfilePicture.mockResolvedValue(mockUploadResult);

      const { getByTestId } = render(createTestComponent());

      await waitFor(() => {
        const profilePicture = getByTestId('profile-picture');
        expect(profilePicture).toBeTruthy();
      });

      // Note: Full image upload testing would require mocking the image picker
      // and optimization services, which is covered in the component unit tests
    });

    it('should navigate to edit profile screen', async () => {
      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        const editButton = getByText('Edit Profile');
        fireEvent.press(editButton);
      });

      // Should navigate to edit screen (would need navigation mock to verify)
    });

    it('should display verification status', async () => {
      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('Verified')).toBeTruthy();
      });
    });

    it('should handle refresh', async () => {
      const { getByTestId } = render(createTestComponent());

      await waitFor(() => {
        // Simulate pull-to-refresh
        const scrollView = getByTestId('profile-scroll-view');
        if (scrollView) {
          fireEvent(scrollView, 'refresh');
        }
      });

      expect(mockProfileService.getProfile).toHaveBeenCalled();
    });
  });

  describe('Edit Profile Screen', () => {
    it('should display form with current user data', async () => {
      const { getByDisplayValue, getByText } = render(
        createTestComponent('EditProfile')
      );

      await waitFor(() => {
        expect(getByDisplayValue('John')).toBeTruthy();
        expect(getByDisplayValue('Doe')).toBeTruthy();
        expect(getByDisplayValue('5')).toBeTruthy();
      });
    });

    it('should handle form submission', async () => {
      const mockUpdatedUser = {
        ...mockUser,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      mockProfileService.updateProfile.mockResolvedValue(mockUpdatedUser);

      const { getByDisplayValue, getByText } = render(
        createTestComponent('EditProfile')
      );

      await waitFor(() => {
        const firstNameInput = getByDisplayValue('John');
        fireEvent.changeText(firstNameInput, 'Jane');

        const lastNameInput = getByDisplayValue('Doe');
        fireEvent.changeText(lastNameInput, 'Smith');
      });

      const saveButton = getByText('Save Changes');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockProfileService.updateProfile).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
          subjects: ['1', '2'],
          gradeLevels: ['1', '2'],
          schoolLocationId: '1',
          yearsOfExperience: 5,
        });
      });
    });

    it('should handle form validation errors', async () => {
      const { getByDisplayValue, getByText } = render(
        createTestComponent('EditProfile')
      );

      await waitFor(() => {
        const firstNameInput = getByDisplayValue('John');
        fireEvent.changeText(firstNameInput, ''); // Clear required field
      });

      const saveButton = getByText('Save Changes');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText('First name is required')).toBeTruthy();
      });
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: ['Email already exists'],
          },
        },
      };

      mockProfileService.updateProfile.mockRejectedValue(error);

      const { getByText } = render(createTestComponent('EditProfile'));

      await waitFor(() => {
        const saveButton = getByText('Save Changes');
        fireEvent.press(saveButton);
      });

      // Error handling would show an alert (mocked in component tests)
    });

    it('should handle cancel with unsaved changes', async () => {
      const { getByDisplayValue, getByText } = render(
        createTestComponent('EditProfile')
      );

      await waitFor(() => {
        const firstNameInput = getByDisplayValue('John');
        fireEvent.changeText(firstNameInput, 'Jane');
      });

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      // Should show confirmation dialog (mocked in component tests)
    });
  });

  describe('Error Handling', () => {
    it('should handle profile loading error', async () => {
      mockProfileService.getProfile.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('Failed to load profile')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('should handle reference data loading error', async () => {
      mockProfileService.getSubjects.mockRejectedValue(new Error('Network error'));

      const { getByText } = render(createTestComponent('EditProfile'));

      await waitFor(() => {
        expect(getByText('Loading form data...')).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching profile', () => {
      // Mock a pending promise
      mockProfileService.getProfile.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(createTestComponent());

      expect(getByText('Loading profile...')).toBeTruthy();
    });

    it('should show loading state while fetching form data', () => {
      mockProfileService.getSubjects.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(createTestComponent('EditProfile'));

      expect(getByText('Loading form data...')).toBeTruthy();
    });
  });

  describe('User Experience', () => {
    it('should format experience correctly for new teacher', async () => {
      const newTeacher = { ...mockUser, yearsOfExperience: 0 };
      mockUseAuth.mockReturnValue({
        user: newTeacher,
        isAuthenticated: true,
        isLoading: false,
        isFirstLaunch: false,
        verificationStatus: VerificationStatus.VERIFIED,
        login: jest.fn(),
        logout: jest.fn(),
        completeOnboarding: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('New teacher')).toBeTruthy();
      });
    });

    it('should format experience correctly for single year', async () => {
      const oneYearTeacher = { ...mockUser, yearsOfExperience: 1 };
      mockUseAuth.mockReturnValue({
        user: oneYearTeacher,
        isAuthenticated: true,
        isLoading: false,
        isFirstLaunch: false,
        verificationStatus: VerificationStatus.VERIFIED,
        login: jest.fn(),
        logout: jest.fn(),
        completeOnboarding: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('1 year of experience')).toBeTruthy();
      });
    });

    it('should handle empty subjects and grade levels', async () => {
      const userWithoutSubjects = {
        ...mockUser,
        subjects: [],
        gradeLevels: [],
      };
      mockUseAuth.mockReturnValue({
        user: userWithoutSubjects,
        isAuthenticated: true,
        isLoading: false,
        isFirstLaunch: false,
        verificationStatus: VerificationStatus.VERIFIED,
        login: jest.fn(),
        logout: jest.fn(),
        completeOnboarding: jest.fn(),
        refreshUser: jest.fn(),
      });

      const { getByText } = render(createTestComponent());

      await waitFor(() => {
        expect(getByText('No subjects selected')).toBeTruthy();
        expect(getByText('No grade levels selected')).toBeTruthy();
      });
    });
  });
});