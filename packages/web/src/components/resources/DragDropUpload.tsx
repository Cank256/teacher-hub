import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  acceptedTypes = ['*'],
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className = '',
  children
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setDragActive(false);
      }
      return newCounter;
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragCounter(0);
    
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileSelect(file);
    }
  }, [disabled, onFileSelect]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getAcceptString = () => {
    if (acceptedTypes.includes('*')) {
      return 'video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx';
    }
    return acceptedTypes.join(',');
  };

  const formatMaxSize = () => {
    const mb = maxSize / (1024 * 1024);
    return mb >= 1 ? `${mb}MB` : `${Math.round(maxSize / 1024)}KB`;
  };

  const getFileTypeDescription = () => {
    if (acceptedTypes.includes('*')) {
      return 'videos, images, PDFs, and documents';
    }
    
    const types = [];
    if (acceptedTypes.some(type => type.startsWith('video/'))) types.push('videos');
    if (acceptedTypes.some(type => type.startsWith('image/'))) types.push('images');
    if (acceptedTypes.includes('.pdf')) types.push('PDFs');
    if (acceptedTypes.some(type => type.includes('document') || type.includes('.doc'))) types.push('documents');
    
    return types.join(', ') || 'files';
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
        disabled 
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
          : dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400 cursor-pointer'
      } ${className}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        accept={getAcceptString()}
        disabled={disabled}
      />
      
      {children || (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            {dragActive ? (
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          
          <h3 className={`text-lg font-medium mb-2 ${
            disabled ? 'text-gray-400' : dragActive ? 'text-primary-700' : 'text-gray-900'
          }`}>
            {dragActive ? 'Drop your file here' : 'Drop your file here, or click to browse'}
          </h3>
          
          <p className={`mb-4 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
            Supports {getFileTypeDescription()} up to {formatMaxSize()}
          </p>
          
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              Choose File
            </Button>
          )}
        </div>
      )}
      
      {/* Drag overlay */}
      {dragActive && !disabled && (
        <div className="absolute inset-0 bg-primary-50 bg-opacity-90 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <svg className="w-12 h-12 text-primary-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <p className="text-primary-700 font-medium">Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  onRemove,
  className = ''
}) => {
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = 1; // Seek to 1 second for thumbnail
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          setPreview(canvas.toDataURL());
        }
      };
      video.src = URL.createObjectURL(file);
    }

    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (file.type.startsWith('video/')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (file.type.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (file.type === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-4">
        {/* File Preview/Icon */}
        <div className="flex-shrink-0">
          {preview ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
              {file.type.startsWith('video/') ? (
                <div className="relative w-full h-full">
                  <img
                    src={preview}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <img
                  src={preview}
                  alt="File preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              {getFileIcon()}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {formatFileSize(file.size)} • {file.type || 'Unknown type'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Modified: {new Date(file.lastModified).toLocaleDateString()}
          </p>
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove file"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};