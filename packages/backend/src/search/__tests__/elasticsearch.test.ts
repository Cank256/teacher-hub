import { ElasticsearchClient } from '../elasticsearch';
import { Client } from '@elastic/elasticsearch';

// Mock the Elasticsearch client
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn()
}));

describe('ElasticsearchClient', () => {
  let elasticsearchClient: ElasticsearchClient;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      ping: jest.fn(),
      close: jest.fn(),
      indices: {
        exists: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
      }
    };

    (Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient);
    elasticsearchClient = new ElasticsearchClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockClient.ping.mockResolvedValue({});

      await elasticsearchClient.connect();

      expect(mockClient.ping).toHaveBeenCalled();
      expect(elasticsearchClient.isHealthy()).toBe(true);
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      mockClient.ping.mockRejectedValue(error);

      await expect(elasticsearchClient.connect()).rejects.toThrow('Connection failed');
      expect(elasticsearchClient.isHealthy()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockClient.close.mockResolvedValue({});

      await elasticsearchClient.disconnect();

      expect(mockClient.close).toHaveBeenCalled();
      expect(elasticsearchClient.isHealthy()).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should return client when connected', async () => {
      mockClient.ping.mockResolvedValue({});
      await elasticsearchClient.connect();

      const client = elasticsearchClient.getClient();

      expect(client).toBe(mockClient);
    });

    it('should throw error when not connected', () => {
      expect(() => elasticsearchClient.getClient()).toThrow('Elasticsearch client is not connected');
    });
  });

  describe('createIndex', () => {
    beforeEach(async () => {
      mockClient.ping.mockResolvedValue({});
      await elasticsearchClient.connect();
    });

    it('should create index when it does not exist', async () => {
      const indexName = 'test_index';
      const mapping = { properties: { title: { type: 'text' } } };

      mockClient.indices.exists.mockResolvedValue(false);
      mockClient.indices.create.mockResolvedValue({});

      await elasticsearchClient.createIndex(indexName, mapping);

      expect(mockClient.indices.exists).toHaveBeenCalledWith({ index: indexName });
      expect(mockClient.indices.create).toHaveBeenCalledWith({
        index: indexName,
        mappings: mapping,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              custom_text_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'stemmer']
              }
            }
          }
        }
      });
    });

    it('should not create index when it already exists', async () => {
      const indexName = 'test_index';
      const mapping = { properties: { title: { type: 'text' } } };

      mockClient.indices.exists.mockResolvedValue(true);

      await elasticsearchClient.createIndex(indexName, mapping);

      expect(mockClient.indices.exists).toHaveBeenCalledWith({ index: indexName });
      expect(mockClient.indices.create).not.toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const indexName = 'test_index';
      const mapping = { properties: { title: { type: 'text' } } };
      const error = new Error('Creation failed');

      mockClient.indices.exists.mockResolvedValue(false);
      mockClient.indices.create.mockRejectedValue(error);

      await expect(elasticsearchClient.createIndex(indexName, mapping)).rejects.toThrow('Creation failed');
    });
  });

  describe('deleteIndex', () => {
    beforeEach(async () => {
      mockClient.ping.mockResolvedValue({});
      await elasticsearchClient.connect();
    });

    it('should delete index when it exists', async () => {
      const indexName = 'test_index';

      mockClient.indices.exists.mockResolvedValue(true);
      mockClient.indices.delete.mockResolvedValue({});

      await elasticsearchClient.deleteIndex(indexName);

      expect(mockClient.indices.exists).toHaveBeenCalledWith({ index: indexName });
      expect(mockClient.indices.delete).toHaveBeenCalledWith({ index: indexName });
    });

    it('should not delete index when it does not exist', async () => {
      const indexName = 'test_index';

      mockClient.indices.exists.mockResolvedValue(false);

      await elasticsearchClient.deleteIndex(indexName);

      expect(mockClient.indices.exists).toHaveBeenCalledWith({ index: indexName });
      expect(mockClient.indices.delete).not.toHaveBeenCalled();
    });
  });
});