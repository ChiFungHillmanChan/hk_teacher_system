#!/usr/bin/env node

/**
 * School Schema Migration Script
 *
 * This script migrates the existing school schema to the new structure:
 * - Removes deprecated fields: website, nameCh
 * - Adds new field: contactPerson
 * - Restructures schema to match new form sections
 * - Safely handles data migration with backup functionality
 *
 * Usage: node scripts/migrate-school-schema.js [--dry-run] [--backup]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup') || !isDryRun;

class SchoolMigration {
  constructor() {
    this.backupPath = null;
    this.migrationStats = {
      totalSchools: 0,
      migrated: 0,
      errors: 0,
      skipped: 0,
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      log('✅ Connected to MongoDB', 'green');
    } catch (error) {
      log(`❌ MongoDB connection failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    log('📤 Disconnected from MongoDB', 'blue');
  }

  async createBackup() {
    if (!shouldBackup) {
      log('⚠️  Skipping backup (use --backup to enable)', 'yellow');
      return;
    }

    try {
      log('💾 Creating backup...', 'cyan');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '../backups');

      // Create backups directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      this.backupPath = path.join(backupDir, `schools-backup-${timestamp}.json`);

      // Get all schools from database
      const schools = await mongoose.connection.db.collection('schools').find({}).toArray();

      // Write backup file
      fs.writeFileSync(this.backupPath, JSON.stringify(schools, null, 2));

      log(`✅ Backup created: ${this.backupPath}`, 'green');
      log(`📊 Backed up ${schools.length} schools`, 'blue');
    } catch (error) {
      log(`❌ Backup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async analyzeCurrentSchema() {
    try {
      log('🔍 Analyzing current schema...', 'cyan');

      const schools = await mongoose.connection.db.collection('schools').find({}).toArray();
      this.migrationStats.totalSchools = schools.length;

      const fieldsAnalysis = {
        hasWebsite: 0,
        hasNameCh: 0,
        hasContactPerson: 0,
        hasDescription: 0,
      };

      schools.forEach(school => {
        if (school.website) fieldsAnalysis.hasWebsite++;
        if (school.nameCh) fieldsAnalysis.hasNameCh++;
        if (school.contactPerson) fieldsAnalysis.hasContactPerson++;
        if (school.description) fieldsAnalysis.hasDescription++;
      });

      log(`📊 Schema Analysis:`, 'blue');
      log(`   Total schools: ${schools.length}`);
      log(`   Schools with website: ${fieldsAnalysis.hasWebsite}`);
      log(`   Schools with nameCh: ${fieldsAnalysis.hasNameCh}`);
      log(`   Schools with contactPerson: ${fieldsAnalysis.hasContactPerson}`);
      log(`   Schools with description: ${fieldsAnalysis.hasDescription}`);

      return fieldsAnalysis;
    } catch (error) {
      log(`❌ Schema analysis failed: ${error.message}`, 'red');
      throw error;
    }
  }

  async migrateSchool(school) {
    try {
      const updateDoc = {
        $unset: {},
        $set: {},
      };

      let hasChanges = false;

      // Remove deprecated fields
      if (school.website !== undefined) {
        updateDoc.$unset.website = '';
        hasChanges = true;
        log(`   - Removing website field: ${school.website}`, 'yellow');
      }

      if (school.nameCh !== undefined) {
        updateDoc.$unset.nameCh = '';
        hasChanges = true;
        log(`   - Removing nameCh field: ${school.nameCh}`, 'yellow');
      }

      // Add contactPerson field if it doesn't exist
      if (school.contactPerson === undefined) {
        updateDoc.$set.contactPerson = null;
        hasChanges = true;
        log(`   - Adding contactPerson field`, 'green');
      }

      // Ensure description field exists
      if (school.description === undefined) {
        updateDoc.$set.description = null;
        hasChanges = true;
        log(`   - Adding description field`, 'green');
      }

      // Clean up empty update operations
      if (Object.keys(updateDoc.$unset).length === 0) {
        delete updateDoc.$unset;
      }
      if (Object.keys(updateDoc.$set).length === 0) {
        delete updateDoc.$set;
      }

      if (!hasChanges) {
        log(`   ✅ No migration needed for ${school.name}`, 'blue');
        this.migrationStats.skipped++;
        return;
      }

      if (isDryRun) {
        log(`   🔍 [DRY RUN] Would update school: ${school.name}`, 'cyan');
        log(`   🔍 [DRY RUN] Update operation:`, 'cyan');
        console.log(JSON.stringify(updateDoc, null, 4));
        this.migrationStats.migrated++;
        return;
      }

      // Perform the actual migration
      await mongoose.connection.db.collection('schools').updateOne({ _id: school._id }, updateDoc);

      log(`   ✅ Migrated school: ${school.name}`, 'green');
      this.migrationStats.migrated++;
    } catch (error) {
      log(`   ❌ Failed to migrate school ${school.name}: ${error.message}`, 'red');
      this.migrationStats.errors++;
      throw error;
    }
  }

  async performMigration() {
    try {
      log('🚀 Starting school schema migration...', 'cyan');

      if (isDryRun) {
        log('🔍 Running in DRY RUN mode - no actual changes will be made', 'yellow');
      }

      const schools = await mongoose.connection.db.collection('schools').find({}).toArray();

      for (let i = 0; i < schools.length; i++) {
        const school = schools[i];
        log(`\n📝 Processing school ${i + 1}/${schools.length}: ${school.name}`, 'blue');

        try {
          await this.migrateSchool(school);
        } catch {
          log(`⚠️  Continuing with next school after error...`, 'yellow');
          continue;
        }
      }

      this.printMigrationSummary();
    } catch (error) {
      log(`❌ Migration failed: ${error.message}`, 'red');
      throw error;
    }
  }

  printMigrationSummary() {
    log('\n📊 Migration Summary:', 'cyan');
    log(`   Total schools: ${this.migrationStats.totalSchools}`);
    log(`   Successfully migrated: ${this.migrationStats.migrated}`, 'green');
    log(`   Skipped (no changes needed): ${this.migrationStats.skipped}`, 'blue');
    log(
      `   Errors: ${this.migrationStats.errors}`,
      this.migrationStats.errors > 0 ? 'red' : 'green'
    );

    if (this.backupPath) {
      log(`   Backup location: ${this.backupPath}`, 'blue');
    }

    if (isDryRun) {
      log('\n🔍 This was a DRY RUN - no actual changes were made', 'yellow');
      log('   Remove --dry-run flag to perform the actual migration', 'yellow');
    } else {
      log('\n✅ Migration completed successfully!', 'green');
    }
  }

  async restoreFromBackup(backupFilePath) {
    try {
      log(`🔄 Restoring from backup: ${backupFilePath}`, 'cyan');

      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFilePath}`);
      }

      const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

      // Drop existing collection
      await mongoose.connection.db.collection('schools').drop();
      log('🗑️  Dropped existing schools collection', 'yellow');

      // Restore from backup
      if (backupData.length > 0) {
        await mongoose.connection.db.collection('schools').insertMany(backupData);
        log(`✅ Restored ${backupData.length} schools from backup`, 'green');
      }
    } catch (error) {
      log(`❌ Restore failed: ${error.message}`, 'red');
      throw error;
    }
  }
}

// Main execution function
async function main() {
  const migration = new SchoolMigration();

  try {
    // Print header
    log('='.repeat(60), 'cyan');
    log('  HK Teacher School Schema Migration Tool', 'cyan');
    log('='.repeat(60), 'cyan');
    log('');

    // Check if restore mode
    const restoreFlag = args.find(arg => arg.startsWith('--restore='));
    if (restoreFlag) {
      const backupPath = restoreFlag.split('=')[1];
      await migration.connect();
      await migration.restoreFromBackup(backupPath);
      await migration.disconnect();
      return;
    }

    // Connect to database
    await migration.connect();

    // Analyze current schema
    await migration.analyzeCurrentSchema();

    // Create backup
    await migration.createBackup();

    // Confirm before proceeding (unless dry run)
    if (!isDryRun) {
      log('\n⚠️  WARNING: This will modify your database!', 'yellow');
      log('   Make sure you have a backup before proceeding.', 'yellow');
      log('   Press Ctrl+C to cancel, or any key to continue...', 'yellow');

      // Wait for user input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      });
      log('');
    }

    // Perform migration
    await migration.performMigration();

    // Disconnect
    await migration.disconnect();

    log('\n🎉 Migration process completed!', 'green');
  } catch (error) {
    log(`\n💥 Migration failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle script arguments and help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
School Schema Migration Tool

Usage: node scripts/migrate-school-schema.js [options]

Options:
  --dry-run              Run migration without making changes (preview mode)
  --backup               Create backup before migration (default: true)
  --restore=<file>       Restore from backup file
  --help, -h             Show this help message

Examples:
  # Preview migration changes
  node scripts/migrate-school-schema.js --dry-run

  # Run migration with backup
  node scripts/migrate-school-schema.js --backup

  # Run migration without backup (not recommended)
  node scripts/migrate-school-schema.js

  # Restore from backup
  node scripts/migrate-school-schema.js --restore=./backups/schools-backup-2025-07-29.json

Environment Variables:
  MONGODB_URI            MongoDB connection string (required)

Migration Changes:
  ✅ Adds: contactPerson field
  ✅ Adds: description field (if missing)
  ❌ Removes: website field
  ❌ Removes: nameCh field

Note: This migration aligns the database schema with the new form structure:
  - 基本資料 (Basic Information): name, nameEn, schoolType, district
  - 位置資訊 (Location Information): address
  - 聯絡資訊 (Contact Information): contactPerson, email, phone
  - 其他資訊 (Other Information): description
`);
  process.exit(0);
}

// Validate environment
if (!process.env.MONGODB_URI) {
  log('❌ Error: MONGODB_URI environment variable is required', 'red');
  log('   Please set MONGODB_URI in your .env file', 'yellow');
  process.exit(1);
}

// Run the migration
main().catch(error => {
  log(`💥 Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
