#!/usr/bin/env ts-node

import { migrator } from '../database/migrator';
import { createLogger } from '../utils/logger';

const logger = createLogger('migrate-script');

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
      case undefined:
        await migrator.migrate();
        break;
      
      case 'down':
        await migrator.rollback();
        break;
      
      case 'status':
        const status = await migrator.getStatus();
        console.log('\n=== Migration Status ===');
        console.log(`Total migrations: ${status.total}`);
        console.log(`Executed: ${status.executed.length}`);
        console.log(`Pending: ${status.pending.length}`);
        
        if (status.executed.length > 0) {
          console.log('\nExecuted migrations:');
          status.executed.forEach(migration => console.log(`  ✓ ${migration}`));
        }
        
        if (status.pending.length > 0) {
          console.log('\nPending migrations:');
          status.pending.forEach(migration => console.log(`  ○ ${migration}`));
        }
        break;
      
      case 'reset':
        if (process.env.NODE_ENV === 'production') {
          console.error('ERROR: Database reset is not allowed in production');
          process.exit(1);
        }
        
        console.log('WARNING: This will destroy all data in the database!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        await migrator.reset();
        break;
      
      default:
        console.log('Usage: npm run migrate [command]');
        console.log('Commands:');
        console.log('  up (default) - Run pending migrations');
        console.log('  down         - Rollback last migration');
        console.log('  status       - Show migration status');
        console.log('  reset        - Reset database (development only)');
        process.exit(1);
    }

    console.log('Migration command completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration command failed', error);
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nMigration cancelled by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nMigration terminated');
  process.exit(1);
});

main();