/**
 * Profile Service
 * Handles user profile management API calls
 */

import { ApiClient } from './apiClient';
import { User, Subject, GradeLevel, Location } from '@/types';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  subjects?: string[];
  gradeLevels?: string[];
  schoolLocationId?: string;
  yearsOfExperience?: number;
}

export interface ProfilePictureUploadResult {
  profilePictureUrl: string;
  thumbnailUrl?: string;
}

export interface ProfilePreferences {
  notifications: {
    posts: boolean;
    communities: boolean;
    messages: boolean;
    government: boolean;
  };
  privacy: {
    showEmail: boolean;
    showLocation: boolean;
    showExperience: boolean;
  };
  language: string;
  theme: 'light' | 'dark' | 'system';
}

class ProfileService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    const response = await this.apiClient.get<User>('/profile', undefined, {
      requiresAuth: true,
    });
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    const response = await this.apiClient.patch<User>('/profile', updates, {
      requiresAuth: true,
    });
    return response.data;
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(imageUri: string): Promise<ProfilePictureUploadResult> {
    const formData = new FormData();
    
    // Create file object for upload
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('profilePicture', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await this.apiClient.uploadFile<ProfilePictureUploadResult>(
      '/profile/picture',
      formData,
      {
        requiresAuth: true,
      }
    );

    return response.data;
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(): Promise<void> {
    await this.apiClient.delete('/profile/picture', {
      requiresAuth: true,
    });
  }

  /**
   * Get available subjects
   */
  async getSubjects(): Promise<Subject[]> {
    const response = await this.apiClient.get<Subject[]>('/subjects');
    return response.data;
  }

  /**
   * Get available grade levels
   */
  async getGradeLevels(): Promise<GradeLevel[]> {
    const response = await this.apiClient.get<GradeLevel[]>('/grade-levels');
    return response.data;
  }

  /**
   * Get available locations
   */
  async getLocations(): Promise<Location[]> {
    const response = await this.apiClient.get<Location[]>('/locations');
    return response.data;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<ProfilePreferences> {
    const response = await this.apiClient.get<ProfilePreferences>('/profile/preferences', undefined, {
      requiresAuth: true,
    });
    return response.data;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<ProfilePreferences>): Promise<ProfilePreferences> {
    const response = await this.apiClient.patch<ProfilePreferences>('/profile/preferences', preferences, {
      requiresAuth: true,
    });
    return response.data;
  }

  /**
   * Get verification status details
   */
  async getVerificationDetails(): Promise<{
    status: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    feedback?: string;
    documents: Array<{
      id: string;
      type: string;
      status: string;
      uploadedAt: Date;
    }>;
  }> {
    const response = await this.apiClient.get('/profile/verification', undefined, {
      requiresAuth: true,
    });
    return response.data;
  }
}

export const profileService = new ProfileService();