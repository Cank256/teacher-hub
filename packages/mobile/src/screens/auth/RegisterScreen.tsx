import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {StackNavigationProp} from '@react-navigation/stack';
import DocumentPicker from 'react-native-document-picker-v2';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {theme} from '../../styles/theme';
import {registerUser, clearError} from '../../store/slices/authSlice';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {AppDispatch, RootState} from '../../store';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  subjects?: string;
  gradeLevels?: string;
  schoolLocation?: string;
}

interface CredentialFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    subjects: '',
    gradeLevels: '',
    schoolLocation: '',
    yearsExperience: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [credentialFiles, setCredentialFiles] = useState<CredentialFile[]>([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const dispatch = useDispatch<AppDispatch>();
  const {isLoading, error} = useSelector((state: RootState) => state.auth);
  const {width: screenWidth} = Dimensions.get('window');

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, [formData, dispatch, error]);

  useEffect(() => {
    validateForm();
  }, [formData, credentialFiles]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Step 1 validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (!formData.subjects.trim()) {
        newErrors.subjects = 'Please specify your teaching subjects';
        isValid = false;
      }

      if (!formData.gradeLevels.trim()) {
        newErrors.gradeLevels = 'Please specify grade levels you teach';
        isValid = false;
      }

      if (!formData.schoolLocation.trim()) {
        newErrors.schoolLocation = 'School location is required';
        isValid = false;
      }
    }

    setErrors(newErrors);
    setIsFormValid(isValid);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({...prev, [field]: undefined}));
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        allowMultiSelection: true,
      });

      const newFiles = results.map(result => ({
        uri: result.uri,
        name: result.name || 'Unknown',
        type: result.type || 'application/octet-stream',
        size: result.size || 0,
      }));

      setCredentialFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select documents. Please try again.');
      }
    }
  };

  const removeCredentialFile = (index: number) => {
    setCredentialFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isFormValid) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleRegister = async () => {
    if (!isFormValid) {
      Alert.alert('Form Incomplete', 'Please fill in all required fields correctly.');
      return;
    }

    try {
      await dispatch(registerUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(s => s),
        gradeLevels: formData.gradeLevels.split(',').map(g => g.trim()).filter(g => g),
        schoolLocation: formData.schoolLocation.trim(),
        yearsExperience: parseInt(formData.yearsExperience) || 0,
        credentials: credentialFiles,
      })).unwrap();
      
      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please check your email for verification instructions.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMessage);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepContainer}>
        <View style={[styles.step, currentStep >= 1 && styles.activeStep]}>
          <Text style={[styles.stepText, currentStep >= 1 && styles.activeStepText]}>1</Text>
        </View>
        <Text style={styles.stepLabel}>Account</Text>
      </View>
      <View style={[styles.stepLine, currentStep >= 2 && styles.activeStepLine]} />
      <View style={styles.stepContainer}>
        <View style={[styles.step, currentStep >= 2 && styles.activeStep]}>
          <Text style={[styles.stepText, currentStep >= 2 && styles.activeStepText]}>2</Text>
        </View>
        <Text style={styles.stepLabel}>Profile</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Account Information</Text>
      <Text style={styles.stepSubtitle}>Create your Teacher Hub account</Text>

      <Input
        label="Full Name"
        placeholder="Enter your full name"
        value={formData.fullName}
        onChangeText={(value) => updateFormData('fullName', value)}
        autoCapitalize="words"
        leftIcon="person"
        error={errors.fullName}
        editable={!isLoading}
        testID="fullname-input"
      />

      <Input
        label="Email Address"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(value) => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="email"
        error={errors.email}
        editable={!isLoading}
        testID="email-input"
      />

      <Input
        label="Password"
        placeholder="Create a password (min 8 characters)"
        value={formData.password}
        onChangeText={(value) => updateFormData('password', value)}
        secureTextEntry
        autoCapitalize="none"
        leftIcon="lock"
        error={errors.password}
        editable={!isLoading}
        testID="password-input"
      />

      <Input
        label="Confirm Password"
        placeholder="Confirm your password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData('confirmPassword', value)}
        secureTextEntry
        autoCapitalize="none"
        leftIcon="lock"
        error={errors.confirmPassword}
        editable={!isLoading}
        testID="confirm-password-input"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Teaching Profile</Text>
      <Text style={styles.stepSubtitle}>Tell us about your teaching experience</Text>

      <Input
        label="Teaching Subjects"
        placeholder="e.g., Mathematics, English, Science"
        value={formData.subjects}
        onChangeText={(value) => updateFormData('subjects', value)}
        multiline
        leftIcon="school"
        error={errors.subjects}
        editable={!isLoading}
        testID="subjects-input"
      />

      <Input
        label="Grade Levels"
        placeholder="e.g., S1, S2, S3, S4"
        value={formData.gradeLevels}
        onChangeText={(value) => updateFormData('gradeLevels', value)}
        leftIcon="grade"
        error={errors.gradeLevels}
        editable={!isLoading}
        testID="grade-levels-input"
      />

      <Input
        label="School Location"
        placeholder="Enter your school's location"
        value={formData.schoolLocation}
        onChangeText={(value) => updateFormData('schoolLocation', value)}
        leftIcon="location-on"
        error={errors.schoolLocation}
        editable={!isLoading}
        testID="school-location-input"
      />

      <Input
        label="Years of Experience (Optional)"
        placeholder="Enter years of teaching experience"
        value={formData.yearsExperience}
        onChangeText={(value) => updateFormData('yearsExperience', value)}
        keyboardType="numeric"
        leftIcon="work"
        editable={!isLoading}
        testID="experience-input"
      />

      {/* Credential Upload Section */}
      <View style={styles.credentialSection}>
        <Text style={styles.credentialTitle}>Teaching Credentials (Optional)</Text>
        <Text style={styles.credentialSubtitle}>
          Upload your teaching certificates or credentials to verify your profile
        </Text>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleDocumentPicker}
          disabled={isLoading}
          testID="upload-credentials-button">
          <Icon name="cloud-upload" size={24} color={theme.colors.primary} />
          <Text style={styles.uploadButtonText}>Upload Documents</Text>
        </TouchableOpacity>

        {credentialFiles.length > 0 && (
          <View style={styles.fileList}>
            {credentialFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <Icon name="description" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeCredentialFile(index)}
                  style={styles.removeFileButton}
                  testID={`remove-file-${index}`}>
                  <Icon name="close" size={16} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} testID="register-screen">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Creating your account...</Text>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Join Teacher Hub</Text>
              <Text style={styles.subtitle}>Connect with educators across Uganda</Text>
            </View>

            {renderStepIndicator()}

            {/* Global Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              {currentStep === 1 ? renderStep1() : renderStep2()}

              <View style={styles.buttonContainer}>
                {currentStep === 2 && (
                  <Button
                    title="Previous"
                    onPress={handlePreviousStep}
                    variant="outline"
                    style={styles.previousButton}
                    disabled={isLoading}
                  />
                )}

                {currentStep === 1 ? (
                  <Button
                    title="Next"
                    onPress={handleNextStep}
                    disabled={!isFormValid || isLoading}
                    style={[
                      styles.nextButton,
                      (!isFormValid || isLoading) && styles.disabledButton
                    ]}
                    testID="next-button"
                  />
                ) : (
                  <Button
                    title={isLoading ? "Creating Account..." : "Create Account"}
                    onPress={handleRegister}
                    loading={isLoading}
                    disabled={!isFormValid || isLoading}
                    style={[
                      styles.registerButton,
                      (!isFormValid || isLoading) && styles.disabledButton
                    ]}
                    testID="register-button"
                  />
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Button
                title="Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="ghost"
                size="small"
                disabled={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xl,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  stepContainer: {
    alignItems: 'center',
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  activeStep: {
    backgroundColor: theme.colors.primary,
  },
  stepText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeStepText: {
    color: theme.colors.surface,
  },
  stepLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  activeStepLine: {
    backgroundColor: theme.colors.primary,
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
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  stepContent: {
    marginBottom: theme.spacing.lg,
  },
  stepTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepSubtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 20,
  },
  credentialSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  credentialTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  credentialSubtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '10',
    marginBottom: theme.spacing.md,
  },
  uploadButtonText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  fileList: {
    marginTop: theme.spacing.md,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fileName: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textPrimary,
  },
  removeFileButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },
  previousButton: {
    flex: 0.45,
  },
  nextButton: {
    flex: 1,
    minHeight: 52,
  },
  registerButton: {
    flex: 1,
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
});