import { elasticsearchClient } from './elasticsearch';
import { resourceMapping, userMapping, communityMapping, INDICES } from './mappings';
import logger from '../utils/logger';

export class IndexManager {
  async initializeIndices(): Promise<void> {
    try {
      await elasticsearchClient.connect();
      
      // Create all indices with their mappings
      await Promise.all([
        elasticsearchClient.createIndex(INDICES.RESOURCES, resourceMapping),
        elasticsearchClient.createIndex(INDICES.USERS, userMapping),
        elasticsearchClient.createIndex(INDICES.COMMUNITIES, communityMapping)
      ]);

      logger.info('All Elasticsearch indices initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch indices:', error);
      throw error;
    }
  }

  async recreateIndices(): Promise<void> {
    try {
      await elasticsearchClient.connect();
      
      // Delete existing indices
      await Promise.all([
        elasticsearchClient.deleteIndex(INDICES.RESOURCES),
        elasticsearchClient.deleteIndex(INDICES.USERS),
        elasticsearchClient.deleteIndex(INDICES.COMMUNITIES)
      ]);

      // Recreate indices
      await this.initializeIndices();
      
      logger.info('All Elasticsearch indices recreated successfully');
    } catch (error) {
      logger.error('Failed to recreate Elasticsearch indices:', error);
      throw error;
    }
  }

  async checkIndicesHealth(): Promise<{ [key: string]: boolean }> {
    try {
      const client = elasticsearchClient.getClient();
      const health: { [key: string]: boolean } = {};

      for (const [name, index] of Object.entries(INDICES)) {
        try {
          const exists = await client.indices.exists({ index });
          health[name] = exists;
        } catch (error) {
          health[name] = false;
        }
      }

      return health;
    } catch (error) {
      logger.error('Failed to check indices health:', error);
      throw error;
    }
  }
}

export const indexManager = new IndexManager();