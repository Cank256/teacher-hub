import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  ownerId: string;
  moderators: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  rules: CommunityRule[];
  imageUrl?: string;
  memberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  rules?: CommunityRule[];
  imageUrl?: string;
}

interface CommunitySettingsProps {
  community: Community;
  onUpdate: (updates: UpdateCommunityRequest) => Promise<void>;
  onDelete: () => Promise<void>;
  isOwner: boolean;
  isLoading?: boolean;
}

export const CommunitySettings: React.FC<CommunitySettingsProps> = ({
  community,
  onUpdate,
  onDelete,
  isOwner,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<UpdateCommunityRequest>({
    name: community.name,
    description: community.description,
    isPrivate: community.isPrivate,
    requiresApproval: community.requiresApproval,
    rules: [...community.rules],
    imageUrl: community.imageUrl
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newRule, setNewRule] = useState({ title: '', description: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Check if form data has changed from original community data
    const changed = 
      formData.name !== community.name ||
      formData.description !== community.description ||
      formData.isPrivate !== community.isPrivate ||
      formData.requiresApproval !== community.requiresApproval ||
      JSON.stringify(formData.rules) !== JSON.stringify(community.rules) ||
      formData.imageUrl !== community.imageUrl;
    
    setHasChanges(changed);
  }, [formData, community]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Community name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Community name must be less than 100 characters';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Community description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onUpdate(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update community:', error);
    }
  };

  const handleInputChange = (field: keyof UpdateCommunityRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addRule = () => {
    if (!newRule.title.trim() || !newRule.description.trim()) {
      return;
    }

    const rule: CommunityRule = {
      id: Date.now().toString(),
      title: newRule.title.trim(),
      description: newRule.description.trim(),
      order: (formData.rules?.length || 0) + 1
    };

    setFormData(prev => ({
      ...prev,
      rules: [...(prev.rules || []), rule]
    }));

    setNewRule({ title: '', description: '' });
  };

  const removeRule = (ruleId: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules?.filter(rule => rule.id !== ruleId) || []
    }));
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    if (!formData.rules) return;

    const rules = [...formData.rules];
    const index = rules.findIndex(rule => rule.id === ruleId);
    
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= rules.length) return;

    // Swap rules
    [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
    
    // Update order numbers
    rules.forEach((rule, idx) => {
      rule.order = idx + 1;
    });

    setFormData(prev => ({ ...prev, rules }));
  };

  const handleDelete = async () => {
    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete community:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: community.name,
      description: community.description,
      isPrivate: community.isPrivate,
      requiresApproval: community.requiresApproval,
      rules: [...community.rules],
      imageUrl: community.imageUrl
    });
    setErrors({});
    setHasChanges(false);
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Community Settings</CardTitle>
        </CardHeader>
        <div className="p-6">
          <p className="text-gray-600">
            Only community owners can access settings.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Community Settings</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Community Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter community name"
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this community is about"
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.description ? 'border-red-500' : ''
                }`}
                disabled={isLoading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {(formData.description || '').length}/500 characters
              </p>
            </div>

            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Community Image URL (Optional)
              </label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPrivate || false}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Private Community
                </span>
              </label>
              <p className="text-sm text-gray-500 ml-6">
                Private communities are only visible to members and require invitation to join
              </p>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.requiresApproval || false}
                  onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Require Approval for New Members
                </span>
              </label>
              <p className="text-sm text-gray-500 ml-6">
                New member requests will need approval from moderators
              </p>
            </div>
          </div>

          {/* Community Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Community Rules</h3>
            
            {/* Existing Rules */}
            {formData.rules && formData.rules.length > 0 && (
              <div className="space-y-2">
                {formData.rules.map((rule, index) => (
                  <div key={rule.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {index + 1}. {rule.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          type="button"
                          onClick={() => moveRule(rule.id, 'up')}
                          disabled={index === 0 || isLoading}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRule(rule.id, 'down')}
                          disabled={index === formData.rules!.length - 1 || isLoading}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRule(rule.id)}
                          disabled={isLoading}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Rule */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">Add New Rule</h4>
              <div className="space-y-2">
                <Input
                  type="text"
                  value={newRule.title}
                  onChange={(e) => setNewRule(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Rule title"
                  disabled={isLoading}
                />
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Rule description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  onClick={addRule}
                  variant="outline"
                  size="sm"
                  disabled={!newRule.title.trim() || !newRule.description.trim() || isLoading}
                >
                  Add Rule
                </Button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={!hasChanges || isLoading}
              >
                Reset Changes
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={!hasChanges || isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Delete Community</h4>
            <p className="text-sm text-red-700 mb-4">
              Once you delete a community, there is no going back. This will permanently delete the community, 
              all its posts, and remove all members. This action cannot be undone.
            </p>
            
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={isLoading}
              >
                Delete Community
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-800">
                  Are you sure you want to delete "{community.name}"?
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Yes, Delete Community'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};