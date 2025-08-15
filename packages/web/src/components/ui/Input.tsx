import React, { useId } from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

interface SingleLineInputProps extends BaseInputProps, React.InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

interface MultiLineInputProps extends BaseInputProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

type InputProps = SingleLineInputProps | MultiLineInputProps;

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  required = false,
  multiline = false,
  rows = 3,
  value,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperTextId = `${inputId}-helper`;
  
  // Ensure value is always a string to prevent controlled/uncontrolled switching
  const safeValue = value === null || value === undefined ? '' : String(value);
  
  // Build aria-describedby attribute
  const describedByIds = [];
  if (error) describedByIds.push(errorId);
  if (helperText && !error) describedByIds.push(helperTextId);
  
  // Extract aria-describedby from props for both input and textarea
  const ariaDescribedBy = 'aria-describedby' in props ? props['aria-describedby'] : undefined;
  if (ariaDescribedBy) describedByIds.push(ariaDescribedBy);
  
  const baseClassName = `
    block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
    ${className}
  `;
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      
      {multiline ? (
        <textarea
          id={inputId}
          required={required}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          className={baseClassName}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          value={safeValue}
        />
      ) : (
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
          className={baseClassName}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          value={safeValue}
        />
      )}
      
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};