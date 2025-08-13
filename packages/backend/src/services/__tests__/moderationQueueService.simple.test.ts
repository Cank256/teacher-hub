import { ModerationQueueService } from '../moderationQueueService';

describe('ModerationQueueService - Simple Tests', () => {
  let mockDb: any;
  let moderationService: ModerationQueueService;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
      })
    };

    moderationService = new ModerationQueueService(mockDb);
  });

  it('should be instantiated correctly', () => {
    expect(moderationService).toBeInstanceOf(ModerationQueueService);
  });

  it('should have all required methods', () => {
    expect(typeof moderationService.addToQueue).toBe('function');
    expect(typeof moderationService.getQueue).toBe('function');
    expect(typeof moderationService.assignToModerator).toBe('function');
    expect(typeof moderationService.resolveItem).toBe('function');
    expect(typeof moderationService.escalateItem).toBe('function');
    expect(typeof moderationService.autoFlagContent).toBe('function');
    expect(typeof moderationService.scanForInappropriateContent).toBe('function');
    expect(typeof moderationService.reportContent).toBe('function');
    expect(typeof moderationService.getQueueStats).toBe('function');
  });
});