import React from 'react';

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

interface UploadProgressIndicatorProps {
  steps: UploadStep[];
  currentProgress?: number;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({
  steps,
  currentProgress
}) => {
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {currentProgress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      )}

      {/* Step Indicators */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            {/* Step Icon */}
            <div className="flex-shrink-0">
              {step.status === 'completed' && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {step.status === 'active' && (
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
              {step.status === 'error' && (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              {step.status === 'pending' && (
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                step.status === 'completed' ? 'text-green-700' :
                step.status === 'active' ? 'text-primary-700' :
                step.status === 'error' ? 'text-red-700' :
                'text-gray-500'
              }`}>
                {step.label}
              </p>
              {step.description && (
                <p className={`text-xs mt-1 ${
                  step.status === 'error' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              )}
            </div>

            {/* Loading Spinner for Active Step */}
            {step.status === 'active' && (
              <div className="flex-shrink-0">
                <svg className="animate-spin h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface SecurityScanIndicatorProps {
  status: 'pending' | 'scanning' | 'passed' | 'failed';
  details?: {
    virusFound?: boolean;
    malwareFound?: boolean;
    suspiciousContent?: boolean;
    scanDetails?: string;
  };
}

export const SecurityScanIndicator: React.FC<SecurityScanIndicatorProps> = ({
  status,
  details
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'scanning': return 'text-yellow-600';
      case 'passed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-4 h-4 bg-gray-300 rounded-full" />
        );
      case 'scanning':
        return (
          <svg className="animate-spin h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'passed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'pending': return 'Preparing security scan...';
      case 'scanning': return 'Scanning for security threats...';
      case 'passed': return 'Security scan passed - file is safe';
      case 'failed': return 'Security scan failed - file contains threats';
      default: return 'Unknown status';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            Security Scan
          </p>
          <p className={`text-xs ${getStatusColor()}`}>
            {getStatusMessage()}
          </p>
        </div>
      </div>

      {status === 'failed' && details && (
        <div className="mt-3 p-3 bg-red-50 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Security Issues Found:</h4>
          <ul className="text-xs text-red-700 space-y-1">
            {details.virusFound && <li>• Virus detected</li>}
            {details.malwareFound && <li>• Malware detected</li>}
            {details.suspiciousContent && <li>• Suspicious content detected</li>}
          </ul>
          {details.scanDetails && (
            <p className="text-xs text-red-600 mt-2">{details.scanDetails}</p>
          )}
        </div>
      )}

      {status === 'passed' && (
        <div className="mt-2 text-xs text-green-600">
          File has been verified as safe for upload and sharing.
        </div>
      )}
    </div>
  );
};

interface FileValidationFeedbackProps {
  file: File;
  validationErrors: string[];
  validationWarnings: string[];
}

export const FileValidationFeedback: React.FC<FileValidationFeedbackProps> = ({
  file,
  validationErrors,
  validationWarnings
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* File Information */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">File Information</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Name:</span> {file.name}
          </div>
          <div>
            <span className="font-medium">Size:</span> {formatFileSize(file.size)}
          </div>
          <div>
            <span className="font-medium">Type:</span> {file.type || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">Modified:</span> {new Date(file.lastModified).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="text-sm font-medium text-red-800">Validation Errors</h4>
          </div>
          <ul className="text-xs text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
          </div>
          <ul className="text-xs text-yellow-700 space-y-1">
            {validationWarnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success State */}
      {validationErrors.length === 0 && validationWarnings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">File validation passed successfully</p>
          </div>
        </div>
      )}
    </div>
  );
};