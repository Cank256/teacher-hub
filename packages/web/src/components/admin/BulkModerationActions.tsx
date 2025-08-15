import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface BulkModerationActionsProps {
  selectedItems: string[];
  itemType: 'posts' | 'communities' | 'messages' | 'resources';
  onBulkAction: (action: string, reason?: string) => Promise<void>;
  onClearSelection: () => void;
}

export const BulkModerationActions: React.FC<BulkModerationActionsProps> = ({
  selectedItems,
  itemType,
  onBulkAction,
  onClearSelection
}) => {
  const { t } = useTranslation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const getAvailableActions = () => {
    const commonActions = [
      { value: 'approve', label: 'Approve', color: 'bg-green-600 hover:bg-green-700' },
      { value: 'flag', label: 'Flag', color: 'bg-yellow-600 hover:bg-yellow-700' },
      { value: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700' }
    ];

    switch (itemType) {
      case 'posts':
        return [
          ...commonActions,
          { value: 'hide', label: 'Hide', color: 'bg-orange-600 hover:bg-orange-700' }
        ];
      case 'communities':
        return [
          ...commonActions,
          { value: 'suspend', label: 'Suspend', color: 'bg-orange-600 hover:bg-orange-700' },
          { value: 'warn_owner', label: 'Warn Owner', color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'messages':
        return [
          ...commonActions,
          { value: 'hide', label: 'Hide', color: 'bg-orange-600 hover:bg-orange-700' },
          { value: 'warn_user', label: 'Warn User', color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'resources':
        return [
          ...commonActions,
          { value: 'reject', label: 'Reject', color: 'bg-red-600 hover:bg-red-700' }
        ];
      default:
        return commonActions;
    }
  };

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    try {
      setLoading(true);
      await onBulkAction(selectedAction, reason);
      setShowConfirmDialog(false);
      setSelectedAction('');
      setReason('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setSelectedAction('');
    setReason('');
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-40">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedItems.length} {itemType} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
          
          <div className="flex space-x-2">
            {getAvailableActions().map((action) => (
              <button
                key={action.value}
                onClick={() => handleActionClick(action.value)}
                className={`px-3 py-1 text-sm text-white rounded ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Bulk Action
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to <strong>{selectedAction}</strong> {selectedItems.length} {itemType}?
                This action cannot be undone.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};