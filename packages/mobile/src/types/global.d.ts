// Global type declarations for the mobile app

declare global {
  const __DEV__: boolean;

  namespace NodeJS {
    interface Global {
      __DEV__: boolean;
    }
  }
}

export {};
