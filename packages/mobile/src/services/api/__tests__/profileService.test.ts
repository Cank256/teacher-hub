/**
 * Profile Service Tests
 */

import { profileService, UpdateProfileRequest } from '../profileService';
import { ApiClient } from '../apiClient';
import { User, Subject, GradeLevel, Location, VerificationStatus } from '@/types';

// Mock the ApiClient
jest.mock('../apiClient');
const mockApiClient = ApiClient.getInstance() as jest.Mocked<ApiClient>;

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/profile.jpg',
        subjects: [],
        gradeLevels: [],
        schoolLocation: {
          id: '1',
          name: 'Test School',
          district: 'Test District',
          region: 'Test Region',
        },
        yearsOfExperience: 5,
        verificationStatus: VerificationStatus.VERIFIED,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockApiClient.get.mockResolvedValue({ data: mockProfile });

      const result = await profileService.getProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/profile', undefined, {
        requiresAuth: true,
      });
      expect(result).toEqual(mockProfile);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(profileService.getProfile()).rejects.toThrow('Network error');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData: UpdateProfileRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
        subjects: ['1', '2'],
        gradeLevels: ['1'],
        schoolLocationId: '2',
        yearsOfExperience: 3,
      };

      const updatedProfile: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        subjects: [],
        gradeLevels: [],
        schoolLocation: {
          id: '2',
          name: 'Updated School',
          district: 'Updated District',
          region: 'Updated Region',
        },
        yearsOfExperience: 3,
        verificationStatus: VerificationStatus.VERIFIED,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      mockApiClient.patch.mockResolvedValue({ data: updatedProfile });

      const result = await profileService.updateProfile(updateData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/profile', updateData, {
        requiresAuth: true,
      });
      expect(result).toEqual(updatedProfile);
    });

    it('should handle validation errors', async () => {
      const updateData: UpdateProfileRequest = {
        firstName: '',
        lastName: 'Smith',
      };

      const error = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: ['First name is required'],
          },
        },
      };

      mockApiClient.patch.mockRejectedValue(error);

      await expect(profileService.updateProfile(updateData)).rejects.toEqual(error);
    });
  });

  describe('uploadProfilePicture', () => {
    it('should upload profile picture successfully', async () => {
      const imageUri = 'file:///path/to/image.jpg';
      const uploadResult = {
        profilePictureUrl: 'https://example.com/new-profile.jpg',
        thumbnailUrl: 'https://example.com/new-profile-thumb.jpg',
      };

      mockApiClient.uploadFile.mockResolvedValue({ data: uploadResult });

      const result = await profileService.uploadProfilePicture(imageUri);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        '/profile/picture',
        expect.any(FormData),
        { requiresAuth: true }
      );
      expect(result).toEqual(uploadResult);
    });

    it('should handle upload errors', async () => {
      const imageUri = 'file:///path/to/image.jpg';
      const error = new Error('Upload failed');

      mockApiClient.uploadFile.mockRejectedValue(error);

      await expect(profileService.uploadProfilePicture(imageUri)).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteProfilePicture', () => {
    it('should delete profile picture successfully', async () => {
      mockApiClient.delete.mockResolvedValue({ data: null });

      await profileService.deleteProfilePicture();

      expect(mockApiClient.delete).toHaveBeenCalledWith('/profile/picture', {
        requiresAuth: true,
      });
    });
  });

  describe('getSubjects', () => {
    it('should fetch subjects successfully', async () => {
      const mockSubjects: Subject[] = [
        { id: '1', name: 'Mathematics', code: 'MATH' },
        { id: '2', name: 'English', code: 'ENG' },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockSubjects });

      const result = await profileService.getSubjects();

      expect(mockApiClient.get).toHaveBeenCalledWith('/subjects');
      expect(result).toEqual(mockSubjects);
    });
  });

  describe('getGradeLevels', () => {
    it('should fetch grade levels successfully', async () => {
      const mockGradeLevels: GradeLevel[] = [
        { id: '1', name: 'Primary 1', order: 1 },
        { id: '2', name: 'Primary 2', order: 2 },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockGradeLevels });

      const result = await profileService.getGradeLevels();

      expect(mockApiClient.get).toHaveBeenCalledWith('/grade-levels');
      expect(result).toEqual(mockGradeLevels);
    });
  });

  describe('getLocations', () => {
    it('should fetch locations successfully', async () => {
      const mockLocations: Location[] = [
        {
          id: '1',
          name: 'School A',
          district: 'District A',
          region: 'Region A',
        },
        {
          id: '2',
          name: 'School B',
          district: 'District B',
          region: 'Region B',
        },
      ];

      mockApiClient.get.mockResolvedValue({ data: mockLocations });

      const result = await profileService.getLocations();

      expect(mockApiClient.get).toHaveBeenCalledWith('/locations');
      expect(result).toEqual(mockLocations);
    });
  });

  describe('getPreferences', () => {
    it('should fetch user preferences successfully', async () => {
      const mockPreferences = {
        notifications: {
          posts: true,
          communities: true,
          messages: true,
          government: false,
        },
        privacy: {
          showEmail: false,
          showLocation: true,
          showExperience: true,
        },
        language: 'en',
        theme: 'system' as const,
      };

      mockApiClient.get.mockResolvedValue({ data: mockPreferences });

      const result = await profileService.getPreferences();

      expect(mockApiClient.get).toHaveBeenCalledWith('/profile/preferences', undefined, {
        requiresAuth: true,
      });
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const preferences = {
        notifications: {
          posts: false,
          communities: true,
          messages: true,
          government: true,
        },
      };

      const updatedPreferences = {
        notifications: {
          posts: false,
          communities: true,
          messages: true,
          government: true,
        },
        privacy: {
          showEmail: false,
          showLocation: true,
          showExperience: true,
        },
        language: 'en',
        theme: 'system' as const,
      };

      mockApiClient.patch.mockResolvedValue({ data: updatedPreferences });

      const result = await profileService.updatePreferences(preferences);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/profile/preferences', preferences, {
        requiresAuth: true,
      });
      expect(result).toEqual(updatedPreferences);
    });
  });

  describe('getVerificationDetails', () => {
    it('should fetch verification details successfully', async () => {
      const mockDetails = {
        status: 'verified',
        submittedAt: new Date('2024-01-01'),
        reviewedAt: new Date('2024-01-02'),
        feedback: 'All documents verified successfully',
        documents: [
          {
            id: '1',
            type: 'teaching_certificate',
            status: 'verified',
            uploadedAt: new Date('2024-01-01'),
          },
        ],
      };

      mockApiClient.get.mockResolvedValue({ data: mockDetails });

      const result = await profileService.getVerificationDetails();

      expect(mockApiClient.get).toHaveBeenCalledWith('/profile/verification', undefined, {
        requiresAuth: true,
      });
      expect(result).toEqual(mockDetails);
    });
  });
});