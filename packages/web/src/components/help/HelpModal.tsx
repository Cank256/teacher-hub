import React, { useState } from 'react';
import { X, Search, Book, MessageCircle, Upload, Users, Settings } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'posts'
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  const helpSections: HelpSection[] = [
    {
      id: 'posts',
      title: 'Posts & Content',
      icon: <Book size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Creating and Managing Posts</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Creating a Post</h4>
              <p className="text-gray-600 text-sm">
                Click "Create Post" from your dashboard, add a title and content, 
                select visibility settings, and publish to share with the community.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Adding Media</h4>
              <p className="text-gray-600 text-sm">
                Attach images, documents, or videos to your posts. Files are 
                automatically scanned for security and optimized for viewing.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Post Visibility</h4>
              <p className="text-gray-600 text-sm">
                Choose between Public (everyone), Community (specific communities), 
                or Followers (only your followers) visibility settings.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Editing Posts</h4>
              <p className="text-gray-600 text-sm">
                Click the edit button on your posts to make changes. Edit history 
                is maintained for transparency.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'communities',
      title: 'Communities',
      icon: <Users size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Community Management</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Creating Communities</h4>
              <p className="text-gray-600 text-sm">
                Create specialized groups for subjects, grade levels, or interests. 
                Set privacy settings and community rules during creation.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Joining Communities</h4>
              <p className="text-gray-600 text-sm">
                Browse public communities or search by subject. Some communities 
                require approval from moderators before you can join.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Managing Members</h4>
              <p className="text-gray-600 text-sm">
                Community owners can approve members, assign moderator roles, 
                and manage community settings and rules.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Community Roles</h4>
              <p className="text-gray-600 text-sm">
                Owner (full control), Moderator (manage members and content), 
                and Member (participate in discussions) roles available.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'messaging',
      title: 'Messaging',
      icon: <MessageCircle size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Messaging & Communication</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Finding Users</h4>
              <p className="text-gray-600 text-sm">
                Search for other teachers by name, email, subject, or location. 
                Use filters to find educators with specific expertise.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Starting Conversations</h4>
              <p className="text-gray-600 text-sm">
                Click "New Message" to start a conversation. You can send direct 
                messages or create group conversations with multiple participants.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Message Features</h4>
              <p className="text-gray-600 text-sm">
                Send text, files, images, and links. Reply to specific messages, 
                edit sent messages, and use emoji reactions.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Privacy Settings</h4>
              <p className="text-gray-600 text-sm">
                Control who can find and message you through privacy settings. 
                Block users and report inappropriate behavior when needed.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'resources',
      title: 'Resources & Videos',
      icon: <Upload size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resource Sharing & Video Integration</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Uploading Resources</h4>
              <p className="text-gray-600 text-sm">
                Upload documents, images, and videos up to 10MB. All files are 
                scanned for security before being made available.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Video Integration</h4>
              <p className="text-gray-600 text-sm">
                Videos are uploaded to YouTube as unlisted content, accessible 
                only through our platform for secure sharing.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Resource Discovery</h4>
              <p className="text-gray-600 text-sm">
                Search resources by subject, grade level, or type. Browse 
                categories or view personalized recommendations.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Sharing Permissions</h4>
              <p className="text-gray-600 text-sm">
                Set resources as Public, Community-specific, or Private. 
                Control who can download and share your materials.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'settings',
      title: 'Settings & Privacy',
      icon: <Settings size={20} />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Account Settings & Privacy</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-gray-900">Profile Settings</h4>
              <p className="text-gray-600 text-sm">
                Update your profile information, teaching subjects, and 
                professional details. Control what information is public.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Privacy Controls</h4>
              <p className="text-gray-600 text-sm">
                Manage who can find you in searches, send you messages, 
                and view your profile and content.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Notification Settings</h4>
              <p className="text-gray-600 text-sm">
                Customize email and push notifications for posts, messages, 
                community activity, and platform updates.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Account Security</h4>
              <p className="text-gray-600 text-sm">
                Enable two-factor authentication, manage connected accounts, 
                and review login activity for security.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Help Center</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close help"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search help topics..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <nav className="space-y-1">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {filteredSections.find(section => section.id === activeSection)?.content}
              
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Need More Help?</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Check our comprehensive user guides for detailed instructions</p>
                  <p>• Join the "Platform Help" community for peer support</p>
                  <p>• Contact support through the help chat for immediate assistance</p>
                  <p>• Email support@teacherhub.com for detailed questions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;