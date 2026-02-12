#!/usr/bin/env node
/**
 * Schema Drift Detection Script
 *
 * This script compares the current database schema against a baseline snapshot
 * to detect any unauthorized schema changes.
 *
 * Usage: node scripts/schema-drift-check.mjs
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const BASELINE_FILE = join(process.cwd(), 'supabase', 'schema-baseline.sql');
const SNAPSHOT_FILE = join(process.cwd(), 'supabase', 'schema-current.sql');

/**
 * Generate current schema snapshot
 */
function generateSchemaSnapshot() {
  try {
    console.log('Generating current schema snapshot...');

    const snapshot = execSync('supabase db dump --schema-only --db-url $SUPABASE_DB_URL', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    writeFileSync(SNAPSHOT_FILE, snapshot);
    console.log('✓ Current schema snapshot generated');
    return snapshot;
  } catch (error) {
    console.error('✗ Failed to generate schema snapshot:', error.message);

    // Fallback: try local supabase
    try {
      const snapshot = execSync('supabase db dump --schema-only', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      writeFileSync(SNAPSHOT_FILE, snapshot);
      console.log('✓ Current schema snapshot generated (local)');
      return snapshot;
    } catch (localError) {
      console.error('✗ Failed to generate schema snapshot (local):', localError.message);
      process.exit(1);
    }
  }
}

/**
 * Normalize schema for comparison (remove timestamps, etc.)
 */
function normalizeSchema(schema) {
  return (
    schema
      // Remove timestamps from default values
      .replace(/DEFAULT \(now\(\)\)/g, 'DEFAULT_NOW')
      .replace(/DEFAULT now\(\)/g, 'DEFAULT_NOW')
      .replace(/DEFAULT \(CURRENT_TIMESTAMP\)/g, 'DEFAULT_NOW')
      .replace(/DEFAULT CURRENT_TIMESTAMP/g, 'DEFAULT_NOW')
      // Remove whitespace differences
      .replace(/\s+/g, ' ')
      // Remove comments
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Normalize quotes
      .replace(/"/g, '')
      .trim()
  );
}

/**
 * Calculate hash of normalized schema
 */
function calculateHash(schema) {
  const normalized = normalizeSchema(schema);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if baseline exists
 */
function checkBaseline() {
  if (!existsSync(BASELINE_FILE)) {
    console.error('✗ Schema baseline not found!');
    console.log('Run the following command to create a baseline:');
    console.log('  supabase db dump --schema-only > supabase/schema-baseline.sql');
    process.exit(1);
  }

  return readFileSync(BASELINE_FILE, 'utf-8');
}

/**
 * Compare schemas
 */
function compareSchemas(baseline, current) {
  const baselineHash = calculateHash(baseline);
  const currentHash = calculateHash(current);

  console.log('\nSchema Comparison:');
  console.log('==================');
  console.log(`Baseline hash: ${baselineHash.substring(0, 16)}...`);
  console.log(`Current hash:  ${currentHash.substring(0, 16)}...`);

  if (baselineHash === currentHash) {
    console.log('\n✓ No schema drift detected');
    return true;
  } else {
    console.log('\n✗ SCHEMA DRIFT DETECTED!');
    console.log('\nDifferences found:');

    // Show simple diff
    const baselineLines = baseline.split('\n').filter((l) => l.trim());
    const currentLines = current.split('\n').filter((l) => l.trim());

    const added = currentLines.filter((line) => !baselineLines.includes(line));
    const removed = baselineLines.filter((line) => !currentLines.includes(line));

    if (added.length > 0) {
      console.log('\nAdded:');
      added.slice(0, 10).forEach((line) => console.log(`  + ${line}`));
      if (added.length > 10) {
        console.log(`  ... and ${added.length - 10} more`);
      }
    }

    if (removed.length > 0) {
      console.log('\nRemoved:');
      removed.slice(0, 10).forEach((line) => console.log(`  - ${line}`));
      if (removed.length > 10) {
        console.log(`  ... and ${removed.length - 10} more`);
      }
    }

    return false;
  }
}

/**
 * Check for missing migrations
 */
function checkMigrations() {
  try {
    console.log('\nChecking migration files...');

    const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
    const files = execSync(`ls -1 ${migrationsDir}/*.sql 2>/dev/null || echo ""`, {
      encoding: 'utf-8',
    });
    const migrationFiles = files.split('\n').filter((f) => f.trim());

    console.log(`Found ${migrationFiles.length} migration files`);

    // Check for uncommitted migrations
    try {
      const status = execSync('git status --porcelain supabase/migrations/', { encoding: 'utf-8' });
      if (status.trim()) {
        console.log('\n⚠️  Uncommitted migration files detected:');
        console.log(status);
      } else {
        console.log('✓ All migrations committed');
      }
    } catch (gitError) {
      // Git not available or not a git repo
      console.log('⚠️  Unable to check git status');
    }

    return migrationFiles;
  } catch (error) {
    console.error('✗ Failed to check migrations:', error.message);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Schema Drift Detection');
  console.log('========================\n');

  // Check baseline
  const baseline = checkBaseline();

  // Generate current snapshot
  const current = generateSchemaSnapshot();

  // Compare schemas
  const isMatch = compareSchemas(baseline, current);

  // Check migrations
  checkMigrations();

  // Cleanup
  try {
    execSync(`rm -f ${SNAPSHOT_FILE}`);
  } catch (cleanupError) {
    // Ignore cleanup errors
  }

  console.log('\n========================');

  if (isMatch) {
    console.log('✅ Schema validation passed');
    process.exit(0);
  } else {
    console.log('❌ Schema validation failed');
    console.log('\nTo update the baseline, run:');
    console.log('  supabase db dump --schema-only > supabase/schema-baseline.sql');
    console.log('  git add supabase/schema-baseline.sql');
    console.log('  git commit -m "Update schema baseline"');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
