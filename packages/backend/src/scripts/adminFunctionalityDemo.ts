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

class AdminFunctionalityDemo {
  private tokens: { [key: string]: string } = {};
  private users: { [key: string]: any } = {};

  async runDemo() {
    console.log('🚀 Teacher Hub Platform - Admin Functionality Demo');
    console.log('=' .repeat(60));
    console.log('');

    try {
      // Step 1: Login all demo users
      await this.loginAllUsers();
      
      // Step 2: Demonstrate role hierarchy
      await this.demonstrateRoleHierarchy();
      
      // Step 3: Test admin dashboard access
      await this.testAdminDashboardAccess();
      
      // Step 4: Test user management
      await this.testUserManagement();
      
      // Step 5: Test permission system
      await this.testPermissionSystem();
      
      // Step 6: Test role management
      await this.testRoleManagement();
      
      console.log('\n🎉 Admin Functionality Demo Completed Successfully!');
      console.log('=' .repeat(60));
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error);
    }
  }

  private async loginAllUsers() {
    console.log('👥 Step 1: Logging in all demo users...');
    console.log('-' .repeat(40));

    const demoUsers = [
      { email: 'superadmin@teacherhub.ug', password: 'SuperAdmin123!', role: 'super_admin', name: 'Super Admin' },
      { email: 'admin@teacherhub.ug', password: 'AdminPass123!', role: 'admin', name: 'Admin' },
      { email: 'james.okello@example.com', password: 'Password123!', role: 'moderator', name: 'Moderator' },
      { email: 'sarah.nakato@example.com', password: 'Password123!', role: 'admin', name: 'Teacher (Admin)' },
      { email: 'mary.achieng@example.com', password: 'Password123!', role: 'teacher', name: 'Teacher' }
    ];

    for (const user of demoUsers) {
      try {
        const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
          email: user.email,
          password: user.password
        });

        if (response.data.success) {
          this.tokens[user.role] = response.data.data.accessToken;
          this.users[user.role] = response.data.data.user;
          console.log(`✅ ${user.name}: ${response.data.data.user.fullName} (${response.data.data.user.role})`);
        }
      } catch (error: any) {
        console.log(`❌ ${user.name}: Login failed - ${error.response?.data?.error?.message || error.message}`);
      }
    }
    console.log('');
  }

  private async demonstrateRoleHierarchy() {
    console.log('🏗️  Step 2: Demonstrating Role Hierarchy...');
    console.log('-' .repeat(40));

    const roleHierarchy = [
      { role: 'super_admin', level: 4, description: 'Complete system control, can create other super admins' },
      { role: 'admin', level: 3, description: 'Administrative privileges, user management, system settings' },
      { role: 'moderator', level: 2, description: 'Content moderation, user verification, community management' },
      { role: 'teacher', level: 1, description: 'Standard user access, content creation, community participation' }
    ];

    console.log('Role Hierarchy (Level 4 = Highest):');
    roleHierarchy.forEach(role => {
      const user = this.users[role.role];
      const status = user ? '✅' : '❌';
      console.log(`${status} Level ${role.level} - ${role.role.toUpperCase().padEnd(12)} | ${role.description}`);
      if (user) {
        console.log(`    └─ Logged in as: ${user.fullName} (${user.email})`);
      }
    });
    console.log('');
  }

  private async testAdminDashboardAccess() {
    console.log('📊 Step 3: Testing Admin Dashboard Access...');
    console.log('-' .repeat(40));

    const testCases = [
      { role: 'super_admin', shouldAccess: true },
      { role: 'admin', shouldAccess: true },
      { role: 'moderator', shouldAccess: false },
      { role: 'teacher', shouldAccess: false }
    ];

    for (const testCase of testCases) {
      const token = this.tokens[testCase.role];
      if (!token) {
        console.log(`⏭️  Skipping ${testCase.role} - not logged in`);
        continue;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (testCase.shouldAccess) {
          console.log(`✅ ${testCase.role.toUpperCase()}: Successfully accessed admin dashboard`);
          const data = response.data;
          if (data.overview) {
            console.log(`    └─ Total Users: ${data.overview.totalUsers || 'N/A'}`);
            console.log(`    └─ Active Users: ${data.overview.activeUsers || 'N/A'}`);
          }
        } else {
          console.log(`❌ ${testCase.role.toUpperCase()}: Should not have access but did`);
        }
      } catch (error: any) {
        if (!testCase.shouldAccess && error.response?.status === 403) {
          console.log(`✅ ${testCase.role.toUpperCase()}: Correctly denied access (403 Forbidden)`);
        } else {
          console.log(`❌ ${testCase.role.toUpperCase()}: Unexpected error - ${error.response?.data?.error?.message || error.message}`);
        }
      }
    }
    console.log('');
  }

  private async testUserManagement() {
    console.log('👥 Step 4: Testing User Management...');
    console.log('-' .repeat(40));

    // Test getting admin users (admin access required)
    const adminToken = this.tokens['admin'];
    if (adminToken) {
      try {
        const response = await axios.get(`${API_BASE_URL}/roles/admin-users`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('✅ Admin Users Retrieved:');
        response.data.data.forEach((user: any) => {
          console.log(`    └─ ${user.full_name} (${user.email}) - ${user.role.toUpperCase()}`);
        });
      } catch (error: any) {
        console.log(`❌ Failed to get admin users: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    // Test teacher trying to access user management (should fail)
    const teacherToken = this.tokens['teacher'];
    if (teacherToken) {
      try {
        await axios.get(`${API_BASE_URL}/roles/admin-users`, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log('❌ Teacher should not be able to access admin users');
      } catch (error: any) {
        if (error.response?.status === 403) {
          console.log('✅ Teacher correctly denied access to user management');
        }
      }
    }
    console.log('');
  }

  private async testPermissionSystem() {
    console.log('🔑 Step 5: Testing Permission System...');
    console.log('-' .repeat(40));

    const permissionsToTest = [
      'users.create',
      'users.delete',
      'system.admin',
      'resources.moderate',
      'communities.create',
      'government.create'
    ];

    const rolesToTest = ['super_admin', 'admin', 'moderator', 'teacher'];

    console.log('Permission Matrix:');
    console.log('Permission'.padEnd(20) + rolesToTest.map(r => r.toUpperCase().padEnd(12)).join(''));
    console.log('-' .repeat(20 + rolesToTest.length * 12));

    for (const permission of permissionsToTest) {
      let row = permission.padEnd(20);
      
      for (const role of rolesToTest) {
        const token = this.tokens[role];
        if (!token) {
          row += 'N/A'.padEnd(12);
          continue;
        }

        try {
          const response = await axios.get(`${API_BASE_URL}/roles/check/${permission}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const hasPermission = response.data.data.hasPermission;
          row += (hasPermission ? '✅ YES' : '❌ NO').padEnd(12);
        } catch (error) {
          row += '❌ ERR'.padEnd(12);
        }
      }
      console.log(row);
    }
    console.log('');
  }

  private async testRoleManagement() {
    console.log('⚙️  Step 6: Testing Role Management...');
    console.log('-' .repeat(40));

    const adminToken = this.tokens['admin'];
    if (!adminToken) {
      console.log('❌ No admin token available for role management test');
      return;
    }

    // Test getting all permissions
    try {
      const response = await axios.get(`${API_BASE_URL}/roles/permissions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      console.log(`✅ Retrieved ${response.data.data.permissions.length} total permissions`);
      
      const grouped = response.data.data.groupedPermissions;
      console.log('\nPermission Categories:');
      Object.keys(grouped).forEach(resource => {
        console.log(`    └─ ${resource.toUpperCase()}: ${grouped[resource].length} permissions`);
      });
    } catch (error: any) {
      console.log(`❌ Failed to get permissions: ${error.response?.data?.error?.message || error.message}`);
    }

    // Test getting role-specific permissions
    const rolesToCheck = ['teacher', 'moderator', 'admin', 'super_admin'];
    
    console.log('\nRole-Specific Permissions:');
    for (const role of rolesToCheck) {
      try {
        const response = await axios.get(`${API_BASE_URL}/roles/${role}/permissions`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log(`✅ ${role.toUpperCase()}: ${response.data.data.permissions.length} permissions`);
      } catch (error: any) {
        console.log(`❌ ${role.toUpperCase()}: Failed to get permissions`);
      }
    }
    console.log('');
  }

  async waitForServer() {
    console.log('⏳ Checking if backend server is running...');
    
    for (let i = 0; i < 10; i++) {
      try {
        await axios.get(`${API_BASE_URL}`);
        console.log('✅ Backend server is running\n');
        return true;
      } catch (error) {
        if (i === 9) {
          console.log('❌ Backend server is not responding');
          console.log('Please start the backend server with: npm run dev:backend\n');
          return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return false;
  }
}

// Main execution
async function main() {
  const demo = new AdminFunctionalityDemo();
  
  // Check if server is running first
  if (await demo.waitForServer()) {
    await demo.runDemo();
  } else {
    console.log('\n🔧 To start the backend server:');
    console.log('   cd packages/backend');
    console.log('   npm run dev');
    console.log('\nThen run this demo again.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { AdminFunctionalityDemo };