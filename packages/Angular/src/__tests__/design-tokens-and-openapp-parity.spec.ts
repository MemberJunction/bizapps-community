import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MJGlobal } from '@memberjunction/global';
import { BaseEntity } from '@memberjunction/core';
import { LoadBizAppsCommunityEntities } from '@mj-biz-apps/community-entities';
import {
  ArtifactPostUIDriver,
  InteractivePostUIDriver,
  PostUIDriverRegistry,
  RegisterBuiltInCommunityUIDrivers,
} from '@mj-biz-apps/community-ng-widgets';

const HERE = dirname(fileURLToPath(import.meta.url));
const ANGULAR_ROOT = join(HERE, '..', '..');
const ANGULAR_SRC = join(ANGULAR_ROOT, 'src');
const REPO_ROOT = join(ANGULAR_ROOT, '..', '..');
const GENERATED_ENTITIES_DIR = join(ANGULAR_SRC, 'lib', 'generated', 'Entities');
const GENERATED_FORMS_MODULE = join(ANGULAR_SRC, 'lib', 'generated', 'generated-forms.module.ts');
const APPLICATIONS_METADATA = join(REPO_ROOT, 'metadata', 'applications', '.applications.json');
const MJ_APP_MANIFEST = join(REPO_ROOT, 'mj-app.json');

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

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('AC-1 & AC-3 — Dependency Pinning, --mj-* Design Tokens & Zero window.print()/localStorage', () => {
  it('declares @memberjunction/ng-artifacts matching exact @memberjunction/*@6.3.0-edge.1 peer/dev caret-pinning rules', () => {
    const pkg = JSON.parse(readFileSync(join(ANGULAR_ROOT, 'package.json'), 'utf8')) as {
      peerDependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    assert.equal(pkg.peerDependencies?.['@memberjunction/ng-artifacts'], '^6.3.0-edge.1');
    assert.equal(pkg.devDependencies?.['@memberjunction/ng-artifacts'], '6.3.0-edge.1');
  });

  const RAW_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
  const WINDOW_PRINT_PATTERN = /\bwindow\.print\s*\(/g;
  const BROWSER_STORAGE_PATTERN = /\b(?:localStorage|sessionStorage)\b/g;

  const handwrittenFiles = listFilesRecursive(join(ANGULAR_SRC, 'lib'), ['.css', '.html', '.ts']).filter(
    (f) => !f.includes(join('lib', 'generated')),
  );

  it('verifies zero raw #hex, rgb(), rgba(), or hsl() color literals in all handwritten Angular .css/.html/.ts files', () => {
    assert.ok(handwrittenFiles.length > 0);
    const violations: string[] = [];
    for (const file of handwrittenFiles) {
      const content = readFileSync(file, 'utf8');
      const matches = content.match(RAW_COLOR_PATTERN) ?? [];
      if (matches.length > 0) {
        violations.push(`${file}: ${matches.join(', ')}`);
      }
    }
    assert.deepEqual(violations, []);
  });

  it('verifies zero window.print(), localStorage, or sessionStorage calls across handwritten Angular sources', () => {
    const violations: string[] = [];
    for (const file of handwrittenFiles) {
      const active = stripComments(readFileSync(file, 'utf8'));
      const printMatches = active.match(WINDOW_PRINT_PATTERN) ?? [];
      const storageMatches = active.match(BROWSER_STORAGE_PATTERN) ?? [];
      if (printMatches.length > 0) {
        violations.push(`${file}: forbidden window.print()`);
      }
      if (storageMatches.length > 0) {
        violations.push(`${file}: forbidden browser storage (${storageMatches.join(', ')})`);
      }
    }
    assert.deepEqual(violations, []);
  });

  it('verifies community-artifact-viewer.component.css uses semantic --mj-* CSS custom properties', () => {
    const css = readFileSync(join(ANGULAR_SRC, 'lib', 'community-artifact-viewer.component.css'), 'utf8');
    assert.match(css, /var\(--mj-bg-surface\)/);
    assert.match(css, /var\(--mj-border-default\)/);
    assert.match(css, /var\(--mj-text-primary\)/);
    assert.match(css, /var\(--mj-brand-primary\)/);
    assert.equal((css.match(RAW_COLOR_PATTERN) ?? []).length, 0);
  });

  it('verifies every <img> element across all Angular templates declares an explicit accessible alt= attribute (WCAG 1.1.1)', () => {
    const htmlFiles = listFilesRecursive(ANGULAR_SRC, ['.html']);
    assert.ok(htmlFiles.length > 0);
    const violations: string[] = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
      for (const tag of imgTags) {
        if (!/\salt\s*=/i.test(tag)) {
          violations.push(`${file}: <img> missing explicit alt= attribute -> ${tag.replace(/\s+/g, ' ').trim()}`);
        }
      }
    }
    assert.deepEqual(violations, []);
  });
});

describe('AC-4 — OpenApp Dual Form Registration Parity & Navigation/Resource Parity', () => {
  it('retains active @RegisterClass(BaseFormComponent, "<EntityName>") for all 25 entities reachable from mj-app.json startupExport', () => {
    const manifest = JSON.parse(readFileSync(MJ_APP_MANIFEST, 'utf8')) as {
      packages: { client: Array<{ name: string; startupExport?: string }> };
    };
    const clientBootstrapPkg = manifest.packages.client.find((p) => p.name === '@mj-biz-apps/community-ng');
    assert.equal(clientBootstrapPkg?.startupExport, 'LoadBizAppsCommunityClient');

    const publicApi = stripComments(readFileSync(join(ANGULAR_SRC, 'public-api.ts'), 'utf8'));
    assert.match(publicApi, /client-bootstrap/);
    assert.match(publicApi, /generated-forms\.module/);
    assert.match(publicApi, /community-artifact-viewer\.component/);
    assert.match(publicApi, /community-hub-resource\.component/);

    const formDirs = readdirSync(GENERATED_ENTITIES_DIR).filter((name) =>
      statSync(join(GENERATED_ENTITIES_DIR, name)).isDirectory(),
    );
    assert.equal(formDirs.length, 25);

    const moduleSource = stripComments(readFileSync(GENERATED_FORMS_MODULE, 'utf8'));
    const entityNames = new Set<string>();
    for (const dirName of formDirs) {
      const formFile = listFilesRecursive(join(GENERATED_ENTITIES_DIR, dirName), ['.form.component.ts'])[0];
      assert.ok(formFile, `Missing form component in ${dirName}`);
      const active = stripComments(readFileSync(formFile, 'utf8'));
      const regMatch = active.match(/@RegisterClass\(BaseFormComponent,\s*'([^']+)'\)/);
      assert.ok(regMatch, `${dirName} missing active @RegisterClass(BaseFormComponent, ...)`);
      entityNames.add(regMatch![1]);
      assert.match(moduleSource, new RegExp(`${dirName}FormComponent\\b`));
    }
    assert.equal(entityNames.size, 25);
    assert.ok(entityNames.has('MJ_BizApps_Community: Forum Artifact Posts'));
    assert.ok(entityNames.has('MJ_BizApps_Community: Forum Interactive Posts'));
  });

  it('registers runtime entities and UI drivers in MJGlobal.Instance.ClassFactory', () => {
    LoadBizAppsCommunityEntities();
    RegisterBuiltInCommunityUIDrivers();

    assert.ok(
      MJGlobal.Instance.ClassFactory.GetRegistration(BaseEntity, 'MJ_BizApps_Community: Forum Artifact Posts'),
      'Forum Artifact Posts entity must be registered in ClassFactory',
    );
    assert.ok(
      MJGlobal.Instance.ClassFactory.GetRegistration(BaseEntity, 'MJ_BizApps_Community: Forum Interactive Posts'),
      'Forum Interactive Posts entity must be registered in ClassFactory',
    );
    assert.ok(
      PostUIDriverRegistry.Instance.Resolve({ Code: 'collaborative-doc', UIDriverClass: 'ArtifactPostUIDriver' }) instanceof ArtifactPostUIDriver,
      'ArtifactPostUIDriver must be registered in PostUIDriverRegistry',
    );
    assert.ok(
      PostUIDriverRegistry.Instance.Resolve({ Code: 'interactive-experience', UIDriverClass: 'InteractivePostUIDriver' }) instanceof InteractivePostUIDriver,
      'InteractivePostUIDriver must be registered in PostUIDriverRegistry',
    );
  });

  it('preserves BaseResourceComponent registration, <mj-page-layout>, NotifyLoadComplete(), and DefaultNavItems parity', () => {
    const apps = JSON.parse(readFileSync(APPLICATIONS_METADATA, 'utf8')) as Array<{
      fields: { DefaultNavItems: Array<{ DriverClass: string }> };
    }>;
    const driverClasses = apps.flatMap((app) => app.fields.DefaultNavItems.map((item) => item.DriverClass));
    assert.ok(driverClasses.includes('CommunityHubResource'));

    const hubTs = stripComments(readFileSync(join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.ts'), 'utf8'));
    const hubHtml = readFileSync(join(ANGULAR_SRC, 'lib', 'community-hub-resource.component.html'), 'utf8');

    assert.match(hubTs, /@RegisterClass\(BaseResourceComponent,\s*'CommunityHubResource'\)/);
    assert.match(hubTs, /extends BaseResourceComponent/);
    assert.match(hubTs, /queueMicrotask\([\s\S]*?this\.NotifyLoadStarted\(\)/);
    assert.match(hubTs, /this\.NotifyLoadComplete\(\)/);
    assert.match(hubHtml, /<mj-page-layout>/);
    assert.match(hubHtml, /<\/mj-page-layout>/);
  });
});
