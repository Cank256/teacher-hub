import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HelpModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialSection?: string;
}

interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: {
    title: string;
    items: Array<{
      subtitle: string;
      description: string;
    }>;
  };
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isVisible,
  onClose,
  initialSection = 'posts'
}) => {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  const helpSections: HelpSection[] = [
    {
      id: 'posts',
      title: 'Posts & Content',
      icon: 'document-text-outline',
      content: {
        title: 'Creating and Managing Posts',
        items: [
          {
            subtitle: 'Creating a Post',
            description: 'Tap the "+" button, select "New Post", add title and content, choose visibility, and publish to share.'
          },
          {
            subtitle: 'Adding Media',
            description: 'Tap the camera or attachment icon to add photos, videos, or documents from your device.'
          },
          {
            subtitle: 'Post Visibility',
            description: 'Choose Public (everyone), Community (specific groups), or Followers (your followers only).'
          },
          {
            subtitle: 'Editing Posts',
            description: 'Tap the three dots on your posts and select "Edit" to make changes.'
          }
        ]
      }
    },
    {
      id: 'communities',
      title: 'Communities',
      icon: 'people-outline',
      content: {
        title: 'Community Management',
        items: [
          {
            subtitle: 'Creating Communities',
            description: 'Tap "+" and select "New Community". Set name, description, privacy settings, and rules.'
          },
          {
            subtitle: 'Joining Communities',
            description: 'Browse communities, tap "Join" for public ones, or "Request to Join" for private communities.'
          },
          {
            subtitle: 'Managing Members',
            description: 'Community owners can approve requests, assign roles, and manage settings from the community page.'
          },
          {
            subtitle: 'Community Roles',
            description: 'Owner (full control), Moderator (manage content/members), Member (participate in discussions).'
          }
        ]
      }
    },
    {
      id: 'messaging',
      title: 'Messaging',
      icon: 'chatbubble-outline',
      content: {
        title: 'Messaging & Communication',
        items: [
          {
            subtitle: 'Finding Users',
            description: 'Tap "New Message", then search by name, subject, or location to find other teachers.'
          },
          {
            subtitle: 'Starting Conversations',
            description: 'Tap a user from search results or your contacts to start a direct message or create a group.'
          },
          {
            subtitle: 'Message Features',
            description: 'Send text, photos, files, voice messages, and use reactions. Long-press messages for options.'
          },
          {
            subtitle: 'Privacy Settings',
            description: 'Control who can find and message you in Settings > Privacy > Messaging.'
          }
        ]
      }
    },
    {
      id: 'resources',
      title: 'Resources',
      icon: 'cloud-upload-outline',
      content: {
        title: 'Resource Sharing & Videos',
        items: [
          {
            subtitle: 'Uploading Resources',
            description: 'Tap "Upload" in Resources, select files from device or take photos/videos directly.'
          },
          {
            subtitle: 'Video Integration',
            description: 'Videos are uploaded to YouTube as unlisted content, viewable only through our app.'
          },
          {
            subtitle: 'Resource Discovery',
            description: 'Browse by subject, grade level, or search for specific materials and lesson plans.'
          },
          {
            subtitle: 'Sharing Permissions',
            description: 'Set resources as Public, Community-specific, or Private when uploading.'
          }
        ]
      }
    }
  ];

  const filteredSections = helpSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeContent = helpSections.find(section => section.id === activeSection);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help Center</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help topics..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredSections.map((section) => (
                <TouchableOpacity
                  key={section.id}
                  onPress={() => setActiveSection(section.id)}
                  style={[
                    styles.sidebarItem,
                    activeSection === section.id && styles.sidebarItemActive
                  ]}
                >
                  <Ionicons
                    name={section.icon as any}
                    size={20}
                    color={activeSection === section.id ? '#2563EB' : '#6B7280'}
                    style={styles.sidebarIcon}
                  />
                  <Text
                    style={[
                      styles.sidebarText,
                      activeSection === section.id && styles.sidebarTextActive
                    ]}
                  >
                    {section.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.mainContent}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
              {activeContent && (
                <View style={styles.contentContainer}>
                  <Text style={styles.contentTitle}>{activeContent.content.title}</Text>
                  {activeContent.content.items.map((item, index) => (
                    <View key={index} style={styles.contentItem}>
                      <Text style={styles.contentSubtitle}>{item.subtitle}</Text>
                      <Text style={styles.contentDescription}>{item.description}</Text>
                    </View>
                  ))}

                  <View style={styles.supportSection}>
                    <Text style={styles.supportTitle}>Need More Help?</Text>
                    <View style={styles.supportItems}>
                      <Text style={styles.supportItem}>• Check user guides for detailed instructions</Text>
                      <Text style={styles.supportItem}>• Join the "Platform Help" community</Text>
                      <Text style={styles.supportItem}>• Contact support through in-app chat</Text>
                      <Text style={styles.supportItem}>• Email support@teacherhub.com</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 140,
    backgroundColor: '#F9FAFB',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: '#EBF4FF',
  },
  sidebarIcon: {
    marginRight: 8,
  },
  sidebarText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  sidebarTextActive: {
    color: '#2563EB',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  contentItem: {
    marginBottom: 16,
  },
  contentSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  supportSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  supportItems: {
    marginLeft: 8,
  },
  supportItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default HelpModal;