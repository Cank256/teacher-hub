import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  profilePicture: null,
  subjects: [{ id: 'math', name: 'Mathematics', code: 'MATH' }],
  gradeLevels: [{ id: 'grade-5', name: 'Grade 5', order: 5 }],
  schoolLocation: { id: 'kampala', name: 'Kampala', region: 'Central' },
  yearsOfExperience: 5,
  verificationStatus: 'verified' as const,
  createdAt: new Date('2024-01-01'),
  lastActiveAt: new Date(),
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  title: 'Test Post',
  content: 'This is a test post content',
  author: createMockUser(),
  category: { id: 'lesson-plan', name: 'Lesson Plans', color: '#4CAF50', icon: 'book' },
  mediaAttachments: [],
  likes: 5,
  comments: 3,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isLiked: false,
  ...overrides,
});

export const createMockCommunity = (overrides = {}) => ({
  id: 'community-1',
  name: 'Mathematics Teachers',
  description: 'A community for mathematics teachers',
  category: { id: 'subject', name: 'Subject-based' },
  memberCount: 150,
  isPublic: true,
  isJoined: false,
  moderators: [createMockUser()],
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: 'message-1',
  conversationId: 'conversation-1',
  senderId: 'user-1',
  content: 'Hello, how are you?',
  type: 'text' as const,
  timestamp: new Date(),
  isRead: false,
  deliveryStatus: 'delivered' as const,
  ...overrides,
});

export const createMockResource = (overrides = {}) => ({
  id: 'resource-1',
  title: 'Math Worksheet',
  description: 'A comprehensive math worksheet for grade 5',
  type: 'document' as const,
  fileUrl: 'https://example.com/worksheet.pdf',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  size: 1024000,
  category: { id: 'worksheet', name: 'Worksheets', subjects: [], gradeLevels: [] },
  uploadedBy: createMockUser(),
  rating: 4.5,
  downloadCount: 25,
  isDownloaded: false,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// Test providers wrapper
interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ 
  children, 
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}) => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            {children}
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient;
  }
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const measureMemoryUsage = (): number => {
  // Mock implementation for React Native environment
  return (global as any).performance?.memory?.usedJSHeapSize || 0;
};

// Mock API responses
export const createMockApiResponse = <T>(data: T, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

export const createMockPaginatedResponse = <T>(
  items: T[],
  page = 1,
  limit = 10,
  total?: number
) => ({
  data: items,
  pagination: {
    page,
    limit,
    total: total || items.length,
    totalPages: Math.ceil((total || items.length) / limit),
    hasNext: page * limit < (total || items.length),
    hasPrev: page > 1,
  },
});

// Async testing utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock storage utilities
export const createMockStorage = () => {
  const storage = new Map<string, string>();
  
  return {
    getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
    setItem: jest.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
  };
};

// Network testing utilities
export const createMockNetworkInfo = (isConnected = true) => ({
  isConnected,
  type: isConnected ? 'wifi' : 'none',
  isInternetReachable: isConnected,
  details: {
    isConnectionExpensive: false,
    cellularGeneration: null,
    carrier: null,
  },
});

// Error testing utilities
export const createMockError = (message = 'Test error', code = 'TEST_ERROR') => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};

// Re-export everything from testing library
export * from '@testing-library/react-native';

// Export custom render as default render
export { customRender as render };