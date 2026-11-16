import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * These checks verify source text directly rather than importing the real `@Component` /
 * `@RegisterClass` classes at runtime. `@memberjunction/ng-shared` and friends are built
 * exclusively for an Angular CLI (webpack/esbuild) consumer — their own emitted relative imports
 * omit file extensions, which plain Node ESM resolution cannot follow (`ERR_MODULE_NOT_FOUND`) —
 * so there is no way to `import` a real Explorer component in this repo's lightweight
 * `node --experimental-strip-types --test` runner. Reading the compiled source and asserting the
 * required architecture markers are present and uncommented is the available, deterministic
 * substitute for a live `MJGlobal.Instance.ClassFactory.GetRegistration(...)` check.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ANGULAR_SRC = join(HERE); // packages/Angular/src
const ANGULAR_WIDGETS_SRC = join(HERE, '..', '..', 'AngularWidgets', 'src');
const GENERATED_ENTITIES_DIR = join(ANGULAR_SRC, 'lib', 'generated', 'Entities');
const GENERATED_FORMS_MODULE = join(ANGULAR_SRC, 'lib', 'generated', 'generated-forms.module.ts');
const APPLICATIONS_METADATA = join(HERE, '..', '..', '..', 'metadata', 'applications', '.applications.json');

function listFilesRecursive(dir: string, extensions: string[]): string[] {
  const out: string[] = [];
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

/** Strips single-line (`//`) and block (`/* ... *\/`) comments so a commented-out decorator doesn't count as active. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('OpenApp Readiness — Dual Form Registration Parity (all 25 entities)', () => {
  const formDirs = readdirSync(GENERATED_ENTITIES_DIR).filter((name) =>
    statSync(join(GENERATED_ENTITIES_DIR, name)).isDirectory(),
  );

  it('found all 25 generated per-entity form directories', () => {
    assert.equal(formDirs.length, 25);
  });

  const registeredEntityNames: string[] = [];

  for (const dirName of formDirs) {
    it(`${dirName}: has an active, uncommented @RegisterClass(BaseFormComponent, '<EntityName>')`, () => {
      const formFile = listFilesRecursive(join(GENERATED_ENTITIES_DIR, dirName), ['.form.component.ts'])[0];
      assert.ok(formFile, `no .form.component.ts under ${dirName}`);
      const source = readFileSync(formFile, 'utf8');
      const active = stripComments(source);

      const match = active.match(/@RegisterClass\(BaseFormComponent,\s*'([^']+)'\)/);
      assert.ok(match, `${dirName}: no active @RegisterClass(BaseFormComponent, ...) found`);
      assert.match(match![1], /^MJ_BizApps_Community: /, `${dirName}: unexpected EntityName "${match![1]}"`);

      assert.match(active, /extends BaseFormComponent/, `${dirName}: form class must extend BaseFormComponent`);
      registeredEntityNames.push(match![1]);
    });
  }

  it('retains all 25 form classes in generated-forms.module.ts (startupExport / anti-tree-shake retention)', () => {
    const moduleSource = stripComments(readFileSync(GENERATED_FORMS_MODULE, 'utf8'));
    for (const dirName of formDirs) {
      const classNameGuess = new RegExp(`${dirName}FormComponent\\b`);
      assert.match(
        moduleSource,
        classNameGuess,
        `${dirName}FormComponent is not referenced (declared/imported) in generated-forms.module.ts`,
      );
    }
  });

  it('every registered EntityName is unique across all 25 forms', () => {
    assert.equal(new Set(registeredEntityNames).size, 25);
  });

  it('public-api.ts re-exports generated-forms.module.ts so the host app\'s manifest generator can discover it', () => {
    const publicApi = stripComments(readFileSync(join(ANGULAR_SRC, 'public-api.ts'), 'utf8'));
    assert.match(publicApi, /generated-forms\.module/);
  });
});

describe('OpenApp Readiness — CommunityHubResource architecture', () => {
  const componentSource = stripComments(
    readFileSync(join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.ts'), 'utf8'),
  );

  it("is decorated with @RegisterClass(BaseResourceComponent, 'CommunityHubResource') and extends BaseResourceComponent", () => {
    assert.match(componentSource, /@RegisterClass\(BaseResourceComponent,\s*'CommunityHubResource'\)/);
    assert.match(componentSource, /export class CommunityHubResource extends BaseResourceComponent/);
  });

  it('uses ChangeDetectionStrategy.OnPush', () => {
    assert.match(componentSource, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('defers NotifyLoadStarted out of the synchronous ngOnInit via queueMicrotask, then calls NotifyLoadComplete', () => {
    const ngOnInitBlock = componentSource.match(/ngOnInit\(\)[\s\S]*?\n {2}\}/)?.[0] ?? '';
    assert.match(ngOnInitBlock, /queueMicrotask\(/);
    // NotifyLoadStarted must be INSIDE the queueMicrotask callback, not called synchronously beforehand.
    const beforeQueueMicrotask = ngOnInitBlock.split('queueMicrotask(')[0];
    assert.doesNotMatch(beforeQueueMicrotask, /this\.NotifyLoadStarted\(\)/);
    assert.match(componentSource, /this\.NotifyLoadComplete\(\)/);
  });

  it("wraps its template in <mj-page-layout>", () => {
    const template = readFileSync(join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.html'), 'utf8');
    assert.match(template, /<mj-page-layout>/);
    assert.match(template, /<\/mj-page-layout>/);
  });

  it('declares all 4 required Community Hub tabs', () => {
    for (const label of [
      'Knowledge Stream',
      'Q&A Canon Workbench',
      'Quadratic Ideation Wallet',
      'Living Co-Authoring & Interactive Mini-Apps',
    ]) {
      assert.ok(componentSource.includes(label), `missing tab label "${label}"`);
    }
  });

  it("matches metadata/applications/.applications.json's DefaultNavItems[].DriverClass", () => {
    const apps = JSON.parse(readFileSync(APPLICATIONS_METADATA, 'utf8')) as Array<{
      fields: { DefaultNavItems: Array<{ DriverClass: string }> };
    }>;
    const driverClasses = apps.flatMap((app) => app.fields.DefaultNavItems.map((item) => item.DriverClass));
    assert.ok(driverClasses.includes('CommunityHubResource'));
  });
});

describe('OpenApp Readiness — 100% --mj-* design tokens (zero raw color literals)', () => {
  const RAW_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

  // Generated CodeGen output and third-party font-icon classes are out of this package's control.
  const files = [
    ...listFilesRecursive(join(ANGULAR_SRC, 'lib'), ['.css', '.html', '.ts']).filter(
      (f) => !f.includes(`${join('lib', 'generated')}`),
    ),
    ...listFilesRecursive(ANGULAR_WIDGETS_SRC, ['.css', '.html', '.ts']),
  ];

  it('scanned at least one .css/.html/.ts file', () => {
    assert.ok(files.length > 0);
  });

  for (const file of files) {
    it(`${file.replace(HERE, '.')}: contains zero raw hex/rgb()/rgba()/hsl() color literals`, () => {
      const content = readFileSync(file, 'utf8');
      const matches = content.match(RAW_COLOR_PATTERN) ?? [];
      assert.deepEqual(matches, [], `found raw color literal(s) in ${file}: ${matches.join(', ')}`);
    });
  }
});
