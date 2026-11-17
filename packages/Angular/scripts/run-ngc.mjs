#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(HERE, '..');

function resolveNgcExecutable() {
  const candidates = [
    join(PKG_DIR, 'node_modules', '.bin', 'ngc'),
    join(PKG_DIR, '..', '..', 'node_modules', '.bin', 'ngc'),
    join(PKG_DIR, '..', '..', '..', 'node_modules', '.bin', 'ngc'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return 'ngc';
}

const ngcBin = resolveNgcExecutable();
const ngcRes = spawnSync(ngcBin, ['-p', 'tsconfig.json'], {
  cwd: PKG_DIR,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if ((ngcRes.status ?? 1) !== 0) {
  process.exit(ngcRes.status ?? 1);
}

const copyRes = spawnSync(process.execPath, [join(HERE, 'copy-assets.mjs')], {
  cwd: PKG_DIR,
  stdio: 'inherit',
});
process.exit(copyRes.status ?? 1);
