import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import DocumentPicker from 'react-native-document-picker-v2';

import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {theme} from '../../styles/theme';
import {registerWithGoogle, clearError} from '../../store/slices/authSlice';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {AppDispatch, RootState} from '../../store';

type GoogleRegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'GoogleRegister'>;

interface Props {
  navigation: GoogleRegisterScreenNavigationProp;
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Social Studies',
  'Religious Education',
  'Physical Education',
  'Art',
  'Music',
  'Computer Studies',
  'Agriculture',
];

const GRADE_LEVELS = [
  'Nursery',
  'Primary 1-3',
  'Primary 4-7',
  'Secondary 1-4',
  'Secondary 5-6',
  'Tertiary',
];

const UGANDAN_REGIONS = ['Central', 'Eastern', 'Northern', 'Western'];

const DISTRICTS_BY_REGION: Record<string, string[]> = {
  Central: ['Kampala', 'Wakiso', 'Mukono', 'Mpigi', 'Luwero', 'Nakasongola', 'Masaka', 'Rakai'],
  Eastern: ['Jinja', 'Mbale', 'Soroti', 'Tororo', 'Busia', 'Iganga', 'Kamuli', 'Pallisa'],
  Northern: ['Gulu', 'Lira', 'Arua', 'Kitgum', 'Pader', 'Apac', 'Nebbi', 'Yumbe'],
  Western: ['Mbarara', 'Kasese', 'Kabale', 'Hoima', 'Masindi', 'Bundibugyo', 'Rukungiri', 'Ntungamo'],
};

export const GoogleRegisterScreen: React.FC<Props> = ({navigation}) => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [credentials, setCredentials] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch<AppDispatch>();
  const {isLoading, error} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [subjects, gradeLevels, region, district, yearsExperience, dispatch, error]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (subjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject';
    }

    if (gradeLevels.length === 0) {
      newErrors.gradeLevels = 'Please select at least one grade level';
    }

    if (!region) {
      newErrors.region = 'Please select a region';
    }

    if (!district) {
      newErrors.district = 'Please select a district';
    }

    if (!yearsExperience) {
      newErrors.yearsExperience = 'Please enter years of experience';
    } else if (parseInt(yearsExperience) < 0 || parseInt(yearsExperience) > 50) {
      newErrors.yearsExperience = 'Years of experience must be between 0 and 50';
    }

    if (credentials.length === 0) {
      newErrors.credentials = 'Please upload at least one teaching credential';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubjectToggle = (subject: string) => {
    setSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleGradeLevelToggle = (gradeLevel: string) => {
    setGradeLevels(prev =>
      prev.includes(gradeLevel)
        ? prev.filter(g => g !== gradeLevel)
        : [...prev, gradeLevel]
    );
  };

  const handleRegionChange = (selectedRegion: string) => {
    setRegion(selectedRegion);
    setDistrict(''); // Reset district when region changes
  };

  const handleDocumentPicker = async () => {
    try {
      const results = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      setCredentials(prev => [...prev, ...results]);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to pick documents');
      }
    }
  };

  const removeCredential = (index: number) => {
    setCredentials(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(registerWithGoogle({
        subjects,
        gradeLevels,
        schoolLocation: {district, region},
        yearsExperience: parseInt(yearsExperience),
        credentials,
        bio: bio.trim() || undefined,
      })).unwrap();

      // Navigation will be handled by auth state change
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  const availableDistricts = region ? DISTRICTS_BY_REGION[region] || [] : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Completing registration...</Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Please provide additional information to complete your registration
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Subjects */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subjects *</Text>
            <View style={styles.checkboxGrid}>
              {SUBJECTS.map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[
                    styles.checkbox,
                    subjects.includes(subject) && styles.checkboxSelected,
                  ]}
                  onPress={() => handleSubjectToggle(subject)}>
                  <Text
                    style={[
                      styles.checkboxText,
                      subjects.includes(subject) && styles.checkboxTextSelected,
                    ]}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.subjects && (
              <Text style={styles.errorText}>{errors.subjects}</Text>
            )}
          </View>

          {/* Grade Levels */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grade Levels *</Text>
            <View style={styles.checkboxGrid}>
              {GRADE_LEVELS.map(gradeLevel => (
                <TouchableOpacity
                  key={gradeLevel}
                  style={[
                    styles.checkbox,
                    gradeLevels.includes(gradeLevel) && styles.checkboxSelected,
                  ]}
                  onPress={() => handleGradeLevelToggle(gradeLevel)}>
                  <Text
                    style={[
                      styles.checkboxText,
                      gradeLevels.includes(gradeLevel) && styles.checkboxTextSelected,
                    ]}>
                    {gradeLevel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gradeLevels && (
              <Text style={styles.errorText}>{errors.gradeLevels}</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location *</Text>
            
            <Text style={styles.fieldLabel}>Region</Text>
            <View style={styles.pickerContainer}>
              {UGANDAN_REGIONS.map(regionOption => (
                <TouchableOpacity
                  key={regionOption}
                  style={[
                    styles.pickerOption,
                    region === regionOption && styles.pickerOptionSelected,
                  ]}
                  onPress={() => handleRegionChange(regionOption)}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      region === regionOption && styles.pickerOptionTextSelected,
                    ]}>
                    {regionOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.region && (
              <Text style={styles.errorText}>{errors.region}</Text>
            )}

            <Text style={styles.fieldLabel}>District</Text>
            <View style={styles.pickerContainer}>
              {availableDistricts.map(districtOption => (
                <TouchableOpacity
                  key={districtOption}
                  style={[
                    styles.pickerOption,
                    district === districtOption && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setDistrict(districtOption)}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      district === districtOption && styles.pickerOptionTextSelected,
                    ]}>
                    {districtOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.district && (
              <Text style={styles.errorText}>{errors.district}</Text>
            )}
          </View>

          {/* Years of Experience */}
          <View style={styles.section}>
            <Input
              label="Years of Teaching Experience *"
              placeholder="Enter years of experience"
              value={yearsExperience}
              onChangeText={setYearsExperience}
              keyboardType="numeric"
              error={errors.yearsExperience}
            />
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Input
              label="Bio (Optional)"
              placeholder="Tell us about yourself and your teaching experience..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={styles.bioInput}
            />
          </View>

          {/* Credentials */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teaching Credentials *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleDocumentPicker}>
              <Text style={styles.uploadButtonText}>
                Upload Teaching Certificates
              </Text>
            </TouchableOpacity>
            
            {credentials.length > 0 && (
              <View style={styles.credentialsList}>
                {credentials.map((credential, index) => (
                  <View key={index} style={styles.credentialItem}>
                    <Text style={styles.credentialName} numberOfLines={1}>
                      {credential.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeCredential(index)}
                      style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            
            {errors.credentials && (
              <Text style={styles.errorText}>{errors.credentials}</Text>
            )}
          </View>

          <Button
            title="Complete Registration"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '15',
    borderColor: theme.colors.error,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.bodySmall.fontSize,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  checkbox: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
  },
  checkboxTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pickerOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerOptionText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  credentialsList: {
    marginTop: theme.spacing.md,
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  credentialName: {
    flex: 1,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
  },
  removeButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  removeButtonText: {
    color: theme.colors.error,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: theme.spacing.xl,
    minHeight: 52,
  },
});