#!/usr/bin/env node

/**
 * TimeTask System Health Check Script
 * Checks all dependencies and system requirements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper functions
const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
};

class HealthCheck {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // Check Node.js version
  checkNodeVersion() {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
      
      if (majorVersion >= 18) {
        log.success(`Node.js version ${nodeVersion} ✓`);
      } else {
        this.errors.push(`Node.js version 18+ required (current: ${nodeVersion})`);
        log.error(`Node.js version 18+ required (current: ${nodeVersion})`);
      }
    } catch (error) {
      this.errors.push('Failed to check Node.js version');
      log.error('Failed to check Node.js version');
    }
  }

  // Check npm version
  checkNpmVersion() {
    try {
      const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(npmVersion.split('.')[0]);
      
      if (majorVersion >= 9) {
        log.success(`npm version ${npmVersion} ✓`);
      } else {
        this.warnings.push(`npm version 9+ recommended (current: ${npmVersion})`);
        log.warning(`npm version 9+ recommended (current: ${npmVersion})`);
      }
    } catch (error) {
      this.errors.push('npm not found');
      log.error('npm not found');
    }
  }

  // Check if PostgreSQL is accessible
  checkPostgreSQL() {
    try {
      execSync('psql --version', { encoding: 'utf8' });
      log.success('PostgreSQL client found ✓');
    } catch (error) {
      this.warnings.push('PostgreSQL client not found (psql command)');
      log.warning('PostgreSQL client not found - make sure PostgreSQL is installed');
    }
  }

  // Check package.json files
  checkPackageFiles() {
    const packageFiles = [
      'package.json',
      'server/package.json',
      'client/package.json'
    ];

    packageFiles.forEach(file => {
      if (fs.existsSync(file)) {
        log.success(`Found ${file} ✓`);
      } else {
        this.errors.push(`Missing ${file}`);
        log.error(`Missing ${file}`);
      }
    });
  }

  // Check environment files
  checkEnvFiles() {
    const envFiles = [
      { path: 'server/.env', required: false },
      { path: 'client/.env', required: false },
      { path: 'server/.env.example', required: true },
      { path: 'client/.env.example', required: true }
    ];

    envFiles.forEach(file => {
      if (fs.existsSync(file.path)) {
        log.success(`Found ${file.path} ✓`);
      } else if (file.required) {
        this.errors.push(`Missing ${file.path}`);
        log.error(`Missing ${file.path}`);
      } else {
        this.warnings.push(`${file.path} not configured (copy from .env.example)`);
        log.warning(`${file.path} not configured (copy from .env.example)`);
      }
    });

    // Check DATABASE_URL if .env exists
    const serverEnvPath = 'server/.env';
    if (fs.existsSync(serverEnvPath)) {
      const envContent = fs.readFileSync(serverEnvPath, 'utf8');
      if (envContent.includes('DATABASE_URL="postgresql://username:password')) {
        this.warnings.push('DATABASE_URL not configured in server/.env');
        log.warning('DATABASE_URL appears to be using default values');
      }
    }
  }

  // Check node_modules
  checkDependencies() {
    const moduleDirs = [
      'node_modules',
      'server/node_modules',
      'client/node_modules'
    ];

    moduleDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        log.success(`Found ${dir} ✓`);
      } else {
        this.warnings.push(`Dependencies not installed in ${dir}`);
        log.warning(`Dependencies not installed in ${dir} - run npm install`);
      }
    });
  }

  // Check Prisma setup
  checkPrisma() {
    const prismaSchema = 'server/prisma/schema.prisma';
    const prismaClient = 'server/node_modules/@prisma/client';

    if (fs.existsSync(prismaSchema)) {
      log.success('Prisma schema found ✓');
    } else {
      this.errors.push('Prisma schema not found');
      log.error('Prisma schema not found');
    }

    if (fs.existsSync(prismaClient)) {
      log.success('Prisma client generated ✓');
    } else {
      this.warnings.push('Prisma client not generated - run: cd server && npx prisma generate');
      log.warning('Prisma client not generated');
    }
  }

  // Check required directories
  checkDirectories() {
    const requiredDirs = [
      'server/src',
      'client/src',
      'server/uploads',
      'server/logs'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        log.success(`Directory ${dir} exists ✓`);
      } else {
        if (dir.includes('uploads') || dir.includes('logs')) {
          // Create these directories
          fs.mkdirSync(dir, { recursive: true });
          log.info(`Created directory: ${dir}`);
        } else {
          this.errors.push(`Missing directory: ${dir}`);
          log.error(`Missing directory: ${dir}`);
        }
      }
    });
  }

  // Check ports availability
  async checkPorts() {
    const ports = [
      { port: 3000, service: 'Backend API' },
      { port: 5173, service: 'Frontend Dev Server' },
      { port: 5432, service: 'PostgreSQL' }
    ];

    const net = require('net');
    
    for (const { port, service } of ports) {
      await new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            if (port === 5432) {
              // PostgreSQL should be running
              log.success(`Port ${port} (${service}) is in use - expected ✓`);
            } else {
              this.warnings.push(`Port ${port} (${service}) is already in use`);
              log.warning(`Port ${port} (${service}) is already in use`);
            }
          }
          resolve();
        });
        
        server.once('listening', () => {
          server.close();
          if (port === 5432) {
            this.warnings.push(`Port ${port} (${service}) is not in use - PostgreSQL might not be running`);
            log.warning(`Port ${port} (${service}) is available - PostgreSQL might not be running`);
          } else {
            log.success(`Port ${port} (${service}) is available ✓`);
          }
          resolve();
        });
        
        server.listen(port, '127.0.0.1');
      });
    }
  }

  // Run all checks
  async run() {
    console.log('');
    console.log('====================================');
    console.log('   TimeTask System Health Check');
    console.log('====================================');
    console.log('');

    log.info('Checking system requirements...\n');

    this.checkNodeVersion();
    this.checkNpmVersion();
    this.checkPostgreSQL();
    
    console.log('');
    log.info('Checking project structure...\n');
    
    this.checkPackageFiles();
    this.checkEnvFiles();
    this.checkDependencies();
    this.checkPrisma();
    this.checkDirectories();
    
    console.log('');
    log.info('Checking network ports...\n');
    
    await this.checkPorts();

    // Summary
    console.log('');
    console.log('====================================');
    console.log('   Health Check Summary');
    console.log('====================================');
    console.log('');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      log.success('All checks passed! System is ready.');
    } else {
      if (this.errors.length > 0) {
        console.log(`${colors.red}Errors (${this.errors.length}):${colors.reset}`);
        this.errors.forEach(err => console.log(`  - ${err}`));
        console.log('');
      }
      
      if (this.warnings.length > 0) {
        console.log(`${colors.yellow}Warnings (${this.warnings.length}):${colors.reset}`);
        this.warnings.forEach(warn => console.log(`  - ${warn}`));
        console.log('');
      }
    }

    // Recommendations
    if (this.errors.length > 0 || this.warnings.length > 0) {
      console.log('Recommended actions:');
      
      if (!fs.existsSync('server/.env')) {
        console.log('1. Copy environment file: cp server/.env.example server/.env');
        console.log('2. Configure DATABASE_URL in server/.env');
      }
      
      if (!fs.existsSync('server/node_modules')) {
        console.log('3. Install dependencies: npm run setup');
      }
      
      if (!fs.existsSync('server/node_modules/@prisma/client')) {
        console.log('4. Generate Prisma client: cd server && npx prisma generate');
      }
      
      console.log('');
    }

    // Exit with appropriate code
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Run health check
const healthCheck = new HealthCheck();
healthCheck.run().catch(error => {
  console.error('Health check failed:', error);
  process.exit(1);
});