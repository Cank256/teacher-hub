import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  school: string;
  location: string;
  yearsExperience: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  profilePicture?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: null,
};

const BACKEND_URL = import.meta.env.REACT_BACKEND_URL || "http://localhost:8001";

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string; rememberMe: boolean }, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.message || 'Login failed');
      }

      const response_data = await response.json();
      const data = response_data.data; // Extract data from the response wrapper

      // Store tokens in localStorage if remember me is checked
      if (credentials.rememberMe) {
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
      } else {
        sessionStorage.setItem('auth_token', data.accessToken);
        sessionStorage.setItem('refresh_token', data.refreshToken);
      }

      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: {
    fullName: string;
    email: string;
    password: string;
    subjects: string[];
    gradeLevels: string[];
    school: string;
    location: string;
    yearsExperience: number;
    credentialFile: File;
  }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Object.entries(userData).forEach(([key, value]) => {
        if (key === 'subjects' || key === 'gradeLevels') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'credentialFile') {
          formData.append(key, value as File);
        } else {
          formData.append(key, String(value));
        }
      });

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || error.message || 'Registration failed');
      }

      const response_data = await response.json();
      const data = response_data.data; // Extract data from the response wrapper
      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.refreshToken;

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return rejectWithValue('Token refresh failed');
      }

      const result = await response.json();
      const data = result.data;

      // Update stored tokens
      const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
      storage.setItem('auth_token', data.accessToken);
      storage.setItem('refresh_token', data.refreshToken);

      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || error.message || 'Failed to send reset email');
      }

      return { email };
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

      if (!token) {
        return rejectWithValue('No stored authentication');
      }

      // Validate token with API and get user data
      const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Clear invalid tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
        return rejectWithValue('Invalid stored token');
      }

      const result = await response.json();
      const user = result.data;
      return { user, token, refreshToken };
    } catch (error) {
      return rejectWithValue('Failed to load user data');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (authCode: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: authCode }),
      });

      const response_data = await response.json();

      if (!response.ok) {
        if (response.status === 202 && response_data.requiresRegistration) {
          // User needs to complete registration
          return rejectWithValue({
            type: 'REGISTRATION_REQUIRED',
            message: response_data.error?.message || 'Registration required',
            authCode
          });
        }
        return rejectWithValue(response_data.error?.message || 'Google login failed');
      }

      const data = response_data.data;

      // Store tokens
      localStorage.setItem('auth_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);

      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const googleRegister = createAsyncThunk(
  'auth/googleRegister',
  async (registrationData: {
    authCode: string;
    subjects: string[];
    gradeLevels: string[];
    schoolLocation: { district: string; region: string };
    yearsExperience: number;
    credentials: File[];
    bio?: string;
  }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('code', registrationData.authCode);
      formData.append('subjects', JSON.stringify(registrationData.subjects));
      formData.append('gradeLevels', JSON.stringify(registrationData.gradeLevels));
      formData.append('schoolLocation', JSON.stringify(registrationData.schoolLocation));
      formData.append('yearsExperience', registrationData.yearsExperience.toString());

      if (registrationData.bio) {
        formData.append('bio', registrationData.bio);
      }

      // Add credential files
      registrationData.credentials.forEach((file) => {
        formData.append('credentialDocuments', file);
      });

      // Add credentials metadata
      const credentialsMetadata = registrationData.credentials.map(() => ({
        type: 'teaching_license',
        institution: 'To be verified',
        issueDate: new Date(),
        documentUrl: '' // Will be set by backend
      }));
      formData.append('credentials', JSON.stringify(credentialsMetadata));

      const response = await fetch(`${BACKEND_URL}/api/auth/google/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Google registration failed');
      }

      const response_data = await response.json();
      const data = response_data.data;

      // Store tokens
      localStorage.setItem('auth_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);

      return data;
    } catch (error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.lastActivity = null;

      // Clear stored tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // Registration might not immediately authenticate the user
        if (action.payload.user) {
          state.user = action.payload.user;
          state.token = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
          state.lastActivity = Date.now();
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Refresh token
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.lastActivity = Date.now();
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        // If refresh fails, logout the user
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.lastActivity = null;
      })

      // Forgot password
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Load from storage
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      })
      .addCase(loadUserFromStorage.rejected, (state) => {
        // Silently fail - user just needs to login again
        state.isAuthenticated = false;
      })

      // Google Login
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        const payload = action.payload as any;
        if (payload?.type === 'REGISTRATION_REQUIRED') {
          state.error = payload.message;
        } else {
          state.error = payload as string;
        }
      })

      // Google Register
      .addCase(googleRegister.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleRegister.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      })
      .addCase(googleRegister.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, updateLastActivity, updateUser } = authSlice.actions;
export default authSlice.reducer;