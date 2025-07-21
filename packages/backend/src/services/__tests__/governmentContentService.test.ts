import { governmentContentService, GovernmentContentIngestionRequest } from '../governmentContentService';
import { db } from '../../database/connection';
import { GovernmentContent } from '../../types';

// Mock the database connection
jest.mock('../../database/connection');
const mockDb = db as jest.Mocked<typeof db>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('GovernmentContentService', () => {
  beforeEach(() => {
    mockDb.query = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyDigitalSignature', () => {
    it('should verify valid digital signature', async () => {
      const content = 'Test government content';
      const signature = 'valid-signature-hash';
      const source = 'MOE';

      const result = await governmentContentService.verifyDigitalSignature(content, signature, source);

      expect(result.isValid).toBe(true);
      expect(result.verificationHash).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid digital signature', async () => {
      const content = 'Test government content';
      const signature = ''; // Empty signature should be invalid
      const source = 'UNEB';

      const result = await governmentContentService.verifyDigitalSignature(content, signature, source);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid digital signature');
    });

    it('should handle verification errors gracefully', async () => {
      // Test with empty signature which should be invalid
      const content = 'Test content';
      const signature = '';
      const source = 'NCDC';

      const result = await governmentContentService.verifyDigitalSignature(content, signature, source);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid digital signature');
    });
  });

  describe('ingestGovernmentContent', () => {
    const mockContentData: GovernmentContentIngestionRequest = {
      source: 'MOE',
      contentType: 'policy',
      title: 'New Education Policy',
      content: 'This is a new education policy for Uganda.',
      attachments: [
        {
          filename: 'policy.pdf',
          url: 'https://example.com/policy.pdf',
          mimeType: 'application/pdf',
          size: 1024000
        }
      ],
      targetAudience: ['teachers', 'administrators'],
      priority: 'high',
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      digitalSignature: 'valid-signature-hash'
    };

    it('should successfully ingest government content with valid signature', async () => {
      const mockDbResult = {
        rows: [{
          id: 'test-id',
          source: 'MOE',
          content_type: 'policy',
          title: 'New Education Policy',
          content: 'This is a new education policy for Uganda.',
          attachments_json: JSON.stringify(mockContentData.attachments),
          target_audience_json: JSON.stringify(mockContentData.targetAudience),
          priority: 'high',
          effective_date: new Date('2024-01-01'),
          expiry_date: new Date('2025-01-01'),
          digital_signature: 'valid-signature-hash',
          verification_hash: 'test-verification-hash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockDbResult);

      const result = await governmentContentService.ingestGovernmentContent(mockContentData);

      expect(result).toBeDefined();
      expect(result.source).toBe('MOE');
      expect(result.contentType).toBe('policy');
      expect(result.title).toBe('New Education Policy');
      expect(result.priority).toBe('high');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO government_content'),
        expect.arrayContaining([
          expect.any(String), // id
          'MOE',
          'policy',
          'New Education Policy',
          'This is a new education policy for Uganda.',
          JSON.stringify(mockContentData.attachments),
          JSON.stringify(mockContentData.targetAudience),
          'high',
          mockContentData.effectiveDate,
          mockContentData.expiryDate,
          'valid-signature-hash',
          expect.any(String), // verification hash
          true,
          expect.any(Date),
          expect.any(Date)
        ])
      );
    });

    it('should reject content with invalid digital signature', async () => {
      const invalidContentData = {
        ...mockContentData,
        digitalSignature: '' // Invalid signature
      };

      await expect(
        governmentContentService.ingestGovernmentContent(invalidContentData)
      ).rejects.toThrow('Digital signature verification failed');

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle database errors during ingestion', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        governmentContentService.ingestGovernmentContent(mockContentData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getGovernmentContent', () => {
    const mockDbEntities = [
      {
        id: 'content-1',
        source: 'MOE',
        content_type: 'policy',
        title: 'Education Policy 1',
        content: 'Policy content 1',
        attachments_json: '[]',
        target_audience_json: '["teachers"]',
        priority: 'high',
        effective_date: new Date('2024-01-01'),
        expiry_date: new Date('2025-01-01'),
        digital_signature: 'signature-1',
        verification_hash: 'hash-1',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'content-2',
        source: 'UNEB',
        content_type: 'curriculum',
        title: 'Math Curriculum Update',
        content: 'Updated math curriculum',
        attachments_json: '[]',
        target_audience_json: '["math teachers"]',
        priority: 'medium',
        effective_date: new Date('2024-02-01'),
        expiry_date: null,
        digital_signature: 'signature-2',
        verification_hash: 'hash-2',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should fetch government content with default options', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockDbEntities }); // Content query

      const result = await governmentContentService.getGovernmentContent();

      expect(result.total).toBe(2);
      expect(result.content).toHaveLength(2);
      expect(result.content[0]?.source).toBe('MOE');
      expect(result.content[1]?.source).toBe('UNEB');
    });

    it('should filter content by source', async () => {
      const filteredEntities = [mockDbEntities[0]];
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: filteredEntities });

      const result = await governmentContentService.getGovernmentContent({
        source: 'MOE'
      });

      expect(result.total).toBe(1);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.source).toBe('MOE');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('source = $1'),
        expect.arrayContaining(['MOE'])
      );
    });

    it('should filter content by priority', async () => {
      const highPriorityEntities = [mockDbEntities[0]];
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: highPriorityEntities });

      const result = await governmentContentService.getGovernmentContent({
        priority: 'high'
      });

      expect(result.total).toBe(1);
      expect(result.content[0]?.priority).toBe('high');
    });

    it('should apply pagination', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: mockDbEntities });

      const result = await governmentContentService.getGovernmentContent({
        limit: 5,
        offset: 2
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $'),
        expect.arrayContaining([5, 2])
      );
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        governmentContentService.getGovernmentContent()
      ).rejects.toThrow('Database error');
    });
  });

  describe('getGovernmentContentById', () => {
    it('should fetch content by ID', async () => {
      const mockEntity = {
        id: 'content-1',
        source: 'MOE',
        content_type: 'policy',
        title: 'Test Policy',
        content: 'Policy content',
        attachments_json: '[]',
        target_audience_json: '["teachers"]',
        priority: 'high',
        effective_date: new Date(),
        expiry_date: null,
        digital_signature: 'signature',
        verification_hash: 'hash',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockEntity] });

      const result = await governmentContentService.getGovernmentContentById('content-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('content-1');
      expect(result?.source).toBe('MOE');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM government_content WHERE id = $1 AND is_active = true',
        ['content-1']
      );
    });

    it('should return null for non-existent content', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await governmentContentService.getGovernmentContentById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateContentStatus', () => {
    it('should update content status successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await governmentContentService.updateContentStatus('content-1', false);

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE government_content'),
        [false, expect.any(Date), 'content-1']
      );
    });

    it('should return false for non-existent content', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      const result = await governmentContentService.updateContentStatus('non-existent', true);

      expect(result).toBe(false);
    });
  });

  describe('notification system', () => {
    it('should trigger notifications for high priority content', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          full_name: 'John Teacher',
          subjects_json: '["mathematics"]',
          grade_levels_json: '["primary"]',
          preferences_json: '{"notifications": {"push": true}}'
        }
      ];

      const mockContentData: GovernmentContentIngestionRequest = {
        source: 'MOE',
        contentType: 'announcement',
        title: 'Urgent: School Closure Notice',
        content: 'All schools must close immediately due to emergency.',
        targetAudience: ['all teachers'],
        priority: 'high',
        effectiveDate: new Date(),
        digitalSignature: 'valid-signature'
      };

      const mockDbResult = {
        rows: [{
          id: 'urgent-content',
          source: 'MOE',
          content_type: 'announcement',
          title: 'Urgent: School Closure Notice',
          content: 'All schools must close immediately due to emergency.',
          attachments_json: '[]',
          target_audience_json: '["all teachers"]',
          priority: 'high',
          effective_date: new Date(),
          expiry_date: null,
          digital_signature: 'valid-signature',
          verification_hash: 'test-hash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResult) // Insert content
        .mockResolvedValueOnce({ rows: mockUsers }); // Fetch users for notifications

      const result = await governmentContentService.ingestGovernmentContent(mockContentData);

      expect(result.priority).toBe('high');
      // Verify that user query was called for notifications (should be the second call)
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query.mock.calls[1]?.[0]).toEqual(
        expect.stringContaining('SELECT id, full_name, subjects_json')
      );
    });
  });

  describe('integration with mock government APIs', () => {
    it('should handle MOE content ingestion', async () => {
      const moeContent: GovernmentContentIngestionRequest = {
        source: 'MOE',
        contentType: 'policy',
        title: 'New Teacher Training Policy',
        content: 'All teachers must complete additional training by end of year.',
        targetAudience: ['primary teachers', 'secondary teachers'],
        priority: 'medium',
        effectiveDate: new Date('2024-03-01'),
        expiryDate: new Date('2024-12-31'),
        digitalSignature: 'moe-signature-hash'
      };

      const mockDbResult = {
        rows: [{
          id: 'moe-content-1',
          source: 'MOE',
          content_type: 'policy',
          title: moeContent.title,
          content: moeContent.content,
          attachments_json: '[]',
          target_audience_json: JSON.stringify(moeContent.targetAudience),
          priority: 'medium',
          effective_date: moeContent.effectiveDate,
          expiry_date: moeContent.expiryDate,
          digital_signature: moeContent.digitalSignature,
          verification_hash: 'moe-verification-hash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResult)
        .mockResolvedValueOnce({ rows: [] }); // No users for notifications

      const result = await governmentContentService.ingestGovernmentContent(moeContent);

      expect(result.source).toBe('MOE');
      expect(result.contentType).toBe('policy');
      expect(result.targetAudience).toEqual(['primary teachers', 'secondary teachers']);
    });

    it('should handle UNEB content ingestion', async () => {
      const unebContent: GovernmentContentIngestionRequest = {
        source: 'UNEB',
        contentType: 'curriculum',
        title: 'Updated Mathematics Syllabus',
        content: 'New mathematics syllabus for O-Level students.',
        attachments: [
          {
            filename: 'math-syllabus.pdf',
            url: 'https://uneb.ac.ug/syllabus/math.pdf',
            mimeType: 'application/pdf',
            size: 2048000
          }
        ],
        targetAudience: ['mathematics teachers', 'secondary teachers'],
        priority: 'high',
        effectiveDate: new Date('2024-01-15'),
        digitalSignature: 'uneb-signature-hash'
      };

      const mockDbResult = {
        rows: [{
          id: 'uneb-content-1',
          source: 'UNEB',
          content_type: 'curriculum',
          title: unebContent.title,
          content: unebContent.content,
          attachments_json: JSON.stringify(unebContent.attachments),
          target_audience_json: JSON.stringify(unebContent.targetAudience),
          priority: 'high',
          effective_date: unebContent.effectiveDate,
          expiry_date: null,
          digital_signature: unebContent.digitalSignature,
          verification_hash: 'uneb-verification-hash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResult)
        .mockResolvedValueOnce({ rows: [] });

      const result = await governmentContentService.ingestGovernmentContent(unebContent);

      expect(result.source).toBe('UNEB');
      expect(result.contentType).toBe('curriculum');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]?.filename).toBe('math-syllabus.pdf');
    });

    it('should handle NCDC content ingestion', async () => {
      const ncdcContent: GovernmentContentIngestionRequest = {
        source: 'NCDC',
        contentType: 'resource',
        title: 'Teaching Aids for Science Classes',
        content: 'New teaching aids and materials for science education.',
        targetAudience: ['science teachers', 'primary teachers'],
        priority: 'low',
        effectiveDate: new Date('2024-02-01'),
        digitalSignature: 'ncdc-signature-hash'
      };

      const mockDbResult = {
        rows: [{
          id: 'ncdc-content-1',
          source: 'NCDC',
          content_type: 'resource',
          title: ncdcContent.title,
          content: ncdcContent.content,
          attachments_json: '[]',
          target_audience_json: JSON.stringify(ncdcContent.targetAudience),
          priority: 'low',
          effective_date: ncdcContent.effectiveDate,
          expiry_date: null,
          digital_signature: ncdcContent.digitalSignature,
          verification_hash: 'ncdc-verification-hash',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      mockDb.query
        .mockResolvedValueOnce(mockDbResult)
        .mockResolvedValueOnce({ rows: [] });

      const result = await governmentContentService.ingestGovernmentContent(ncdcContent);

      expect(result.source).toBe('NCDC');
      expect(result.contentType).toBe('resource');
      expect(result.priority).toBe('low');
    });
  });
});