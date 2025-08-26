# Offline Synchronization Engine

A comprehensive offline synchronization system for the Teacher Hub mobile app, providing robust data synchronization, conflict resolution, and offline content management.

## Features

- **Offline Operation Queue**: Priority-based queue with retry mechanisms and exponential backoff
- **Conflict Resolution**: Intelligent conflict detection and resolution strategies
- **Background Sync**: Battery-optimized background synchronization
- **Content Download**: Selective content download for offline access
- **Status Monitoring**: Real-time sync status and progress tracking
- **Event System**: Comprehensive event listeners for sync operations

## Architecture

```
SyncEngine (Main Orchestrator)
├── OperationQueue (Queue Management)
├── ConflictResolutionManager (Conflict Handling)
├── BackgroundSyncService (Background Processing)
├── OfflineStatusMonitor (Status Tracking)
└── ContentDownloadManager (Content Management)
```

## Quick Start

```typescript
import { createSyncEngine } from '@/services/sync'
import { NetworkMonitor } from '@/services/api/networkMonitor'
import { DatabaseService } from '@/services/storage/databaseService'
import { StorageService } from '@/services/storage/mmkvService'

// Initialize sync engine
const syncEngine = await createSyncEngine(
  NetworkMonitor.getInstance(),
  new DatabaseService(),
  new StorageService(),
  {
    autoSyncEnabled: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    storageQuotaMB: 100
  }
)

// Queue an operation
await syncEngine.queueOperation({
  type: OperationType.CREATE,
  resourceType: ResourceType.POST,
  data: { title: 'My Post', content: 'Post content' },
  priority: SyncPriority.MEDIUM,
  retryCount: 0,
  maxRetries: 3
})

// Listen to sync events
const unsubscribe = syncEngine.addSyncListener({
  onSyncStarted: () => console.log('Sync started'),
  onSyncCompleted: (result) => console.log('Sync completed:', result),
  onConflictDetected: (conflict) => console.log('Conflict detected:', conflict)
})
```

## Operation Types

### OperationType
- `CREATE`: Create new resource
- `UPDATE`: Update existing resource
- `DELETE`: Delete resource
- `UPLOAD`: Upload file/media
- `DOWNLOAD`: Download content

### ResourceType
- `POST`: Blog posts and articles
- `COMMENT`: Comments on posts
- `MESSAGE`: Direct messages
- `RESOURCE`: Educational resources
- `COMMUNITY`: Community data
- `USER_PROFILE`: User profile information
- `MEDIA_ATTACHMENT`: Media files

### SyncPriority
- `LOW` (0): Background operations
- `MEDIUM` (1): Normal user actions
- `HIGH` (2): Important user actions
- `CRITICAL` (3): System-critical operations

## Conflict Resolution

The sync engine supports multiple conflict resolution strategies:

### ConflictResolutionStrategy
- `CLIENT_WINS`: Always use client data
- `SERVER_WINS`: Always use server data
- `LAST_MODIFIED_WINS`: Use data with latest timestamp
- `MERGE`: Intelligently merge both versions
- `PROMPT_USER`: Ask user to resolve manually

### Custom Resolvers

Register custom conflict resolvers for specific resource types:

```typescript
syncEngine.conflictResolver.registerResolver(
  ResourceType.USER_PROFILE,
  async (clientData, serverData, conflict) => {
    // Custom merge logic
    return {
      ...serverData,
      ...clientData,
      updated_at: Math.max(clientData.updated_at, serverData.updated_at)
    }
  }
)
```

## Offline Content Management

### Download Content for Offline Access

```typescript
// Download specific resources
await syncEngine.downloadForOffline(['resource1', 'resource2'], SyncPriority.HIGH)

// Monitor download progress
const unsubscribe = downloadManager.addProgressListener('resource1', (progress) => {
  console.log(`Download progress: ${progress.progress}%`)
})
```

### Storage Management

```typescript
// Get storage usage
const usage = await downloadManager.getStorageUsage()
console.log(`Using ${usage.totalSize} bytes for ${usage.downloadCount} downloads`)

// Clean up failed downloads
await downloadManager.cleanupFailedDownloads()

// Remove specific content
await syncEngine.removeOfflineContent(['resource1', 'resource2'])
```

## Background Sync

The background sync service optimizes battery usage and handles sync operations when the app is backgrounded:

```typescript
// Configure background sync
syncEngine.backgroundSync.updateConfiguration({
  syncInterval: 60000, // 1 minute
  wifiOnlyBackground: true,
  batteryOptimized: true
})

// Schedule background task
await syncEngine.backgroundSync.scheduleTask({
  type: 'sync',
  priority: SyncPriority.MEDIUM,
  scheduledAt: new Date(Date.now() + 60000),
  batteryOptimized: true,
  wifiOnly: false
})
```

## Status Monitoring

### Get Offline Status

```typescript
const status = await syncEngine.getOfflineStatus()
console.log({
  isOnline: status.isOnline,
  pendingOperations: status.pendingOperations,
  failedOperations: status.failedOperations,
  storageUsed: status.storageUsed,
  lastSyncTime: status.lastSyncTime
})
```

### User-Friendly Status Messages

```typescript
const statusMonitor = syncEngine.statusMonitor
const message = statusMonitor.getStatusMessage()
// Returns: "Syncing...", "5 changes pending sync", "Offline - Changes will sync when connected", etc.
```

## Event Listeners

Listen to various sync events:

```typescript
const listener: SyncEventListener = {
  onSyncStarted: () => {
    // Show sync indicator
  },
  
  onSyncCompleted: (result: SyncResult) => {
    // Hide sync indicator, show success message
    if (result.conflicts.length > 0) {
      // Handle conflicts
    }
  },
  
  onSyncFailed: (error: SyncError) => {
    // Show error message
  },
  
  onOperationQueued: (operation: OfflineOperation) => {
    // Update pending operations count
  },
  
  onConflictDetected: (conflict: SyncConflict) => {
    // Show conflict resolution UI
  },
  
  onStorageQuotaExceeded: (usage: number, limit: number) => {
    // Show storage management UI
  },
  
  onNetworkStatusChanged: (isOnline: boolean) => {
    // Update UI based on network status
  }
}

const unsubscribe = syncEngine.addSyncListener(listener)
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG: SyncConfiguration = {
  autoSyncEnabled: true,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  backoffMultiplier: 2,
  initialRetryDelay: 1000,
  maxRetryDelay: 300000, // 5 minutes
  batchSize: 10,
  storageQuotaMB: 100,
  priorityWeights: {
    [SyncPriority.LOW]: 1,
    [SyncPriority.MEDIUM]: 2,
    [SyncPriority.HIGH]: 4,
    [SyncPriority.CRITICAL]: 8
  },
  conflictResolutionDefaults: {
    [ResourceType.POST]: ConflictResolutionStrategy.LAST_MODIFIED_WINS,
    [ResourceType.COMMENT]: ConflictResolutionStrategy.CLIENT_WINS,
    [ResourceType.MESSAGE]: ConflictResolutionStrategy.CLIENT_WINS,
    [ResourceType.RESOURCE]: ConflictResolutionStrategy.SERVER_WINS,
    [ResourceType.COMMUNITY]: ConflictResolutionStrategy.SERVER_WINS,
    [ResourceType.USER_PROFILE]: ConflictResolutionStrategy.MERGE,
    [ResourceType.MEDIA_ATTACHMENT]: ConflictResolutionStrategy.SERVER_WINS
  }
}
```

## Database Schema

The sync engine creates the following tables:

### offline_operations
```sql
CREATE TABLE offline_operations (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  data TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  last_attempt_at TEXT,
  error_message TEXT,
  conflict_resolution TEXT
)
```

### file_downloads
```sql
CREATE TABLE file_downloads (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL UNIQUE,
  file_url TEXT NOT NULL,
  local_path TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  downloaded_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  progress REAL NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  metadata TEXT
)
```

## Testing

The sync engine includes comprehensive tests:

```bash
# Run all sync tests
npm test -- src/services/sync

# Run specific test file
npm test -- src/services/sync/__tests__/syncEngine.test.ts

# Run integration tests
npm test -- src/services/sync/__tests__/syncIntegration.test.ts

# Run with coverage
npm run test:coverage -- src/services/sync
```

## Performance Considerations

### Batching
- Operations are processed in configurable batches (default: 10)
- Prevents overwhelming the network and UI

### Priority Queue
- High-priority operations are processed first
- Critical operations bypass normal queuing

### Exponential Backoff
- Failed operations are retried with increasing delays
- Prevents overwhelming servers during outages

### Background Optimization
- Reduced sync frequency when app is backgrounded
- Battery-aware scheduling
- WiFi-only options for large downloads

### Memory Management
- Efficient data structures for large operation queues
- Automatic cleanup of completed operations
- Storage quota enforcement

## Error Handling

The sync engine categorizes errors for appropriate handling:

- **Network Errors**: Retryable, use exponential backoff
- **Authentication Errors**: Not retryable, require user intervention
- **Validation Errors**: Not retryable, fix data and retry
- **Conflict Errors**: Require conflict resolution
- **Storage Errors**: May be retryable depending on cause
- **Quota Exceeded**: Not retryable, require storage cleanup

## Best Practices

1. **Use Appropriate Priorities**: Reserve HIGH and CRITICAL for truly important operations
2. **Handle Conflicts Gracefully**: Implement custom resolvers for complex data types
3. **Monitor Storage Usage**: Regularly clean up old downloads and failed operations
4. **Listen to Events**: Provide user feedback for sync operations
5. **Test Offline Scenarios**: Ensure your app works well without connectivity
6. **Optimize for Battery**: Use background sync judiciously
7. **Handle Edge Cases**: Network interruptions, app kills, storage full, etc.

## Troubleshooting

### Common Issues

**Operations not syncing**
- Check network connectivity
- Verify sync is not paused
- Check for authentication errors

**High storage usage**
- Run cleanup for failed downloads
- Check storage quota settings
- Monitor download patterns

**Frequent conflicts**
- Review conflict resolution strategies
- Implement custom resolvers
- Consider data model changes

**Poor performance**
- Adjust batch sizes
- Review priority assignments
- Monitor operation queue size

### Debug Information

```typescript
// Get queue statistics
const stats = await syncEngine.operationQueue.getQueueStats()
console.log('Queue stats:', stats)

// Get sync metrics
const metrics = syncEngine.statusMonitor.getSyncMetrics()
console.log('Sync metrics:', metrics)

// Get storage usage
const usage = await syncEngine.downloadManager.getStorageUsage()
console.log('Storage usage:', usage)
```