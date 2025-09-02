import { DataEncryptionService } from '../DataEncryptionService';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import DeviceInfo from 'react-native-device-info';

// Mock dependencies
jest.mock('expo-crypto');
jest.mock('expo-secure-store');
jest.mock('react-native-device-info');

describe('DataEncryptionService', () => {
  let dataEncryptionService: DataEncryptionService;
  let mockCrypto: jest.Mocked<typeof Crypto>;
  let mockSecureStore: jest.Mocked<typeof SecureStore>;
  let mockDeviceInfo: jest.Mocked<typeof DeviceInfo>;

  beforeEach(() => {
    jest.clearAllMocks();
    dataEncryptionService = DataEncryptionService.getInstance();
    mockCrypto = Crypto as jest.Mocked<typeof Crypto>;
    mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
    mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>;
  });

  describe('initialization', () => {
    it('should initialize encryption service', async () => {
      mockDeviceInfo.getUniqueId.mockResolvedValue('device123');
      mockCrypto.getRandomBytesAsync.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.digestStringAsync.mockResolvedValue('hashed_key');
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      mockSecureStore.setItemAsync.mockResolvedValue();

      await dataEncryptionService.initialize();

      expect(mockDeviceInfo.getUniqueId).toHaveBeenCalled();
      expect(mockCrypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should use existing key if available', async () => {
      const existingKey = 'existing_key';
      mockSecureStore.getItemAsync.mockResolvedValue(existingKey);

      await dataEncryptionService.initialize();

      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockDeviceInfo.getUniqueId.mockRejectedValue(new Error('Device ID failed'));

      await expect(dataEncryptionService.initialize()).rejects.toThrow('Encryption service initialization failed');
    });
  });

  describe('data encryption and decryption', () => {
    beforeEach(async () => {
      // Setup successful initialization
      mockDeviceInfo.getUniqueId.mockResolvedValue('device123');
      mockCrypto.getRandomBytesAsync.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.digestStringAsync.mockResolvedValue('hashed_key');
      mockSecureStore.getItemAsync.mockResolvedValue('master_key');
      mockSecureStore.setItemAsync.mockResolvedValue();
    });

    it('should encrypt and decrypt data successfully', async () => {
      const testData = { username: 'testuser', password: 'testpass' };
      
      // Mock crypto operations
      mockCrypto.getRandomBytesAsync
        .mockResolvedValueOnce(new ArrayBuffer(16)) // salt
        .mockResolvedValueOnce(new ArrayBuffer(12)); // iv
      
      mockCrypto.digestStringAsync.mockResolvedValue('derived_key');

      await dataEncryptionService.initialize();

      const encrypted = await dataEncryptionService.encryptData(testData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const decrypted = await dataEncryptionService.decryptData(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle encryption failure', async () => {
      const testData = { test: 'data' };
      mockCrypto.getRandomBytesAsync.mockRejectedValue(new Error('Crypto failed'));

      await dataEncryptionService.initialize();

      await expect(dataEncryptionService.encryptData(testData)).rejects.toThrow('Failed to encrypt data');
    });

    it('should handle decryption failure', async () => {
      const invalidEncryptedData = 'invalid_data';

      await dataEncryptionService.initialize();

      await expect(dataEncryptionService.decryptData(invalidEncryptedData)).rejects.toThrow('Failed to decrypt data');
    });

    it('should auto-initialize if not initialized', async () => {
      const testData = { test: 'data' };
      
      mockCrypto.getRandomBytesAsync
        .mockResolvedValueOnce(new ArrayBuffer(16))
        .mockResolvedValueOnce(new ArrayBuffer(12));
      mockCrypto.digestStringAsync.mockResolvedValue('derived_key');

      const encrypted = await dataEncryptionService.encryptData(testData);
      expect(encrypted).toBeDefined();
    });
  });

  describe('secure storage operations', () => {
    beforeEach(async () => {
      mockDeviceInfo.getUniqueId.mockResolvedValue('device123');
      mockCrypto.getRandomBytesAsync.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.digestStringAsync.mockResolvedValue('hashed_key');
      mockSecureStore.getItemAsync.mockResolvedValue('master_key');
      mockSecureStore.setItemAsync.mockResolvedValue();
      
      await dataEncryptionService.initialize();
    });

    it('should encrypt data for secure storage', async () => {
      const testData = { sensitive: 'data' };
      const key = 'test_key';

      mockCrypto.getRandomBytesAsync
        .mockResolvedValueOnce(new ArrayBuffer(16))
        .mockResolvedValueOnce(new ArrayBuffer(12));
      mockCrypto.digestStringAsync.mockResolvedValue('derived_key');

      await dataEncryptionService.encryptForSecureStorage(key, testData);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(key, expect.any(String));
    });

    it('should decrypt data from secure storage', async () => {
      const testData = { sensitive: 'data' };
      const key = 'test_key';
      const encryptedData = JSON.stringify({
        salt: 'salt_base64',
        iv: 'iv_base64',
        data: 'encrypted_data'
      });

      mockSecureStore.getItemAsync.mockResolvedValue(encryptedData);
      mockCrypto.digestStringAsync.mockResolvedValue('derived_key');

      const decrypted = await dataEncryptionService.decryptFromSecureStorage(key);
      expect(decrypted).toBeDefined();
    });

    it('should return null for non-existent secure storage key', async () => {
      const key = 'non_existent_key';
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await dataEncryptionService.decryptFromSecureStorage(key);
      expect(result).toBeNull();
    });

    it('should handle secure storage encryption failure', async () => {
      const testData = { test: 'data' };
      const key = 'test_key';
      
      mockCrypto.getRandomBytesAsync.mockRejectedValue(new Error('Crypto failed'));

      await expect(dataEncryptionService.encryptForSecureStorage(key, testData))
        .rejects.toThrow('Failed to encrypt data for secure storage');
    });

    it('should handle secure storage decryption failure', async () => {
      const key = 'test_key';
      mockSecureStore.getItemAsync.mockResolvedValue('invalid_data');

      await expect(dataEncryptionService.decryptFromSecureStorage(key))
        .rejects.toThrow('Failed to decrypt data from secure storage');
    });
  });

  describe('data integrity validation', () => {
    beforeEach(async () => {
      mockDeviceInfo.getUniqueId.mockResolvedValue('device123');
      mockSecureStore.getItemAsync.mockResolvedValue('master_key');
      await dataEncryptionService.initialize();
    });

    it('should validate data integrity successfully', async () => {
      const originalData = { test: 'data' };
      const decryptedData = { test: 'data' };
      
      mockCrypto.digestStringAsync
        .mockResolvedValueOnce('hash1')
        .mockResolvedValueOnce('hash1');

      const isValid = await dataEncryptionService.validateDataIntegrity(originalData, decryptedData);
      expect(isValid).toBe(true);
    });

    it('should detect data integrity failure', async () => {
      const originalData = { test: 'data' };
      const tamperedData = { test: 'tampered' };
      
      mockCrypto.digestStringAsync
        .mockResolvedValueOnce('hash1')
        .mockResolvedValueOnce('hash2');

      const isValid = await dataEncryptionService.validateDataIntegrity(originalData, tamperedData);
      expect(isValid).toBe(false);
    });

    it('should handle validation error', async () => {
      const originalData = { test: 'data' };
      const decryptedData = { test: 'data' };
      
      mockCrypto.digestStringAsync.mockRejectedValue(new Error('Hash failed'));

      const isValid = await dataEncryptionService.validateDataIntegrity(originalData, decryptedData);
      expect(isValid).toBe(false);
    });
  });

  describe('key management', () => {
    it('should wipe keys from memory', () => {
      dataEncryptionService.wipeKeys();
      // This test mainly ensures the method doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should convert ArrayBuffer to Base64 and back', async () => {
      // This tests the internal utility methods indirectly through encryption
      const testData = { test: 'data' };
      
      mockDeviceInfo.getUniqueId.mockResolvedValue('device123');
      mockSecureStore.getItemAsync.mockResolvedValue('master_key');
      mockCrypto.getRandomBytesAsync
        .mockResolvedValueOnce(new ArrayBuffer(16))
        .mockResolvedValueOnce(new ArrayBuffer(12));
      mockCrypto.digestStringAsync.mockResolvedValue('derived_key');

      await dataEncryptionService.initialize();
      
      const encrypted = await dataEncryptionService.encryptData(testData);
      const decrypted = await dataEncryptionService.decryptData(encrypted);
      
      expect(decrypted).toEqual(testData);
    });
  });
});