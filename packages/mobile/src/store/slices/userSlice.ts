import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
  };
  yearsExperience: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  avatar?: string;
  bio?: string;
}

export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (userId: string) => {
    // This would call the actual API
    // For now, return mock data
    return {
      id: userId,
      email: 'teacher@example.com',
      fullName: 'John Doe',
      subjects: ['Mathematics', 'Physics'],
      gradeLevels: ['S1', 'S2', 'S3'],
      schoolLocation: {
        district: 'Kampala',
        region: 'Central',
      },
      yearsExperience: 5,
      verificationStatus: 'verified' as const,
    };
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = {...state.profile, ...action.payload};
      }
    },
    clearUserData: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch profile';
      });
  },
});

export const {updateProfile, clearUserData} = userSlice.actions;
export default userSlice.reducer;