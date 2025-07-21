import { ContentScreeningService } from '../contentScreening';
import { ModerationConfig } from '../types';

describe('ContentScreeningService', () => {
  let screeningService: ContentScreeningService;
  let config: ModerationConfig;

  beforeEach(() => {
    config = {
      autoApproveThreshold: 0.2,
      autoRejectThreshold: 0.8,
      requireReviewThreshold: 0.5,
      enabledCategories: [
        'inappropriate_language',
        'spam',
        'harassment',
        'copyright',
        'misinformation',
        'adult_content',
        'violence',
        'hate_speech'
      ],
      maxQueueSize: 1000,
      reviewTimeoutHours: 24
    };

    screeningService = new ContentScreeningService(config);
  });

  describe('Content Screening', () => {
    it('should approve clean content', async () => {
      const result = await screeningService.screenContent(
        'content-1',
        'resource',
        {
          title: 'Mathematics Tutorial',
          description: 'A helpful guide to basic algebra concepts',
          text: 'This tutorial covers fundamental mathematical concepts in an educational manner.'
        }
      );

      expect(result.contentId).toBe('content-1');
      expect(result.contentType).toBe('resource');
      expect(result.status).toBe('approved');
      expect(result.confidence).toBeLessThan(config.autoApproveThreshold);
      expect(result.flags).toHaveLength(0);
    });

    it('should flag inappropriate language', async () => {
      const result = await screeningService.screenContent(
        'content-2',
        'message',
        {
          text: 'This is fucking stupid and you are an idiot'
        }
      );

      expect(['flagged', 'pending_review', 'rejected']).toContain(result.status);
      expect(result.flags.length).toBeGreaterThan(0);
      expect(result.flags.some(f => f.type === 'inappropriate_language')).toBe(true);
    });

    it('should detect hate speech', async () => {
      const result = await screeningService.screenContent(
        'content-3',
        'message',
        {
          text: 'I hate those people and they should all die'
        }
      );

      expect(['flagged', 'pending_review', 'rejected']).toContain(result.status);
      expect(result.flags.some(f => f.type === 'hate_speech')).toBe(true);
      expect(result.flags.some(f => f.severity === 'high')).toBe(true);
    });

    it('should detect adult content', async () => {
      const result = await screeningService.screenContent(
        'content-4',
        'resource',
        {
          title: 'Adult Content',
          text: 'This contains explicit sexual content and nude images'
        }
      );

      expect(['flagged', 'pending_review', 'rejected']).toContain(result.status);
      expect(result.flags.some(f => f.type === 'adult_content')).toBe(true);
    });

    it('should detect spam patterns', async () => {
      const result = await screeningService.screenContent(
        'content-5',
        'message',
        {
          text: 'Buy now! Click here for free money! Limited time offer guaranteed!'
        }
      );

      expect(['flagged', 'pending_review']).toContain(result.status);
      expect(result.flags.some(f => f.type === 'spam')).toBe(true);
    });

    it('should handle content with images', async () => {
      const result = await screeningService.screenContent(
        'content-6',
        'resource',
        {
          title: 'Educational Resource',
          text: 'This is a clean educational resource',
          imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        }
      );

      expect(result).toHaveProperty('contentId', 'content-6');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle empty content gracefully', async () => {
      const result = await screeningService.screenContent(
        'content-7',
        'message',
        {}
      );

      expect(result.contentId).toBe('content-7');
      expect(result.status).toBe('approved');
      expect(result.flags).toHaveLength(0);
    });

    it('should assign correct confidence levels', async () => {
      const cleanResult = await screeningService.screenContent(
        'clean-content',
        'resource',
        { text: 'This is a wonderful educational resource' }
      );

      const flaggedResult = await screeningService.screenContent(
        'flagged-content',
        'message',
        { text: 'This is fucking terrible shit' }
      );

      // Clean content should have lower or equal confidence than flagged content
      expect(cleanResult.confidence).toBeLessThanOrEqual(flaggedResult.confidence);
      
      // If flagged content has flags, it should have higher confidence
      if (flaggedResult.flags.length > 0) {
        expect(flaggedResult.confidence).toBeGreaterThan(cleanResult.confidence);
      }
      
      // Clean content should be approved
      expect(cleanResult.status).toBe('approved');
    });
  });

  describe('Rule Management', () => {
    it('should add custom moderation rules', () => {
      const ruleId = screeningService.addRule({
        name: 'Custom Test Rule',
        type: 'keyword',
        category: 'misinformation',
        severity: 'medium',
        keywords: ['fake news', 'conspiracy'],
        isActive: true,
        threshold: 0.5,
        action: 'flag'
      });

      expect(ruleId).toBeTruthy();
      expect(typeof ruleId).toBe('string');

      const rules = screeningService.getRules();
      const addedRule = rules.find(r => r.id === ruleId);
      expect(addedRule).toBeTruthy();
      expect(addedRule?.name).toBe('Custom Test Rule');
    });

    it('should update existing rules', () => {
      const rules = screeningService.getRules();
      const firstRule = rules[0];
      
      if (!firstRule) {
        throw new Error('No rules found');
      }
      
      const success = screeningService.updateRule(firstRule.id, {
        threshold: 0.9,
        isActive: false
      });

      expect(success).toBe(true);

      const updatedRules = screeningService.getRules();
      const updatedRule = updatedRules.find(r => r.id === firstRule.id);
      expect(updatedRule?.threshold).toBe(0.9);
      expect(updatedRule?.isActive).toBe(false);
    });

    it('should delete rules', () => {
      const rules = screeningService.getRules();
      const initialCount = rules.length;
      const ruleToDelete = rules[0];

      if (!ruleToDelete) {
        throw new Error('No rules found');
      }

      const success = screeningService.deleteRule(ruleToDelete.id);
      expect(success).toBe(true);

      const remainingRules = screeningService.getRules();
      expect(remainingRules).toHaveLength(initialCount - 1);
      expect(remainingRules.find(r => r.id === ruleToDelete.id)).toBeUndefined();
    });

    it('should handle non-existent rule operations', () => {
      const updateSuccess = screeningService.updateRule('non-existent', { threshold: 0.5 });
      expect(updateSuccess).toBe(false);

      const deleteSuccess = screeningService.deleteRule('non-existent');
      expect(deleteSuccess).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        autoApproveThreshold: 0.1,
        autoRejectThreshold: 0.9,
        maxQueueSize: 2000
      };

      screeningService.updateConfig(newConfig);
      const currentConfig = screeningService.getConfig();

      expect(currentConfig.autoApproveThreshold).toBe(0.1);
      expect(currentConfig.autoRejectThreshold).toBe(0.9);
      expect(currentConfig.maxQueueSize).toBe(2000);
      expect(currentConfig.requireReviewThreshold).toBe(config.requireReviewThreshold); // Unchanged
    });

    it('should return current configuration', () => {
      const currentConfig = screeningService.getConfig();
      
      expect(currentConfig).toHaveProperty('autoApproveThreshold');
      expect(currentConfig).toHaveProperty('autoRejectThreshold');
      expect(currentConfig).toHaveProperty('requireReviewThreshold');
      expect(currentConfig).toHaveProperty('enabledCategories');
      expect(currentConfig).toHaveProperty('maxQueueSize');
      expect(currentConfig).toHaveProperty('reviewTimeoutHours');
    });
  });

  describe('Text Analysis', () => {
    it('should analyze text sentiment correctly', async () => {
      const positiveResult = await screeningService.screenContent(
        'positive-content',
        'message',
        { text: 'This is wonderful, amazing, and excellent content that is very helpful' }
      );

      const negativeResult = await screeningService.screenContent(
        'negative-content',
        'message',
        { text: 'This is terrible, awful, and horrible content that is completely useless' }
      );

      // Both should be processed without errors
      expect(positiveResult.contentId).toBe('positive-content');
      expect(negativeResult.contentId).toBe('negative-content');
    });

    it('should handle different content types', async () => {
      const contentTypes: Array<'resource' | 'message' | 'profile' | 'comment'> = [
        'resource', 'message', 'profile', 'comment'
      ];

      for (const contentType of contentTypes) {
        const result = await screeningService.screenContent(
          `content-${contentType}`,
          contentType,
          { text: 'This is test content' }
        );

        expect(result.contentType).toBe(contentType);
        expect(result.status).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle screening errors gracefully', async () => {
      // Test with potentially problematic content that might cause errors
      const result = await screeningService.screenContent(
        'error-content',
        'message',
        {
          text: null as any, // Invalid input
          title: undefined,
          description: ''
        }
      );

      expect(result.contentId).toBe('error-content');
      // The service should handle null gracefully and return approved for empty content
      expect(['approved', 'pending_review']).toContain(result.status);
    });

    it('should handle very long content', async () => {
      const longText = 'word '.repeat(10000); // Very long text
      
      const result = await screeningService.screenContent(
        'long-content',
        'resource',
        { text: longText }
      );

      expect(result.contentId).toBe('long-content');
      expect(result.status).toBeDefined();
    });

    it('should handle special characters and unicode', async () => {
      const result = await screeningService.screenContent(
        'unicode-content',
        'message',
        {
          text: '🎓📚 Educational content with émojis and spëcial chàracters 中文'
        }
      );

      expect(result.contentId).toBe('unicode-content');
      expect(result.status).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should process content within reasonable time', async () => {
      const startTime = Date.now();
      
      await screeningService.screenContent(
        'perf-test',
        'resource',
        {
          title: 'Performance Test Content',
          description: 'This is a test to measure processing performance',
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)
        }
      );

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple concurrent screenings', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        screeningService.screenContent(
          `concurrent-${i}`,
          'message',
          { text: `Test message ${i}` }
        )
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.contentId).toBe(`concurrent-${i}`);
        expect(result.status).toBeDefined();
      });
    });
  });
});