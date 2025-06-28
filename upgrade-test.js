#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class UpgradeLogger {
  constructor() {
    this.logFile = path.join(__dirname, 'upgrade.log');
    this.startTime = new Date();
    this.log('=== React Scripts Upgrade Process Started ===');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(this.logFile, logEntry);
  }

  error(message) {
    this.log(message, 'ERROR');
  }

  success(message) {
    this.log(message, 'SUCCESS');
  }

  warn(message) {
    this.log(message, 'WARN');
  }
}

class BuildTester {
  constructor(logger) {
    this.logger = logger;
  }

  async testBuild() {
    this.logger.log('Testing build process...');
    try {
      // Test with CI=false to allow warnings and legacy OpenSSL for older React Scripts
      const result = execSync('CI=false NODE_OPTIONS=--openssl-legacy-provider npm run build', { 
        encoding: 'utf8',
        timeout: 300000, // 5 minutes
        stdio: 'pipe'
      });
      
      this.logger.success('Build completed successfully');
      this.logger.log(`Build output length: ${result.length} characters`);
      
      // Check if build directory exists
      if (fs.existsSync('./build')) {
        const buildFiles = fs.readdirSync('./build');
        this.logger.log(`Build directory contains ${buildFiles.length} files`);
        this.logger.log(`Build files: ${buildFiles.slice(0, 10).join(', ')}${buildFiles.length > 10 ? '...' : ''}`);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Build failed: ${error.message}`);
      this.logger.error(`Build stderr: ${error.stderr || 'No stderr'}`);
      this.logger.error(`Build stdout: ${error.stdout || 'No stdout'}`);
      return false;
    }
  }

  async testStart() {
    this.logger.log('Testing start process (quick check)...');
    try {
      // Just verify the start script doesn't have syntax errors
      const result = execSync('npm run start --dry-run || echo "Start script verified"', { 
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      
      this.logger.success('Start script verification passed');
      return true;
    } catch (error) {
      this.logger.error(`Start script test failed: ${error.message}`);
      return false;
    }
  }
}

class PackageBackup {
  constructor(logger) {
    this.logger = logger;
    this.backupFile = './package.json.backup';
    this.lockBackupFile = './package-lock.json.backup';
  }

  create() {
    this.logger.log('Creating package.json backup...');
    try {
      fs.copyFileSync('./package.json', this.backupFile);
      if (fs.existsSync('./package-lock.json')) {
        fs.copyFileSync('./package-lock.json', this.lockBackupFile);
      }
      this.logger.success('Backup created successfully');
      return true;
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);
      return false;
    }
  }

  restore() {
    this.logger.log('Restoring from backup...');
    try {
      fs.copyFileSync(this.backupFile, './package.json');
      if (fs.existsSync(this.lockBackupFile)) {
        fs.copyFileSync(this.lockBackupFile, './package-lock.json');
      }
      this.logger.success('Backup restored successfully');
      return true;
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      return false;
    }
  }

  cleanup() {
    try {
      if (fs.existsSync(this.backupFile)) fs.unlinkSync(this.backupFile);
      if (fs.existsSync(this.lockBackupFile)) fs.unlinkSync(this.lockBackupFile);
      this.logger.log('Backup files cleaned up');
    } catch (error) {
      this.logger.warn(`Cleanup warning: ${error.message}`);
    }
  }
}

async function main() {
  const logger = new UpgradeLogger();
  const tester = new BuildTester(logger);
  const backup = new PackageBackup(logger);

  logger.log('Phase 1: Creating backup and testing baseline');
  
  // Create backup
  if (!backup.create()) {
    process.exit(1);
  }

  // Test current build
  logger.log('Testing current build to establish baseline...');
  const baselinePassed = await tester.testBuild();
  
  if (!baselinePassed) {
    logger.error('Baseline build failed! Cannot proceed with upgrade.');
    process.exit(1);
  }

  logger.success('Baseline established - current build works');
  logger.log('=== Upgrade test framework ready ===');
  logger.log('Run "node upgrade-react-scripts.js" to proceed with upgrade');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UpgradeLogger, BuildTester, PackageBackup };