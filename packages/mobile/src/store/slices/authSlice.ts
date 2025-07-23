import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {authService} from '../../services/auth/authService';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
  } | null;
  token: string | null;
  error: string | null;
  biometric: {
    isAvailable: boolean;
    isEnabled: boolean;
    isLoading: boolean;
  };
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  error: null,
  biometric: {
    isAvailable: false,
    isEnabled: false,
    isLoading: false,
  },
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: {email: string; password: string}) => {
    const response = await authService.login(credentials);
    return response;
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    password: string;
    fullName: string;
    subjects: string[];
    gradeLevels: string[];
    schoolLocation: string;
    yearsExperience: number;
    credentials?: any[];
  }) => {
    const response = await authService.register(userData);
    return response;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuthStatus = createAsyncThunk('auth/checkStatus', async () => {
  const isAuthenticated = await authService.checkAuthStatus();
  if (isAuthenticated) {
    const user = await authService.getCurrentUser();
    return {isAuthenticated: true, user};
  }
  return {isAuthenticated: false, user: null};
});

export const checkBiometricAvailability = createAsyncThunk(
  'auth/checkBiometricAvailability',
  async () => {
    const isAvailable = await authService.isBiometricAvailable();
    const isEnabled = await authService.isBiometricEnabled();
    return {isAvailable, isEnabled};
  }
);

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async () => {
    const result = await authService.enableBiometric();
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }
);

export const disableBiometric = createAsyncThunk(
  'auth/disableBiometric',
  async () => {
    await authService.disableBiometric();
  }
);

export const loginWithBiometric = createAsyncThunk(
  'auth/loginWithBiometric',
  async () => {
    const response = await authService.loginWithBiometric();
    if (!response) {
      throw new Error('Biometric login failed');
    }
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
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
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      // Check auth status
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = action.payload.isAuthenticated;
        state.user = action.payload.user;
      })
      // Check biometric availability
      .addCase(checkBiometricAvailability.fulfilled, (state, action) => {
        state.biometric.isAvailable = action.payload.isAvailable;
        state.biometric.isEnabled = action.payload.isEnabled;
      })
      // Enable biometric
      .addCase(enableBiometric.pending, (state) => {
        state.biometric.isLoading = true;
        state.error = null;
      })
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometric.isLoading = false;
        state.biometric.isEnabled = true;
        state.error = null;
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.biometric.isLoading = false;
        state.error = action.error.message || 'Failed to enable biometric authentication';
      })
      // Disable biometric
      .addCase(disableBiometric.fulfilled, (state) => {
        state.biometric.isEnabled = false;
      })
      // Login with biometric
      .addCase(loginWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Biometric login failed';
      });
  },
});

export const {clearError, setLoading} = authSlice.actions;
export default authSlice.reducer;