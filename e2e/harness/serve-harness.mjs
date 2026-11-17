import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { BuildCommunityHubHarnessHtml, ResolveFontAwesomeRoot } from './build-harness.mjs';

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

/** Starts the real Angular 21 harness HTTP server and returns `{ url, close, fontAwesomeMode }`. */
export async function StartHarnessServer() {
  const html = BuildCommunityHubHarnessHtml();
  const bundleBytes = await buildAngularBrowserBundle();
  const fontAwesomeRoot = ResolveFontAwesomeRoot();
  const fontAwesomeCssBytes = fontAwesomeRoot
    ? readFileSync(join(fontAwesomeRoot, 'css', 'all.min.css'))
    : readFileSync(FONTAWESOME_FALLBACK_CSS);

  const server = createServer((req, res) => {
    try {
      const urlPath = (req.url ?? '/').split('?')[0];
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
