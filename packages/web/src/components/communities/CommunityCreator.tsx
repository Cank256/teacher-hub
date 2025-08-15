import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle } from '../ui/Card';

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface CreateCommunityRequest {
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  isPrivate: boolean;
  requiresApproval: boolean;
  rules?: CommunityRule[];
  imageUrl?: string;
}

interface CommunityCreatorProps {
  onSubmit: (data: CreateCommunityRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CommunityCreator: React.FC<CommunityCreatorProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateCommunityRequest>({
    name: '',
    description: '',
    type: 'general',
    isPrivate: false,
    requiresApproval: false,
    rules: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newRule, setNewRule] = useState({ title: '', description: '' });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Community name must be at least 3 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Community name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create community:', error);
    }
  };

  const handleInputChange = (field: keyof CreateCommunityRequest, value: any) => {
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Community</CardTitle>
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
              value={formData.name}
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
              value={formData.description}
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
              {formData.description.length}/500 characters
            </p>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Community Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="general">General</option>
              <option value="subject">Subject-specific</option>
              <option value="region">Regional</option>
              <option value="grade">Grade Level</option>
            </select>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPrivate}
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
                checked={formData.requiresApproval}
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
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Community'}
          </Button>
        </div>
      </form>
    </Card>
  );
};