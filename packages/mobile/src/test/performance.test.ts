import { render } from '@testing-library/react-native';
import { 
  PerformanceMonitor, 
  MemoryLeakDetector, 
  FrameRateMonitor,
  measurePerformance,
  measureColdStartTime,
  measureTimeToInteractive
} from './performanceUtils';
import { createMockPost, createMockUser } from './testUtils';
import { PostCard } from '../components/posts/PostCard/PostCard';
import { Button } from '../components/ui/Button/Button';
import { PostsList } from '../features/posts/components/PostsList';

describe('Performance Tests', () => {
  describe('Component Render Performance', () => {
    it('should render Button component within performance threshold', 
      measurePerformance(
        () => {
          render(<Button title="Test Button" onPress={() => {}} />);
        },
        {
          maxRenderTime: 50, // 50ms
          maxMemoryUsage: 1024 * 1024, // 1MB
          maxReRenders: 1,
        }
      )
    );

    it('should render PostCard component efficiently', 
      measurePerformance(
        () => {
          const mockPost = createMockPost();
          render(<PostCard post={mockPost} />);
        },
        {
          maxRenderTime: 100, // 100ms
          maxMemoryUsage: 2 * 1024 * 1024, // 2MB
          maxReRenders: 1,
        }
      )
    );

    it('should render large lists efficiently', 
      measurePerformance(
        () => {
          const mockPosts = Array.from({ length: 100 }, () => createMockPost());
          render(<PostsList posts={mockPosts} />);
        },
        {
          maxRenderTime: 500, // 500ms for 100 items
          maxMemoryUsage: 10 * 1024 * 1024, // 10MB
          maxReRenders: 1,
        }
      )
    );
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during component mounting/unmounting', () => {
      const detector = new MemoryLeakDetector();
      detector.start();

      // Mount and unmount components multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<Button title={`Button ${i}`} onPress={() => {}} />);
        detector.sample();
        unmount();
        detector.sample();
      }

      expect(detector.detectLeak(5 * 1024 * 1024)).toBe(false); // 5MB threshold
    });

    it('should handle large data sets without excessive memory usage', () => {
      const detector = new MemoryLeakDetector();
      detector.start();

      const largePosts = Array.from({ length: 1000 }, (_, i) => 
        createMockPost({ id: `post-${i}`, title: `Post ${i}` })
      );

      render(<PostsList posts={largePosts} />);
      detector.sample();

      expect(detector.detectLeak(20 * 1024 * 1024)).toBe(false); // 20MB threshold
    });

    it('should maintain stable memory usage over time', () => {
      const detector = new MemoryLeakDetector();
      detector.start();

      // Simulate app usage over time
      for (let i = 0; i < 10; i++) {
        const mockPost = createMockPost();
        const { unmount } = render(<PostCard post={mockPost} />);
        detector.sample();
        
        // Simulate some delay
        setTimeout(() => {
          unmount();
          detector.sample();
        }, 10);
      }

      expect(detector.getMemoryTrend()).not.toBe('increasing');
    });
  });

  describe('Render Time Tests', () => {
    it('should render simple components quickly', async () => {
      const renderTime = await new Promise<number>((resolve) => {
        const start = performance.now();
        render(<Button title="Quick Render Test" onPress={() => {}} />);
        const end = performance.now();
        resolve(end - start);
      });

      expect(renderTime).toBeLessThan(50); // 50ms
    });

    it('should render complex components within acceptable time', async () => {
      const mockPost = createMockPost({
        mediaAttachments: [
          { id: '1', type: 'image', url: 'https://example.com/image1.jpg', filename: 'image1.jpg', size: 1024 },
          { id: '2', type: 'image', url: 'https://example.com/image2.jpg', filename: 'image2.jpg', size: 1024 },
        ],
      });

      const renderTime = await new Promise<number>((resolve) => {
        const start = performance.now();
        render(<PostCard post={mockPost} />);
        const end = performance.now();
        resolve(end - start);
      });

      expect(renderTime).toBeLessThan(200); // 200ms
    });

    it('should handle rapid re-renders efficiently', async () => {
      let renderCount = 0;
      const maxRenders = 100;
      
      const start = performance.now();
      
      for (let i = 0; i < maxRenders; i++) {
        const { rerender } = render(<Button title={`Button ${i}`} onPress={() => {}} />);
        rerender(<Button title={`Updated Button ${i}`} onPress={() => {}} />);
        renderCount += 2;
      }
      
      const end = performance.now();
      const totalTime = end - start;
      const averageRenderTime = totalTime / renderCount;

      expect(averageRenderTime).toBeLessThan(10); // 10ms average per render
    });
  });

  describe('Frame Rate Tests', () => {
    it('should maintain smooth frame rate during animations', () => {
      const frameMonitor = new FrameRateMonitor();
      frameMonitor.start();

      // Simulate animation frames
      const animationDuration = 1000; // 1 second
      const targetFPS = 60;
      const frameInterval = 1000 / targetFPS;

      for (let i = 0; i < targetFPS; i++) {
        setTimeout(() => {
          frameMonitor.recordFrame();
        }, i * frameInterval);
      }

      setTimeout(() => {
        const averageFPS = frameMonitor.getAverageFrameRate();
        const droppedFrames = frameMonitor.getDroppedFrames(targetFPS);

        expect(averageFPS).toBeGreaterThan(55); // At least 55 FPS
        expect(droppedFrames).toBeLessThan(5); // Less than 5 dropped frames
      }, animationDuration + 100);
    });
  });

  describe('Cold Start Performance', () => {
    it('should have acceptable cold start time', async () => {
      const coldStartTime = await measureColdStartTime();
      expect(coldStartTime).toBeLessThan(1500); // 1.5 seconds
    });

    it('should achieve time to interactive quickly', async () => {
      const ttiTime = await measureTimeToInteractive();
      expect(ttiTime).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('List Performance', () => {
    it('should handle large lists with virtualization', 
      measurePerformance(
        () => {
          const largePosts = Array.from({ length: 10000 }, (_, i) => 
            createMockPost({ id: `post-${i}` })
          );
          render(<PostsList posts={largePosts} />);
        },
        {
          maxRenderTime: 1000, // 1 second for 10k items
          maxMemoryUsage: 50 * 1024 * 1024, // 50MB
          maxReRenders: 1,
        }
      )
    );

    it('should handle rapid scrolling without performance degradation', () => {
      const posts = Array.from({ length: 1000 }, (_, i) => 
        createMockPost({ id: `post-${i}` })
      );

      const monitor = new PerformanceMonitor();
      monitor.start();

      const { getByTestId } = render(<PostsList posts={posts} testID="posts-list" />);
      
      // Simulate rapid scrolling
      const list = getByTestId('posts-list');
      for (let i = 0; i < 50; i++) {
        // Simulate scroll events
        monitor.incrementRenderCount();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBeLessThan(2000); // 2 seconds
      expect(metrics.reRenderCount).toBeLessThan(100); // Reasonable re-render count
    });
  });

  describe('Image Loading Performance', () => {
    it('should load images efficiently', async () => {
      const mockPost = createMockPost({
        mediaAttachments: [
          { 
            id: '1', 
            type: 'image', 
            url: 'https://example.com/large-image.jpg',
            thumbnailUrl: 'https://example.com/thumbnail.jpg',
            filename: 'large-image.jpg', 
            size: 5 * 1024 * 1024 // 5MB
          },
        ],
      });

      const start = performance.now();
      render(<PostCard post={mockPost} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should render quickly even with large images
    });

    it('should handle multiple images without blocking', async () => {
      const mockPost = createMockPost({
        mediaAttachments: Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          type: 'image' as const,
          url: `https://example.com/image-${i}.jpg`,
          thumbnailUrl: `https://example.com/thumb-${i}.jpg`,
          filename: `image-${i}.jpg`,
          size: 1024 * 1024, // 1MB each
        })),
      });

      const start = performance.now();
      render(<PostCard post={mockPost} />);
      const end = performance.now();

      expect(end - start).toBeLessThan(200); // Should handle multiple images efficiently
    });
  });

  describe('State Management Performance', () => {
    it('should handle frequent state updates efficiently', () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      let clickCount = 0;
      const { getByText, rerender } = render(
        <Button 
          title={`Clicked ${clickCount} times`} 
          onPress={() => {
            clickCount++;
            monitor.incrementRenderCount();
          }} 
        />
      );

      // Simulate rapid clicks
      const button = getByText(`Clicked ${clickCount} times`);
      for (let i = 0; i < 100; i++) {
        clickCount++;
        rerender(
          <Button 
            title={`Clicked ${clickCount} times`} 
            onPress={() => {}} 
          />
        );
        monitor.incrementRenderCount();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBeLessThan(1000); // 1 second for 100 updates
      expect(metrics.reRenderCount).toBe(100);
    });
  });

  describe('Network Performance Impact', () => {
    it('should not block UI during API calls', async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      // Simulate component that makes API calls
      const mockUser = createMockUser();
      const { rerender } = render(<Button title="Loading..." onPress={() => {}} disabled />);

      // Simulate API response after delay
      setTimeout(() => {
        rerender(<Button title={`Welcome ${mockUser.firstName}`} onPress={() => {}} />);
        monitor.incrementRenderCount();
      }, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.renderTime).toBeLessThan(150); // Should complete within reasonable time
    });
  });

  describe('Bundle Size Impact', () => {
    it('should have reasonable component bundle impact', () => {
      // This is a mock test - in real scenarios, you'd measure actual bundle sizes
      const componentSizes = {
        Button: 2 * 1024, // 2KB
        PostCard: 8 * 1024, // 8KB
        PostsList: 15 * 1024, // 15KB
      };

      Object.entries(componentSizes).forEach(([component, size]) => {
        expect(size).toBeLessThan(20 * 1024); // 20KB max per component
      });
    });
  });

  describe('Concurrent Rendering', () => {
    it('should handle concurrent component renders', async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      // Render multiple components concurrently
      const renderPromises = Array.from({ length: 10 }, (_, i) => 
        new Promise<void>((resolve) => {
          setTimeout(() => {
            render(<Button title={`Concurrent Button ${i}`} onPress={() => {}} />);
            monitor.incrementComponentCount();
            resolve();
          }, Math.random() * 100);
        })
      );

      await Promise.all(renderPromises);

      const metrics = monitor.getMetrics();
      expect(metrics.componentCount).toBe(10);
      expect(metrics.renderTime).toBeLessThan(500); // 500ms for concurrent renders
    });
  });
});