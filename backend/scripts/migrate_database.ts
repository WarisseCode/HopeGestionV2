#!/usr/bin/env node
/**
 * Database Migration Script for Digital Ocean PostgreSQL
 * 
 * This script helps migrate your local database to Digital Ocean's managed PostgreSQL.
 * 
 * Usage:
 *   1. Export local database: npm run db:export
 *   2. Import to production: npm run db:import
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(__dirname, '../../backups/production');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Export local database to SQL file
 */
async function exportLocalDatabase() {
    console.log('📦 Exporting local database...');
    
    const localDbConfig = {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'hopegestion',
        port: process.env.DB_PORT || '5432',
        password: process.env.DB_PASSWORD || ''
    };

    const backupFile = path.join(BACKUP_DIR, `local_backup_${TIMESTAMP}.sql`);
    
    // Set PGPASSWORD environment variable
    const env = { ...process.env, PGPASSWORD: localDbConfig.password };
    
    const command = `pg_dump -h ${localDbConfig.host} -p ${localDbConfig.port} -U ${localDbConfig.user} -d ${localDbConfig.database} -F p -f "${backupFile}"`;
    
    try {
        await execAsync(command, { env });
        console.log(`✅ Database exported successfully to: ${backupFile}`);
        console.log(`📊 File size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
        return backupFile;
    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    }
}

/**
 * Import SQL file to Digital Ocean PostgreSQL
 */
async function importToProduction(sqlFile?: string) {
    console.log('📥 Importing to production database...');
    
    // Use DATABASE_URL from production environment
    const productionDbUrl = process.env.PRODUCTION_DATABASE_URL;
    
    if (!productionDbUrl) {
        throw new Error('PRODUCTION_DATABASE_URL not set in environment variables');
    }

    // Find the most recent backup file if not specified
    if (!sqlFile) {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('local_backup_') && f.endsWith('.sql'))
            .sort()
            .reverse();
        
        if (files.length === 0) {
            throw new Error('No backup files found. Run export first.');
        }
        
        sqlFile = path.join(BACKUP_DIR, files[0]);
        console.log(`📂 Using backup file: ${files[0]}`);
    }

    if (!sqlFile) {
         throw new Error('No backup file available to import.');
    }

    if (!fs.existsSync(sqlFile)) {
        throw new Error(`Backup file not found: ${sqlFile}`);
    }

    const command = `psql "${productionDbUrl}" < "${sqlFile}"`;
    
    try {
        console.log('⚠️  WARNING: This will overwrite the production database!');
        console.log('⏳ Importing... This may take a few minutes.');
        
        await execAsync(command);
        console.log('✅ Database imported successfully to production!');
    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    }
}

/**
 * Create a backup of production database before migration
 */
async function backupProduction() {
    console.log('💾 Creating production database backup...');
    
    const productionDbUrl = process.env.PRODUCTION_DATABASE_URL;
    
    if (!productionDbUrl) {
        throw new Error('PRODUCTION_DATABASE_URL not set');
    }

    const backupFile = path.join(BACKUP_DIR, `production_backup_${TIMESTAMP}.sql`);
    const command = `pg_dump "${productionDbUrl}" -F p -f "${backupFile}"`;
    
    try {
        await execAsync(command);
        console.log(`✅ Production backup created: ${backupFile}`);
        return backupFile;
    } catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}

/**
 * Run database migrations (create tables, etc.)
 */
async function runMigrations() {
    console.log('🔄 Running database migrations...');
    
    const productionDbUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!productionDbUrl) {
        throw new Error('DATABASE_URL not set');
    }

    // Read and execute migration SQL files
    const migrationsDir = path.join(__dirname, '../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('⚠️  No migrations directory found');
        return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of migrationFiles) {
        console.log(`  Running migration: ${file}`);
        const sqlFile = path.join(migrationsDir, file);
        const command = `psql "${productionDbUrl}" < "${sqlFile}"`;
        
        try {
            await execAsync(command);
            console.log(`  ✅ ${file} completed`);
        } catch (error) {
            console.error(`  ❌ ${file} failed:`, error);
            throw error;
        }
    }
    
    console.log('✅ All migrations completed');
}

// CLI Interface
const command = process.argv[2];

(async () => {
    try {
        switch (command) {
            case 'export':
                await exportLocalDatabase();
                break;
            
            case 'import':
                const sqlFile = process.argv[3];
                await importToProduction(sqlFile);
                break;
            
            case 'backup-prod':
                await backupProduction();
                break;
            
            case 'migrate':
                await runMigrations();
                break;
            
            case 'full-migration':
                console.log('🚀 Starting full migration process...\n');
                console.log('Step 1: Backup production database');
                await backupProduction();
                console.log('\nStep 2: Export local database');
                const backup = await exportLocalDatabase();
                console.log('\nStep 3: Import to production');
                await importToProduction(backup);
                console.log('\n🎉 Full migration completed successfully!');
                break;
            
            default:
                console.log(`
Database Migration Tool

Usage:
  npm run db:export          - Export local database to SQL file
  npm run db:import [file]   - Import SQL file to production
  npm run db:backup-prod     - Backup production database
  npm run db:migrate         - Run migration scripts
  npm run db:full-migration  - Complete migration (backup prod → export local → import)

Environment Variables Required:
  - Local DB: DB_USER, DB_HOST, DB_NAME, DB_PORT, DB_PASSWORD
  - Production: PRODUCTION_DATABASE_URL

Example:
  npm run db:export
  npm run db:import ./backups/production/local_backup_2026-01-30.sql
                `);
        }
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
})();
