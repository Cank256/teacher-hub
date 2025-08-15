import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
}

interface PostEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialVisibility?: 'public' | 'community' | 'followers';
  initialCommunityId?: string;
  initialMediaAttachments?: MediaAttachment[];
  communities?: Array<{ id: string; name: string }>;
  onSubmit: (postData: {
    title: string;
    content: string;
    tags: string[];
    visibility: 'public' | 'community' | 'followers';
    communityId?: string;
    mediaAttachments: MediaAttachment[];
  }) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

export const PostEditor: React.FC<PostEditorProps> = ({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialVisibility = 'public',
  initialCommunityId,
  initialMediaAttachments = [],
  communities = [],
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'community' | 'followers'>(initialVisibility);
  const [communityId, setCommunityId] = useState(initialCommunityId || '');
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>(initialMediaAttachments);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploadingFiles(true);
    try {
      const newAttachments: MediaAttachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Create a temporary URL for preview
        const url = URL.createObjectURL(file);
        const attachment: MediaAttachment = {
          id: `temp-${Date.now()}-${i}`,
          type: file.type.startsWith('image/') ? 'image' : 
                file.type.startsWith('video/') ? 'video' : 'document',
          url,
          filename: file.name,
          size: file.size
        };

        // For images, create thumbnail
        if (file.type.startsWith('image/')) {
          attachment.thumbnailUrl = url;
        }

        newAttachments.push(attachment);
      }

      setMediaAttachments([...mediaAttachments, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const attachment = mediaAttachments.find(a => a.id === attachmentId);
    if (attachment && attachment.url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.url);
    }
    setMediaAttachments(mediaAttachments.filter(a => a.id !== attachmentId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and content.');
      return;
    }

    if (visibility === 'community' && !communityId) {
      alert('Please select a community for community posts.');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags,
        visibility,
        communityId: visibility === 'community' ? communityId : undefined,
        mediaAttachments
      });
    } catch (error) {
      console.error('Error submitting post:', error);
      alert('Error submitting post. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Post' : 'Create New Post'}
          </h2>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Title */}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter post title..."
          required
          disabled={loading}
        />

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post content here..."
            rows={8}
            required
            disabled={loading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                     disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Media Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media Attachments
          </label>
          
          {/* Upload Button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              disabled={loading || uploadingFiles}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingFiles}
              loading={uploadingFiles}
              loadingText="Uploading..."
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Media
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              Supported: Images, videos, PDFs, documents (max 10MB each)
            </p>
          </div>

          {/* Attachment Previews */}
          {mediaAttachments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaAttachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.thumbnailUrl || attachment.url}
                        alt={attachment.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs text-gray-500 truncate">{attachment.filename}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(attachment.id)}
                    disabled={loading}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center
                             hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          
          {/* Tag Input */}
          <div className="flex gap-2 mb-3">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              placeholder="Add a tag..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={loading || !tagInput.trim()}
            >
              Add
            </Button>
          </div>

          {/* Tag List */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={loading}
                    className="ml-2 text-primary-600 hover:text-primary-800 focus:outline-none"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Visibility and Community Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visibility */}
          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'community' | 'followers')}
              disabled={loading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="public">Public</option>
              <option value="community">Community Only</option>
              <option value="followers">Followers Only</option>
            </select>
          </div>

          {/* Community Selection */}
          {visibility === 'community' && (
            <div>
              <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-1">
                Community <span className="text-red-500">*</span>
              </label>
              <select
                id="community"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                required={visibility === 'community'}
                disabled={loading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="">Select a community...</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            loading={loading}
            loadingText={isEditing ? 'Updating...' : 'Publishing...'}
          >
            {isEditing ? 'Update Post' : 'Publish Post'}
          </Button>
        </div>
      </form>
    </Card>
  );
};