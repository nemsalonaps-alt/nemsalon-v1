import { readFileSync } from 'node:fs';

const path = process.argv[2];
const input = path ? readFileSync(path, 'utf8') : readFileSync(0, 'utf8');

const projectUrlMatch = input.match(/Project URL\s*\|\s*(http[^\s]+)/);
const secretMatch = input.match(/Secret\s*\|\s*(sb_secret_[A-Za-z0-9_-]+)/);

if (!projectUrlMatch || !secretMatch) {
  console.error('Failed to parse Supabase status output for Project URL or Secret key.');
  process.exit(1);
}

const supabaseUrl = projectUrlMatch[1];
const serviceRoleKey = secretMatch[1];

process.stdout.write(`SUPABASE_URL=${supabaseUrl}\n`);
process.stdout.write(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`);
