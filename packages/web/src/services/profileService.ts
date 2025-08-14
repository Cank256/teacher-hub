import { authService } from './authService';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export interface ProfileUpdateData {
  fullName?: string;
  email?: string;
  school?: string;
  subjects?: string[];
  gradeLevels?: string[];
  yearsExperience?: number;
  location?: string;
  bio?: string;
  phone?: string;
  profileImage?: File;
}

class ProfileService {
  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: ProfileUpdateData) {
    const formData = new FormData();
    
    // Add text fields
    Object.entries(updateData).forEach(([key, value]) => {
      if (key === 'profileImage') {
        if (value instanceof File) {
          formData.append('profileImage', value);
        }
      } else if (key === 'subjects' || key === 'gradeLevels') {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        }
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}`, {
      method: 'PUT',
      headers: {
        ...authService.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update profile');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string) {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch profile');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Search profiles
   */
  async searchProfiles(params: {
    query?: string;
    subject?: string;
    gradeLevel?: string;
    district?: string;
    region?: string;
    verificationStatus?: string;
    minExperience?: number;
    maxExperience?: number;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${BACKEND_URL}/api/profile/search?${searchParams}`, {
      headers: {
        ...authService.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to search profiles');
    }

    const result = await response.json();
    return result.data;
  }
}

export const profileService = new ProfileService();