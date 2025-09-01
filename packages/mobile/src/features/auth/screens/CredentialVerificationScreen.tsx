import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Button, Input } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { authService } from '@/services/auth';
import { AuthStackScreenProps } from '@/navigation/types';
import { DocumentType, CredentialDocument, VerificationStatus } from '@/services/auth/types';
import * as Haptics from 'expo-haptics';

type Props = AuthStackScreenProps<'VerifyCredentials'>;

const DOCUMENT_TYPES = [
  { type: DocumentType.TEACHING_CERTIFICATE, label: 'Teaching Certificate', required: true },
  { type: DocumentType.DEGREE_CERTIFICATE, label: 'Degree Certificate', required: true },
  { type: DocumentType.NATIONAL_ID, label: 'National ID', required: false },
  { type: DocumentType.PASSPORT, label: 'Passport', required: false },
];

export const CredentialVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { userId } = route.params;
  const [documents, setDocuments] = useState<CredentialDocument[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(VerificationStatus.PENDING);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const status = await authService.getVerificationStatus();
      setVerificationStatus(status);
    } catch (error) {
      console.warn('Failed to check verification status:', error);
    }
  };

  const pickDocument = async (documentType: DocumentType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Select Document',
      'Choose how you want to add your document',
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(documentType),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickFromGallery(documentType),
        },
        {
          text: 'Browse Files',
          onPress: () => pickFile(documentType),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const takePhoto = async (documentType: DocumentType) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDocument({
          type: documentType,
          fileName: `${documentType}_${Date.now()}.jpg`,
          fileUri: asset.uri,
          mimeType: 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickFromGallery = async (documentType: DocumentType) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        addDocument({
          type: documentType,
          fileName: asset.fileName || `${documentType}_${Date.now()}.jpg`,
          fileUri: asset.uri,
          mimeType: 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const pickFile = async (documentType: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (max 10MB)
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }

        addDocument({
          type: documentType,
          fileName: asset.name,
          fileUri: asset.uri,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const addDocument = (document: Omit<CredentialDocument, 'id' | 'uploadedAt'>) => {
    const newDocument: CredentialDocument = {
      ...document,
      id: Date.now().toString(),
      uploadedAt: new Date(),
    };

    // Remove existing document of the same type
    setDocuments(prev => [
      ...prev.filter(doc => doc.type !== document.type),
      newDocument,
    ]);
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const submitVerification = async () => {
    if (isLoading) return;

    // Check required documents
    const requiredTypes = DOCUMENT_TYPES.filter(dt => dt.required).map(dt => dt.type);
    const uploadedTypes = documents.map(doc => doc.type);
    const missingRequired = requiredTypes.filter(type => !uploadedTypes.includes(type));

    if (missingRequired.length > 0) {
      const missingLabels = DOCUMENT_TYPES
        .filter(dt => missingRequired.includes(dt.type))
        .map(dt => dt.label)
        .join(', ');
      
      Alert.alert(
        'Missing Required Documents',
        `Please upload the following required documents: ${missingLabels}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await authService.uploadCredentials({
        documents,
        additionalInfo: additionalInfo.trim() || undefined,
      });

      if (result.success) {
        setVerificationStatus(result.status);
        
        Alert.alert(
          'Documents Submitted Successfully!',
          'Your credentials have been submitted for review. You will be notified once the verification is complete.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to main app or biometric setup
                navigation.navigate('BiometricSetup', { userId });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          result.message || 'Failed to submit your documents. Please try again.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Verification submission error:', error);
      Alert.alert(
        'Submission Error',
        'An error occurred while submitting your documents. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const skipForNow = () => {
    Alert.alert(
      'Skip Verification?',
      'You can verify your credentials later in your profile settings. Some features may be limited until verification is complete.',
      [
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            navigation.navigate('BiometricSetup', { userId });
          },
        },
        {
          text: 'Continue Verification',
          style: 'cancel',
        },
      ]
    );
  };

  const getDocumentForType = (type: DocumentType) => {
    return documents.find(doc => doc.type === type);
  };

  const renderDocumentItem = (documentTypeInfo: typeof DOCUMENT_TYPES[0]) => {
    const document = getDocumentForType(documentTypeInfo.type);
    const isImage = document?.mimeType.startsWith('image/');

    return (
      <View key={documentTypeInfo.type} style={styles.documentItem}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentLabel}>
            {documentTypeInfo.label}
            {documentTypeInfo.required && <Text style={styles.required}> *</Text>}
          </Text>
          {document && (
            <TouchableOpacity
              onPress={() => removeDocument(document.id!)}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {document ? (
          <View style={styles.documentPreview}>
            {isImage ? (
              <Image source={{ uri: document.fileUri }} style={styles.documentImage} />
            ) : (
              <View style={styles.documentFile}>
                <Text style={styles.documentFileName}>{document.fileName}</Text>
                <Text style={styles.documentFileSize}>
                  {(document.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Button
            title={`Upload ${documentTypeInfo.label}`}
            onPress={() => pickDocument(documentTypeInfo.type)}
            variant="outline"
            size="small"
            testID={`upload-${documentTypeInfo.type}-button`}
          />
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.lineHeight.md,
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.md,
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.semibold,
      textAlign: 'center',
    },
    documentsSection: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    documentItem: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
    },
    documentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    documentLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
    },
    required: {
      color: theme.colors.error,
    },
    removeButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    removeButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.error,
    },
    documentPreview: {
      alignItems: 'center',
    },
    documentImage: {
      width: '100%',
      height: 200,
      borderRadius: theme.borderRadius.md,
      resizeMode: 'cover',
    },
    documentFile: {
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      width: '100%',
    },
    documentFileName: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.medium,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    documentFileSize: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.regular,
      color: theme.colors.textSecondary,
    },
    additionalInfoSection: {
      marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    submitButton: {
      marginBottom: theme.spacing.md,
    },
  });

  const getStatusColor = () => {
    switch (verificationStatus) {
      case VerificationStatus.VERIFIED:
        return theme.colors.success;
      case VerificationStatus.REJECTED:
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case VerificationStatus.VERIFIED:
        return 'Verified';
      case VerificationStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Pending Review';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Your Credentials</Text>
          <Text style={styles.subtitle}>
            Upload your teaching credentials to verify your professional status and access all platform features.
          </Text>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              Status: {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          {DOCUMENT_TYPES.map(renderDocumentItem)}
        </View>

        <View style={styles.additionalInfoSection}>
          <Input
            label="Additional Information (Optional)"
            placeholder="Any additional information about your credentials..."
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            multiline
            numberOfLines={4}
            maxLength={500}
            showCharacterCount
            testID="additional-info-input"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Submit for Verification"
            onPress={submitVerification}
            loading={isLoading}
            disabled={isLoading || documents.length === 0}
            style={styles.submitButton}
            testID="submit-verification-button"
          />
          
          <Button
            title="Skip for Now"
            onPress={skipForNow}
            variant="outline"
            testID="skip-verification-button"
          />
        </View>
      </View>
    </ScrollView>
  );
};