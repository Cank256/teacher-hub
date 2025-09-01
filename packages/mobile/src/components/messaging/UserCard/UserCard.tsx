import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import type { User } from '@/types/messaging';

interface UserCardProps {
  user: User;
  isSelected?: boolean;
  onPress: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isSelected = false,
  onPress,
}) => {
  const getSubjectsText = () => {
    if (!user.subjects || user.subjects.length === 0) {
      return 'No subjects listed';
    }
    
    return user.subjects.map(subject => subject.name).join(', ');
  };

  const getLocationText = () => {
    if (!user.schoolLocation) {
      return 'Location not specified';
    }
    
    return `${user.schoolLocation.name}, ${user.schoolLocation.district}`;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isSelected && styles.selectedContainer
      ]} 
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        {user.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>
              {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        
        {/* Online indicator */}
        {user.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Text style={styles.selectedIcon}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.subjects} numberOfLines={1}>
          {getSubjectsText()}
        </Text>

        <Text style={styles.location} numberOfLines={1}>
          📍 {getLocationText()}
        </Text>

        {user.yearsOfExperience && (
          <Text style={styles.experience}>
            {user.yearsOfExperience} years of experience
          </Text>
        )}

        {user.lastActiveAt && (
          <Text style={styles.lastSeen}>
            Last seen {new Date(user.lastActiveAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedContainer: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subjects: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  experience: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  lastSeen: {
    fontSize: 11,
    color: '#aaa',
  },
});