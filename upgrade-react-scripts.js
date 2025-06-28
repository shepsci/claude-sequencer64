#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const { UpgradeLogger, BuildTester, PackageBackup } = require('./upgrade-test.js');

class ReactScriptsUpgrader {
  constructor() {
    this.logger = new UpgradeLogger();
    this.tester = new BuildTester(this.logger);
    this.backup = new PackageBackup(this.logger);
    this.upgradePath = [
      { version: '5.0.0', description: 'React Scripts 5.0.0 - Major version with Webpack 5' },
      { version: '5.0.1', description: 'React Scripts 5.0.1 - Latest stable in 5.x' }
    ];
  }

  async updateHomepageUrl() {
    this.logger.log('Updating homepage URL for new repository name...');
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      packageJson.homepage = 'https://shepsci.github.io/claude-sequencer64';
      fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
      this.logger.success('Homepage URL updated to claude-sequencer64');
    } catch (error) {
      this.logger.error(`Failed to update homepage: ${error.message}`);
    }
  }

  async installDependencies() {
    this.logger.log('Installing dependencies with legacy peer deps...');
    try {
      execSync('npm install --legacy-peer-deps', { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 180000 // 3 minutes
      });
      this.logger.success('Dependencies installed successfully');
      return true;
    } catch (error) {
      this.logger.error(`Dependency installation failed: ${error.message}`);
      return false;
    }
  }

  async upgradeToVersion(targetVersion, description) {
    this.logger.log(`Starting upgrade to ${description}`);
    
    try {
      // Clean node_modules and package-lock for fresh install
      this.logger.log('Cleaning dependencies for fresh install...');
      try {
        execSync('rm -rf node_modules package-lock.json', { stdio: 'pipe' });
      } catch (error) {
        this.logger.warn('Could not clean dependencies');
      }
      
      // Update react-scripts
      this.logger.log(`Installing react-scripts@${targetVersion}...`);
      execSync(`npm install react-scripts@${targetVersion} --legacy-peer-deps`, { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000
      });
      
      // Install all dependencies
      this.logger.log('Installing all dependencies...');
      execSync('npm install --legacy-peer-deps', { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000
      });
      
      this.logger.success(`React Scripts ${targetVersion} installed`);
      
      // Test the build (newer React Scripts won't need legacy OpenSSL)
      this.logger.log('Testing build after upgrade...');
      
      // Try without legacy provider first (for newer versions)
      let buildPassed = false;
      try {
        const result = execSync('CI=false npm run build', { 
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 300000
        });
        buildPassed = true;
        this.logger.success('Build successful without legacy OpenSSL provider');
      } catch (error) {
        // If that fails, try with legacy provider
        this.logger.log('Build failed without legacy provider, trying with legacy provider...');
        buildPassed = await this.tester.testBuild();
      }
      
      if (!buildPassed) {
        this.logger.error(`Build failed with react-scripts@${targetVersion}`);
        return false;
      }
      
      this.logger.success(`Build successful with react-scripts@${targetVersion}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Upgrade to ${targetVersion} failed: ${error.message}`);
      this.logger.error(`Error details: ${error.stderr || error.stdout || 'No additional details'}`);
      return false;
    }
  }

  async handleCompatibilityIssues() {
    this.logger.log('Checking for compatibility issues...');
    
    // Update package.json browserslist for newer react-scripts
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      // Update browserslist for React Scripts 5+
      packageJson.browserslist = {
        "production": [
          ">0.2%",
          "not dead",
          "not op_mini all"
        ],
        "development": [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
      };
      
      fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
      this.logger.success('Updated browserslist for compatibility');
      
    } catch (error) {
      this.logger.warn(`Could not update browserslist: ${error.message}`);
    }
  }

  async updateWorkflowForNewVersion() {
    this.logger.log('Updating GitHub Actions workflow for newer Node/React Scripts...');
    
    try {
      const workflowPath = './.github/workflows/deploy.yml';
      if (fs.existsSync(workflowPath)) {
        let workflow = fs.readFileSync(workflowPath, 'utf8');
        
        // Update Node version to 18 for React Scripts 5+
        workflow = workflow.replace(/node-version: ['"]16['"]/, "node-version: '18'");
        
        // Remove legacy OpenSSL provider since newer versions don't need it
        workflow = workflow.replace(/export NODE_OPTIONS=--openssl-legacy-provider\s*\n\s*/, '');
        
        // Update homepage in build output path
        workflow = workflow.replace(/claude-sequencer/g, 'claude-sequencer64');
        
        fs.writeFileSync(workflowPath, workflow);
        this.logger.success('GitHub Actions workflow updated');
      }
    } catch (error) {
      this.logger.warn(`Could not update workflow: ${error.message}`);
    }
  }

  async performUpgrade() {
    this.logger.log('=== Starting React Scripts Upgrade Process ===');
    this.logger.log('Note: Skipping baseline test since current build has Node.js compatibility issues');
    this.logger.log('Upgrading React Scripts will fix these issues');
    
    // Create backup
    if (!this.backup.create()) {
      this.logger.error('Failed to create backup - aborting');
      return false;
    }
    
    // Update homepage first
    await this.updateHomepageUrl();
    
    // Handle compatibility issues
    await this.handleCompatibilityIssues();
    
    // Try each upgrade step
    for (const upgrade of this.upgradePath) {
      this.logger.log(`\n--- Attempting upgrade to ${upgrade.description} ---`);
      
      const success = await this.upgradeToVersion(upgrade.version, upgrade.description);
      
      if (success) {
        this.logger.success(`✅ Successfully upgraded to React Scripts ${upgrade.version}`);
        
        // Update workflow for the new version
        await this.updateWorkflowForNewVersion();
        
        // Final dependency installation
        await this.installDependencies();
        
        // Final build test
        this.logger.log('Performing final build test...');
        const finalTest = await this.tester.testBuild();
        
        if (finalTest) {
          this.logger.success('🎉 Upgrade completed successfully!');
          this.logger.log(`Final version: React Scripts ${upgrade.version}`);
          return true;
        } else {
          this.logger.error('Final build test failed');
          return false;
        }
      } else {
        this.logger.warn(`❌ Upgrade to ${upgrade.version} failed, trying fallback...`);
        
        // Try to restore and continue with next version
        this.backup.restore();
        await this.installDependencies();
        continue;
      }
    }
    
    this.logger.error('All upgrade attempts failed');
    return false;
  }
}

async function main() {
  const upgrader = new ReactScriptsUpgrader();
  
  try {
    const success = await upgrader.performUpgrade();
    
    if (success) {
      upgrader.logger.success('🚀 React Scripts upgrade completed successfully!');
      upgrader.logger.log('You can now commit the changes and deploy');
      process.exit(0);
    } else {
      upgrader.logger.error('💥 Upgrade failed - restoring backup');
      upgrader.backup.restore();
      process.exit(1);
    }
    
  } catch (error) {
    upgrader.logger.error(`Unexpected error: ${error.message}`);
    upgrader.backup.restore();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}