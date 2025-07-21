import { db, PoolClient } from '../connection';
import { createLogger } from '../../utils/logger';

const logger = createLogger('repository');

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id = $1 AND is_active = true`,
        [id]
      );
      
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Find multiple records by IDs
   */
  async findByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    try {
      const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
      const result = await db.query(
        `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders}) AND is_active = true`,
        ids
      );
      
      return result.rows.map((row: any) => this.mapFromDb(row));
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by IDs`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>, client?: PoolClient): Promise<T> {
    const dbClient = client || db;
    
    try {
      const { columns, values, placeholders } = this.buildInsertQuery(data);
      const query = `
        INSERT INTO ${this.tableName} (${columns}) 
        VALUES (${placeholders}) 
        RETURNING *
      `;
      
      const result = await dbClient.query(query, values);
      return this.mapFromDb(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to create ${this.tableName}`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<T>, client?: PoolClient): Promise<T | null> {
    const dbClient = client || db;
    
    try {
      const { setClause, values } = this.buildUpdateQuery(data);
      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}
        WHERE id = $${values.length + 1} AND is_active = true
        RETURNING *
      `;
      
      const result = await dbClient.query(query, [...values, id]);
      return result.rows.length > 0 ? this.mapFromDb(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to update ${this.tableName} with ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Soft delete a record by ID
   */
  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const dbClient = client || db;
    
    try {
      const result = await dbClient.query(
        `UPDATE ${this.tableName} SET is_active = false WHERE id = $1`,
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName} with ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Hard delete a record by ID (use with caution)
   */
  async hardDelete(id: string, client?: PoolClient): Promise<boolean> {
    const dbClient = client || db;
    
    try {
      const result = await dbClient.query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Failed to hard delete ${this.tableName} with ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Count records with optional conditions
   */
  async count(conditions?: Record<string, any>): Promise<number> {
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE is_active = true`;
      const values: any[] = [];

      if (conditions) {
        const { whereClause, conditionValues } = this.buildWhereClause(conditions);
        query += ` AND ${whereClause}`;
        values.push(...conditionValues);
      }

      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Failed to count ${this.tableName}`, error);
      throw error;
    }
  }

  /**
   * Find records with pagination
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    conditions?: Record<string, any>,
    orderBy?: string
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      let query = `SELECT * FROM ${this.tableName} WHERE is_active = true`;
      const values: any[] = [];

      if (conditions) {
        const { whereClause, conditionValues } = this.buildWhereClause(conditions);
        query += ` AND ${whereClause}`;
        values.push(...conditionValues);
      }

      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      } else {
        query += ` ORDER BY created_at DESC`;
      }

      query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const [dataResult, total] = await Promise.all([
        db.query(query, values),
        this.count(conditions)
      ]);

      return {
        data: dataResult.rows.map((row: any) => this.mapFromDb(row)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} with pagination`, error);
      throw error;
    }
  }

  /**
   * Abstract method to map database row to domain object
   */
  protected abstract mapFromDb(row: any): T;

  /**
   * Abstract method to map domain object to database row
   */
  protected abstract mapToDb(data: Partial<T>): Record<string, any>;

  /**
   * Build INSERT query components
   */
  protected buildInsertQuery(data: Partial<T>): {
    columns: string;
    values: any[];
    placeholders: string;
  } {
    const dbData = this.mapToDb(data);
    const columns = Object.keys(dbData).join(', ');
    const values = Object.values(dbData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    return { columns, values, placeholders };
  }

  /**
   * Build UPDATE query components
   */
  protected buildUpdateQuery(data: Partial<T>): {
    setClause: string;
    values: any[];
  } {
    const dbData = this.mapToDb(data);
    const entries = Object.entries(dbData);
    const setClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);

    return { setClause, values };
  }

  /**
   * Build WHERE clause for conditions
   */
  protected buildWhereClause(conditions: Record<string, any>): {
    whereClause: string;
    conditionValues: any[];
  } {
    const entries = Object.entries(conditions);
    const whereClause = entries.map(([key], index) => `${key} = $${index + 1}`).join(' AND ');
    const conditionValues = entries.map(([, value]) => value);

    return { whereClause, conditionValues };
  }
}