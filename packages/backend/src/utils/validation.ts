import { Credential } from '../types';

/**
 * Validates email format using a comprehensive regex pattern
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * Requirements: At least 8 characters, contains uppercase, lowercase, number, and special character
 */
export function validatePassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Validates teaching credentials
 */
export function validateCredentials(credential: Omit<Credential, 'id' | 'verificationStatus'>): boolean {
  // Check required fields
  if (!credential.type || !credential.institution || !credential.issueDate || !credential.documentUrl) {
    return false;
  }

  // Validate credential type
  const validTypes = ['teaching_license', 'degree', 'certification'];
  if (!validTypes.includes(credential.type)) {
    return false;
  }

  // Validate institution name
  if (credential.institution.trim().length < 2) {
    return false;
  }

  // Validate issue date (should not be in the future)
  const issueDate = new Date(credential.issueDate);
  const now = new Date();
  if (issueDate > now) {
    return false;
  }

  // Validate expiry date if provided (should be after issue date)
  if (credential.expiryDate) {
    const expiryDate = new Date(credential.expiryDate);
    if (expiryDate <= issueDate) {
      return false;
    }
  }

  // Validate document URL format
  const urlRegex = /^https?:\/\/.+/;
  if (!urlRegex.test(credential.documentUrl)) {
    return false;
  }

  return true;
}

/**
 * Validates Ugandan phone number format
 */
export function validateUgandanPhoneNumber(phoneNumber: string): boolean {
  // Remove spaces and dashes
  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  
  // Uganda phone number patterns:
  // +256XXXXXXXXX (international format)
  // 0XXXXXXXXX (national format)
  // 256XXXXXXXXX (without +)
  const patterns = [
    /^\+256[0-9]{9}$/,  // +256XXXXXXXXX
    /^0[0-9]{9}$/,      // 0XXXXXXXXX
    /^256[0-9]{9}$/     // 256XXXXXXXXX
  ];

  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Validates subject names against common Ugandan curriculum subjects
 */
export function validateSubject(subject: string): boolean {
  const validSubjects = [
    'Mathematics', 'English', 'Science', 'Social Studies', 'Religious Education',
    'Physical Education', 'Art and Craft', 'Music', 'Agriculture', 'Biology',
    'Chemistry', 'Physics', 'Geography', 'History', 'Literature', 'Computer Studies',
    'Technical Drawing', 'Home Economics', 'Commerce', 'Accounting', 'Economics',
    'Luganda', 'Runyankole', 'Ateso', 'Luo', 'Runyoro', 'Rukiga', 'Lusoga'
  ];

  return validSubjects.includes(subject) || subject.trim().length >= 2;
}

/**
 * Validates grade levels for Ugandan education system
 */
export function validateGradeLevel(gradeLevel: string): boolean {
  const validGradeLevels = [
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', // Primary
    'S1', 'S2', 'S3', 'S4', 'S5', 'S6',       // Secondary
    'University', 'Tertiary', 'Adult Education'
  ];

  return validGradeLevels.includes(gradeLevel);
}

/**
 * Validates Ugandan districts
 */
export function validateUgandanDistrict(district: string): boolean {
  // This is a simplified list - in production, this would be more comprehensive
  const ugandanDistricts = [
    'Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara',
    'Masaka', 'Kasese', 'Kabale', 'Soroti', 'Arua', 'Kitgum', 'Moroto', 'Hoima',
    'Fort Portal', 'Masindi', 'Mityana', 'Mubende', 'Rakai', 'Kalangala', 'Lyantonde',
    'Sembabule', 'Lwengo', 'Bukomansimbi', 'Kalungu', 'Butambala', 'Gomba', 'Mpigi',
    'Buikwe', 'Buvuma', 'Kayunga', 'Luweero', 'Nakaseke', 'Nakasongola'
  ];

  return ugandanDistricts.includes(district) || district.trim().length >= 2;
}

/**
 * Validates file upload for credential documents
 */
export function validateCredentialDocument(file: Express.Multer.File): boolean {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return false;
  }

  // Check file type (PDF, JPG, PNG)
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates years of experience
 */
export function validateYearsExperience(years: number): boolean {
  return Number.isInteger(years) && years >= 0 && years <= 50;
}

/**
 * Validates profile update data
 */
export function validateProfileUpdate(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate email if provided
  if (data.email !== undefined) {
    if (!validateEmail(data.email)) {
      errors.push('Invalid email format');
    }
  }

  // Validate full name if provided
  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }
  }

  // Validate subjects if provided
  if (data.subjects !== undefined) {
    if (!Array.isArray(data.subjects)) {
      errors.push('Subjects must be an array');
    } else {
      for (const subject of data.subjects) {
        if (!validateSubject(subject)) {
          errors.push(`Invalid subject: ${subject}`);
        }
      }
    }
  }

  // Validate grade levels if provided
  if (data.gradeLevels !== undefined) {
    if (!Array.isArray(data.gradeLevels)) {
      errors.push('Grade levels must be an array');
    } else {
      for (const gradeLevel of data.gradeLevels) {
        if (!validateGradeLevel(gradeLevel)) {
          errors.push(`Invalid grade level: ${gradeLevel}`);
        }
      }
    }
  }

  // Validate school location if provided
  if (data.schoolLocation !== undefined) {
    if (typeof data.schoolLocation !== 'object' || !data.schoolLocation.district) {
      errors.push('School location must include district');
    } else {
      if (!validateUgandanDistrict(data.schoolLocation.district)) {
        errors.push(`Invalid district: ${data.schoolLocation.district}`);
      }
    }
  }

  // Validate years of experience if provided
  if (data.yearsExperience !== undefined) {
    if (!validateYearsExperience(data.yearsExperience)) {
      errors.push('Years of experience must be a number between 0 and 50');
    }
  }

  // Validate bio if provided
  if (data.bio !== undefined) {
    if (typeof data.bio !== 'string' || data.bio.length > 500) {
      errors.push('Bio must be a string with maximum 500 characters');
    }
  }

  // Validate preferences if provided
  if (data.preferences !== undefined) {
    if (typeof data.preferences !== 'object') {
      errors.push('Preferences must be an object');
    } else {
      // Validate privacy settings
      if (data.preferences.privacy) {
        const validVisibility = ['public', 'teachers_only', 'private'];
        if (data.preferences.privacy.profileVisibility && 
            !validVisibility.includes(data.preferences.privacy.profileVisibility)) {
          errors.push('Invalid profile visibility setting');
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}