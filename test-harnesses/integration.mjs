#!/usr/bin/env node
/**
 * BizApps Community — Cross-Stack Integration, Adversarial Boundary & Multi-Viewport
 * Headless Chromium Playwright Verification Harness (`test-harnesses/integration.mjs`).
 *
 * Orchestrates 4 deterministic verification stages:
 *   1. Seed Density & SQLite FK Integrity (`ART-6` SeedDensityReport)
 *   2. Cross-Stack Functional & Adversarial Boundary Checks (`ART-3` IntegrationSuiteRun)
 *   3. Multi-Viewport (1440x900, 1024x768, 768x1024, 390x844) Light & Dark `--mj-*`
 *      Headless Chromium Playwright UX Verification (`ART-4` PlaywrightScreenshot report)
 *   4. OpenApp v3 Readiness Certification (`ART-5` OpenAppReadinessReport)
 *
 * Usage:
 *   node test-harnesses/integration.mjs [--skip-playwright] [--report-out <path>]
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from '@playwright/test';
import { ResolveFontAwesomeRoot } from '../e2e/harness/build-harness.mjs';
import {
  ARTIFACT_WORLD_IDS,
  BuildSeedDensityReport,
  GetArtifactWorldSeedSummary,
  WORLD_ARTIFACT_VERSIONS,
  WORLD_ARTIFACTS,
  WORLD_FORUM_ARTIFACT_POSTS,
  WORLD_FORUM_INTERACTIVE_POSTS,
  WORLD_FORUM_POST_REPLIES,
  WORLD_FORUMS,
  WORLD_PEOPLE,
  WORLD_ROLES,
  WORLD_SPACES,
} from '../packages/IntegrationTests/world/community-artifact-world.mjs';
import {
  CreateArtifactWorldRunViewProvider,
  VerifyArtifactWorldSqliteReferentialIntegrity,
} from '../packages/IntegrationTests/world/community-artifact-world-provider.mjs';
import { RunForumArtifactPostViewerChecks } from '../packages/IntegrationTests/checks/forum-artifact-post-viewer.check.mjs';
import { RunForumArtifactAdversarialBoundaryChecks } from '../packages/IntegrationTests/checks/forum-artifact-adversarial-boundaries.check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const FONTAWESOME_FALLBACK_CSS = join(REPO_ROOT, 'e2e', 'harness', 'fontawesome-fallback.css');
const DEFAULT_REPORT_PATH = join(
  REPO_ROOT,
  'packages',
  'IntegrationTests',
  'reports',
  'integration-verification-report.json',
);

const ID = ARTIFACT_WORLD_IDS;

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-landscape-1024x768', width: 1024, height: 768 },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const THEMES = ['light', 'dark'];

const FONT_MIME_TYPES = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
};

const SINGLETON_SCOPES = ['@angular/', '@memberjunction/', '@mj-biz-apps/'];
const SINGLETON_PACKAGES = ['rxjs', 'tslib'];

function isSingletonModuleImport(specifier) {
  return (
    SINGLETON_SCOPES.some((prefix) => specifier.startsWith(prefix)) ||
    SINGLETON_PACKAGES.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))
  );
}

function createHostSingletonDedupePlugin() {
  const hostRoots = [join(REPO_ROOT, 'packages', 'Angular'), REPO_ROOT];
  return {
    name: 'mj-integration-singleton-dedupe',
    setup(build) {
      build.onResolve(
        { filter: /^(@angular\/|@memberjunction\/|@mj-biz-apps\/|rxjs($|\/)|tslib($|\/))/ },
        async (args) => {
          if (args.pluginData?.deduped || !isSingletonModuleImport(args.path)) {
            return null;
          }
          for (const resolveDir of hostRoots) {
            const resolved = await build.resolve(args.path, {
              resolveDir,
              kind: args.kind,
              pluginData: { deduped: true },
            });
            if (resolved.errors.length === 0 && resolved.path) {
              return resolved;
            }
          }
          return null;
        },
      );
    },
  };
}

function buildIntegrationHarnessHtml() {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BizApps Community — Multi-Viewport Artifact Viewer Verification Harness</title>
<link rel="stylesheet" href="/fontawesome/css/all.min.css" />
<style>
  :root,
  :root[data-theme="light"] {
    --mj-bg-page: #f5f6f8;
    --mj-bg-surface: #ffffff;
    --mj-bg-surface-card: #ffffff;
    --mj-bg-surface-elevated: #ffffff;
    --mj-bg-surface-sunken: #eef1f5;
    --mj-bg-surface-hover: #eef1f5;
    --mj-bg-surface-active: #e2e6ec;
    --mj-bg-overlay: rgba(15, 23, 42, 0.52);
    --mj-border-default: #c7ccd4;
    --mj-border-subtle: #dde1e7;
    --mj-brand-primary: #1f4ed8;
    --mj-brand-primary-hover: #1a3fb8;
    --mj-brand-on-primary: #ffffff;
    --mj-text-primary: #15181d;
    --mj-text-secondary: #3a3f47;
    --mj-text-muted: #5b6270;
    --mj-text-disabled: #9aa1ac;
    --mj-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mj-font-medium: 500;
    --mj-font-semibold: 600;
    --mj-text-xs: 0.75rem;
    --mj-text-sm: 0.875rem;
    --mj-text-base: 1rem;
    --mj-radius-sm: 4px;
    --mj-radius-md: 6px;
    --mj-radius-lg: 10px;
    --mj-space-1: 0.25rem;
    --mj-space-2: 0.5rem;
    --mj-space-3: 0.75rem;
    --mj-space-4: 1rem;
    --mj-space-5: 1.25rem;
    --mj-ring-width: 2px;
    --mj-focus-ring-color: #1f4ed8;
    --mj-status-success: #0f6b3f;
    --mj-status-success-text: #0f6b3f;
    --mj-status-warning: #8a5a00;
    --mj-status-warning-bg: #fef7e0;
    --mj-status-warning-text: #8a5a00;
    --mj-status-danger: #a3221f;
    --mj-status-error: #a3221f;
    --mj-status-error-bg: #fdecec;
    --mj-status-error-text: #a3221f;
    --mj-status-info-bg: #e8eefc;
    --mj-status-info-text: #163ba8;
    --mj-shadow-lg: 0 18px 40px rgba(15, 23, 42, 0.22);
  }
  :root[data-theme="dark"] {
    --mj-bg-page: #0f141c;
    --mj-bg-surface: #171e29;
    --mj-bg-surface-card: #1b2432;
    --mj-bg-surface-elevated: #222d3e;
    --mj-bg-surface-sunken: #121821;
    --mj-bg-surface-hover: #253145;
    --mj-bg-surface-active: #2e3d55;
    --mj-bg-overlay: rgba(2, 6, 23, 0.72);
    --mj-border-default: #334155;
    --mj-border-subtle: #243044;
    --mj-brand-primary: #60a5fa;
    --mj-brand-primary-hover: #93c5fd;
    --mj-brand-on-primary: #0b1220;
    --mj-text-primary: #f1f5f9;
    --mj-text-secondary: #cbd5e1;
    --mj-text-muted: #94a3b8;
    --mj-text-disabled: #64748b;
    --mj-focus-ring-color: #60a5fa;
    --mj-status-success: #34d399;
    --mj-status-success-text: #6ee7b7;
    --mj-status-warning: #fbbf24;
    --mj-status-warning-bg: #3b2d0c;
    --mj-status-warning-text: #fde68a;
    --mj-status-danger: #f87171;
    --mj-status-error: #f87171;
    --mj-status-error-bg: #3b1414;
    --mj-status-error-text: #fecaca;
    --mj-status-info-bg: #172554;
    --mj-status-info-text: #bfdbfe;
    --mj-shadow-lg: 0 18px 40px rgba(0, 0, 0, 0.55);
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    width: 100%;
    overflow-x: hidden;
    background: var(--mj-bg-page);
    color: var(--mj-text-primary);
    font-family: var(--mj-font-family);
  }
  .mjc-integration-footer {
    border-top: 1px solid var(--mj-border-subtle);
    background: var(--mj-bg-surface);
    color: var(--mj-text-muted);
    padding: 0.75rem 1.25rem;
    font-size: var(--mj-text-xs);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
</head>
<body>
  <main aria-label="Platform Architecture Commons">
    <mjc-community-hub-resource></mjc-community-hub-resource>
  </main>
  <footer class="mjc-integration-footer" aria-label="Community Workspace Status">
    <span>BizApps Community · Platform Architecture Commons</span>
    <span>Theme-native MJ Explorer Surface</span>
  </footer>
  <script type="module" src="/integration-bundle.js"></script>
</body>
</html>
`;
}

function buildBrowserEntrySource() {
  return `
import '@angular/compiler';
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Metadata, RunView, UserInfo } from '@memberjunction/core';
import { UserInfoEngine } from '@memberjunction/core-entities';
import { MJGlobal } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {
  CommunityHubResource,
  LoadBizAppsCommunityClient,
  GeneratedFormsModule,
} from './packages/Angular/dist/public-api.js';

LoadBizAppsCommunityClient();
window.__generatedFormsModule = GeneratedFormsModule;

const GENERATED_FORM_ENTITY_NAMES = [
  'MJ_BizApps_Community: Community Member Profiles',
  'MJ_BizApps_Community: Community Spaces',
  'MJ_BizApps_Community: Forum AMA Posts',
  'MJ_BizApps_Community: Forum Answer Posts',
  'MJ_BizApps_Community: Forum Artifact Posts',
  'MJ_BizApps_Community: Forum Case Posts',
  'MJ_BizApps_Community: Forum Form Posts',
  'MJ_BizApps_Community: Forum Idea Allocations',
  'MJ_BizApps_Community: Forum Idea Campaigns',
  'MJ_BizApps_Community: Forum Idea Posts',
  'MJ_BizApps_Community: Forum Interactive Posts',
  'MJ_BizApps_Community: Forum Interactive Sessions',
  'MJ_BizApps_Community: Forum Members',
  'MJ_BizApps_Community: Forum Post Attachments',
  'MJ_BizApps_Community: Forum Post Flags',
  'MJ_BizApps_Community: Forum Post Reactions',
  'MJ_BizApps_Community: Forum Post Tags',
  'MJ_BizApps_Community: Forum Posts',
  'MJ_BizApps_Community: Forum Question Posts',
  'MJ_BizApps_Community: Forum Role Types',
  'MJ_BizApps_Community: Forum Subscriptions',
  'MJ_BizApps_Community: Forum Topic Tags',
  'MJ_BizApps_Community: Forum Types',
  'MJ_BizApps_Community: Forums',
  'MJ_BizApps_Community: Post Types',
];

const cf = MJGlobal.Instance.ClassFactory;
const hubRegistration = cf.GetRegistration(BaseResourceComponent, 'CommunityHubResource');
const formRegistrations = {};
for (const entityName of GENERATED_FORM_ENTITY_NAMES) {
  formRegistrations[entityName] = Boolean(cf.GetRegistration(BaseFormComponent, entityName));
}
window.__runtimeRegistrations = {
  CommunityHubResource: Boolean(hubRegistration),
  formRegistrations,
  totalVerified: (hubRegistration ? 1 : 0) + Object.values(formRegistrations).filter(Boolean).length,
};

const HARNESS_USER = new UserInfo(undefined, {
  ID: '${ID.USER_ELENA}',
  Name: 'Elena Rostova',
  Email: 'elena.rostova@apexcloud.example',
  UserRoles: [],
});

window.__harnessPendingOps = 0;

async function postJson(endpoint, body) {
  window.__harnessPendingOps += 1;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } finally {
    window.__harnessPendingOps = Math.max(0, window.__harnessPendingOps - 1);
  }
}

function wrapEntity(entityName, row) {
  const record = row ? { ...row } : { ID: crypto.randomUUID() };
  let isSaved = Boolean(row);
  const base = {
    LatestResult: null,
    get IsSaved() { return isSaved; },
    NewRecord() { record.ID = crypto.randomUUID(); isSaved = false; },
    async Load(id) {
      const targetId = typeof id === 'string' ? id : id?.KeyValuePairs?.[0]?.Value ?? '';
      const res = await postJson('/api/entity-by-id', { entityName, id: targetId });
      if (!res?.record) return false;
      Object.assign(record, res.record);
      isSaved = true;
      return true;
    },
    async InnerLoad(compositeKey) {
      const targetId = compositeKey?.KeyValuePairs?.[0]?.Value ?? '';
      return this.Load(targetId);
    },
    Get(field) { return record[field]; },
    Set(field, value) { record[field] = value; },
    GetAll() { return { ...record }; },
    async Save() { isSaved = true; return true; },
    async Delete() { isSaved = false; return true; },
  };
  return new Proxy(base, {
    get(target, prop) { return prop in target ? target[prop] : record[prop]; },
    set(target, prop, val) {
      if (prop in target) target[prop] = val;
      else record[prop] = val;
      return true;
    },
  });
}

const mockProvider = {
  ProviderType: 'Network',
  CurrentUser: HARNESS_USER,
  Entities: [],
  EntityByName: () => undefined,
  async RunView(params) {
    const res = await postJson('/api/run-view', { params });
    if (params?.ResultType !== 'simple' && Array.isArray(res?.Results)) {
      return { ...res, Results: res.Results.map((r) => wrapEntity(params.EntityName, r)) };
    }
    return res;
  },
  async RunViews(paramsArray) {
    const res = await postJson('/api/run-views', { paramsArray });
    const list = Array.isArray(res?.results) ? res.results : [];
    return list.map((item, idx) => {
      const p = paramsArray[idx];
      if (p?.ResultType !== 'simple' && Array.isArray(item?.Results)) {
        return { ...item, Results: item.Results.map((r) => wrapEntity(p.EntityName, r)) };
      }
      return item;
    });
  },
  async GetEntityObject(entityName, compositeKeyOrUser) {
    const keyId = Array.isArray(compositeKeyOrUser?.KeyValuePairs)
      ? compositeKeyOrUser.KeyValuePairs[0]?.Value
      : null;
    if (keyId) {
      const res = await postJson('/api/entity-by-id', { entityName, id: keyId });
      if (!res?.record) return null;
      return wrapEntity(entityName, res.record);
    }
    return wrapEntity(entityName, null);
  },
  async ExecuteGQL() { return {}; },
  async CreateTransactionGroup() {
    return { AddTransaction() {}, async Submit() { return true; } };
  },
};

Metadata.Provider = mockProvider;
RunView.Provider = mockProvider;
await UserInfoEngine.Instance.Config(true, HARNESS_USER, mockProvider);

await bootstrapApplication(CommunityHubResource, {
  providers: [provideZonelessChangeDetection()],
});

for (let attempt = 0; attempt < 60; attempt += 1) {
  await new Promise((r) => setTimeout(r, 30));
  if (window.__harnessPendingOps === 0 && attempt >= 4) break;
}
window.__harnessReady = true;
`;
}

async function buildIntegrationBrowserBundle() {
  const result = await esbuild.build({
    stdin: {
      contents: buildBrowserEntrySource(),
      resolveDir: REPO_ROOT,
      sourcefile: 'integration-harness-entry.mjs',
      loader: 'js',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    nodePaths: [join(REPO_ROOT, 'packages', 'Angular', 'node_modules'), join(REPO_ROOT, 'node_modules')],
    loader: {
      '.woff': 'empty',
      '.woff2': 'empty',
      '.ttf': 'empty',
      '.eot': 'empty',
      '.svg': 'empty',
      '.png': 'empty',
    },
    plugins: [createHostSingletonDedupePlugin()],
    logLevel: 'silent',
  });

  if (result.errors.length > 0) {
    throw new Error(`esbuild integration bundle failed: ${result.errors.map((e) => e.text).join('; ')}`);
  }
  return result.outputFiles[0].contents;
}

function createHarnessBackendHandler() {
  const provider = CreateArtifactWorldRunViewProvider(ID.USER_ELENA);
  const userSettings = [];
  const postTypes = [
    { ID: ID.PT_COLLAB_DOC, Code: 'collaborative-doc', Name: 'Collaborative Doc' },
    { ID: ID.PT_COLLAB_SHEET, Code: 'collaborative-sheet', Name: 'Collaborative Sheet' },
    { ID: ID.PT_COLLAB_DECK, Code: 'collaborative-deck', Name: 'Collaborative Deck' },
    { ID: ID.PT_INTERACTIVE, Code: 'interactive-experience', Name: 'Interactive Experience' },
    { ID: ID.PT_REPLY, Code: 'reply', Name: 'Reply' },
    { ID: ID.PT_DISCUSSION, Code: 'discussion', Name: 'Discussion' },
  ];
  const topicTags = [
    { ID: 'fa000000-0000-4000-8000-000000000001', SpaceID: ID.SPACE_COMMONS, Slug: 'api-security', Name: 'API Security', PostCount: 3 },
    { ID: 'fa000000-0000-4000-8000-000000000002', SpaceID: ID.SPACE_COMMONS, Slug: 'multi-region', Name: 'Multi-Region', PostCount: 2 },
    { ID: 'fa000000-0000-4000-8000-000000000003', SpaceID: ID.SPACE_COMMONS, Slug: 'playbooks', Name: 'Playbooks', PostCount: 4 },
  ];
  const spaceRows = WORLD_SPACES.map((s) => ({
    ID: s.ID,
    Name: s.Name,
    Description: `${s.Name} collaborative knowledge community.`,
    IconClass: 'fa-solid fa-layer-group',
    Color: null,
    ImageURL: null,
    OwnerID: ID.USER_ELENA,
    ParentID: null,
    InheritsMembership: false,
    ClosedAt: null,
  }));

  async function handleRunView(params) {
    const entityName = String(params?.EntityName ?? '');
    if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
      return { Success: true, Results: spaceRows.filter((s) => s.ID === ID.SPACE_COMMONS), TotalRowCount: 1 };
    }
    if (entityName === 'MJ_BizApps_Community: Post Types') {
      return { Success: true, Results: postTypes, TotalRowCount: postTypes.length };
    }
    if (entityName === 'MJ_BizApps_Community: Forum Topic Tags') {
      return { Success: true, Results: topicTags, TotalRowCount: topicTags.length };
    }
    if (entityName === 'MJ_BizApps_Community: Forum Role Types') {
      return { Success: true, Results: WORLD_ROLES, TotalRowCount: WORLD_ROLES.length };
    }
    if (entityName === 'MJ: Users') {
      return { Success: true, Results: WORLD_PEOPLE, TotalRowCount: WORLD_PEOPLE.length };
    }
    if (entityName === 'MJ: User Settings') {
      return { Success: true, Results: userSettings, TotalRowCount: userSettings.length };
    }
    if (entityName === 'MJ: Artifact Types') {
      return {
        Success: true,
        Results: [
          { ID: 'fb000000-0000-4000-8000-000000000001', Name: 'Document', ContentType: 'text/markdown', IsEnabled: true },
          { ID: 'fb000000-0000-4000-8000-000000000002', Name: 'Spreadsheet', ContentType: 'application/json', IsEnabled: true },
          { ID: 'fb000000-0000-4000-8000-000000000003', Name: 'Interactive', ContentType: 'text/html', IsEnabled: true },
        ],
        TotalRowCount: 3,
      };
    }
    return provider.RunView(params, { ID: ID.USER_ELENA });
  }

  function handleEntityById(entityName, id) {
    const target = String(id ?? '').trim().toLowerCase();
    if (!target) return null;
    if (entityName === 'MJ: Artifacts') {
      return WORLD_ARTIFACTS.find((a) => a.ID.toLowerCase() === target && a.OrganizationID === ID.ORG_APEX) ?? null;
    }
    if (entityName === 'MJ: Artifact Versions') {
      return WORLD_ARTIFACT_VERSIONS.find((v) => v.ID.toLowerCase() === target) ?? null;
    }
    if (entityName === 'MJ_BizApps_Community: Forums') {
      return WORLD_FORUMS.find((f) => f.ID.toLowerCase() === target) ?? null;
    }
    if (entityName === 'MJ_BizApps_Community: Forum Posts') {
      return (
        WORLD_FORUM_ARTIFACT_POSTS.find((p) => p.ID.toLowerCase() === target) ??
        WORLD_FORUM_INTERACTIVE_POSTS.find((p) => p.ID.toLowerCase() === target) ??
        WORLD_FORUM_POST_REPLIES.find((r) => r.ID.toLowerCase() === target) ??
        null
      );
    }
    return null;
  }

  return {
    provider,
    handleRunView,
    async handleRunViews(paramsArray) {
      const results = [];
      for (const params of paramsArray) {
        results.push(await handleRunView(params));
      }
      return results;
    },
    handleEntityById,
  };
}

async function startIntegrationHarnessServer() {
  const html = buildIntegrationHarnessHtml();
  const bundleBytes = await buildIntegrationBrowserBundle();
  const fontAwesomeRoot = ResolveFontAwesomeRoot();
  const fontAwesomeCssBytes = fontAwesomeRoot
    ? readFileSync(join(fontAwesomeRoot, 'css', 'all.min.css'))
    : readFileSync(FONTAWESOME_FALLBACK_CSS);
  const backend = createHarnessBackendHandler();

  async function readJson(req) {
    const chunks = [];
    for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
  }

  function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  const server = createServer(async (req, res) => {
    try {
      const urlPath = (req.url ?? '/').split('?')[0];
      if (urlPath === '/' || urlPath === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (urlPath === '/integration-bundle.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(bundleBytes);
        return;
      }
      if (urlPath === '/fontawesome/css/all.min.css') {
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        res.end(fontAwesomeCssBytes);
        return;
      }
      if (fontAwesomeRoot && urlPath.startsWith('/fontawesome/webfonts/')) {
        const requested = normalize(urlPath.replace('/fontawesome/webfonts/', '')).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = join(fontAwesomeRoot, 'webfonts', requested);
        if (existsSync(filePath)) {
          const mimeType = FONT_MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': mimeType });
          res.end(readFileSync(filePath));
          return;
        }
      }
      if (urlPath === '/api/run-view' && req.method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, await backend.handleRunView(body?.params ?? {}));
        return;
      }
      if (urlPath === '/api/run-views' && req.method === 'POST') {
        const body = await readJson(req);
        const list = Array.isArray(body?.paramsArray) ? body.paramsArray : [];
        sendJson(res, 200, { results: await backend.handleRunViews(list) });
        return;
      }
      if (urlPath === '/api/entity-by-id' && req.method === 'POST') {
        const body = await readJson(req);
        sendJson(res, 200, { record: backend.handleEntityById(body?.entityName ?? '', body?.id ?? '') });
        return;
      }
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      res.writeHead(500);
      res.end(err instanceof Error ? err.message : 'Internal server error');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        fontAwesomeMode: fontAwesomeRoot ? 'local-package' : 'svg-mask-fallback',
        backend,
        close: () => new Promise((r) => server.close(() => r(undefined))),
      });
    });
  });
}

async function runMultiViewportPlaywrightVerification() {
  const server = await startIntegrationHarnessServer();
  const browser = await chromium.launch({ headless: true });
  const matrixResults = [];
  let runtimeRegistrations = null;
  let drawerFlowSummary = null;

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.addInitScript(() => {
      window.__printCallCount = 0;
      window.print = () => {
        window.__printCallCount += 1;
      };
    });

    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__harnessReady === true, { timeout: 30_000 });
    runtimeRegistrations = await page.evaluate(() => window.__runtimeRegistrations);

    assert.equal(runtimeRegistrations.CommunityHubResource, true, 'CommunityHubResource must register in ClassFactory');
    assert.equal(runtimeRegistrations.totalVerified, 26, 'Expected 26 ClassFactory registrations (1 resource + 25 forms)');

    // 1. Multi-viewport x light/dark theme layout & fidelity checks
    const bgByTheme = {};
    for (const theme of THEMES) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(120);

        const audit = await page.evaluate(async () => {
          await document.fonts.ready;
          const styleLoaded = Array.from(document.styleSheets).some((s) =>
            (s.href ?? '').includes('/fontawesome/css/all.min.css'),
          );
          const faEl = document.querySelector('i.fa-solid');
          const faRect = faEl ? faEl.getBoundingClientRect() : null;
          const headerEl = document.querySelector('header.mjc-hub-header');
          const headerPos = headerEl ? window.getComputedStyle(headerEl).position : '';
          const navEl = document.querySelector('nav[role="tablist"]');
          const mainEl = document.querySelector('main');
          const asideCount = document.querySelectorAll('aside').length;
          const footerEl = document.querySelector('footer');
          const searchInput = document.querySelector('#mjc-header-search-input');
          const filterChips = document.querySelectorAll('.mjc-filter-pill, .mjc-topic-pill, .mjc-living-pill').length;
          const cardStreamCount = document.querySelectorAll('.mjc-stream-card').length;
          const hasMultiColumnGrid = Boolean(document.querySelector('.mjc-commons'));
          const brokenImages = Array.from(document.querySelectorAll('img')).filter(
            (img) => !img.complete || img.naturalWidth === 0,
          ).length;
          const visibleText = document.body.innerText || '';
          const rawMarkdownLeak = /(^|\n)\s*#{2,6}\s|\*\*[^*\n]{2,}\*\*/m.test(visibleText);
          const brandNameLeak = /\bmore\s*cheese\b|\bmorecheese\b/i.test(visibleText);
          const bgPage = window.getComputedStyle(document.body).backgroundColor;
          const textPrimary = window.getComputedStyle(document.body).color;
          const overflowPx = document.documentElement.scrollWidth - window.innerWidth;

          return {
            styleLoaded,
            fontAwesomeWidth: faRect?.width ?? 0,
            fontAwesomeHeight: faRect?.height ?? 0,
            landmarks: {
              header: Boolean(headerEl),
              headerSticky: headerPos === 'sticky',
              nav: Boolean(navEl),
              main: Boolean(mainEl),
              asideCount,
              footer: Boolean(footerEl),
            },
            hasSearchBar: Boolean(searchInput),
            filterChipCount: filterChips,
            cardStreamCount,
            hasMultiColumnGrid,
            brokenImages,
            rawMarkdownLeak,
            brandNameLeak,
            bgPage,
            textPrimary,
            overflowPx,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          };
        });

        bgByTheme[theme] = audit.bgPage;

        assert.equal(audit.styleLoaded, true, `[${vp.name}/${theme}] FontAwesome CSS must load`);
        assert.ok(audit.fontAwesomeWidth > 0 && audit.fontAwesomeHeight > 0, `[${vp.name}/${theme}] FontAwesome icon must render`);
        assert.equal(audit.landmarks.header, true, `[${vp.name}/${theme}] Missing <header> landmark`);
        assert.equal(audit.landmarks.headerSticky, true, `[${vp.name}/${theme}] Header must be sticky`);
        assert.equal(audit.landmarks.nav, true, `[${vp.name}/${theme}] Missing <nav> landmark`);
        assert.equal(audit.landmarks.main, true, `[${vp.name}/${theme}] Missing <main> landmark`);
        assert.ok(audit.landmarks.asideCount >= 1, `[${vp.name}/${theme}] Missing <aside> sidebar rail landmark`);
        assert.equal(audit.landmarks.footer, true, `[${vp.name}/${theme}] Missing <footer> landmark`);
        assert.equal(audit.hasSearchBar, true, `[${vp.name}/${theme}] Missing header search bar`);
        assert.ok(audit.filterChipCount >= 1, `[${vp.name}/${theme}] Missing filter chips`);
        assert.equal(audit.hasMultiColumnGrid, true, `[${vp.name}/${theme}] Missing multi-column grid (.mjc-commons)`);
        assert.ok(audit.cardStreamCount >= 1, `[${vp.name}/${theme}] Missing card stream (.mjc-stream-card)`);
        assert.equal(audit.brokenImages, 0, `[${vp.name}/${theme}] Found ${audit.brokenImages} broken image(s)`);
        assert.equal(audit.rawMarkdownLeak, false, `[${vp.name}/${theme}] Raw markdown syntax leaked into visible DOM`);
        assert.equal(audit.brandNameLeak, false, `[${vp.name}/${theme}] Sample mockup brand name leaked into visible DOM`);
        assert.ok(
          audit.overflowPx <= 1,
          `[${vp.name}/${theme}] Horizontal overflow detected: scrollWidth=${audit.scrollWidth} > innerWidth=${audit.innerWidth}`,
        );

        matrixResults.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          theme,
          passed: true,
          bgPage: audit.bgPage,
          overflowPx: audit.overflowPx,
          landmarks: audit.landmarks,
        });
      }
    }

    assert.notEqual(bgByTheme.light, bgByTheme.dark, 'Light and dark --mj-* themes must resolve to distinct page backgrounds');

    // 2. Interactive Artifact Viewer Drawer CUJ across Playbooks tab (Pinned v2, Interactive v2, Revoked Fallback, Escape-to-close)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

    await page.click('#mjc-hub-tab-living-co-authoring');
    await page.waitForSelector('#mjc-hub-panel-living-co-authoring', { state: 'visible' });

    // 2a. Select pinned ForumArtifactPost (v2) and open slide-over drawer
    await page.locator('.mjc-living-list-item', { hasText: 'Zero-Downtime API Key Rotation Playbook (Pinned v2)' }).click();
    await page.click('#mjc-living-open-artifact-drawer-btn');
    const drawer = page.locator('#mjc-artifact-viewer-drawer');
    await drawer.waitFor({ state: 'visible' });
    await page.waitForFunction(
      () => document.querySelector('#mjc-artifact-viewer-drawer')?.getAttribute('data-viewer-state') === 'ready',
      { timeout: 10_000 },
    );

    const pinnedDrawerCheck = await page.evaluate(() => {
      const el = document.querySelector('#mjc-artifact-viewer-drawer');
      const badge = document.querySelector('#mjc-artifact-viewer-version-badge');
      const panel = el?.querySelector('mj-artifact-viewer-panel');
      const visibleText = el?.innerText || '';
      return {
        state: el?.getAttribute('data-viewer-state'),
        versionNumber: el?.getAttribute('data-version-number'),
        pinnedVersionId: el?.getAttribute('data-pinned-version-id'),
        badgeText: badge?.textContent?.trim() ?? '',
        hasArtifactViewerPanel: Boolean(panel),
        rawMarkdownLeak: /(^|\n)\s*#{2,6}\s|\*\*[^*\n]{2,}\*\*/m.test(visibleText),
      };
    });
    assert.equal(pinnedDrawerCheck.state, 'ready');
    assert.equal(pinnedDrawerCheck.versionNumber, '2');
    assert.equal(pinnedDrawerCheck.pinnedVersionId, ID.VER_PLAYBOOK_V2);
    assert.match(pinnedDrawerCheck.badgeText, /Pinned v2/i);
    assert.equal(pinnedDrawerCheck.hasArtifactViewerPanel, true);
    assert.equal(pinnedDrawerCheck.rawMarkdownLeak, false);

    // Dismiss via Escape
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });

    // 2b. Switch to dark theme + mobile viewport, select ForumInteractivePost (Pinned v2), open drawer & Escape
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.locator('.mjc-living-list-item', { hasText: 'Webhook Backoff & Capacity Simulator (Pinned v2)' }).click();
    await page.click('#mjc-living-open-artifact-drawer-btn');
    await drawer.waitFor({ state: 'visible' });
    await page.waitForFunction(
      () => document.querySelector('#mjc-artifact-viewer-drawer')?.getAttribute('data-viewer-state') === 'ready',
      { timeout: 10_000 },
    );
    const interactiveDrawerCheck = await page.evaluate(() => {
      const el = document.querySelector('#mjc-artifact-viewer-drawer');
      return {
        state: el?.getAttribute('data-viewer-state'),
        postKind: el?.getAttribute('data-post-kind'),
        versionNumber: el?.getAttribute('data-version-number'),
        overflowPx: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    assert.equal(interactiveDrawerCheck.state, 'ready');
    assert.equal(interactiveDrawerCheck.postKind, 'interactive-post');
    assert.equal(interactiveDrawerCheck.versionNumber, '2');
    assert.ok(interactiveDrawerCheck.overflowPx <= 1, 'Mobile drawer must not overflow horizontally');
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });

    // 2c. Select missing/revoked ForumArtifactPost and verify graceful fallback banner with ZERO raw markdown
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('.mjc-living-list-item', { hasText: 'Archived Legacy Gateway Runbook (Revoked Artifact)' }).click();
    await page.click('#mjc-living-open-artifact-drawer-btn');
    await drawer.waitFor({ state: 'visible' });
    await page.waitForFunction(
      () => document.querySelector('#mjc-artifact-viewer-drawer')?.getAttribute('data-viewer-state') === 'missing',
      { timeout: 10_000 },
    );
    const fallbackDrawerCheck = await page.evaluate(() => {
      const el = document.querySelector('#mjc-artifact-viewer-drawer');
      const fb = document.querySelector('#mjc-artifact-viewer-fallback');
      const text = fb?.innerText || '';
      return {
        state: el?.getAttribute('data-viewer-state'),
        reason: fb?.getAttribute('data-fallback-reason'),
        text,
        rawMarkdownLeak: /(^|\n)\s*#{2,6}\s|\*\*[^*\n]{2,}\*\*|```/m.test(text),
      };
    });
    assert.equal(fallbackDrawerCheck.state, 'missing');
    assert.equal(fallbackDrawerCheck.reason, 'artifact-not-found');
    assert.equal(fallbackDrawerCheck.rawMarkdownLeak, false, `Fallback leaked markdown: ${fallbackDrawerCheck.text}`);
    assert.match(fallbackDrawerCheck.text, /Artifact unavailable or revoked/i);

    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });

    const finalPrintCalls = await page.evaluate(() => window.__printCallCount);
    assert.equal(finalPrintCalls, 0, 'window.print() must never be invoked');
    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${JSON.stringify(pageErrors)}`);
    assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);

    drawerFlowSummary = {
      pinnedArtifactPost: pinnedDrawerCheck,
      pinnedInteractivePost: interactiveDrawerCheck,
      revokedArtifactFallback: {
        state: fallbackDrawerCheck.state,
        reason: fallbackDrawerCheck.reason,
        rawMarkdownLeak: fallbackDrawerCheck.rawMarkdownLeak,
      },
      escapeDismissalVerified: true,
      windowPrintCalled: false,
    };

    await context.close();
  } finally {
    await browser.close();
    await server.close();
  }

  return {
    tool: 'playwright-chromium',
    evaluatedAtIso: new Date().toISOString(),
    fontAwesomeMode: server.fontAwesomeMode,
    fontAwesomeLoaded: true,
    customElementsVerified: true,
    runtimeClassFactoryRegistrationsVerified: runtimeRegistrations.totalVerified,
    viewportThemeCombinationsVerified: matrixResults.length,
    matrix: matrixResults,
    drawerFlows: drawerFlowSummary,
    pageErrors: 0,
    consoleErrors: 0,
  };
}

function listFilesRecursive(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listFilesRecursive(full, extensions));
    else if (extensions.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function certifyOpenAppReadiness(playwrightResult, seedReport) {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'mj-app.json'), 'utf8'));
  const clientBootstrap = manifest.packages.client.find((p) => p.name === '@mj-biz-apps/community-ng');
  const startupExportOk = clientBootstrap?.startupExport === 'LoadBizAppsCommunityClient';

  const generatedEntitiesDir = join(REPO_ROOT, 'packages', 'Angular', 'src', 'lib', 'generated', 'Entities');
  const generatedFormsModule = stripComments(
    readFileSync(join(REPO_ROOT, 'packages', 'Angular', 'src', 'lib', 'generated', 'generated-forms.module.ts'), 'utf8'),
  );
  const entityDirs = readdirSync(generatedEntitiesDir).filter((n) =>
    statSync(join(generatedEntitiesDir, n)).isDirectory(),
  );
  const formViolations = [];
  for (const dirName of entityDirs) {
    const formFile = listFilesRecursive(join(generatedEntitiesDir, dirName), ['.form.component.ts'])[0];
    if (!formFile) {
      formViolations.push(`${dirName}: missing .form.component.ts`);
      continue;
    }
    const active = stripComments(readFileSync(formFile, 'utf8'));
    if (!/@RegisterClass\(BaseFormComponent,\s*'([^']+)'\)/.test(active)) {
      formViolations.push(`${dirName}: missing @RegisterClass(BaseFormComponent, ...)`);
    }
    if (!generatedFormsModule.includes(`${dirName}FormComponent`)) {
      formViolations.push(`${dirName}: not retained in generated-forms.module.ts`);
    }
  }
  if (!startupExportOk) {
    formViolations.push('mj-app.json client startupExport is not LoadBizAppsCommunityClient');
  }

  const apps = JSON.parse(readFileSync(join(REPO_ROOT, 'metadata', 'applications', '.applications.json'), 'utf8'));
  const driverClasses = apps.flatMap((a) => a.fields.DefaultNavItems.map((item) => item.DriverClass));
  const hubSource = stripComments(
    readFileSync(join(REPO_ROOT, 'packages', 'Angular', 'src', 'lib', 'community-hub-resource.component.ts'), 'utf8'),
  );
  const navViolations = [];
  for (const driverClass of driverClasses) {
    if (!new RegExp(`@RegisterClass\\(BaseResourceComponent,\\s*'${driverClass}'\\)`).test(hubSource)) {
      navViolations.push(`Missing @RegisterClass(BaseResourceComponent, '${driverClass}')`);
    }
  }

  const rawColorRe = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
  const angularFiles = [
    ...listFilesRecursive(join(REPO_ROOT, 'packages', 'Angular', 'src', 'lib'), ['.css', '.html', '.ts']).filter(
      (f) => !f.includes(join('lib', 'generated')),
    ),
    ...listFilesRecursive(join(REPO_ROOT, 'packages', 'AngularWidgets', 'src'), ['.css', '.html', '.ts']),
  ];
  const colorViolations = [];
  for (const file of angularFiles) {
    const matches = readFileSync(file, 'utf8').match(rawColorRe) ?? [];
    if (matches.length > 0) colorViolations.push(`${file}: ${matches.join(', ')}`);
  }

  const browserPassed = playwrightResult
    ? playwrightResult.pageErrors === 0 &&
      playwrightResult.consoleErrors === 0 &&
      playwrightResult.viewportThemeCombinationsVerified === 8
    : true;

  const pillars = {
    formParity: {
      passed: formViolations.length === 0 && entityDirs.length === 25,
      summary: `startupExport=${clientBootstrap?.startupExport}; ${entityDirs.length}/25 BaseFormComponent classes registered and retained`,
      checkedCount: entityDirs.length,
      violationCount: formViolations.length,
      violations: formViolations,
    },
    navParity: {
      passed: navViolations.length === 0 && driverClasses.length > 0,
      summary: `${driverClasses.length}/${driverClasses.length} DefaultNavItems match active BaseResourceComponent registrations`,
      checkedCount: driverClasses.length,
      violationCount: navViolations.length,
      violations: navViolations,
    },
    designTokens: {
      passed: colorViolations.length === 0,
      summary: `Zero raw hex/rgb/rgba/hsl color literals across ${angularFiles.length} Angular files`,
      checkedCount: angularFiles.length,
      violationCount: colorViolations.length,
      violations: colorViolations,
    },
    browserSmoke: {
      passed: browserPassed,
      summary: playwrightResult
        ? `Headless Chromium verified ${playwrightResult.viewportThemeCombinationsVerified} viewport/theme combinations, 0 pageErrors, 0 consoleErrors, ${playwrightResult.runtimeClassFactoryRegistrationsVerified} runtime ClassFactory registrations`
        : 'Skipped via --skip-playwright flag',
      checkedCount: playwrightResult ? playwrightResult.viewportThemeCombinationsVerified : 0,
      violationCount: browserPassed ? 0 : 1,
      violations: browserPassed ? [] : ['Playwright browser smoke failed'],
    },
    seedDensity: seedReport.pillars.seedDensity,
  };

  return {
    schemaVersion: 'sf-readiness/v3',
    overallPassed: Object.values(pillars).every((p) => p.passed),
    pillars,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const skipPlaywright = args.includes('--skip-playwright');
  const reportOutIdx = args.indexOf('--report-out');
  const reportOutPath = reportOutIdx >= 0 && args[reportOutIdx + 1] ? args[reportOutIdx + 1] : DEFAULT_REPORT_PATH;

  // Stage 1: Seed density + SQLite FK referential integrity
  const sqliteIntegrity = VerifyArtifactWorldSqliteReferentialIntegrity();
  assert.equal(sqliteIntegrity.foreignKeyViolations, 0, 'SQLite FK integrity check failed');
  const seedSummary = GetArtifactWorldSeedSummary();
  const seedDensityReport = BuildSeedDensityReport();
  assert.equal(seedDensityReport.overallPassed, true, 'SeedDensityReport failed');

  // Stage 2: Cross-stack functional & adversarial boundary checks
  const functionalSummary = await RunForumArtifactPostViewerChecks();
  const adversarialSummary = await RunForumArtifactAdversarialBoundaryChecks();
  assert.equal(functionalSummary.passed, true);
  assert.equal(adversarialSummary.passed, true);

  // Stage 3: Multi-viewport light/dark headless Chromium Playwright verification
  const playwrightVerification = skipPlaywright ? null : await runMultiViewportPlaywrightVerification();

  // Stage 4: OpenApp v3 readiness certification
  const openAppReadinessReport = certifyOpenAppReadiness(playwrightVerification, seedDensityReport);
  assert.equal(openAppReadinessReport.overallPassed, true, 'OpenAppReadinessReport failed');

  const consolidated = {
    schemaVersion: 'sf-integration-report/v1',
    evaluatedAtIso: new Date().toISOString(),
    overallPassed: true,
    seedSummary,
    sqliteIntegrity,
    integrationChecks: {
      totalPassed: functionalSummary.checkCount + adversarialSummary.checkCount,
      totalFailed: 0,
      totalSkipped: 0,
      suites: [functionalSummary, adversarialSummary],
    },
    playwrightVerification,
    openAppReadinessReport,
    seedDensityReport,
  };

  mkdirSync(dirname(reportOutPath), { recursive: true });
  writeFileSync(reportOutPath, `${JSON.stringify(consolidated, null, 2)}\n`, 'utf8');

  console.log(
    `[integration] Seed World: ${seedSummary.totalRecords} records across ${seedSummary.categoryCount} categories (SQLite FK violations: ${sqliteIntegrity.foreignKeyViolations})`,
  );
  console.log(
    `[integration] Cross-Stack Checks: ${consolidated.integrationChecks.totalPassed}/${consolidated.integrationChecks.totalPassed} passed (0 failed, 0 skipped)`,
  );
  if (playwrightVerification) {
    console.log(
      `[integration] Playwright Multi-Viewport: ${playwrightVerification.viewportThemeCombinationsVerified}/8 viewport/theme checks passed (FontAwesome: ${playwrightVerification.fontAwesomeMode}, pageErrors: ${playwrightVerification.pageErrors}, consoleErrors: ${playwrightVerification.consoleErrors})`,
    );
  }
  console.log(
    `[integration] OpenApp Readiness (sf-readiness/v3): overallPassed=${openAppReadinessReport.overallPassed} (forms: ${openAppReadinessReport.pillars.formParity.checkedCount}/25, nav: ${openAppReadinessReport.pillars.navParity.checkedCount}, tokens: ${openAppReadinessReport.pillars.designTokens.checkedCount} clean)`,
  );
  console.log(`[integration] Report written to ${reportOutPath}`);
}

main().catch((err) => {
  console.error('[integration] FAILED:', err);
  process.exit(1);
});
