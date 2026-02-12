import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

try {
  run('git rev-parse --verify origin/main');
} catch {
  console.error('origin/main not found. Run: git fetch origin main --depth=1');
  process.exit(1);
}

const diff = run('git diff --name-status origin/main...HEAD -- supabase/migrations');

if (!diff) {
  process.exit(0);
}

const invalid = [];
const added = [];

for (const line of diff.split('\n')) {
  const [status, file] = line.split('\t');
  if (!status || !file) continue;
  if (status === 'A') {
    added.push(file);
    continue;
  }
  invalid.push(`${status}\t${file}`);
}

const badNames = added.filter((file) => !/supabase\/migrations\/\d{4}_.+\.sql$/.test(file));

if (invalid.length > 0 || badNames.length > 0) {
  if (invalid.length > 0) {
    console.error('Migration edits are not allowed (only new files). Found:');
    for (const entry of invalid) console.error(`  ${entry}`);
  }
  if (badNames.length > 0) {
    console.error('Migration filenames must match ####_name.sql. Found:');
    for (const file of badNames) console.error(`  ${file}`);
  }
  process.exit(1);
}
