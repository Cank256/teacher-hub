import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testSuperAdminLogin() {
  try {
    console.log('Testing superadmin login...');
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'superadmin@teacherhub.ug',
      password: 'SuperAdmin123!'
    });

    console.log('✅ Login successful!');
    console.log('User:', loginResponse.data.data.user.fullName);
    console.log('Role:', loginResponse.data.data.user.role);
    console.log('Token:', loginResponse.data.data.accessToken.substring(0, 50) + '...');

    // Test admin dashboard access
    const token = loginResponse.data.data.accessToken;
    const dashboardResponse = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Admin dashboard access successful!');
    console.log('Dashboard data keys:', Object.keys(dashboardResponse.data));

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSuperAdminLogin();