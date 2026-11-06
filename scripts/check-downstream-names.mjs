// Community must not know its optional downstream or bridge apps inside packages/, metadata/, or migrations/.
// Common, Tasks, Collaboration, and Forms sit upstream as hard dependencies and are allowed.
//
//   node scripts/check-downstream-names.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Apps that sit downstream or in optional bridge Open Apps (`bizapps-community-*`). */
export const DOWNSTREAM_APPS = [
  'accounting',
  'committees',
  'contracts',
  'credentialing',
  'issues',
  'orders',
  'sales',
  'secure-messaging',
  'sonar',
  'voting',
];

const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  '.backups',
  'sql_logging',
  'ExampleForumTypes',
  'ExamplePostTypes',
  '__tests__',
  'fixtures',
]);
const TEXT_FILE = /\.(ts|json|md|mjs|cjs|scss|css|html|csv|sql)$/;
const TEST_FILE = /\.(test|spec)\.ts$/;

/** The patterns that name a downstream app: its repo, its npm scope, or its SQL schema. */
export function patternFor(app) {
  const schema = app
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
  const escaped = app.replace(/-/g, '[-_]');
  return new RegExp(
    `bizapps-${escaped}\\b|@mj-biz-apps/${escaped}-|__mj_BizApps${schema}\\b|MJ_BizApps_${schema}\\b`,
    'i',
  );
}

export function findNames(text, file) {
  const found = [];
  text.split('\n').forEach((line, index) => {
    for (const app of DOWNSTREAM_APPS) {
      if (patternFor(app).test(line)) {
        found.push(`${file}:${index + 1}: names the downstream app "${app}"`);
      }
    }
  });
  return found;
}

function walk(dir, found) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, found);
    else if (TEXT_FILE.test(name) && !TEST_FILE.test(name)) {
      found.push(...findNames(readFileSync(path, 'utf8'), path));
    }
  }
}

export function checkTree(roots) {
  const found = [];
  for (const root of roots) walk(root, found);
  return found;
}

if (process.argv[1] && process.argv[1].endsWith('check-downstream-names.mjs')) {
  const problems = checkTree(['packages', 'metadata', 'migrations']);
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    console.error(
      `${problems.length} downstream name(s) found. Community Core stays blind to optional bridge and downstream apps.`,
    );
    process.exit(1);
  }
  console.log('No downstream app names in packages/, metadata/, or migrations/.');
}
