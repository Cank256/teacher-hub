# Database Layer Documentation

This directory contains the database layer implementation for the Teacher Hub platform, including connection management, migrations, and data access repositories.

## Components

### Connection Management (`connection.ts`)

The database connection is managed through a singleton pattern with connection pooling:

```typescript
import { db } from './database/connection';

// Simple query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Transaction
const user = await db.transaction(async (client) => {
  const userResult = await client.query('INSERT INTO users (...) VALUES (...) RETURNING *', [...]);
  await client.query('INSERT INTO user_connections (...) VALUES (...)', [...]);
  return userResult.rows[0];
});

// Health check
const health = await db.healthCheck();
console.log(health.status); // 'healthy' or 'unhealthy'
```

### Migrations (`migrator.ts`)

Database schema changes are managed through migration files:

```bash
# Run pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration (development only)
npm run migrate:down

# Reset database (development only)
npm run migrate:reset
```

### Data Models (`../types/index.ts`)

TypeScript interfaces define the structure of all data models:

- `TeacherProfile` - User profiles with credentials and preferences
- `Resource` - Educational resources with metadata
- `Message` - Direct and group messages
- `Community` - Teacher communities and groups
- `GovernmentContent` - Official content from government institutions

### Repositories (`repositories/`)

Data access layer with base repository pattern:

```typescript
import { userRepository } from './database/repositories/userRepository';

// Find user by ID
const user = await userRepository.findById('user-123');

// Find user by email
const user = await userRepository.findByEmail('teacher@example.com');

// Create new user
const newUser = await userRepository.create({
  email: 'new@example.com',
  fullName: 'New Teacher',
  // ... other fields
});

// Update user
const updatedUser = await userRepository.update('user-123', {
  verificationStatus: 'verified'
});

// Paginated search
const results = await userRepository.findWithPagination(1, 10, {
  verification_status: 'verified'
});
```

## Database Schema

### Core Tables

1. **users** - Teacher profiles and authentication
2. **resources** - Educational content and materials
3. **communities** - Teacher groups and communities
4. **messages** - Direct and group messaging
5. **government_content** - Official government content
6. **resource_ratings** - User ratings for resources
7. **community_memberships** - User-community relationships
8. **user_connections** - Following/follower relationships

### Key Features

- **UUID Primary Keys** - All tables use UUID primary keys for better distribution
- **JSONB Columns** - Complex data stored as JSONB for flexibility and performance
- **Full-Text Search** - Trigram indexes for efficient text search
- **Soft Deletes** - Records marked as inactive rather than deleted
- **Audit Trails** - Created/updated timestamps with automatic triggers
- **Data Integrity** - Foreign key constraints and check constraints

### Indexing Strategy

- **Primary Indexes** - On frequently queried columns (email, status, type)
- **Composite Indexes** - For common query patterns
- **GIN Indexes** - On JSONB columns for efficient JSON queries
- **Trigram Indexes** - For fuzzy text search capabilities

## Environment Configuration

Required environment variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teacher_hub
DB_USER=teacher_hub_user
DB_PASSWORD=teacher_hub_password
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
```

## Testing

The database layer includes comprehensive tests:

```bash
# Run all database tests
npm test -- --testPathPattern=database

# Run specific test suites
npm test -- --testPathPattern=connection
npm test -- --testPathPattern=migrator
npm test -- --testPathPattern=schema-validation
```

## Performance Considerations

1. **Connection Pooling** - Configured for optimal connection reuse
2. **Query Optimization** - Proper indexing for common query patterns
3. **JSONB Usage** - Efficient storage and querying of complex data
4. **Batch Operations** - Repository methods support batch operations
5. **Caching Strategy** - Ready for Redis integration for frequently accessed data

## Security Features

1. **Parameterized Queries** - All queries use parameter binding
2. **Connection Encryption** - SSL/TLS support for production
3. **Access Control** - Role-based database permissions
4. **Audit Logging** - Comprehensive logging of database operations
5. **Data Validation** - Type checking and constraint validation