import { Client } from '@elastic/elasticsearch';
import logger from '../utils/logger';

export class ElasticsearchClient {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined,
      requestTimeout: 30000,
      pingTimeout: 3000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      logger.info('Connected to Elasticsearch');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      logger.info('Disconnected from Elasticsearch');
    }
  }

  getClient(): Client {
    if (!this.isConnected) {
      throw new Error('Elasticsearch client is not connected');
    }
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async createIndex(indexName: string, mapping: any): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      
      if (!exists) {
        await this.client.indices.create({
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
        logger.info(`Created Elasticsearch index: ${indexName}`);
      } else {
        logger.info(`Elasticsearch index already exists: ${indexName}`);
      }
    } catch (error) {
      logger.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });
      
      if (exists) {
        await this.client.indices.delete({ index: indexName });
        logger.info(`Deleted Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      logger.error(`Failed to delete index ${indexName}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const elasticsearchClient = new ElasticsearchClient();