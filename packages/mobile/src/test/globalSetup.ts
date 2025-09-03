import { GlobalConfig } from '@jest/types';

export default async function globalSetup(globalConfig: GlobalConfig): Promise<void> {
  console.log('🚀 Starting global test setup...');

  // Set up global test environment
  process.env.NODE_ENV = 'test';
  process.env.EXPO_PUBLIC_API_URL = 'https://api.test.teacherhub.ug';
  process.env.EXPO_PUBLIC_ENVIRONMENT = 'test';

  // Set up global performance object for performance tests
  if (!global.performance) {
    try {
      const { performance } = require('perf_hooks');
      global.performance = performance;
    } catch (error) {
      // Fallback performance object
      global.performance = {
        now: () => Date.now(),
        mark: () => {},
        measure: () => {},
      } as any;
    }
  }

  // Set up global TextEncoder/TextDecoder
  if (!global.TextEncoder) {
    try {
      const { TextEncoder, TextDecoder } = require('util');
      global.TextEncoder = TextEncoder;
      global.TextDecoder = TextDecoder;
    } catch (error) {
      // Mock TextEncoder/TextDecoder
      global.TextEncoder = class {
        encode(input: string) {
          return new Uint8Array(Buffer.from(input, 'utf8'));
        }
      } as any;
      global.TextDecoder = class {
        decode(input: Uint8Array) {
          return Buffer.from(input).toString('utf8');
        }
      } as any;
    }
  }

  // Set up global URL constructor
  if (!global.URL) {
    try {
      global.URL = require('url').URL;
    } catch (error) {
      // Mock URL constructor
      global.URL = class {
        constructor(public href: string) {}
      } as any;
    }
  }

  console.log('✅ Global test setup completed');
}