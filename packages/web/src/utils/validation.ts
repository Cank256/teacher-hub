export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (
  value: any,
  rule: ValidationRule,
  fieldName: string,
  t: (key: string, options?: any) => string
): string | undefined => {
  if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return t('errors.required');
  }

  if (value && typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      return t('errors.minLength', { minLength: rule.minLength });
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return t('errors.maxLength', { maxLength: rule.maxLength });
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      if (fieldName === 'email') {
        return t('errors.invalidEmail');
      }
      return t('errors.invalidFormat');
    }
  }

  if (rule.custom) {
    return rule.custom(value);
  }

  return undefined;
};

export const validateForm = (
  data: Record<string, any>,
  rules: ValidationRules,
  t: (key: string, options?: any) => string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach(fieldName => {
    const error = validateField(data[fieldName], rules[fieldName], fieldName, t);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

// Common validation patterns
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^[+]?[\d\s\-()]+$/;

// Common validation rules
export const commonRules = {
  email: {
    required: true,
    pattern: EMAIL_PATTERN,
  },
  password: {
    required: true,
    minLength: 8,
  },
  confirmPassword: (password: string) => ({
    required: true,
    custom: (value: string) => {
      if (value !== password) {
        return 'Passwords do not match';
      }
      return undefined;
    },
  }),
  required: {
    required: true,
  },
};