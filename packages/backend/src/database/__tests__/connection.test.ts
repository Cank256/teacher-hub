import { db } from '../connection';

describe('Database Connection', () => {
  afterAll(async () => {
    await db.close();
  });

  describe('Basic Connection', () => {
    it('should connect to database successfully', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should execute parameterized queries', async () => {
      const testValue = 'test-value';
      const result = await db.query('SELECT $1 as value', [testValue]);
      expect(result.rows[0].value).toBe(testValue);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await db.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details).toHaveProperty('totalConnections');
      expect(health.details).toHaveProperty('idleConnections');
      expect(health.details).toHaveProperty('waitingConnections');
      expect(health.details).toHaveProperty('responseTime');
      expect(typeof health.details.responseTime).toBe('number');
    });
  });

  describe('Transaction Support', () => {
    it('should handle successful transactions', async () => {
      const result = await db.transaction(async (client) => {
        const res1 = await client.query('SELECT 1 as first');
        const res2 = await client.query('SELECT 2 as second');
        return { first: res1.rows[0].first, second: res2.rows[0].second };
      });

      expect(result.first).toBe(1);
      expect(result.second).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      // Create a temporary table for testing
      await db.query('CREATE TEMP TABLE test_rollback (id SERIAL PRIMARY KEY, value TEXT)');
      
      try {
        await db.transaction(async (client) => {
          await client.query('INSERT INTO test_rollback (value) VALUES ($1)', ['test']);
          // Force an error to trigger rollback
          throw new Error('Test error');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }

      // Verify the insert was rolled back
      const result = await db.query('SELECT COUNT(*) as count FROM test_rollback');
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('Pool Statistics', () => {
    it('should provide pool statistics', () => {
      const stats = db.poolStats;
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
      expect(typeof stats.totalCount).toBe('number');
      expect(typeof stats.idleCount).toBe('number');
      expect(typeof stats.waitingCount).toBe('number');
    });
  });
});