import { Pool } from 'pg';
import { ModerationQueueService } from '../moderationQueueService';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ModerationQueueService', () => {
  let mockDb: jest.Mocked<Pool>;
  let moderationService: ModerationQueueService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    mockDb = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient)
    } as jest.Mocked<Pool>;

    moderationService = new ModerationQueueService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToQueue', () => {
    it('should add item to moderation queue successfully', async () => {
      const mockQueueItem = {
        id: 'queue-1',
        item_type: 'post',
        item_id: 'post-1',
        report_reason: 'Inappropriate content',
        reported_by: 'user-1',
        status: 'pending',
        assigned_to: null,
        created_at: new Date(),
        resolved_at: null
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // check existing
        .mockResolvedValueOnce({ rows: [mockQueueItem] }); // insert

      const result = await moderationService.addToQueue(
        'post',
        'post-1',
        'Inappropriate content',
        'user-1'
      );

      expect(result.itemType).toBe('post');
      expect(result.reportReason).toBe('Inappropriate content');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Added post post-1 to moderation queue')
      );
    });

    it('should throw error if item already in queue', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'existing-1' }] });

      await expect(
        moderationService.addToQueue('post', 'post-1', 'reason', 'user-1')
      ).rejects.toThrow('Item is already in moderation queue');
    });
  });

  describe('getQueue', () => {
    it('should retrieve moderation queue with pagination', async () => {
      const mockQueueItems = [
        {
          id: 'queue-1',
          item_type: 'post',
          item_id: 'post-1',
          report_reason: 'Inappropriate content',
          reported_by: 'user-1',
          status: 'pending',
          assigned_to: null,
          created_at: new Date(),
          resolved_at: null,
          reporter_name: 'John Doe',
          assignee_name: null
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockQueueItems }); // data query

      // Mock getItemDetails
      jest.spyOn(moderationService as any, 'getItemDetails').mockResolvedValue({
        title: 'Test Post',
        content: 'Test content',
        author_name: 'Jane Doe'
      });

      const pagination = { page: 1, limit: 20 };
      const result = await moderationService.getQueue(pagination);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].itemType).toBe('post');
      expect(result.data[0].itemDetails).toBeDefined();
    });

    it('should apply filters correctly', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const pagination = { page: 1, limit: 20 };
      const filters = { itemType: 'post', status: 'pending' };

      await moderationService.getQueue(pagination, filters);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('mq.item_type = $1'),
        expect.arrayContaining(['post'])
      );
    });
  });

  describe('assignToModerator', () => {
    it('should assign queue item to moderator successfully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'queue-1' }] });

      await moderationService.assignToModerator('queue-1', 'moderator-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE moderation_queue'),
        ['moderator-1', 'queue-1']
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Assigned moderation queue item queue-1')
      );
    });

    it('should throw error if item not found or already assigned', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        moderationService.assignToModerator('nonexistent', 'moderator-1')
      ).rejects.toThrow('Queue item not found or already assigned');
    });
  });

  describe('resolveItem', () => {
    it('should resolve queue item successfully', async () => {
      const mockQueueItem = {
        item_type: 'post',
        item_id: 'post-1',
        assigned_to: 'moderator-1',
        status: 'reviewed'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockQueueItem] }) // get queue item
        .mockResolvedValueOnce(undefined) // update queue item
        .mockResolvedValueOnce(undefined); // COMMIT

      const resolution = {
        action: 'approve' as const,
        reason: 'Content is appropriate',
        notes: 'Reviewed and approved'
      };

      await moderationService.resolveItem('queue-1', 'moderator-1', resolution);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Resolved moderation queue item queue-1 with action: approve')
      );
    });

    it('should throw error if not authorized', async () => {
      const mockQueueItem = {
        item_type: 'post',
        item_id: 'post-1',
        assigned_to: 'other-moderator',
        status: 'reviewed'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockQueueItem] }) // get queue item
        .mockResolvedValueOnce({ rows: [] }) // check admin privileges
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const resolution = {
        action: 'approve' as const,
        reason: 'Content is appropriate'
      };

      await expect(
        moderationService.resolveItem('queue-1', 'moderator-1', resolution)
      ).rejects.toThrow('Not authorized to resolve this moderation item');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('escalateItem', () => {
    it('should escalate queue item successfully', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'queue-1' }] });

      await moderationService.escalateItem('queue-1', 'moderator-1', 'Complex case');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE moderation_queue'),
        ['Complex case', 'queue-1', 'moderator-1']
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Escalated moderation queue item queue-1')
      );
    });
  });

  describe('autoFlagContent', () => {
    it('should auto-flag content with high confidence', async () => {
      jest.spyOn(moderationService, 'addToQueue').mockResolvedValue({
        id: 'queue-1',
        itemType: 'post',
        itemId: 'post-1',
        reportReason: '[AUTOMATED] Spam detected (confidence: 0.9)',
        reportedBy: '00000000-0000-0000-0000-000000000000',
        status: 'pending',
        assignedTo: undefined,
        createdAt: new Date(),
        resolvedAt: undefined
      });

      await moderationService.autoFlagContent('post', 'post-1', 'Spam detected', 0.9);

      expect(moderationService.addToQueue).toHaveBeenCalledWith(
        'post',
        'post-1',
        '[AUTOMATED] Spam detected (confidence: 0.9)',
        '00000000-0000-0000-0000-000000000000'
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Auto-flagged post post-1 with confidence 0.9')
      );
    });

    it('should not auto-flag content with low confidence', async () => {
      jest.spyOn(moderationService, 'addToQueue').mockResolvedValue({} as any);

      await moderationService.autoFlagContent('post', 'post-1', 'Spam detected', 0.5);

      expect(moderationService.addToQueue).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Auto-flag confidence too low (0.5)')
      );
    });
  });

  describe('scanForInappropriateContent', () => {
    it('should flag content with inappropriate keywords', async () => {
      jest.spyOn(moderationService, 'autoFlagContent').mockResolvedValue();

      await moderationService.scanForInappropriateContent(
        'This is spam content',
        'post',
        'post-1'
      );

      expect(moderationService.autoFlagContent).toHaveBeenCalledWith(
        'post',
        'post-1',
        'Inappropriate content detected: spam',
        0.3
      );
    });

    it('should not flag appropriate content', async () => {
      jest.spyOn(moderationService, 'autoFlagContent').mockResolvedValue();

      await moderationService.scanForInappropriateContent(
        'This is appropriate educational content',
        'post',
        'post-1'
      );

      expect(moderationService.autoFlagContent).not.toHaveBeenCalled();
    });
  });

  describe('reportContent', () => {
    it('should report content successfully', async () => {
      jest.spyOn(moderationService as any, 'verifyItemExists').mockResolvedValue(true);
      jest.spyOn(moderationService as any, 'isUserAuthor').mockResolvedValue(false);
      jest.spyOn(moderationService, 'addToQueue').mockResolvedValue({
        id: 'queue-1',
        itemType: 'post',
        itemId: 'post-1',
        reportReason: 'Inappropriate content',
        reportedBy: 'user-1',
        status: 'pending',
        assignedTo: undefined,
        createdAt: new Date(),
        resolvedAt: undefined
      });

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // activity log

      const result = await moderationService.reportContent(
        'post',
        'post-1',
        'Inappropriate content',
        'user-1',
        'Additional details here'
      );

      expect(result.itemType).toBe('post');
      expect(result.reportReason).toBe('Inappropriate content\n\nAdditional details: Additional details here');
    });

    it('should throw error if item does not exist', async () => {
      jest.spyOn(moderationService as any, 'verifyItemExists').mockResolvedValue(false);

      await expect(
        moderationService.reportContent('post', 'nonexistent', 'reason', 'user-1')
      ).rejects.toThrow('post not found');
    });

    it('should throw error if user is the author', async () => {
      jest.spyOn(moderationService as any, 'verifyItemExists').mockResolvedValue(true);
      jest.spyOn(moderationService as any, 'isUserAuthor').mockResolvedValue(true);

      await expect(
        moderationService.reportContent('post', 'post-1', 'reason', 'author-1')
      ).rejects.toThrow('Cannot report your own content');
    });
  });

  describe('getQueueStats', () => {
    it('should retrieve queue statistics', async () => {
      const mockStats = {
        total_pending: '5',
        total_reviewed: '3',
        total_resolved: '10',
        avg_resolution_hours: '2.5'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockStats] }) // main stats
        .mockResolvedValueOnce({ 
          rows: [
            { item_type: 'post', count: '3' },
            { item_type: 'comment', count: '2' }
          ] 
        }); // type breakdown

      const result = await moderationService.getQueueStats();

      expect(result).toEqual({
        totalPending: 5,
        totalReviewed: 3,
        totalResolved: 10,
        averageResolutionTime: 2.5,
        itemTypeBreakdown: {
          post: 3,
          comment: 2
        }
      });
    });
  });

  describe('utility methods', () => {
    describe('verifyItemExists', () => {
      it('should return true if item exists', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'post-1' }] });

        const result = await (moderationService as any).verifyItemExists('post', 'post-1');

        expect(result).toBe(true);
      });

      it('should return false if item does not exist', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const result = await (moderationService as any).verifyItemExists('post', 'nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('isUserAuthor', () => {
      it('should return true if user is author', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'post-1' }] });

        const result = await (moderationService as any).isUserAuthor('post', 'post-1', 'author-1');

        expect(result).toBe(true);
      });

      it('should return false if user is not author', async () => {
        mockDb.query.mockResolvedValueOnce({ rows: [] });

        const result = await (moderationService as any).isUserAuthor('post', 'post-1', 'other-user');

        expect(result).toBe(false);
      });
    });

    describe('getItemDetails', () => {
      it('should return item details for post', async () => {
        const mockPost = {
          title: 'Test Post',
          content: 'Test content',
          author_id: 'user-1',
          created_at: new Date(),
          author_name: 'John Doe'
        };

        mockDb.query.mockResolvedValueOnce({ rows: [mockPost] });

        const result = await (moderationService as any).getItemDetails('post', 'post-1');

        expect(result.title).toBe('Test Post');
        expect(result.author_name).toBe('John Doe');
      });

      it('should return null for invalid item type', async () => {
        const result = await (moderationService as any).getItemDetails('invalid', 'item-1');

        expect(result).toBeNull();
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        moderationService.getQueue({ page: 1, limit: 20 })
      ).rejects.toThrow('Failed to retrieve moderation queue');

      expect(logger.error).toHaveBeenCalledWith(
        'Error getting moderation queue:',
        expect.any(Error)
      );
    });

    it('should handle transaction rollback on resolve errors', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // query fails
        .mockResolvedValueOnce(undefined); // ROLLBACK

      const resolution = { action: 'approve' as const, reason: 'reason' };

      await expect(
        moderationService.resolveItem('queue-1', 'moderator-1', resolution)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should not throw on auto-flag errors', async () => {
      jest.spyOn(moderationService, 'addToQueue').mockRejectedValue(new Error('Database error'));

      await expect(
        moderationService.autoFlagContent('post', 'post-1', 'reason', 0.9)
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error auto-flagging content:',
        expect.any(Error)
      );
    });
  });
});