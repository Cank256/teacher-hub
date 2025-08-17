// Utility to create a test user for debugging WebSocket connections
// This is for development/testing purposes only

export const createTestUser = async () => {
  const testUserData = {
    email: 'test.teacher@teacherhub.ug',
    password: 'TestPass123!',
    fullName: 'Test Teacher',
    subjects: ['Mathematics', 'Science'],
    gradeLevels: ['Primary 1-3', 'Primary 4-7'],
    school: 'Test Primary School',
    schoolLocation: {
      district: 'Kampala',
      region: 'Central'
    },
    yearsExperience: 5,
    bio: 'Test teacher account for WebSocket debugging'
  };

  try {
    console.log('Creating test user...');
    
    const formData = new FormData();
    formData.append('email', testUserData.email);
    formData.append('password', testUserData.password);
    formData.append('fullName', testUserData.fullName);
    formData.append('subjects', JSON.stringify(testUserData.subjects));
    formData.append('gradeLevels', JSON.stringify(testUserData.gradeLevels));
    formData.append('school', testUserData.school);
    formData.append('schoolLocation[district]', testUserData.schoolLocation.district);
    formData.append('schoolLocation[region]', testUserData.schoolLocation.region);
    formData.append('yearsExperience', testUserData.yearsExperience.toString());
    formData.append('bio', testUserData.bio);
    
    // Create a dummy credential file
    const dummyFile = new Blob(['Dummy credential content'], { type: 'application/pdf' });
    formData.append('credentialFile', dummyFile, 'test-credential.pdf');

    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test user created successfully:', result);
      return { success: true, data: result };
    } else {
      console.log('❌ Test user creation failed:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return { success: false, error };
  }
};

export const loginTestUser = async () => {
  try {
    console.log('Logging in test user...');
    
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test.teacher@teacherhub.ug',
        password: 'TestPass123!',
        rememberMe: false
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test user login successful:', result);
      
      // Store tokens
      sessionStorage.setItem('auth_token', result.accessToken);
      sessionStorage.setItem('refresh_token', result.refreshToken);
      
      return { success: true, data: result };
    } else {
      console.log('❌ Test user login failed:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error logging in test user:', error);
    return { success: false, error };
  }
};

// Helper function to run in browser console
export const setupTestUser = async () => {
  console.log('Setting up test user for WebSocket debugging...');
  
  // Try to login first
  let loginResult = await loginTestUser();
  
  if (!loginResult.success) {
    // If login fails, try to create the user
    const createResult = await createTestUser();
    
    if (createResult.success) {
      // Try to login again after creation
      loginResult = await loginTestUser();
    } else {
      console.log('Failed to create test user:', createResult.error);
      return createResult;
    }
  }
  
  if (loginResult.success) {
    console.log('✅ Test user setup complete! Refresh the page to see the changes.');
    return loginResult;
  } else {
    console.log('❌ Test user setup failed:', loginResult.error);
    return loginResult;
  }
};

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).setupTestUser = setupTestUser;
  (window as any).createTestUser = createTestUser;
  (window as any).loginTestUser = loginTestUser;
}