import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
    renderTime: number;
    memoryUsage: number;
    componentCount: number;
    reRenderCount: number;
}

export interface PerformanceThresholds {
    maxRenderTime: number;
    maxMemoryUsage: number;
    maxReRenders: number;
}

export class PerformanceMonitor {
    private startTime: number = 0;
    private initialMemory: number = 0;
    private renderCount: number = 0;
    private componentCount: number = 0;

    start(): void {
        this.startTime = performance.now();
        this.initialMemory = this.getMemoryUsage();
        this.renderCount = 0;
        this.componentCount = 0;
    }

    incrementRenderCount(): void {
        this.renderCount++;
    }

    incrementComponentCount(): void {
        this.componentCount++;
    }

    getMetrics(): PerformanceMetrics {
        const renderTime = performance.now() - this.startTime;
        const memoryUsage = this.getMemoryUsage() - this.initialMemory;

        return {
            renderTime,
            memoryUsage,
            componentCount: this.componentCount,
            reRenderCount: this.renderCount,
        };
    }

    private getMemoryUsage(): number {
        // Mock implementation for React Native environment
        if (typeof global !== 'undefined' && (global as any).performance?.memory) {
            return (global as any).performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    assertPerformance(thresholds: PerformanceThresholds): void {
        const metrics = this.getMetrics();

        if (metrics.renderTime > thresholds.maxRenderTime) {
            throw new Error(
                `Render time ${metrics.renderTime}ms exceeds threshold ${thresholds.maxRenderTime}ms`
            );
        }

        if (metrics.memoryUsage > thresholds.maxMemoryUsage) {
            throw new Error(
                `Memory usage ${metrics.memoryUsage} bytes exceeds threshold ${thresholds.maxMemoryUsage} bytes`
            );
        }

        if (metrics.reRenderCount > thresholds.maxReRenders) {
            throw new Error(
                `Re-render count ${metrics.reRenderCount} exceeds threshold ${thresholds.maxReRenders}`
            );
        }
    }
}

// Performance testing decorators
export const measurePerformance = (
    testFn: () => Promise<void> | void,
    thresholds: PerformanceThresholds
) => {
    return async () => {
        const monitor = new PerformanceMonitor();
        monitor.start();

        await testFn();

        monitor.assertPerformance(thresholds);
    };
};

// Memory leak detection
export class MemoryLeakDetector {
    private initialMemory: number = 0;
    private samples: number[] = [];

    start(): void {
        this.initialMemory = this.getMemoryUsage();
        this.samples = [];
    }

    sample(): void {
        this.samples.push(this.getMemoryUsage());
    }

    detectLeak(threshold: number = 10 * 1024 * 1024): boolean {
        if (this.samples.length < 2) return false;

        const finalMemory = this.samples.at(-1); // More modern approach using at()
        if (finalMemory === undefined) return false;

        const memoryIncrease = finalMemory - this.initialMemory;

        return memoryIncrease > threshold;
    }

    getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
        if (this.samples.length < 3) return 'stable';

        const recent = this.samples.slice(-3);
        const isIncreasing = recent.every((sample, index) =>
            index === 0 || (index > 0 && sample > recent[index - 1]!)
        );
        const isDecreasing = recent.every((sample, index) =>
            index === 0 || (index > 0 && sample < recent[index - 1]!)
        );

        if (isIncreasing) return 'increasing';
        if (isDecreasing) return 'decreasing';
        return 'stable';
    }

    private getMemoryUsage(): number {
        if (typeof global !== 'undefined' && (global as any).performance?.memory) {
            return (global as any).performance.memory.usedJSHeapSize;
        }
        return Math.random() * 1000000; // Mock for testing
    }
}

// Frame rate monitoring
export class FrameRateMonitor {
    private frames: number[] = [];
    private startTime: number = 0;

    start(): void {
        this.frames = [];
        this.startTime = performance.now();
    }

    recordFrame(): void {
        this.frames.push(performance.now());
    }

    getAverageFrameRate(): number {
        if (this.frames.length < 2) return 0;

        const lastFrame = this.frames[this.frames.length - 1];
        const firstFrame = this.frames[0];
        
        if (lastFrame === undefined || firstFrame === undefined) return 0;
        
        const totalTime = lastFrame - firstFrame;
        const frameCount = this.frames.length - 1;

        return (frameCount / totalTime) * 1000; // FPS
    }

    getDroppedFrames(targetFPS: number = 60): number {
        if (this.frames.length < 2) return 0;

        const expectedFrameTime = 1000 / targetFPS;
        let droppedFrames = 0;

        for (let i = 1; i < this.frames.length; i++) {
            const currentFrame = this.frames[i];
            const previousFrame = this.frames[i - 1];
            
            if (currentFrame === undefined || previousFrame === undefined) continue;
            
            const frameTime = currentFrame - previousFrame;
            if (frameTime > expectedFrameTime * 1.5) {
                droppedFrames++;
            }
        }

        return droppedFrames;
    }
}

// Bundle size analysis
export const analyzeBundleSize = () => {
    // Mock implementation for bundle size analysis
    return {
        totalSize: 2.5 * 1024 * 1024, // 2.5MB
        jsSize: 1.8 * 1024 * 1024,   // 1.8MB
        assetsSize: 0.7 * 1024 * 1024, // 0.7MB
        chunks: [
            { name: 'main', size: 1.2 * 1024 * 1024 },
            { name: 'vendor', size: 0.6 * 1024 * 1024 },
            { name: 'async', size: 0.3 * 1024 * 1024 },
        ],
    };
};

// Cold start time measurement
export const measureColdStartTime = async (): Promise<number> => {
    const start = performance.now();

    // Simulate app initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    const end = performance.now();
    return end - start;
};

// Time to Interactive (TTI) measurement
export const measureTimeToInteractive = async (): Promise<number> => {
    const start = performance.now();

    // Simulate time until app becomes interactive
    await new Promise(resolve => setTimeout(resolve, 200));

    const end = performance.now();
    return end - start;
};