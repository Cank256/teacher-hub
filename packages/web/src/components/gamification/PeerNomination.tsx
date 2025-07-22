import React, { useState } from 'react';

export interface PeerNomination {
  id: string;
  nominatorId: string;
  nomineeId: string;
  category: 'helpful_teacher' | 'innovative_educator' | 'community_leader' | 'resource_creator';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

interface NominationFormProps {
  onSubmit: (nomination: {
    nomineeId: string;
    category: string;
    reason: string;
  }) => Promise<void>;
  onCancel: () => void;
  teachers: Array<{ id: string; name: string; username: string }>;
}

export const NominationForm: React.FC<NominationFormProps> = ({
  onSubmit,
  onCancel,
  teachers
}) => {
  const [formData, setFormData] = useState({
    nomineeId: '',
    category: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'helpful_teacher', label: 'Helpful Teacher', description: 'Always ready to help fellow educators' },
    { value: 'innovative_educator', label: 'Innovative Educator', description: 'Brings creative teaching methods' },
    { value: 'community_leader', label: 'Community Leader', description: 'Actively builds and leads communities' },
    { value: 'resource_creator', label: 'Resource Creator', description: 'Creates valuable educational resources' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nomineeId || !formData.category || !formData.reason.trim()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      setFormData({ nomineeId: '', category: '', reason: '' });
    } catch (error) {
      console.error('Error submitting nomination:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Nominate a Peer</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Teacher
          </label>
          <select
            value={formData.nomineeId}
            onChange={(e) => setFormData({ ...formData, nomineeId: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choose a teacher to nominate...</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} (@{teacher.username})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="space-y-2">
            {categories.map(category => (
              <label key={category.value} className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="category"
                  value={category.value}
                  checked={formData.category === category.value}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                  required
                />
                <div>
                  <div className="font-medium text-gray-900">{category.label}</div>
                  <div className="text-sm text-gray-500">{category.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Nomination
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Explain why this teacher deserves recognition..."
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={20}
          />
          <p className="text-sm text-gray-500 mt-1">
            Minimum 20 characters ({formData.reason.length}/20)
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || !formData.nomineeId || !formData.category || formData.reason.length < 20}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Nomination'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

interface NominationListProps {
  nominations: PeerNomination[];
  type: 'sent' | 'received';
  currentUserId: string;
}

export const NominationList: React.FC<NominationListProps> = ({
  nominations,
  type,
  currentUserId
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'helpful_teacher':
        return '🤝';
      case 'innovative_educator':
        return '💡';
      case 'community_leader':
        return '👑';
      case 'resource_creator':
        return '📚';
      default:
        return '⭐';
    }
  };

  if (nominations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>No nominations {type === 'sent' ? 'sent' : 'received'} yet.</p>
        {type === 'sent' && (
          <p className="text-sm mt-1">Start recognizing your fellow teachers!</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          {type === 'sent' ? 'Nominations Sent' : 'Nominations Received'}
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {nominations.map(nomination => (
          <div key={nomination.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getCategoryIcon(nomination.category)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">
                      {nomination.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(nomination.status)}`}>
                      {nomination.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{nomination.reason}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {type === 'sent' ? 'Nominated' : 'Received'} on{' '}
                    {new Date(nomination.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};