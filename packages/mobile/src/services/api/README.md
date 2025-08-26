# Network Layer and API Client

This module provides a comprehensive network layer for the Teacher Hub mobile application, built with modern React Native architecture and best practices.

## Features

- **Axios-based API Client** with retry logic and interceptors
- **React Query Integration** for caching, background refresh, and optimistic updates
- **Network Status Monitoring** with offline detection
- **SSL Pinning** for secure communications (configuration ready)
- **Comprehensive Error Handling** with user-friendly messages
- **Automatic Token Refresh** and authentication handling
- **Request/Response Interceptors** with device information
- **Retry Logic** with exponential backoff
- **TypeScript Support** with strict typing

## Architecture

```
src/services/api/
├── apiClient.ts          # Main API client with retry logic
├── queryClient.ts        # React Query configuration and utilities
├── hooks.ts              # Custom React Query hooks
├── interceptors.ts       # Request/response interceptors
├── errorHandler.ts       # Error handling and user messages
├── retryHandler.ts       # Retry logic with backoff
├── networkMonitor.ts     # Network status monitoring
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration constants
└── index.ts              # Public API exports
```

## Usage

### Basic API Calls

```typescript
import { ApiClient } from '@/services/api'

const apiClient = ApiClient.getInstance()

// GET request
const response = await apiClient.get('/posts', { page: 1, limit: 10 })

// POST request
const newPost = await apiClient.post('/posts', {
  title: 'My Post',
  content: 'Post content'
})

// File upload
const formData = new FormData()
formData.append('file', file)
const uploadResult = await apiClient.uploadFile('/upload', formData)
```

### React Query Hooks

```typescript
import { useApiQuery, useApiMutation, usePaginatedQuery } from '@/services/api'

// Query data
const { data, isLoading, error } = useApiQuery(
  ['posts', { page: 1 }],
  '/posts',
  { page: 1, limit: 10 }
)

// Paginated query
const { data: posts } = usePaginatedQuery(
  ['posts'],
  '/posts'
)

// Mutation
const createPostMutation = useApiMutation(
  (postData) => apiClient.post('/posts', postData),
  {
    onSuccess: () => {
      // Invalidate posts query
      queryClient.invalidateQueries(['posts'])
    }
  }
)
```

### Network Status

```typescript
import { useNetworkStatus } from '@/services/api'

const {
  isOnline,
  isOffline,
  connectionType,
  isWifi,
  isCellular
} = useNetworkStatus()
```

### Optimistic Updates

```typescript
import { useOptimisticMutation } from '@/services/api'

const updatePostMutation = useOptimisticMutation(
  (variables) => apiClient.put(`/posts/${variables.id}`, variables),
  {
    queryKey: ['posts'],
    updateFn: (oldData, variables) => 
      oldData.map(post => 
        post.id === variables.id ? { ...post, ...variables } : post
      )
  }
)
```

## Configuration

### Environment Variables

```bash
EXPO_PUBLIC_API_URL=https://api.teacherhub.ug
```

### SSL Pinning

SSL pinning is configured but requires certificate files:

```typescript
// Add certificate files to assets and update config
export const SSL_PINNING_CONFIG = {
  'api.teacherhub.ug': {
    certificateFilename: 'teacherhub-cert.cer',
    includeSubdomains: true
  }
}
```

## Error Handling

The API client provides comprehensive error handling with user-friendly messages:

- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: 401/403 responses with automatic token refresh
- **Validation Errors**: 400 responses with field-specific messages
- **Server Errors**: 5xx responses with retry logic
- **Custom Error Types**: Structured error objects with retry flags

## Testing

The module includes comprehensive tests covering:

- API client functionality
- Error handling scenarios
- Retry logic
- Network monitoring
- React Query hooks
- Optimistic updates

Run tests with:

```bash
npm test -- --testPathPattern="services/api"
```

## Integration

### App Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/api'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  )
}
```

### Background Sync

```typescript
import { useBackgroundSync } from '@/services/api'

const { syncAll, syncFeature } = useBackgroundSync()

// Sync all data when app comes to foreground
useEffect(() => {
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      syncAll()
    }
  }

  AppState.addEventListener('change', handleAppStateChange)
  return () => AppState.removeEventListener('change', handleAppStateChange)
}, [])
```

## Performance Considerations

- **Request Deduplication**: React Query automatically deduplicates identical requests
- **Background Refresh**: Stale data is refreshed in the background
- **Caching Strategy**: 5-minute stale time, 10-minute cache time
- **Retry Logic**: Exponential backoff with maximum delay limits
- **Network Awareness**: Queries only run when online
- **Memory Management**: Automatic garbage collection of unused queries

## Security Features

- **SSL Pinning**: Certificate validation for API endpoints
- **Token Management**: Secure storage and automatic refresh
- **Device Information**: Request headers with device context
- **Request Validation**: Input sanitization and validation
- **Error Sanitization**: Sensitive information removed from error messages

This network layer provides a robust foundation for all API communications in the Teacher Hub mobile application, ensuring reliability, performance, and security.