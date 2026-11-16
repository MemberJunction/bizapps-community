import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildCommunityHubHarnessHtml } from './build-harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const COMMUNITY_CORE_DIST = join(REPO_ROOT, 'packages', 'Core', 'dist');

const CONTENT_TYPES = {
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

/** Starts the harness's static file server and returns { url, close }. */
export function StartHarnessServer() {
  const html = BuildCommunityHubHarnessHtml();

  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (req.url && req.url.startsWith('/community-core/')) {
        const relative = req.url.replace('/community-core/', '');
        const filePath = join(COMMUNITY_CORE_DIST, relative);
        if (!filePath.startsWith(COMMUNITY_CORE_DIST)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        const content = await readFile(filePath, 'utf8');
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] ?? 'text/plain; charset=utf-8' });
        res.end(content);
        return;
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
        close: () => new Promise((r) => server.close(() => r(undefined))),
      });
    });
  });
}
