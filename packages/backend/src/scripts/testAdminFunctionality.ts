import axios from 'axios';
import logger from '../utils/logger';

const API_BASE_URL = 'http://localhost:8001/api';

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
    };
  };
}

class AdminFunctionalityTester {
  private adminToken: string = '';
  private superAdminToken: string = '';
  private teacherToken: string = '';

  async testAll() {
    try {
      console.log('🚀 Starting Admin Functionality Tests\n');

      // Step 1: Login as different users
      await this.loginUsers();

      // Step 2: Test role checking
      await this.testRoleChecking();

      // Step 3: Test admin dashboard access
      await this.testAdminDashboard();

      // Step 4: Test role management
      await this.testRoleManagement();

      // Step 5: Test permission management
      await this.testPermissionManagement();

      console.log('\n✅ All admin functionality tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Admin functionality tests failed:', error);
    }
  }

  private async loginUsers() {
    console.log('📝 Step 1: Logging in as different users...');

    // Login as Super Admin
    try {
      const superAdminResponse = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email: 'superadmin@teacherhub.ug',
        password: 'SuperAdmin123!'
      });
      this.superAdminToken = superAdminResponse.data.data.accessToken;
      console.log(`✅ Super Admin logged in: ${superAdminResponse.data.data.user.fullName} (${superAdminResponse.data.data.user.role})`);
    } catch (error: any) {
      console.log(`❌ Super Admin login failed: ${error.response?.data?.error?.message || error.message}`);
    }

    // Login as Admin
    try {
      const adminResponse = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email: 'admin@teacherhub.ug',
        password: 'AdminPass123!'
      });
      this.adminToken = adminResponse.data.data.accessToken;
      console.log(`✅ Admin logged in: ${adminResponse.data.data.user.fullName} (${adminResponse.data.data.user.role})`);
    } catch (error: any) {
      console.log(`❌ Admin login failed: ${error.response?.data?.error?.message || error.message}`);
    }

    // Login as Teacher
    try {
      const teacherResponse = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        email: 'mary.achieng@example.com',
        password: 'Password123!'
      });
      this.teacherToken = teacherResponse.data.data.accessToken;
      console.log(`✅ Teacher logged in: ${teacherResponse.data.data.user.fullName} (${teacherResponse.data.data.user.role})`);
    } catch (error: any) {
      console.log(`❌ Teacher login failed: ${error.response?.data?.error?.message || error.message}`);
    }

    console.log('');
  }

  private async testRoleChecking() {
    console.log('🔐 Step 2: Testing role checking...');

    // Test admin access with admin token
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      console.log('✅ Admin can access admin dashboard');
    } catch (error: any) {
      console.log(`❌ Admin dashboard access failed: ${error.response?.data?.error?.message || error.message}`);
    }

    // Test admin access with teacher token (should fail)
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.teacherToken}` }
      });
      console.log('❌ Teacher should not be able to access admin dashboard');
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log('✅ Teacher correctly denied access to admin dashboard');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    console.log('');
  }

  private async testAdminDashboard() {
    console.log('📊 Step 3: Testing admin dashboard access...');

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      const data = response.data;
      console.log('✅ Admin dashboard data retrieved:');
      console.log(`   - Total Users: ${data.overview?.totalUsers || 'N/A'}`);
      console.log(`   - Active Users: ${data.overview?.activeUsers || 'N/A'}`);
      console.log(`   - System Health: ${data.systemHealth?.status || 'N/A'}`);
    } catch (error: any) {
      console.log(`❌ Admin dashboard access failed: ${error.response?.data?.error?.message || error.message}`);
    }

    console.log('');
  }

  private async testRoleManagement() {
    console.log('👥 Step 4: Testing role management...');

    // Get all admin users
    try {
      const response = await axios.get(`${API_BASE_URL}/roles/admin-users`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      console.log('✅ Admin users retrieved:');
      response.data.data.forEach((user: any) => {
        console.log(`   - ${user.full_name} (${user.email}) - ${user.role.toUpperCase()}`);
      });
    } catch (error: any) {
      console.log(`❌ Failed to get admin users: ${error.response?.data?.error?.message || error.message}`);
    }

    // Get all permissions
    try {
      const response = await axios.get(`${API_BASE_URL}/roles/permissions`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      console.log(`✅ Retrieved ${response.data.data.permissions.length} permissions`);
      console.log('   Sample permissions:');
      response.data.data.permissions.slice(0, 5).forEach((perm: any) => {
        console.log(`   - ${perm.name}: ${perm.description}`);
      });
    } catch (error: any) {
      console.log(`❌ Failed to get permissions: ${error.response?.data?.error?.message || error.message}`);
    }

    console.log('');
  }

  private async testPermissionManagement() {
    console.log('🔑 Step 5: Testing permission management...');

    // Check if current user has specific permission
    try {
      const response = await axios.get(`${API_BASE_URL}/roles/check/users.create`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      console.log(`✅ Admin has 'users.create' permission: ${response.data.data.hasPermission}`);
    } catch (error: any) {
      console.log(`❌ Failed to check permission: ${error.response?.data?.error?.message || error.message}`);
    }

    // Check teacher permission (should be false for admin-only permissions)
    try {
      const response = await axios.get(`${API_BASE_URL}/roles/check/system.admin`, {
        headers: { Authorization: `Bearer ${this.teacherToken}` }
      });
      
      console.log(`✅ Teacher has 'system.admin' permission: ${response.data.data.hasPermission}`);
    } catch (error: any) {
      console.log(`❌ Failed to check teacher permission: ${error.response?.data?.error?.message || error.message}`);
    }

    console.log('');
  }
}

// Run the tests
async function main() {
  const tester = new AdminFunctionalityTester();
  await tester.testAll();
}

if (require.main === module) {
  main().catch(console.error);
}

export { AdminFunctionalityTester };