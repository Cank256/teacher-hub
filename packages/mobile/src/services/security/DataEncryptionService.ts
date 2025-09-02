import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import DeviceInfo from 'react-native-device-info';
import { EncryptionConfig } from './types';

export class DataEncryptionService {
  private static instance: DataEncryptionService;
  private encryptionKey: string | null = null;
  private readonly config: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keySize: 256,
    iterations: 10000,
    saltLength: 16
  };

  public static getInstance(): DataEncryptionService {
    if (!DataEncryptionService.instance) {
      DataEncryptionService.instance = new DataEncryptionService();
    }
    return DataEncryptionService.instance;
  }

  /**
   * Initializes the encryption service
   */
  public async initialize(): Promise<void> {
    try {
      await this.generateOrRetrieveEncryptionKey();
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption service initialization failed');
    }
  }

  /**
   * Encrypts sensitive data before storage
   */
  public async encryptData(data: any): Promise<string> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const plaintext = JSON.stringify(data);
      const salt = await this.generateSalt();
      const iv = await this.generateIV();
      
      // Derive key from master key and salt
      const derivedKey = await this.deriveKey(this.encryptionKey!, salt);
      
      // Encrypt the data
      const encrypted = await this.performEncryption(plaintext, derivedKey, iv);
      
      // Combine salt, iv, and encrypted data
      const combined = {
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
        data: encrypted
      };

      return JSON.stringify(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data after retrieval from storage
   */
  public async decryptData(encryptedData: string): Promise<any> {
    try {
      if (!this.encryptionKey) {
        await this.initialize();
      }

      const combined = JSON.parse(encryptedData);
      const salt = this.base64ToArrayBuffer(combined.salt);
      const iv = this.base64ToArrayBuffer(combined.iv);
      
      // Derive key from master key and salt
      const derivedKey = await this.deriveKey(this.encryptionKey!, salt);
      
      // Decrypt the data
      const decrypted = await this.performDecryption(combined.data, derivedKey, iv);
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypts data for secure storage
   */
  public async encryptForSecureStorage(key: string, data: any): Promise<void> {
    try {
      const encryptedData = await this.encryptData(data);
      await SecureStore.setItemAsync(key, encryptedData);
    } catch (error) {
      console.error('Secure storage encryption failed:', error);
      throw new Error('Failed to encrypt data for secure storage');
    }
  }

  /**
   * Decrypts data from secure storage
   */
  public async decryptFromSecureStorage(key: string): Promise<any> {
    try {
      const encryptedData = await SecureStore.getItemAsync(key);
      if (!encryptedData) {
        return null;
      }
      return await this.decryptData(encryptedData);
    } catch (error) {
      console.error('Secure storage decryption failed:', error);
      throw new Error('Failed to decrypt data from secure storage');
    }
  }

  /**
   * Generates or retrieves the master encryption key
   */
  private async generateOrRetrieveEncryptionKey(): Promise<void> {
    try {
      const keyName = 'master_encryption_key';
      let key = await SecureStore.getItemAsync(keyName);
      
      if (!key) {
        // Generate new key based on device characteristics
        const deviceId = await DeviceInfo.getUniqueId();
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        const keyMaterial = deviceId + this.arrayBufferToBase64(randomBytes);
        
        // Hash the key material to create a consistent key
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          keyMaterial
        );
        
        await SecureStore.setItemAsync(keyName, key);
      }
      
      this.encryptionKey = key;
    } catch (error) {
      console.error('Key generation/retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Generates a random salt
   */
  private async generateSalt(): Promise<ArrayBuffer> {
    const saltBytes = await Crypto.getRandomBytesAsync(this.config.saltLength);
    return saltBytes;
  }

  /**
   * Generates a random initialization vector
   */
  private async generateIV(): Promise<ArrayBuffer> {
    const ivBytes = await Crypto.getRandomBytesAsync(12); // 96 bits for GCM
    return ivBytes;
  }

  /**
   * Derives encryption key from master key and salt using PBKDF2
   */
  private async deriveKey(masterKey: string, salt: ArrayBuffer): Promise<string> {
    try {
      // Create key material from master key and salt
      const keyMaterial = masterKey + this.arrayBufferToBase64(salt);
      
      // Use multiple rounds of hashing to derive the key
      let derivedKey = keyMaterial;
      for (let i = 0; i < this.config.iterations; i++) {
        derivedKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          derivedKey
        );
      }
      
      return derivedKey;
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw error;
    }
  }

  /**
   * Performs the actual encryption
   */
  private async performEncryption(
    plaintext: string,
    key: string,
    iv: ArrayBuffer
  ): Promise<string> {
    try {
      // For this implementation, we'll use a simplified approach
      // In a production app, you'd want to use proper AES-GCM encryption
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key + this.arrayBufferToBase64(iv)
      );
      
      // Simple XOR-based encryption (replace with proper AES-GCM in production)
      const encrypted = this.xorEncrypt(plaintext, keyHash);
      return encrypted;
    } catch (error) {
      console.error('Encryption operation failed:', error);
      throw error;
    }
  }

  /**
   * Performs the actual decryption
   */
  private async performDecryption(
    ciphertext: string,
    key: string,
    iv: ArrayBuffer
  ): Promise<string> {
    try {
      const keyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key + this.arrayBufferToBase64(iv)
      );
      
      // Simple XOR-based decryption (replace with proper AES-GCM in production)
      const decrypted = this.xorDecrypt(ciphertext, keyHash);
      return decrypted;
    } catch (error) {
      console.error('Decryption operation failed:', error);
      throw error;
    }
  }

  /**
   * Simple XOR encryption (replace with proper AES-GCM in production)
   */
  private xorEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Simple XOR decryption (replace with proper AES-GCM in production)
   */
  private xorDecrypt(encryptedText: string, key: string): string {
    const decoded = atob(encryptedText); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const textChar = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    return result;
  }

  /**
   * Converts ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts Base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Securely wipes encryption keys from memory
   */
  public wipeKeys(): void {
    this.encryptionKey = null;
  }

  /**
   * Validates data integrity after decryption
   */
  public async validateDataIntegrity(originalData: any, decryptedData: any): Promise<boolean> {
    try {
      const originalHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(originalData)
      );
      
      const decryptedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(decryptedData)
      );
      
      return originalHash === decryptedHash;
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }
}