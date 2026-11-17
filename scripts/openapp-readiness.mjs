#!/usr/bin/env node
/**
 * BizApps Community — OpenApp v3 5-Pillar Readiness Report
 *
 * Verifies, and emits a consolidated JSON report for, the 5 OpenApp v3 readiness pillars:
 *   1. formParity    — every entity in metadata/entities/ retains an active, uncommented
 *                       @RegisterClass(BaseFormComponent, '<EntityName>') class.
 *   2. navParity      — every Application.DefaultNavItems[].DriverClass resolves to an active
 *                       @RegisterClass(BaseResourceComponent, ...) class.
 *   3. designTokens   — zero raw hex/rgb()/rgba()/hsl() color literals in Angular .ts/.html/.css.
 *   4. seedDensity    — scripts/seed-world.mjs defines >= 25 multi-domain records.
 *   5. browserSmoke   — the headless Playwright + axe-core WCAG run (e2e/reports/
 *                       community-hub-wcag-report.json) reports 0 page/console errors and 0
 *                       critical/serious WCAG 2.1 AA violations.
 *   6. migrationParity — e2e/reports/migration-parity-report.json (from
 *                        scripts/verify-migration-parity.mjs) reports overallPassed === true.
 *
 * The top-level report also carries `gitTreeClean` (informational — whether any tracked file
 * other than this script's own regenerated report outputs is dirty) and
 * `migrationParityVerified` (a convenience mirror of the migrationParity pillar's `passed`).
 *
 * Usage: node scripts/openapp-readiness.mjs
 * Exits 1 if any pillar fails.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { GetWorldSeedSummary } from './seed-world.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const ANGULAR_SRC = join(REPO_ROOT, 'packages', 'Angular', 'src');
const ANGULAR_WIDGETS_SRC = join(REPO_ROOT, 'packages', 'AngularWidgets', 'src');
const GENERATED_ENTITIES_DIR = join(ANGULAR_SRC, 'lib', 'generated', 'Entities');
const GENERATED_FORMS_MODULE = join(ANGULAR_SRC, 'lib', 'generated', 'generated-forms.module.ts');
const APPLICATIONS_METADATA = join(REPO_ROOT, 'metadata', 'applications', '.applications.json');
const COMMUNITY_HUB_RESOURCE = join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.ts');
const E2E_REPORT = join(REPO_ROOT, 'e2e', 'reports', 'community-hub-wcag-report.json');
const MIGRATION_PARITY_REPORT = join(REPO_ROOT, 'e2e', 'reports', 'migration-parity-report.json');

/** Tracked files with unstaged/uncommitted changes, excluding this run's own regenerated report
 * outputs (which are EXPECTED to differ until the caller commits them — that is not drift). */
function checkGitTreeClean() {
  try {
    const status = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf8' });
    const reportOutputPaths = new Set(['e2e/reports/community-hub-wcag-report.json', 'e2e/reports/openapp-readiness-report.json', 'e2e/reports/migration-parity-report.json', 'e2e/screenshots/community-hub.png']);
    // `git status --porcelain` lines are exactly `XY PATH` — 2 status chars + 1 space — before
    // trimming anything; trimming first (removing a leading space on "M path"/" M path" styles)
    // would shift the fixed-width prefix and eat into PATH itself.
    const dirtyPaths = status
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.slice(3).trim())
      .filter((path) => path.length > 0 && !reportOutputPaths.has(path) && !path.startsWith('e2e/screenshots/'));
    return { clean: dirtyPaths.length === 0, dirtyPaths };
  } catch (err) {
    return { clean: false, dirtyPaths: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function checkMigrationParity() {
  if (!existsSync(MIGRATION_PARITY_REPORT)) {
    return {
      passed: false,
      summary: 'No e2e/reports/migration-parity-report.json found — run `node scripts/verify-migration-parity.mjs` first',
      checkedCount: 0,
      violationCount: 1,
      violations: ['missing migration parity report'],
    };
  }
  const report = JSON.parse(readFileSync(MIGRATION_PARITY_REPORT, 'utf8'));
  const violations = Array.isArray(report.violations) ? report.violations : ['migration-parity-report.json is malformed (no violations array)'];
  const passed = report.overallPassed === true && violations.length === 0;
  return {
    passed,
    summary: passed
      ? 'Migration parity verified: 25/25 tables in both dialects, fnCommunityForumAccess present in both, >= 50 blank lines before CodeGen, zero spDeleteUnneededEntityFields, teardown parity'
      : `${violations.length} migration parity violation(s) found`,
    checkedCount: report.expectedTableCount ?? 25,
    violationCount: violations.length,
    violations,
  };
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function listFilesRecursive(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function checkFormParity() {
  const violations = [];
  const entityDirs = readdirSync(GENERATED_ENTITIES_DIR).filter((name) =>
    statSync(join(GENERATED_ENTITIES_DIR, name)).isDirectory(),
  );
  const moduleSource = stripComments(readFileSync(GENERATED_FORMS_MODULE, 'utf8'));
  const seenEntityNames = new Set();

  for (const dirName of entityDirs) {
    const formFile = listFilesRecursive(join(GENERATED_ENTITIES_DIR, dirName), ['.form.component.ts'])[0];
    if (!formFile) {
      violations.push(`${dirName}: no .form.component.ts found`);
      continue;
    }
    const active = stripComments(readFileSync(formFile, 'utf8'));
    const match = active.match(/@RegisterClass\(BaseFormComponent,\s*'([^']+)'\)/);
    if (!match) {
      violations.push(`${dirName}: no active @RegisterClass(BaseFormComponent, ...)`);
      continue;
    }
    if (seenEntityNames.has(match[1])) {
      violations.push(`${dirName}: duplicate EntityName registration "${match[1]}"`);
    }
    seenEntityNames.add(match[1]);
    if (!moduleSource.includes(`${dirName}FormComponent`)) {
      violations.push(`${dirName}: not retained in generated-forms.module.ts`);
    }
  }

  return {
    passed: violations.length === 0 && entityDirs.length === 25,
    summary:
      violations.length === 0
        ? `All ${entityDirs.length} entities registered in ClassFactory and retained in generated-forms.module.ts`
        : `${violations.length} form registration violation(s) found`,
    checkedCount: entityDirs.length,
    violationCount: violations.length,
    violations,
  };
}

function checkNavParity() {
  const violations = [];
  const apps = JSON.parse(readFileSync(APPLICATIONS_METADATA, 'utf8'));
  const driverClasses = apps.flatMap((app) => app.fields.DefaultNavItems.map((item) => item.DriverClass));
  const componentSource = stripComments(readFileSync(COMMUNITY_HUB_RESOURCE, 'utf8'));

  for (const driverClass of driverClasses) {
    const registered = new RegExp(`@RegisterClass\\(BaseResourceComponent,\\s*'${driverClass}'\\)`).test(
      componentSource,
    );
    if (!registered) {
      violations.push(`DefaultNavItems DriverClass "${driverClass}" has no matching @RegisterClass(BaseResourceComponent, ...)`);
    }
  }

  return {
    passed: violations.length === 0 && driverClasses.length > 0,
    summary:
      violations.length === 0
        ? `All ${driverClasses.length} DefaultNavItems resolve to an active BaseResourceComponent class`
        : `${violations.length} nav parity violation(s) found`,
    checkedCount: driverClasses.length,
    violationCount: violations.length,
    violations,
  };
}

function checkDesignTokens() {
  const RAW_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
  const violations = [];
  const files = [
    ...listFilesRecursive(join(ANGULAR_SRC, 'lib'), ['.css', '.html', '.ts']).filter(
      (f) => !f.includes(join('lib', 'generated')),
    ),
    ...listFilesRecursive(ANGULAR_WIDGETS_SRC, ['.css', '.html', '.ts']),
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const matches = content.match(RAW_COLOR_PATTERN) ?? [];
    if (matches.length > 0) {
      violations.push(`${file}: ${matches.join(', ')}`);
    }
  }

  return {
    passed: violations.length === 0,
    summary:
      violations.length === 0
        ? `Zero raw color literals across ${files.length} .ts/.html/.css file(s)`
        : `${violations.length} file(s) with raw color literals`,
    checkedCount: files.length,
    violationCount: violations.length,
    violations,
  };
}

function checkSeedDensity() {
  const { counts, totalRecords } = GetWorldSeedSummary();
  const passed = totalRecords >= 25;
  return {
    passed,
    summary: passed
      ? `${totalRecords} multi-domain seed record(s) across ${Object.keys(counts).length} categories`
      : `Only ${totalRecords} seed records defined (requirement: >= 25)`,
    checkedCount: totalRecords,
    violationCount: passed ? 0 : 1,
    violations: passed ? [] : [`totalRecords ${totalRecords} < 25`],
  };
}

const REQUIRED_E2E_SCHEMA_VERSION = 'sf-e2e/v1';
const REQUIRED_TAB_KEYS = ['knowledge-stream', 'qa-canon-workbench', 'quadratic-ideation-wallet', 'living-co-authoring'];
/** Reports older than this are treated as stale (fail closed) rather than trusted blindly. */
const MAX_REPORT_AGE_MS = 24 * 60 * 60 * 1000;

function checkBrowserSmoke() {
  if (!existsSync(E2E_REPORT)) {
    return {
      passed: false,
      summary: 'No e2e/reports/community-hub-wcag-report.json found — run `pnpm run test:e2e` first',
      checkedCount: 0,
      violationCount: 1,
      violations: ['missing e2e report'],
    };
  }

  const report = JSON.parse(readFileSync(E2E_REPORT, 'utf8'));
  const violations = [];

  // Fail closed: every field this pillar relies on must be explicitly present and well-formed —
  // a missing/undefined field is itself a violation, never silently treated as "0" or "passing".
  if (report.schemaVersion !== REQUIRED_E2E_SCHEMA_VERSION) {
    violations.push(`schemaVersion is "${report.schemaVersion}", expected "${REQUIRED_E2E_SCHEMA_VERSION}"`);
  }

  const evaluatedAtMs = typeof report.evaluatedAtIso === 'string' ? Date.parse(report.evaluatedAtIso) : NaN;
  if (typeof report.evaluatedAtIso !== 'string' || report.evaluatedAtIso.trim() === '' || Number.isNaN(evaluatedAtMs)) {
    violations.push('evaluatedAtIso is missing or not a valid ISO timestamp');
  } else if (evaluatedAtMs > Date.now()) {
    violations.push(`evaluatedAtIso "${report.evaluatedAtIso}" is in the future — a clock-skewed or fabricated report`);
  } else if (Date.now() - evaluatedAtMs > MAX_REPORT_AGE_MS) {
    violations.push(`evaluatedAtIso "${report.evaluatedAtIso}" is stale (> ${MAX_REPORT_AGE_MS / 3_600_000}h old) — re-run \`pnpm run test:e2e\``);
  }

  const tabsExercised = Array.isArray(report.tabsExercised) ? report.tabsExercised : [];
  for (const requiredTab of REQUIRED_TAB_KEYS) {
    if (!tabsExercised.includes(requiredTab)) {
      violations.push(`required tab "${requiredTab}" was not exercised`);
    }
  }

  if (!Array.isArray(report.pageErrors)) {
    violations.push('pageErrors field is missing');
  } else if (report.pageErrors.length > 0) {
    violations.push(`${report.pageErrors.length} page error(s)`);
  }

  if (!Array.isArray(report.consoleErrors)) {
    violations.push('consoleErrors field is missing');
  } else if (report.consoleErrors.length > 0) {
    violations.push(`${report.consoleErrors.length} console error(s)`);
  }

  if (typeof report.totalViolations !== 'number') {
    violations.push('totalViolations field is missing');
  } else if (report.totalViolations > 0) {
    violations.push(`${report.totalViolations} total WCAG 2.1 AA violation(s) (any severity)`);
  }

  if (typeof report.totalCriticalOrSeriousViolations !== 'number') {
    violations.push('totalCriticalOrSeriousViolations field is missing');
  } else if (report.totalCriticalOrSeriousViolations > 0) {
    violations.push(`${report.totalCriticalOrSeriousViolations} critical/serious WCAG 2.1 AA violation(s)`);
  }

  if (typeof report.windowPrintCalled !== 'boolean') {
    violations.push('windowPrintCalled field is missing');
  } else if (report.windowPrintCalled) {
    violations.push('window.print() was called');
  }

  for (const requiredFlag of ['keyboardNavigationVerified', 'askFirstDeflectionExercised', 'digestExportExercised', 'quadraticVotingExercised']) {
    if (report[requiredFlag] !== true) {
      violations.push(`${requiredFlag} is not true (got ${JSON.stringify(report[requiredFlag])})`);
    }
  }

  // axeResultsByTab must reconcile with totalViolations: every required tab present with a
  // non-negative count, and the sum across tabs must equal the reported total exactly — a
  // mismatch (or a negative/fabricated per-tab count) is itself a violation.
  if (typeof report.axeResultsByTab !== 'object' || report.axeResultsByTab === null) {
    violations.push('axeResultsByTab field is missing');
  } else {
    let reconciledTotal = 0;
    let hasNegativeOrInvalidCount = false;
    for (const requiredTab of REQUIRED_TAB_KEYS) {
      const perTab = report.axeResultsByTab[requiredTab];
      const violationCount = perTab?.violationCount;
      if (typeof violationCount !== 'number' || violationCount < 0 || !Number.isInteger(violationCount)) {
        violations.push(`axeResultsByTab["${requiredTab}"].violationCount is missing or invalid (got ${JSON.stringify(violationCount)})`);
        hasNegativeOrInvalidCount = true;
        continue;
      }
      reconciledTotal += violationCount;
    }
    if (!hasNegativeOrInvalidCount && typeof report.totalViolations === 'number' && reconciledTotal !== report.totalViolations) {
      violations.push(
        `axeResultsByTab per-tab violationCount sum (${reconciledTotal}) does not reconcile with totalViolations (${report.totalViolations})`,
      );
    }
  }

  return {
    passed: violations.length === 0,
    summary:
      violations.length === 0
        ? `Chromium smoke passed across all ${REQUIRED_TAB_KEYS.length} required tab(s) (evaluated ${report.evaluatedAtIso}) with 0 pageErrors, 0 consoleErrors, 0 WCAG violations`
        : `${violations.length} browser smoke violation(s) found`,
    checkedCount: tabsExercised.length,
    violationCount: violations.length,
    violations,
  };
}

function main() {
  const pillars = {
    formParity: checkFormParity(),
    navParity: checkNavParity(),
    designTokens: checkDesignTokens(),
    seedDensity: checkSeedDensity(),
    browserSmoke: checkBrowserSmoke(),
    migrationParity: checkMigrationParity(),
  };

  const gitTree = checkGitTreeClean();
  const overallPassed = Object.values(pillars).every((p) => p.passed);
  const report = {
    schemaVersion: 'sf-readiness/v3',
    overallPassed,
    gitTreeClean: gitTree.clean,
    migrationParityVerified: pillars.migrationParity.passed,
    pillars,
  };
  if (!gitTree.clean) {
    report.gitTreeDirtyPaths = gitTree.dirtyPaths;
  }

  console.log(JSON.stringify(report, null, 2));
  if (!overallPassed) {
    process.exitCode = 1;
  }
}

main();
