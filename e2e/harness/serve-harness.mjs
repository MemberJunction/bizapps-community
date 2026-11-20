import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { BuildCommunityHubHarnessHtml, ResolveFontAwesomeRoot } from './build-harness.mjs';
import { createHarnessStore } from './harness-store.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const ENTRY_PATH = join(HERE, 'angular-harness-entry.mjs');
const FONTAWESOME_FALLBACK_CSS = join(HERE, 'fontawesome-fallback.css');

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

/**
 * Resolves Angular, MemberJunction, and BizApps singleton packages from the host package's
 * dependency graph first so transitive imports across separately-linked workspace packages
 * (such as `.ci/bizapps-collaboration` vs `@mj-biz-apps/community-ng`) cannot bundle a second
 * `@memberjunction/global` or `@angular/*` instance and split `MJGlobal.Instance.ClassFactory`.
 */
function createHostSingletonDedupePlugin() {
  const hostRoots = [join(REPO_ROOT, 'packages', 'Angular'), REPO_ROOT];
  return {
    name: 'mj-host-singleton-dedupe',
    setup(build) {
      build.onResolve({ filter: /^(@angular\/|@memberjunction\/|@mj-biz-apps\/|rxjs($|\/)|tslib($|\/))/ }, async (args) => {
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
      });
    },
  };
}

/**
 * Bundles the real Angular 21 `CommunityHubResource` + 25 generated form registrations in memory
 * using `esbuild`, failing loudly if the Angular `dist` output cannot be bundled or linked.
 */
async function buildAngularBrowserBundle() {
  const result = await esbuild.build({
    entryPoints: [ENTRY_PATH],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    nodePaths: [
      join(REPO_ROOT, 'packages', 'Angular', 'node_modules'),
      join(REPO_ROOT, 'node_modules'),
    ],
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
    throw new Error(`esbuild harness bundle errors: ${result.errors.map((e) => e.text).join('; ')}`);
  }

  const jsFile = result.outputFiles.find((f) => f.path.endsWith('.js')) ?? result.outputFiles[0];
  if (!jsFile) {
    throw new Error('esbuild harness build did not produce an output bundle.');
  }
  return jsFile.contents;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/** Starts the real Angular 21 harness HTTP server and returns `{ url, close, fontAwesomeMode }`. */
export async function StartHarnessServer() {
  const html = BuildCommunityHubHarnessHtml();
  const bundleBytes = await buildAngularBrowserBundle();
  const fontAwesomeRoot = ResolveFontAwesomeRoot();
  const fontAwesomeCssBytes = fontAwesomeRoot
    ? readFileSync(join(fontAwesomeRoot, 'css', 'all.min.css'))
    : readFileSync(FONTAWESOME_FALLBACK_CSS);
  const store = createHarnessStore();

  const server = createServer(async (req, res) => {
    try {
      const urlPath = (req.url ?? '/').split('?')[0];
      if (urlPath === '/api/harness/reset' && req.method === 'POST') {
        store.reset();
        sendJson(res, 200, { Success: true });
        return;
      }
      if (urlPath === '/api/harness/faults' && req.method === 'POST') {
        const body = await readJsonBody(req);
        store.setFaults(body ?? {});
        sendJson(res, 200, { Success: true });
        return;
      }
      if (urlPath === '/api/harness/state' && req.method === 'GET') {
        sendJson(res, 200, store.getDebugSnapshot());
        return;
      }
      if (urlPath === '/api/harness/user-settings' && req.method === 'GET') {
        sendJson(res, 200, { settings: store.getUserSettings() });
        return;
      }
      if (urlPath === '/api/harness/user-settings' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (typeof body?.key === 'string' && typeof body?.value === 'string') {
          store.setUserSetting(body.key, body.value);
        }
        sendJson(res, 200, { Success: true, settings: store.getUserSettings() });
        return;
      }
      if (urlPath === '/api/harness/run-view' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const results = store.runView(body?.params ?? {});
        sendJson(res, 200, { Success: true, Results: results, TotalRowCount: results.length });
        return;
      }
      if (urlPath === '/api/harness/entity-by-id' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const record = store.getEntityById(body?.entityName ?? '', body?.id ?? '');
        sendJson(res, 200, { record });
        return;
      }
      if (urlPath === '/api/harness/tx-submit' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = store.commitOperations(Array.isArray(body?.ops) ? body.ops : []);
        sendJson(res, result.Success ? 200 : 400, result);
        return;
      }
      if (urlPath === '/api/harness/graphql' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const data = store.executeGraphQL(body?.query ?? '', body?.variables ?? {});
        sendJson(res, 200, data);
        return;
      }
      if (urlPath === '/api/harness/run-action' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = await store.runAction(body?.actionID ?? '', Array.isArray(body?.params) ? body.params : []);
        sendJson(res, 200, result);
        return;
      }
      if (urlPath === '/' || urlPath === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (urlPath === '/harness-bundle.js') {
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
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      res.writeHead(500);
      res.end(err instanceof Error ? err.message : 'Internal error');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        fontAwesomeMode: fontAwesomeRoot ? 'local-package' : 'svg-mask-fallback',
        close: () => new Promise((r) => server.close(() => r(undefined))),
      });
    });
  });
}
