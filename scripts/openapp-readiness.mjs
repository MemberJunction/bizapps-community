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
 *
 * Usage: node scripts/openapp-readiness.mjs
 * Exits 1 if any pillar fails.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  if (report.pageErrors?.length > 0) violations.push(`${report.pageErrors.length} page error(s)`);
  if (report.consoleErrors?.length > 0) violations.push(`${report.consoleErrors.length} console error(s)`);
  if (report.totalCriticalOrSeriousViolations > 0) {
    violations.push(`${report.totalCriticalOrSeriousViolations} critical/serious WCAG 2.1 AA violation(s)`);
  }
  if (report.windowPrintCalled) violations.push('window.print() was called');

  return {
    passed: violations.length === 0,
    summary:
      violations.length === 0
        ? `Chromium smoke passed across ${report.tabsExercised?.length ?? 0} tab(s) with 0 pageErrors, 0 consoleErrors, 0 critical/serious WCAG violations`
        : `${violations.length} browser smoke violation(s) found`,
    checkedCount: report.tabsExercised?.length ?? 0,
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
  };

  const overallPassed = Object.values(pillars).every((p) => p.passed);
  const report = { schemaVersion: 'sf-readiness/v3', overallPassed, pillars };

  console.log(JSON.stringify(report, null, 2));
  if (!overallPassed) {
    process.exitCode = 1;
  }
}

main();
