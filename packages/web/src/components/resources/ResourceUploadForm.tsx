import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface FileUploadData {
  file: File;
  preview?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  securityScanStatus?: 'pending' | 'scanning' | 'passed' | 'failed';
}

interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  gradeLevel: string;
  subject: string;
  duration?: number;
}

interface ResourceUploadFormProps {
  onUpload: (file: File, metadata: VideoMetadata) => Promise<void>;
  onCancel: () => void;
}

export const ResourceUploadForm: React.FC<ResourceUploadFormProps> = ({
  onUpload,
  onCancel
}) => {
  const [uploadData, setUploadData] = useState<FileUploadData | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata>({
    title: '',
    description: '',
    tags: [],
    category: '',
    gradeLevel: '',
    subject: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = ['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'];
  const gradeLevels = ['Primary 1-3', 'Primary 4-7', 'Secondary 1-4', 'Secondary 5-6'];
  const categories = ['Lesson Plan', 'Worksheet', 'Video Tutorial', 'Assessment', 'Reference Material'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // File size validation (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    // File type validation
    const allowedTypes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
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
          ctx?.drawImage(video, 0, 0);
          resolve(canvas.toDataURL());
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFileSelect = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadData({
        file,
        uploadProgress: 0,
        status: 'error',
        error: validation.error
      });
      return;
    }

    const preview = await createFilePreview(file);
    
    setUploadData({
      file,
      preview,
      uploadProgress: 0,
      status: 'pending',
      securityScanStatus: 'pending'
    });

    // Auto-populate title from filename
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setMetadata(prev => ({
      ...prev,
      title: prev.title || fileName
    }));

    // Start security scan simulation
    setTimeout(() => {
      setUploadData(prev => prev ? {
        ...prev,
        securityScanStatus: 'scanning'
      } : null);
    }, 500);

    setTimeout(() => {
      setUploadData(prev => prev ? {
        ...prev,
        securityScanStatus: 'passed'
      } : null);
    }, 2000);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData || !uploadData.file) return;

    try {
      setUploadData(prev => prev ? { ...prev, status: 'uploading', uploadProgress: 0 } : null);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadData(prev => {
          if (!prev || prev.uploadProgress >= 100) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, uploadProgress: prev.uploadProgress + 10 };
        });
      }, 200);

      await onUpload(uploadData.file, metadata);
      
      setUploadData(prev => prev ? { ...prev, status: 'completed', uploadProgress: 100 } : null);
    } catch (error) {
      setUploadData(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed' 
      } : null);
    }
  };

  const isVideoFile = uploadData?.file.type.startsWith('video/');
  const canSubmit = uploadData && 
    uploadData.securityScanStatus === 'passed' && 
    metadata.title && 
    metadata.description && 
    metadata.subject && 
    metadata.gradeLevel;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Educational Resource</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary-500 bg-primary-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!uploadData ? (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Drop your file here, or click to browse
              </h3>
              <p className="text-gray-600 mb-4">
                Supports videos, images, PDFs, and documents up to 10MB
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                accept="video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx"
              />
            </>
          ) : (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-center justify-center">
                {uploadData.preview ? (
                  <div className="relative">
                    {isVideoFile ? (
                      <video
                        src={uploadData.preview}
                        className="w-32 h-24 object-cover rounded-lg"
                        controls={false}
                      />
                    ) : (
                      <img
                        src={uploadData.preview}
                        alt="Preview"
                        className="w-32 h-24 object-cover rounded-lg"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="text-center">
                <p className="font-medium text-gray-900">{uploadData.file.name}</p>
                <p className="text-sm text-gray-600">
                  {(uploadData.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              {/* Security Scan Status */}
              <div className="flex items-center justify-center space-x-2">
                {uploadData.securityScanStatus === 'pending' && (
                  <>
                    <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">Preparing security scan...</span>
                  </>
                )}
                {uploadData.securityScanStatus === 'scanning' && (
                  <>
                    <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-yellow-600">Scanning for security threats...</span>
                  </>
                )}
                {uploadData.securityScanStatus === 'passed' && (
                  <>
                    <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-600">Security scan passed</span>
                  </>
                )}
                {uploadData.securityScanStatus === 'failed' && (
                  <>
                    <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-red-600">Security scan failed</span>
                  </>
                )}
              </div>

              {/* Upload Progress */}
              {uploadData.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadData.uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {/* Status Messages */}
              {uploadData.status === 'error' && (
                <div className="text-red-600 text-sm">{uploadData.error}</div>
              )}
              {uploadData.status === 'completed' && (
                <div className="text-green-600 text-sm">Upload completed successfully!</div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUploadData(null)}
              >
                Remove File
              </Button>
            </div>
          )}
        </div>

        {/* Metadata Form */}
        {uploadData && uploadData.securityScanStatus === 'passed' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={metadata.title}
                  onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter resource title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  value={metadata.description}
                  onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your resource and how it can be used"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={metadata.subject}
                  onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={metadata.gradeLevel}
                  onChange={(e) => setMetadata(prev => ({ ...prev, gradeLevel: e.target.value }))}
                  required
                >
                  <option value="">Select grade level</option>
                  {gradeLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={metadata.category}
                  onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metadata.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-primary-600 hover:text-primary-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Video-specific fields */}
              {isVideoFile && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Video Upload Information
                  </h4>
                  <p className="text-sm text-blue-700">
                    This video will be uploaded to YouTube as an unlisted video and embedded within the platform for secure viewing.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit || uploadData?.status === 'uploading'}
            loading={uploadData?.status === 'uploading'}
            loadingText="Uploading..."
          >
            Upload Resource
          </Button>
        </div>
      </form>
    </Card>
  );
};