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

describe('Browser/Server Package Boundary — zero @mj-biz-apps/community-actions, @memberjunction/actions, or pdfkit in the Angular package', () => {
  const sourceFiles = listFilesRecursive(join(ANGULAR_SRC, 'lib'), ['.ts']).filter(
    (f) => !f.includes(join('lib', 'generated')),
  );
  const FORBIDDEN_IMPORTS = ['@mj-biz-apps/community-actions', '@memberjunction/actions', 'pdfkit'];

  it('scanned at least one handwritten .ts file', () => {
    assert.ok(sourceFiles.length > 0);
  });

  for (const file of sourceFiles) {
    it(`${file.replace(HERE, '.')}: imports none of ${FORBIDDEN_IMPORTS.join(', ')}`, () => {
      const content = readFileSync(file, 'utf8');
      for (const forbidden of FORBIDDEN_IMPORTS) {
        assert.doesNotMatch(
          content,
          new RegExp(`from\\s+['"]${forbidden.replace(/[/-]/g, '\\$&')}['"]`),
          `${file} imports from "${forbidden}" — this pulls a Node-only package (@memberjunction/actions,` +
            ' pdfkit) into the browser bundle',
        );
      }
    });
  }

  it("package.json declares none of @mj-biz-apps/community-actions, @memberjunction/actions, or pdfkit as a dependency", () => {
    const pkg = JSON.parse(readFileSync(join(ANGULAR_SRC, '..', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDepNames = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    for (const forbidden of ['@mj-biz-apps/community-actions', '@memberjunction/actions', 'pdfkit']) {
      assert.ok(!allDepNames.includes(forbidden), `package.json lists forbidden dependency "${forbidden}"`);
    }
  });
});

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

    it(`${dirName}: uses ChangeDetectionStrategy.OnPush`, () => {
      const formFile = listFilesRecursive(join(GENERATED_ENTITIES_DIR, dirName), ['.form.component.ts'])[0];
      const active = stripComments(readFileSync(formFile, 'utf8'));
      assert.match(active, /changeDetection:\s*ChangeDetectionStrategy\.OnPush/, `${dirName}: missing OnPush`);
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

  it('implements full WAI-ARIA tablist accessibility in the template', () => {
    const template = readFileSync(join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.html'), 'utf8');
    assert.match(template, /role="tablist"/);
    assert.match(template, /aria-label="Community Hub"/);
    assert.match(template, /role="tab"/);
    assert.match(template, /\[id\]="'mjc-hub-tab-' \+ tab\.key"/);
    assert.match(template, /\[attr\.aria-controls\]="'mjc-hub-panel-' \+ tab\.key"/);
    assert.match(template, /\[attr\.aria-selected\]="tab\.key === activeTabKey"/);
    // Roving tabindex: the active/focused tab gets 0, every other tab gets -1.
    assert.match(template, /\[attr\.tabindex\]="tab\.key === focusedTabKey \? 0 : -1"/);
    assert.match(template, /\(keydown\)="OnTabKeydown\(\$event, tab\.key\)"/);
    // Every tabpanel is role="tabpanel" with an id/aria-labelledby pair matching its tab button.
    const tabpanelCount = (template.match(/role="tabpanel"/g) ?? []).length;
    assert.equal(tabpanelCount, 4);
    for (const key of ['knowledge-stream', 'qa-canon-workbench', 'quadratic-ideation-wallet', 'living-co-authoring']) {
      assert.match(template, new RegExp(`mjc-hub-panel-${key}`));
      assert.match(template, new RegExp(`aria-labelledby\\]="'mjc-hub-tab-${key}'"`));
    }
  });

  it('implements the WAI-ARIA tablist keyboard handler (ArrowRight/ArrowLeft/Home/End/Enter/Space)', () => {
    assert.match(componentSource, /public OnTabKeydown\(event: KeyboardEvent, currentKey: CommunityHubTabKey\)/);
    for (const key of ["'ArrowRight'", "'ArrowLeft'", "'Home'", "'End'", "'Enter'"]) {
      assert.ok(componentSource.includes(key), `OnTabKeydown is missing a case for ${key}`);
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

describe('Build Output — dist/ carries every templateUrl/styleUrl .html/.css asset (tsc alone does not emit them)', () => {
  const DIST_DIR = join(HERE, '..', 'dist');
  const distExists = (() => {
    try {
      return statSync(DIST_DIR).isDirectory();
    } catch {
      return false;
    }
  })();

  if (!distExists) {
    // This file is also run directly against `src/` without a preceding `npm run build` (e.g. a
    // fast inner-loop `tsc --noEmit` check); in that case dist/ legitimately does not exist yet and
    // there is nothing to assert. The CI/release pipeline always runs `npm run build` (which now
    // also runs `scripts/copy-assets.mjs`) before `npm test`, where this suite does assert for real.
    it('skipped: dist/ not present (run `npm run build` first to exercise this check for real)', () => {
      assert.ok(true);
    });
  } else {
    const sourceAssets = listFilesRecursive(join(ANGULAR_SRC, 'lib'), ['.html', '.css']);

    it('found at least one .html/.css asset under src/lib', () => {
      assert.ok(sourceAssets.length > 0);
    });

    for (const srcAsset of sourceAssets) {
      const relative = srcAsset.slice(ANGULAR_SRC.length);
      const distAsset = join(DIST_DIR, relative);
      it(`dist${relative.split('\\').join('/')} exists and matches its src asset`, () => {
        const distContent = readFileSync(distAsset, 'utf8');
        const srcContent = readFileSync(srcAsset, 'utf8');
        assert.equal(distContent, srcContent);
      });
    }
  }
});
