import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import HelpModal from './HelpModal';

interface HelpButtonProps {
  section?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'text';
  size?: 'sm' | 'md' | 'lg';
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  section,
  className = '',
  variant = 'icon',
  size = 'md'
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  const renderButton = () => {
    switch (variant) {
      case 'button':
        return (
          <button
            onClick={() => setIsHelpOpen(true)}
            className={`inline-flex items-center ${sizeClasses[size]} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
            aria-label="Open help"
          >
            <HelpCircle size={iconSizes[size]} className="mr-2" />
            Help
          </button>
        );
      case 'text':
        return (
          <button
            onClick={() => setIsHelpOpen(true)}
            className={`inline-flex items-center ${sizeClasses[size]} text-blue-600 hover:text-blue-800 transition-colors ${className}`}
            aria-label="Open help"
          >
            <HelpCircle size={iconSizes[size]} className="mr-1" />
            Help
          </button>
        );
      default:
        return (
          <button
            onClick={() => setIsHelpOpen(true)}
            className={`p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors ${className}`}
            aria-label="Open help"
          >
            <HelpCircle size={iconSizes[size]} />
          </button>
        );
    }
  };

  return (
    <>
      {renderButton()}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialSection={section}
      />
    </>
  );
};

export default HelpButton;