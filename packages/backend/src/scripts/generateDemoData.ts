import { db } from '../database/connection';
import { authService } from '../services/authService';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

interface DemoUser {
  email: string;
  password: string;
  fullName: string;
  subjects: string[];
  gradeLevels: string[];
  schoolLocation: {
    district: string;
    region: string;
    schoolName: string;
  };
  yearsExperience: number;
  bio: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

interface DemoResource {
  title: string;
  description: string;
  type: 'video' | 'image' | 'document' | 'text';
  format: string;
  url: string;
  subjects: string[];
  gradeLevels: string[];
  tags: string[];
  isGovernmentContent: boolean;
}

interface DemoCommunity {
  name: string;
  description: string;
  type: 'subject' | 'region' | 'grade' | 'general';
  isPrivate: boolean;
  rules: string[];
}

class DemoDataGenerator {
  private database = db;

  constructor() {
    // Database connection is already initialized
  }

  async generateAll(): Promise<void> {
    try {
      logger.info('Starting demo data generation...');

      // Generate demo users
      const users = await this.generateDemoUsers();
      logger.info(`Generated ${users.length} demo users`);

      // Generate demo communities
      const communities = await this.generateDemoCommunities();
      logger.info(`Generated ${communities.length} demo communities`);

      // Generate demo resources (only if we have users)
      let resources = [];
      if (users.length > 0) {
        resources = await this.generateDemoResources(users);
        logger.info(`Generated ${resources.length} demo resources`);
      } else {
        logger.warn('No users created, skipping resource generation');
      }

      // Generate demo messages (only if we have users)
      if (users.length > 0) {
        await this.generateDemoMessages(users, communities);
        logger.info('Generated demo messages');
      } else {
        logger.warn('No users created, skipping message generation');
      }

      // Generate demo government content
      await this.generateGovernmentContent();
      logger.info('Generated demo government content');

      // Generate demo events (only if we have users)
      if (users.length > 0) {
        await this.generateDemoEvents(users);
        logger.info('Generated demo events');
      } else {
        logger.warn('No users created, skipping event generation');
      }

      // Generate demo badges and achievements (only if we have users)
      if (users.length > 0) {
        await this.generateGamificationData(users);
        logger.info('Generated gamification data');
      } else {
        logger.warn('No users created, skipping gamification data generation');
      }

      logger.info('Demo data generation completed successfully!');
    } catch (error) {
      logger.error('Failed to generate demo data:', error);
      throw error;
    }
  }

  private createDemoCredentials(name: string): any[] {
    return [
      {
        type: 'degree',
        institution: 'Makerere University',
        qualification: 'Bachelor of Education',
        issueDate: new Date('2015-06-15'),
        documentUrl: `/demo-credentials/${name.toLowerCase().replace(' ', '-')}-degree.pdf`
      },
      {
        type: 'teaching_license',
        institution: 'Ministry of Education and Sports',
        qualification: 'Teaching License',
        issueDate: new Date('2016-03-20'),
        documentUrl: `/demo-credentials/${name.toLowerCase().replace(' ', '-')}-license.pdf`
      }
    ];
  }

  private async generateDemoUsers(): Promise<any[]> {
    // For demo purposes, let's create users directly in the database to bypass validation issues
    const demoUsersData = [
      // Admin Users
      {
        email: 'admin@teacherhub.ug',
        password: 'AdminPass123!',
        fullName: 'Dr. Patricia Namugga',
        subjects: ['Administration', 'Education Management'],
        gradeLevels: ['All Levels'],
        schoolLocation: {
          district: 'Kampala',
          region: 'Central',
          schoolName: 'Ministry of Education and Sports'
        },
        yearsExperience: 15,
        bio: 'Senior Education Administrator with extensive experience in educational policy and teacher development. Responsible for platform oversight and quality assurance.',
        verificationStatus: 'verified',
        role: 'admin'
      },
      {
        email: 'superadmin@teacherhub.ug',
        password: 'SuperAdmin123!',
        fullName: 'Prof. Robert Kyeyune',
        subjects: ['System Administration', 'Educational Technology'],
        gradeLevels: ['All Levels'],
        schoolLocation: {
          district: 'Kampala',
          region: 'Central',
          schoolName: 'Teacher Hub Platform'
        },
        yearsExperience: 20,
        bio: 'Platform Super Administrator and Educational Technology Expert. Oversees all technical and administrative aspects of the Teacher Hub platform.',
        verificationStatus: 'verified',
        role: 'super_admin'
      },
      // Regular Teachers
      {
        email: 'sarah.nakato@example.com',
        password: 'Password123!',
        fullName: 'Sarah Nakato',
        subjects: ['Mathematics', 'Physics'],
        gradeLevels: ['S1', 'S2', 'S3', 'S4'],
        schoolLocation: {
          district: 'Kampala',
          region: 'Central',
          schoolName: 'Kampala Secondary School'
        },
        yearsExperience: 8,
        bio: 'Passionate mathematics and physics teacher with 8 years of experience. I love creating interactive learning experiences for my students.',
        verificationStatus: 'verified',
        role: 'teacher'
      },
      {
        email: 'james.okello@example.com',
        password: 'Password123!',
        fullName: 'James Okello',
        subjects: ['English', 'Literature'],
        gradeLevels: ['P5', 'P6', 'P7'],
        schoolLocation: {
          district: 'Gulu',
          region: 'Northern',
          schoolName: 'Gulu Primary School'
        },
        yearsExperience: 12,
        bio: 'Experienced English teacher focusing on literacy development and creative writing.',
        verificationStatus: 'verified',
        role: 'moderator'
      },
      {
        email: 'mary.achieng@example.com',
        password: 'Password123!',
        fullName: 'Mary Achieng',
        subjects: ['Biology', 'Chemistry'],
        gradeLevels: ['S4', 'S5', 'S6'],
        schoolLocation: {
          district: 'Mbale',
          region: 'Eastern',
          schoolName: 'Mbale High School'
        },
        yearsExperience: 6,
        bio: 'Science teacher passionate about environmental education and laboratory experiments.',
        verificationStatus: 'verified',
        role: 'teacher'
      },
      {
        email: 'david.musoke@example.com',
        password: 'Password123!',
        fullName: 'David Musoke',
        subjects: ['History', 'Geography'],
        gradeLevels: ['S1', 'S2', 'S3'],
        schoolLocation: {
          district: 'Mbarara',
          region: 'Western',
          schoolName: 'Mbarara Secondary School'
        },
        yearsExperience: 4,
        bio: 'Social studies teacher interested in Ugandan history and cultural preservation.',
        verificationStatus: 'pending',
        role: 'teacher'
      },
      {
        email: 'grace.namuli@example.com',
        password: 'Password123!',
        fullName: 'Grace Namuli',
        subjects: ['Mathematics', 'Computer Science'],
        gradeLevels: ['S3', 'S4', 'S5', 'S6'],
        schoolLocation: {
          district: 'Jinja',
          region: 'Eastern',
          schoolName: 'Jinja Technical School'
        },
        yearsExperience: 10,
        bio: 'Technology enthusiast teaching mathematics and computer science. Advocate for digital literacy.',
        verificationStatus: 'verified',
        role: 'teacher'
      }
    ];

    const createdUsers = [];
    for (const userData of demoUsersData) {
      try {
        // Create user directly in database for demo purposes
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        const result = await this.database.query(`
          INSERT INTO users (
            email, password_hash, full_name, subjects_json, grade_levels_json,
            school_location_json, years_experience, bio, verification_status, role
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          userData.email,
          hashedPassword,
          userData.fullName,
          JSON.stringify(userData.subjects),
          JSON.stringify(userData.gradeLevels),
          JSON.stringify(userData.schoolLocation),
          userData.yearsExperience,
          userData.bio,
          userData.verificationStatus,
          userData.role || 'teacher'
        ]);
        
        createdUsers.push(result.rows[0]);
      } catch (error) {
        logger.warn(`Failed to create user ${userData.email}:`, error);
      }
    }

    return createdUsers;
  }

  private async generateDemoCommunities(): Promise<any[]> {
    const demoCommunities: DemoCommunity[] = [
      {
        name: 'Mathematics Teachers Uganda',
        description: 'A community for mathematics teachers to share resources, teaching methods, and collaborate on curriculum development.',
        type: 'subject',
        isPrivate: false,
        rules: [
          'Be respectful to all members',
          'Share relevant mathematics teaching resources',
          'No spam or promotional content',
          'Help fellow teachers with questions'
        ]
      },
      {
        name: 'Northern Region Teachers',
        description: 'Teachers from Northern Uganda sharing regional experiences and resources.',
        type: 'region',
        isPrivate: false,
        rules: [
          'Focus on Northern Uganda educational challenges',
          'Share local teaching resources',
          'Support each other professionally'
        ]
      },
      {
        name: 'Primary School Educators',
        description: 'Community for primary school teachers (P1-P7) to collaborate and share age-appropriate resources.',
        type: 'grade',
        isPrivate: false,
        rules: [
          'Share primary-level appropriate content',
          'Focus on foundational learning',
          'Collaborate on child-friendly teaching methods'
        ]
      },
      {
        name: 'Science Teachers Network',
        description: 'Physics, Chemistry, and Biology teachers collaborating on practical experiments and STEM education.',
        type: 'subject',
        isPrivate: false,
        rules: [
          'Share science experiments and practicals',
          'Discuss STEM education approaches',
          'Safety first in all shared experiments'
        ]
      },
      {
        name: 'Teacher Professional Development',
        description: 'General community for all teachers focusing on professional growth and career development.',
        type: 'general',
        isPrivate: false,
        rules: [
          'Focus on professional development',
          'Share career advancement tips',
          'Support continuing education'
        ]
      }
    ];

    const createdCommunities = [];
    for (const communityData of demoCommunities) {
      try {
        const result = await this.database.query(`
          INSERT INTO communities (name, description, type, is_private, rules_json)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          communityData.name,
          communityData.description,
          communityData.type,
          communityData.isPrivate,
          JSON.stringify(communityData.rules)
        ]);
        
        createdCommunities.push(result.rows[0]);
      } catch (error) {
        logger.warn(`Failed to create community ${communityData.name}:`, error);
      }
    }

    return createdCommunities;
  }

  private async generateDemoResources(users: any[]): Promise<any[]> {
    const demoResources: DemoResource[] = [
      {
        title: 'Quadratic Equations Worksheet',
        description: 'Comprehensive worksheet covering quadratic equations with step-by-step solutions for S3 students.',
        type: 'document',
        format: 'PDF',
        url: '/demo-resources/quadratic-equations.pdf',
        subjects: ['Mathematics'],
        gradeLevels: ['S3'],
        tags: ['algebra', 'equations', 'worksheet'],
        isGovernmentContent: false
      },
      {
        title: 'Photosynthesis Experiment Guide',
        description: 'Laboratory guide for demonstrating photosynthesis using simple materials available in Ugandan schools.',
        type: 'document',
        format: 'PDF',
        url: '/demo-resources/photosynthesis-lab.pdf',
        subjects: ['Biology'],
        gradeLevels: ['S2', 'S3'],
        tags: ['biology', 'experiment', 'photosynthesis'],
        isGovernmentContent: false
      },
      {
        title: 'Uganda Independence History Lesson',
        description: 'Interactive lesson plan covering Uganda\'s path to independence with local historical context.',
        type: 'text',
        format: 'HTML',
        url: '/demo-resources/uganda-independence.html',
        subjects: ['History'],
        gradeLevels: ['S1', 'S2'],
        tags: ['history', 'uganda', 'independence'],
        isGovernmentContent: false
      },
      {
        title: 'English Grammar Exercises',
        description: 'Collection of grammar exercises focusing on common challenges for Ugandan English learners.',
        type: 'document',
        format: 'DOCX',
        url: '/demo-resources/english-grammar.docx',
        subjects: ['English'],
        gradeLevels: ['P6', 'P7', 'S1'],
        tags: ['grammar', 'english', 'exercises'],
        isGovernmentContent: false
      },
      {
        title: 'Basic Computer Skills Tutorial',
        description: 'Step-by-step guide for teaching basic computer skills in schools with limited technology.',
        type: 'video',
        format: 'MP4',
        url: '/demo-resources/computer-basics.mp4',
        subjects: ['Computer Science'],
        gradeLevels: ['S1', 'S2', 'S3'],
        tags: ['computer', 'technology', 'basics'],
        isGovernmentContent: false
      }
    ];

    const createdResources = [];
    for (let i = 0; i < demoResources.length; i++) {
      const resourceData = demoResources[i];
      const author = users[i % users.length]; // Cycle through users
      
      try {
        const result = await this.database.query(`
          INSERT INTO resources (
            title, description, type, format, url, subjects_json, 
            grade_levels_json, tags_json, author_id, is_government_content,
            verification_status, rating, download_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          resourceData.title,
          resourceData.description,
          resourceData.type,
          resourceData.format,
          resourceData.url,
          JSON.stringify(resourceData.subjects),
          JSON.stringify(resourceData.gradeLevels),
          JSON.stringify(resourceData.tags),
          author.id,
          resourceData.isGovernmentContent,
          'verified',
          Math.random() * 2 + 3, // Random rating between 3-5
          Math.floor(Math.random() * 100) + 10 // Random download count
        ]);
        
        createdResources.push(result.rows[0]);
      } catch (error) {
        logger.warn(`Failed to create resource ${resourceData.title}:`, error);
      }
    }

    return createdResources;
  }

  private async generateDemoMessages(users: any[], communities: any[]): Promise<void> {
    // Generate some direct messages between users
    for (let i = 0; i < Math.min(users.length - 1, 5); i++) {
      const sender = users[i];
      const recipient = users[i + 1];
      
      try {
        await this.database.query(`
          INSERT INTO messages (sender_id, recipient_id, content, type, timestamp)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          sender.id,
          recipient.id,
          `Hello ${recipient.full_name}! I saw your profile and noticed we both teach similar subjects. Would love to collaborate on some resources.`,
          'text',
          new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
        ]);
      } catch (error) {
        logger.warn('Failed to create direct message:', error);
      }
    }

    // Generate some group messages
    for (const community of communities.slice(0, 3)) {
      for (let i = 0; i < 3; i++) {
        const sender = users[i % users.length];
        
        try {
          await this.database.query(`
            INSERT INTO messages (sender_id, group_id, content, type, timestamp)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            sender.id,
            community.id,
            `Welcome everyone to ${community.name}! Looking forward to sharing resources and collaborating with fellow educators.`,
            'text',
            new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) // Random time in last 3 days
          ]);
        } catch (error) {
          logger.warn('Failed to create group message:', error);
        }
      }
    }
  }

  private async generateGovernmentContent(): Promise<void> {
    const governmentContent = [
      {
        source: 'MOE',
        contentType: 'curriculum',
        title: 'Updated Mathematics Curriculum Guidelines 2024',
        content: 'The Ministry of Education announces updated mathematics curriculum guidelines for secondary schools, emphasizing practical applications and problem-solving skills.',
        targetAudience: ['Mathematics Teachers', 'Secondary School Teachers'],
        priority: 'high',
        effectiveDate: new Date(),
        digitalSignature: 'MOE_SIGNATURE_2024_001',
        verificationHash: 'hash_' + Math.random().toString(36).substring(7)
      },
      {
        source: 'UNEB',
        contentType: 'announcement',
        title: 'UNEB Examination Schedule 2024',
        content: 'Uganda National Examinations Board releases the official examination schedule for PLE, UCE, and UACE examinations for 2024.',
        targetAudience: ['All Teachers', 'School Administrators'],
        priority: 'high',
        effectiveDate: new Date(),
        digitalSignature: 'UNEB_SIGNATURE_2024_001',
        verificationHash: 'hash_' + Math.random().toString(36).substring(7)
      },
      {
        source: 'NCDC',
        contentType: 'resource',
        title: 'New Science Practical Guidelines',
        content: 'National Curriculum Development Centre provides updated guidelines for conducting science practicals in resource-limited environments.',
        targetAudience: ['Science Teachers', 'Laboratory Technicians'],
        priority: 'medium',
        effectiveDate: new Date(),
        digitalSignature: 'NCDC_SIGNATURE_2024_001',
        verificationHash: 'hash_' + Math.random().toString(36).substring(7)
      }
    ];

    for (const content of governmentContent) {
      try {
        await this.database.query(`
          INSERT INTO government_content (
            source, content_type, title, content, target_audience_json,
            priority, effective_date, digital_signature, verification_hash
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          content.source,
          content.contentType,
          content.title,
          content.content,
          JSON.stringify(content.targetAudience),
          content.priority,
          content.effectiveDate,
          content.digitalSignature,
          content.verificationHash
        ]);
      } catch (error) {
        logger.warn(`Failed to create government content ${content.title}:`, error);
      }
    }
  }

  private async generateDemoEvents(users: any[]): Promise<void> {
    const demoEvents = [
      {
        title: 'Mathematics Teaching Workshop',
        description: 'Interactive workshop on modern mathematics teaching methods and digital tools.',
        type: 'workshop',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        location: 'Kampala Teachers Center',
        isVirtual: false,
        maxAttendees: 50,
        organizerId: users[0].id,
        subjects: ['Mathematics'],
        targetAudience: ['Mathematics Teachers', 'Secondary School Teachers']
      },
      {
        title: 'Digital Literacy for Educators',
        description: 'Online training session on integrating technology into classroom teaching.',
        type: 'webinar',
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        location: null as string | null,
        isVirtual: true,
        virtualLink: 'https://zoom.us/j/demo-session',
        maxAttendees: 100,
        organizerId: users[1].id,
        subjects: ['Computer Science', 'General'],
        targetAudience: ['All Teachers']
      },
      {
        title: 'Science Fair Planning Meeting',
        description: 'Planning meeting for the annual regional science fair. All science teachers welcome.',
        type: 'meeting',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        location: 'Mbale High School',
        isVirtual: false,
        maxAttendees: 25,
        organizerId: users[2].id,
        subjects: ['Biology', 'Chemistry', 'Physics'],
        targetAudience: ['Science Teachers']
      }
    ];

    for (const eventData of demoEvents) {
      try {
        await this.database.query(`
          INSERT INTO events (
            title, description, type, start_date, end_date, location,
            is_virtual, virtual_link, max_attendees, organizer_id,
            subjects, target_audience, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          eventData.title,
          eventData.description,
          eventData.type,
          eventData.startDate,
          eventData.endDate,
          eventData.location,
          eventData.isVirtual,
          eventData.virtualLink || null,
          eventData.maxAttendees,
          eventData.organizerId,
          eventData.subjects,
          eventData.targetAudience,
          'published'
        ]);
      } catch (error) {
        logger.warn(`Failed to create event ${eventData.title}:`, error);
      }
    }
  }

  private async generateGamificationData(users: any[]): Promise<void> {
    // Create user stats for each user
    for (const user of users) {
      try {
        await this.database.query(`
          INSERT INTO user_stats (
            user_id, total_points, weekly_points, monthly_points,
            resource_uploads, helpful_ratings, community_posts,
            login_streak
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          user.id,
          Math.floor(Math.random() * 500) + 100, // Random total points
          Math.floor(Math.random() * 50) + 10,   // Random weekly points
          Math.floor(Math.random() * 200) + 50,  // Random monthly points
          Math.floor(Math.random() * 10) + 1,    // Random resource uploads
          Math.floor(Math.random() * 20) + 5,    // Random helpful ratings
          Math.floor(Math.random() * 15) + 3,    // Random community posts
          Math.floor(Math.random() * 7) + 1      // Random login streak
        ]);

        // Award some badges to users
        const badges = await this.database.query('SELECT id FROM badges LIMIT 3');
        for (const badge of badges.rows) {
          if (Math.random() > 0.5) { // 50% chance to award each badge
            try {
              await this.database.query(`
                INSERT INTO user_badges (user_id, badge_id, earned_at)
                VALUES ($1, $2, $3)
              `, [
                user.id,
                badge.id,
                new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random time in last month
              ]);
            } catch (error) {
              // Ignore duplicate badge errors
            }
          }
        }

        // Create some achievements
        const achievements = [
          'First Resource Upload',
          'Community Contributor',
          'Helpful Teacher'
        ];

        for (const achievement of achievements) {
          if (Math.random() > 0.6) { // 40% chance for each achievement
            try {
              await this.database.query(`
                INSERT INTO achievements (user_id, type, title, description, points)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                user.id,
                'milestone_reached',
                achievement,
                `Congratulations on reaching the ${achievement} milestone!`,
                Math.floor(Math.random() * 50) + 10
              ]);
            } catch (error) {
              logger.warn('Failed to create achievement:', error);
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to create user stats for ${user.full_name}:`, error);
      }
    }
  }

  async cleanup(): Promise<void> {
    // Database connection is managed globally, no need to close
  }
}

// Main execution
async function main() {
  const generator = new DemoDataGenerator();
  
  try {
    await generator.generateAll();
    console.log('✅ Demo data generation completed successfully!');
  } catch (error) {
    console.error('❌ Demo data generation failed:', error);
    process.exit(1);
  } finally {
    await generator.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DemoDataGenerator };