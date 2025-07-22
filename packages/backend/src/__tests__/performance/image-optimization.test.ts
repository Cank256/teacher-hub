import ImageOptimizer from '../../utils/imageOptimization';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

describe('Image Optimization Performance Tests', () => {
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  const outputDir = path.join(__dirname, '../temp');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(outputDir, { recursive: true });

    // Create a test image if it doesn't exist
    try {
      await fs.access(testImagePath);
    } catch {
      // Create a simple test image
      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 100, g: 150, b: 200 }
        }
      })
      .jpeg({ quality: 90 })
      .toFile(testImagePath);
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test files:', error);
    }
  });

  describe('Image Optimization Performance', () => {
    it('should optimize images within acceptable time limits', async () => {
      const outputPath = path.join(outputDir, 'optimized.jpg');

      const start = Date.now();
      await ImageOptimizer.optimizeImage(testImagePath, outputPath, {
        width: 800,
        height: 600,
        quality: 85,
        format: 'jpeg'
      });
      const optimizationTime = Date.now() - start;

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);

      // Performance assertion - should complete within 2 seconds
      expect(optimizationTime).toBeLessThan(2000);
    });

    it('should generate multiple variants efficiently', async () => {
      const variants = [
        { size: 'thumbnail', width: 150, height: 150, quality: 80 },
        { size: 'small', width: 300, quality: 85 },
        { size: 'medium', width: 600, quality: 85 },
        { size: 'large', width: 1200, quality: 90 }
      ];

      const start = Date.now();
      const results = await ImageOptimizer.generateVariants(
        testImagePath,
        outputDir,
        'test-variants.jpg',
        variants
      );
      const variantTime = Date.now() - start;

      // Verify all variants were created
      expect(Object.keys(results)).toHaveLength(variants.length);

      for (const [size, filename] of Object.entries(results)) {
        const filePath = path.join(outputDir, filename);
        const stats = await fs.stat(filePath);
        expect(stats.size).toBeGreaterThan(0);
      }

      // Performance assertion - should complete within 5 seconds for 4 variants
      expect(variantTime).toBeLessThan(5000);
    });

    it('should compress images to target size efficiently', async () => {
      const outputPath = path.join(outputDir, 'compressed.jpg');
      const targetSizeKB = 100;

      const start = Date.now();
      await ImageOptimizer.compressImage(testImagePath, outputPath, targetSizeKB);
      const compressionTime = Date.now() - start;

      // Verify file was created and is approximately the target size
      const stats = await fs.stat(outputPath);
      const actualSizeKB = stats.size / 1024;

      expect(actualSizeKB).toBeLessThanOrEqual(targetSizeKB * 1.2); // Allow 20% tolerance
      expect(actualSizeKB).toBeGreaterThan(5); // Should be at least 5KB

      // Performance assertion - should complete within 3 seconds
      expect(compressionTime).toBeLessThan(3000);
    });

    it('should handle concurrent image processing', async () => {
      const concurrentOperations = 5;
      const promises: Promise<void>[] = [];

      const start = Date.now();

      for (let i = 0; i < concurrentOperations; i++) {
        const outputPath = path.join(outputDir, `concurrent-${i}.jpg`);
        promises.push(
          ImageOptimizer.optimizeImage(testImagePath, outputPath, {
            width: 400 + (i * 100),
            quality: 80,
            format: 'jpeg'
          })
        );
      }

      await Promise.all(promises);
      const totalTime = Date.now() - start;

      // Verify all files were created
      for (let i = 0; i < concurrentOperations; i++) {
        const outputPath = path.join(outputDir, `concurrent-${i}.jpg`);
        const stats = await fs.stat(outputPath);
        expect(stats.size).toBeGreaterThan(0);
      }

      // Performance assertion - concurrent operations should be efficient
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Image Metadata Performance', () => {
    it('should retrieve image metadata quickly', async () => {
      const start = Date.now();
      const metadata = await ImageOptimizer.getImageMetadata(testImagePath);
      const metadataTime = Date.now() - start;

      expect(metadata.width).toBeDefined();
      expect(metadata.height).toBeDefined();
      expect(metadata.format).toBeDefined();

      // Performance assertion - metadata retrieval should be very fast
      expect(metadataTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large images without excessive memory usage', async () => {
      // Create a large test image (4K resolution)
      const largeImagePath = path.join(outputDir, 'large-test.jpg');
      await sharp({
        create: {
          width: 3840,
          height: 2160,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .jpeg({ quality: 95 })
      .toFile(largeImagePath);

      const outputPath = path.join(outputDir, 'large-optimized.jpg');

      // Monitor memory usage (basic check)
      const memBefore = process.memoryUsage().heapUsed;

      const start = Date.now();
      await ImageOptimizer.optimizeImage(largeImagePath, outputPath, {
        width: 1920,
        height: 1080,
        quality: 85,
        format: 'jpeg'
      });
      const processingTime = Date.now() - start;

      const memAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

      // Verify file was created
      const stats = await fs.stat(outputPath);
      expect(stats.size).toBeGreaterThan(0);

      // Performance assertions
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(memoryIncrease).toBeLessThan(500);  // Should not use more than 500MB additional memory
    });
  });
});