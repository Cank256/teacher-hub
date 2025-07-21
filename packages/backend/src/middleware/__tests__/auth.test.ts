import { Request, Response, NextFunction } from 'express';
import { 
  authenticateToken, 
  requireVerifiedUser, 
  requireActiveUser, 
  optionalAuth,
  authRateLimit,
  requireOwnership
} from '../auth';
import { authService } from '../../services/authService';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
      params: {},
      body: {},
      ip: '127.0.0.1'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified' as const
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      mockAuthService.verifyAccessToken.mockReturnValue(mockUser);

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired access token',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat'
      };

      authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireVerifiedUser', () => {
    it('should allow verified user', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified'
      };

      requireVerifiedUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      requireVerifiedUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unverified user', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'pending'
      };

      requireVerifiedUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Account verification required to access this resource',
          timestamp: expect.any(String),
          suggestions: ['Please complete your credential verification process']
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireActiveUser', () => {
    it('should allow verified user', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified'
      };

      requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow pending user', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'pending'
      };

      requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject rejected user', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'rejected'
      };

      requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCOUNT_REJECTED',
          message: 'Account access has been restricted due to credential verification issues',
          timestamp: expect.any(String),
          suggestions: ['Please contact support for assistance with your account']
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      requireActiveUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set user for valid token', () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified' as const
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };
      mockAuthService.verifyAccessToken.mockReturnValue(mockUser);

      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without user for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      mockAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should proceed without user when no token provided', () => {
      optionalAuth(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access to own resources', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified'
      };
      mockRequest.params = { userId: 'user-123' };

      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject access to other users resources', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified'
      };
      mockRequest.params = { userId: 'user-456' };

      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only access your own resources',
          timestamp: expect.any(String)
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when no userId specified', () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        verificationStatus: 'verified'
      };

      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated request', () => {
      requireOwnership(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authRateLimit', () => {
    beforeEach(() => {
      // Reset the rate limiter state between tests
      jest.clearAllMocks();
      mockRequest = {
        headers: {},
        user: undefined,
        params: {},
        body: {},
        ip: '127.0.0.1'
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      mockNext = jest.fn();
    });

    it('should allow first request', () => {
      authRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow requests within limit', () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        authRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests over limit', () => {
      // Make 6 requests (over the limit of 5)
      for (let i = 0; i < 6; i++) {
        authRateLimit(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // The rate limiter should allow the first 5 requests and block the 6th
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Too many authentication attempts'),
          timestamp: expect.any(String),
          retryAfter: expect.any(Number)
        }
      });
    });
  });
});