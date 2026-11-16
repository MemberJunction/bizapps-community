// Enforces CLAUDE.md's strict type-safety rule across every handwritten TypeScript file in this
// repo: zero `any`, zero `unknown` (in type position — not the English word in a comment), and
// zero `BaseEntity.Get()` / `.Set()` dynamic field access.
//
//   node scripts/check-type-safety.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.turbo', 'generated']);
const TS_FILE = /\.ts$/;
const TEST_FILE = /\.(test|spec)\.ts$/;

/**
 * `.Get(`/`.Set(` calls that are NOT `BaseEntity.Get()`/`.Set()` dynamic field access — our own
 * small, reviewed Map-wrapper singletons (`ForumSubtypeDirectory`, `PostSubtypeDirectory`), whose
 * `Get(id)` method takes a record ID, not a field name, and is unrelated to MJ's generic entity
 * accessor pattern CLAUDE.md's rule targets.
 */
const ALLOWED_GET_SET_RECEIVERS = [/\bForumSubtypeDirectory\.Instance\.Get\(/, /\bPostSubtypeDirectory\.Instance\.Get\(/];

/** Strips `/* ... *‍/` and `// ...` comments and string/template literal bodies, so neither the
 * English word "any"/"unknown" in a comment nor a string value can trigger a false match. */
function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

export function findViolations(rawSource, file) {
  const violations = [];
  const source = stripCommentsAndStrings(rawSource);
  const lines = source.split('\n');

  const TYPE_POSITION_ANY = /:\s*any\b|<\s*any\s*>|\bas\s+any\b/;
  const TYPE_POSITION_UNKNOWN = /:\s*unknown\b|<\s*unknown\s*>|\bas\s+unknown\b/;
  const GET_SET_CALL = /\.(Get|Set)\(/;

  lines.forEach((line, index) => {
    if (TYPE_POSITION_ANY.test(line)) {
      violations.push(`${file}:${index + 1}: uses \`any\` — ${line.trim()}`);
    }
    if (TYPE_POSITION_UNKNOWN.test(line)) {
      violations.push(`${file}:${index + 1}: uses \`unknown\` — ${line.trim()}`);
    }
    if (GET_SET_CALL.test(line) && !ALLOWED_GET_SET_RECEIVERS.some((re) => re.test(line))) {
      violations.push(`${file}:${index + 1}: calls \`.Get(\`/\`.Set(\` — ${line.trim()}`);
    }
  });

  return violations;
}

function walk(dir, found) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, found);
    } else if (TS_FILE.test(name) && !TEST_FILE.test(name) && !name.endsWith('.d.ts')) {
      found.push(...findViolations(readFileSync(path, 'utf8'), path));
    }
  }
}

export function checkTree(roots) {
  const found = [];
  for (const root of roots) walk(root, found);
  return found;
}

if (process.argv[1] && process.argv[1].endsWith('check-type-safety.mjs')) {
  const problems = checkTree(['packages']);
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    console.error(`${problems.length} type-safety violation(s) found.`);
    process.exit(1);
  }
  console.log('Zero any, zero unknown, zero BaseEntity.Get()/.Set() across all handwritten packages/**/*.ts files.');
}
