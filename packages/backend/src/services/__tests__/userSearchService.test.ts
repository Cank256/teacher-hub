import { UserSearchService } from '../userSearchService';
import { DatabaseConnection } from '../../database/connection';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../database/connection');

describe('UserSearchService', () => {
  let userSearchService: UserSearchService;
  let mockDb: jest.Mocked<DatabaseConnection>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    } as any;

    userSearchService = new UserSearchService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users by name', async () => {
      const query = 'john';
      const searcherId = 'user-123';
      const filters = {
        subjects: [],
        verificationStatus: undefined,
        page: 1,
        limit: 10
      };

      const mockUsers = [
        {
          id: 'user-456',
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          profileImageUrl: '/profiles/john.jpg',
          subjects: ['Mathematics', 'Physics'],
          verificationStatus: 'verified'
        },
        {
          id: 'user-789',
          fullName: 'Johnny Smith',
          email: 'johnny.smith@example.com',
          profileImageUrl: null,
          subjects: ['English', 'Literature'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_searches'),
        expect.arrayContaining([searcherId, query])
      );
    });

    it('should search users by email', async () => {
      const query = 'teacher@school.edu';
      const searcherId = 'user-123';
      const filters = { page: 1, limit: 10 };

      const mockUsers = [
        {
          id: 'user-456',
          fullName: 'Teacher Name',
          email: 'teacher@school.edu',
          profileImageUrl: null,
          subjects: ['Science'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(1);
    });

    it('should filter by subjects', async () => {
      const query = '';
      const searcherId = 'user-123';
      const filters = {
        subjects: ['Mathematics'],
        page: 1,
        limit: 10
      };

      const mockUsers = [
        {
          id: 'user-456',
          fullName: 'Math Teacher',
          email: 'math@school.edu',
          subjects: ['Mathematics', 'Algebra'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data).toEqual(mockUsers);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('subjects @>'),
        expect.arrayContaining([JSON.stringify(['Mathematics'])])
      );
    });

    it('should filter by verification status', async () => {
      const query = '';
      const searcherId = 'user-123';
      const filters = {
        verificationStatus: 'verified',
        page: 1,
        limit: 10
      };

      const mockUsers = [
        {
          id: 'user-456',
          fullName: 'Verified Teacher',
          email: 'verified@school.edu',
          subjects: ['Science'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data).toEqual(mockUsers);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('verification_status ='),
        expect.arrayContaining(['verified'])
      );
    });

    it('should exclude searcher from results', async () => {
      const query = 'john';
      const searcherId = 'user-123';
      const filters = { page: 1, limit: 10 };

      const mockUsers = [
        {
          id: 'user-456', // Different from searcherId
          fullName: 'John Doe',
          email: 'john@example.com',
          subjects: ['Math'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data.every(user => user.id !== searcherId)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const query = 'nonexistent';
      const searcherId = 'user-123';
      const filters = { page: 1, limit: 10 };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: [] }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const query = 'teacher';
      const searcherId = 'user-123';
      const filters = { page: 2, limit: 5 };

      const mockUsers = [
        {
          id: 'user-456',
          fullName: 'Teacher 6',
          email: 'teacher6@school.edu',
          subjects: ['Math'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Log search
        .mockResolvedValueOnce({ rows: mockUsers }) // Search results
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }); // Total count

      const result = await userSearchService.searchUsers(query, searcherId, filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('OFFSET 5 LIMIT 5'),
        expect.any(Array)
      );
    });
  });

  describe('getUserSuggestions', () => {
    it('should return user suggestions based on common subjects', async () => {
      const userId = 'user-123';
      const limit = 5;

      const mockUser = {
        id: userId,
        subjects: ['Mathematics', 'Physics']
      };

      const mockSuggestions = [
        {
          id: 'user-456',
          fullName: 'Math Teacher',
          email: 'math@school.edu',
          subjects: ['Mathematics', 'Algebra'],
          verificationStatus: 'verified'
        },
        {
          id: 'user-789',
          fullName: 'Physics Teacher',
          email: 'physics@school.edu',
          subjects: ['Physics', 'Chemistry'],
          verificationStatus: 'verified'
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user subjects
        .mockResolvedValueOnce({ rows: mockSuggestions }); // Get suggestions

      const result = await userSearchService.getUserSuggestions(userId, limit);

      expect(result).toEqual(mockSuggestions);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('subjects && $1'),
        expect.arrayContaining([mockUser.subjects])
      );
    });

    it('should return empty array for user with no subjects', async () => {
      const userId = 'user-123';
      const limit = 5;

      const mockUser = {
        id: userId,
        subjects: []
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await userSearchService.getUserSuggestions(userId, limit);

      expect(result).toEqual([]);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Only get user, no suggestions query
    });
  });

  describe('getSearchHistory', () => {
    it('should return user search history', async () => {
      const userId = 'user-123';
      const limit = 10;

      const mockSearchHistory = [
        {
          id: 'search-1',
          searchQuery: 'math teacher',
          searchFilters: { subjects: ['Mathematics'] },
          createdAt: new Date()
        },
        {
          id: 'search-2',
          searchQuery: 'john',
          searchFilters: {},
          createdAt: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockSearchHistory });

      const result = await userSearchService.getSearchHistory(userId, limit);

      expect(result).toEqual(mockSearchHistory);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_searches'),
        [userId, limit]
      );
    });
  });
});