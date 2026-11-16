// Enforces CLAUDE.md's strict type-safety rule across every handwritten TypeScript file in this
// repo: zero `any`, zero `unknown` (in type position — not the English word in a comment, string,
// or template literal interpolation), and zero `BaseEntity.Get()` / `.Set()` dynamic field access.
// Parses real TypeScript syntax (not regex over stripped text) so every `any`/`unknown` spelling —
// `: any`, `as any`, `<any>`, `any[]`, `| any`, `& any`, `Record<string, unknown>`, one buried
// inside a template literal `${...}` expression — is caught by construction: TypeScript's grammar
// only ever allows `any`/`unknown` as a type, so every occurrence of the AnyKeyword/UnknownKeyword
// AST node IS a type-position occurrence, with no separate pattern needed per spelling.
//
//   node scripts/check-type-safety.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.turbo', 'generated']);
const TS_FILE = /\.(ts|d\.ts)$/;

/**
 * `.Get(`/`.Set(` calls that are NOT `BaseEntity.Get()`/`.Set()` dynamic field access — our own
 * small, reviewed Map-wrapper singletons (`ForumSubtypeDirectory`, `PostSubtypeDirectory`), whose
 * `Get(id)` method takes a record ID, not a field name, and is unrelated to MJ's generic entity
 * accessor pattern CLAUDE.md's rule targets.
 */
const ALLOWED_GET_SET_RECEIVERS = ['ForumSubtypeDirectory.Instance', 'PostSubtypeDirectory.Instance'];

export function findViolations(rawSource, file) {
  const violations = [];
  const sourceFile = ts.createSourceFile(file, rawSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  function lineOf(node) {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push(`${file}:${lineOf(node)}: uses \`any\` in type position`);
    } else if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      violations.push(`${file}:${lineOf(node)}: uses \`unknown\` in type position`);
    } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const methodName = node.expression.name.text;
      if (methodName === 'Get' || methodName === 'Set') {
        const receiverText = node.expression.expression.getText(sourceFile);
        const allowed = ALLOWED_GET_SET_RECEIVERS.some((r) => receiverText.endsWith(r));
        if (!allowed) {
          violations.push(`${file}:${lineOf(node)}: calls \`.${methodName}(\` — ${node.getText(sourceFile).slice(0, 80)}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function walk(dir, found) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, found);
    } else if (TS_FILE.test(name)) {
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
  console.log('Zero any, zero unknown, zero BaseEntity.Get()/.Set() across all handwritten packages/**/*.ts(.d.ts) files.');
}
