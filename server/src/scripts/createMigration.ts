#!/usr/bin/env node

import { execSync } from 'child_process';
import { logger } from '../utils/logger';

const createInitialMigration = async () => {
  try {
    logger.info('Creating initial database migration...');
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    // Create migration
    execSync('npx prisma migrate dev --name init --create-only', { stdio: 'inherit' });
    
    logger.info('Migration created successfully!');
    logger.info('Run "npx prisma migrate deploy" to apply the migration');
    
  } catch (error) {
    logger.error('Failed to create migration:', error);
    process.exit(1);
  }
};

createInitialMigration();