// Core types for the Teacher Hub mobile app

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  subjects: Subject[];
  gradeLevels: GradeLevel[];
  schoolLocation: Location;
  yearsOfExperience: number;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface GradeLevel {
  id: string;
  name: string;
  order: number;
}

export interface Location {
  id: string;
  name: string;
  district: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Posts: undefined;
  Communities: undefined;
  Messages: undefined;
  Resources: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'auth_error',
  VALIDATION_ERROR = 'validation_error',
  STORAGE_ERROR = 'storage_error',
  PERMISSION_ERROR = 'permission_error',
  SYNC_ERROR = 'sync_error',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code: string;
  details?: any;
  timestamp: Date;
  userId?: string;
}

// Re-export feature types
export * from './posts';
export * from './communities';
export * from './messaging';
export * from './resources';
export * from './government';
export * from './notifications';
