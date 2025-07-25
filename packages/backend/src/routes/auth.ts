import express from 'express';
import multer from 'multer';
import { authService, RegisterUserRequest, LoginRequest } from '../services/authService';
import { validateCredentialDocument } from '../utils/validation';
import logger from '../utils/logger';
import { authenticateToken, authRateLimit, requireOwnership } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/credentials/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

/**
 * POST /auth/register
 * Register a new teacher with credential verification
 */
router.post('/register', authRateLimit, upload.array('credentialDocuments', 5), async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      subjects,
      gradeLevels,
      schoolLocation,
      yearsExperience,
      bio
    } = req.body;

    // Parse JSON fields
    let parsedSubjects: string[];
    let parsedGradeLevels: string[];
    let parsedSchoolLocation: any;
    let parsedCredentials: any[] = [];

    try {
      parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
      parsedGradeLevels = typeof gradeLevels === 'string' ? JSON.parse(gradeLevels) : gradeLevels;
      parsedSchoolLocation = typeof schoolLocation === 'string' ? JSON.parse(schoolLocation) : schoolLocation;
      
      // Parse credentials if provided
      if (req.body.credentials) {
        parsedCredentials = typeof req.body.credentials === 'string' 
          ? JSON.parse(req.body.credentials) 
          : req.body.credentials;
      }
    } catch (parseError) {
      return res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON format in request body',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate uploaded files
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      for (const file of files) {
        if (!validateCredentialDocument(file)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE',
              message: `Invalid credential document: ${file.originalname}`,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      // Map uploaded files to credentials
      parsedCredentials = parsedCredentials.map((cred: any, index: number) => ({
        ...cred,
        documentUrl: files[index] ? `/uploads/credentials/${files[index].filename}` : cred.documentUrl
      }));
    }

    const registrationData: RegisterUserRequest = {
      email,
      password,
      fullName,
      subjects: parsedSubjects,
      gradeLevels: parsedGradeLevels,
      schoolLocation: parsedSchoolLocation,
      yearsExperience: parseInt(yearsExperience),
      credentials: parsedCredentials,
      bio
    };

    const result = await authService.registerUser(registrationData);

    res.status(201).json({
      message: 'User registered successfully',
      data: result
    });

  } catch (error) {
    logger.error('Registration failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(400).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await authService.loginUser({ email, password });

    res.json({
      message: 'Login successful',
      data: result
    });

  } catch (error) {
    logger.error('Login failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(401).json({
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      message: 'Token refreshed successfully',
      data: result
    });

  } catch (error) {
    logger.error('Token refresh failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(401).json({
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/verify-credential
 * Verify a specific credential (admin/moderator only)
 */
router.post('/verify-credential', async (req, res) => {
  try {
    const { userId, credentialId, status, notes } = req.body;

    if (!userId || !credentialId || !status) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'userId, credentialId, and status are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Status must be either "verified" or "rejected"',
          timestamp: new Date().toISOString()
        }
      });
    }

    await authService.verifyCredentials(userId, credentialId, status, notes);

    res.json({
      message: 'Credential verification updated successfully'
    });

  } catch (error) {
    logger.error('Credential verification failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(400).json({
      error: {
        code: 'VERIFICATION_FAILED',
        message: error instanceof Error ? error.message : 'Credential verification failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await authService.findUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Remove sensitive information
    const { passwordHash, ...userProfile } = user;

    res.json({
      message: 'Profile retrieved successfully',
      data: userProfile
    });

  } catch (error) {
    logger.error('Profile fetch failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch profile',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/validate-email
 * Validate email format and availability
 */
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if email is already registered
    const existingUser = await authService.findUserByEmail(email);
    
    res.json({
      available: !existingUser,
      message: existingUser ? 'Email is already registered' : 'Email is available'
    });

  } catch (error) {
    logger.error('Email validation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    res.status(500).json({
      error: {
        code: 'EMAIL_VALIDATION_FAILED',
        message: 'Failed to validate email',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Extract token ID from refresh token and revoke it
      try {
        const decoded = authService.verifyRefreshToken(refreshToken);
        if (decoded.tokenId) {
          await authService.revokeRefreshToken(decoded.tokenId);
        }
      } catch (error) {
        // Token might be invalid, but we still want to complete logout
        logger.warn('Failed to revoke refresh token during logout', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    logger.info('User logged out successfully', { userId: req.user?.userId });

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout user from all devices by revoking all refresh tokens
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    await authService.revokeAllUserTokens(req.user.userId);

    logger.info('User logged out from all devices', { userId: req.user.userId });

    res.json({
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    logger.error('Logout all failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'LOGOUT_ALL_FAILED',
        message: 'Failed to logout from all devices',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PASSWORDS',
          message: 'Current password and new password are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Password change failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'PASSWORD_CHANGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to change password',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /auth/google
 * Get Google OAuth authorization URL
 */
router.get('/google', (req, res) => {
  try {
    const state = req.query.state as string;
    const authUrl = authService.getGoogleAuthUrl(state);

    res.json({
      authUrl,
      message: 'Google OAuth authorization URL generated'
    });

  } catch (error) {
    logger.error('Failed to generate Google auth URL', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(500).json({
      error: {
        code: 'GOOGLE_AUTH_URL_FAILED',
        message: 'Failed to generate Google authorization URL',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/google/callback
 * Handle Google OAuth callback
 */
router.post('/google/callback', authRateLimit, async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        error: {
          code: 'MISSING_AUTH_CODE',
          message: 'Authorization code is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    try {
      const result = await authService.handleGoogleCallback({ code, state });

      res.json({
        message: 'Google OAuth login successful',
        data: result
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'REGISTRATION_REQUIRED') {
        // User needs to complete registration
        return res.status(202).json({
          error: {
            code: 'REGISTRATION_REQUIRED',
            message: 'User registration required. Please complete your profile.',
            timestamp: new Date().toISOString()
          },
          requiresRegistration: true
        });
      }
      throw error;
    }

  } catch (error) {
    logger.error('Google OAuth callback failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'GOOGLE_AUTH_FAILED',
        message: error instanceof Error ? error.message : 'Google authentication failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/google/register
 * Register new user with Google OAuth
 */
router.post('/google/register', authRateLimit, upload.array('credentialDocuments', 5), async (req, res) => {
  try {
    const {
      code,
      subjects,
      gradeLevels,
      schoolLocation,
      yearsExperience,
      bio
    } = req.body;

    if (!code) {
      return res.status(400).json({
        error: {
          code: 'MISSING_AUTH_CODE',
          message: 'Authorization code is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Parse JSON fields
    let parsedSubjects: string[];
    let parsedGradeLevels: string[];
    let parsedSchoolLocation: any;
    let parsedCredentials: any[] = [];

    try {
      parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
      parsedGradeLevels = typeof gradeLevels === 'string' ? JSON.parse(gradeLevels) : gradeLevels;
      parsedSchoolLocation = typeof schoolLocation === 'string' ? JSON.parse(schoolLocation) : schoolLocation;
      
      if (req.body.credentials) {
        parsedCredentials = typeof req.body.credentials === 'string' 
          ? JSON.parse(req.body.credentials) 
          : req.body.credentials;
      }
    } catch (parseError) {
      return res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON format in request body',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate uploaded files
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      for (const file of files) {
        if (!validateCredentialDocument(file)) {
          return res.status(400).json({
            error: {
              code: 'INVALID_FILE',
              message: `Invalid credential document: ${file.originalname}`,
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      parsedCredentials = parsedCredentials.map((cred: any, index: number) => ({
        ...cred,
        documentUrl: files[index] ? `/uploads/credentials/${files[index].filename}` : cred.documentUrl
      }));
    }

    // Get Google user info from the authorization code
    const { tokens, userInfo } = await authService.getGoogleTokensAndUserInfo(code);

    const registrationData = {
      googleUserInfo: userInfo,
      subjects: parsedSubjects,
      gradeLevels: parsedGradeLevels,
      schoolLocation: parsedSchoolLocation,
      yearsExperience: parseInt(yearsExperience),
      credentials: parsedCredentials,
      bio
    };

    const result = await authService.registerWithGoogle(registrationData);

    res.status(201).json({
      message: 'Google OAuth registration successful',
      data: result
    });

  } catch (error) {
    logger.error('Google OAuth registration failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'GOOGLE_REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Google OAuth registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /auth/google/link
 * Link Google account to existing user account
 */
router.post('/google/link', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: {
          code: 'MISSING_AUTH_CODE',
          message: 'Authorization code is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get Google user info from the authorization code
    const { tokens, userInfo } = await authService.getGoogleTokensAndUserInfo(code);

    await authService.linkGoogleAccount(req.user.userId, userInfo);

    res.json({
      message: 'Google account linked successfully'
    });

  } catch (error) {
    logger.error('Google account linking failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'GOOGLE_LINK_FAILED',
        message: error instanceof Error ? error.message : 'Failed to link Google account',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /auth/google/unlink
 * Unlink Google account from user account
 */
router.delete('/google/unlink', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    await authService.unlinkGoogleAccount(req.user.userId);

    res.json({
      message: 'Google account unlinked successfully'
    });

  } catch (error) {
    logger.error('Google account unlinking failed', { 
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    res.status(400).json({
      error: {
        code: 'GOOGLE_UNLINK_FAILED',
        message: error instanceof Error ? error.message : 'Failed to unlink Google account',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;