import { db } from '../database/connection';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

async function updateUsersWithRoles() {
  try {
    logger.info('Starting admin user setup...');

    // Update existing users with admin roles
    await db.query(`UPDATE users SET role = 'admin' WHERE email = 'sarah.nakato@example.com'`);
    await db.query(`UPDATE users SET role = 'moderator' WHERE email = 'james.okello@example.com'`);
    logger.info('Updated existing users with admin roles');
    
    // Create admin users
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    const superAdminPassword = await bcrypt.hash('SuperAdmin123!', 12);
    
    try {
      await db.query(`
        INSERT INTO users (
          email, password_hash, full_name, subjects_json, grade_levels_json,
          school_location_json, years_experience, bio, verification_status, role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'admin@teacherhub.ug',
        adminPassword,
        'Dr. Patricia Namugga',
        JSON.stringify(['Administration', 'Education Management']),
        JSON.stringify(['All Levels']),
        JSON.stringify({
          district: 'Kampala',
          region: 'Central',
          schoolName: 'Ministry of Education and Sports'
        }),
        15,
        'Senior Education Administrator with extensive experience in educational policy and teacher development. Responsible for platform oversight and quality assurance.',
        'verified',
        'admin'
      ]);
      logger.info('Created admin user: admin@teacherhub.ug');
    } catch (e: any) {
      if (e.code === '23505') {
        logger.info('Admin user already exists');
      } else {
        throw e;
      }
    }
    
    try {
      await db.query(`
        INSERT INTO users (
          email, password_hash, full_name, subjects_json, grade_levels_json,
          school_location_json, years_experience, bio, verification_status, role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'superadmin@teacherhub.ug',
        superAdminPassword,
        'Prof. Robert Kyeyune',
        JSON.stringify(['System Administration', 'Educational Technology']),
        JSON.stringify(['All Levels']),
        JSON.stringify({
          district: 'Kampala',
          region: 'Central',
          schoolName: 'Teacher Hub Platform'
        }),
        20,
        'Platform Super Administrator and Educational Technology Expert. Oversees all technical and administrative aspects of the Teacher Hub platform.',
        'verified',
        'super_admin'
      ]);
      logger.info('Created super admin user: superadmin@teacherhub.ug');
    } catch (e: any) {
      if (e.code === '23505') {
        logger.info('Super admin user already exists');
      } else {
        throw e;
      }
    }
    
    // List all admin users
    const adminUsers = await db.query(`
      SELECT email, full_name, role, verification_status 
      FROM users 
      WHERE role IN ('admin', 'super_admin', 'moderator')
      ORDER BY 
        CASE role 
          WHEN 'super_admin' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'moderator' THEN 3 
          ELSE 4 
        END,
        full_name
    `);
    
    console.log('\n✅ Admin Users Setup Complete!');
    console.log('\n📋 Admin Users List:');
    console.log('==========================================');
    adminUsers.rows.forEach((user: any) => {
      console.log(`${user.role.toUpperCase().padEnd(12)} | ${user.email.padEnd(25)} | ${user.full_name}`);
    });
    console.log('==========================================');
    
    console.log('\n🔑 Login Credentials:');
    console.log('Super Admin: superadmin@teacherhub.ug / SuperAdmin123!');
    console.log('Admin:       admin@teacherhub.ug / AdminPass123!');
    console.log('Moderator:   james.okello@example.com / Password123!');
    console.log('Teacher:     sarah.nakato@example.com / Password123! (now has admin role)');
    
  } catch (error) {
    logger.error('Error updating users:', error);
    console.error('❌ Error updating users:', error);
  }
}

// Run if called directly
if (require.main === module) {
  updateUsersWithRoles().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { updateUsersWithRoles };