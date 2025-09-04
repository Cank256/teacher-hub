import React from 'react';
import HelpTooltip from './HelpTooltip';

interface ContextualHelpProps {
  context: 'post-creation' | 'community-management' | 'messaging' | 'resource-upload' | 'user-search';
  className?: string;
}

const helpContent = {
  'post-creation': {
    title: 'Creating Posts',
    content: 'Add a clear title, write your content, select visibility settings, and optionally attach media files. Your post will be shared based on the visibility you choose.'
  },
  'community-management': {
    title: 'Managing Communities',
    content: 'As a community owner, you can approve members, assign moderator roles, manage community settings, and moderate content to maintain a positive environment.'
  },
  'messaging': {
    title: 'Messaging Features',
    content: 'Send direct messages, create group conversations, share files and images, and use reply threading to organize discussions effectively.'
  },
  'resource-upload': {
    title: 'Uploading Resources',
    content: 'Upload documents, images, and videos (up to 10MB). Files are automatically scanned for security. Videos are uploaded to YouTube as unlisted content.'
  },
  'user-search': {
    title: 'Finding Users',
    content: 'Search for other teachers by name, email, subject, or location. Use filters to find educators with specific expertise or in your area.'
  }
};

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  context,
  className = ''
}) => {
  const help = helpContent[context];

  return (
    <HelpTooltip
      title={help.title}
      content={help.content}
      className={className}
    />
  );
};

export default ContextualHelp;