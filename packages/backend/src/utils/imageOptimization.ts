import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import logger from './logger';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

export interface ImageVariant {
  size: string;
  width: number;
  height?: number;
  quality: number;
}

export class ImageOptimizer {
  private static readonly DEFAULT_VARIANTS: ImageVariant[] = [
    { size: 'thumbnail', width: 150, height: 150, quality: 80 },
    { size: 'small', width: 300, quality: 85 },
    { size: 'medium', width: 600, quality: 85 },
    { size: 'large', width: 1200, quality: 90 }
  ];

  static async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: ImageOptimizationOptions = {}
  ): Promise<void> {
    try {
      const {
        width,
        height,
        quality = 85,
        format = 'jpeg',
        progressive = true
      } = options;

      let pipeline = sharp(inputPath);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality,
            progressive,
            mozjpeg: true
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive,
            compressionLevel: 9
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6
          });
          break;
      }

      await pipeline.toFile(outputPath);
      
      logger.info(`Image optimized: ${inputPath} -> ${outputPath}`);
    } catch (error) {
      logger.error('Image optimization failed:', error);
      throw error;
    }
  }

  static async generateVariants(
    inputPath: string,
    outputDir: string,
    filename: string,
    variants: ImageVariant[] = ImageOptimizer.DEFAULT_VARIANTS
  ): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Generate each variant
      for (const variant of variants) {
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        const outputFilename = `${name}_${variant.size}${ext}`;
        const outputPath = path.join(outputDir, outputFilename);

        await this.optimizeImage(inputPath, outputPath, {
          width: variant.width,
          height: variant.height,
          quality: variant.quality,
          format: 'jpeg'
        });

        results[variant.size] = outputFilename;
      }

      logger.info(`Generated ${variants.length} image variants for ${filename}`);
      return results;
    } catch (error) {
      logger.error('Failed to generate image variants:', error);
      throw error;
    }
  }

  static async getImageMetadata(imagePath: string): Promise<sharp.Metadata> {
    try {
      return await sharp(imagePath).metadata();
    } catch (error) {
      logger.error('Failed to get image metadata:', error);
      throw error;
    }
  }

  static async compressImage(
    inputPath: string,
    outputPath: string,
    targetSizeKB: number
  ): Promise<void> {
    try {
      let quality = 90;
      let currentSize = 0;
      const maxAttempts = 10;
      let attempts = 0;

      do {
        await sharp(inputPath)
          .jpeg({ quality, progressive: true, mozjpeg: true })
          .toFile(outputPath);

        const stats = await fs.stat(outputPath);
        currentSize = stats.size / 1024; // Convert to KB

        if (currentSize > targetSizeKB && attempts < maxAttempts) {
          quality -= 10;
          attempts++;
        } else {
          break;
        }
      } while (currentSize > targetSizeKB && quality > 20);

      logger.info(`Image compressed to ${currentSize.toFixed(2)}KB with quality ${quality}`);
    } catch (error) {
      logger.error('Image compression failed:', error);
      throw error;
    }
  }
}

export default ImageOptimizer;