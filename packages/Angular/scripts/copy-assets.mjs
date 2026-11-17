#!/usr/bin/env node
// `tsc` only emits .js/.d.ts — Angular's `templateUrl`/`styleUrl` components need their sibling
// .html/.css files alongside the compiled output in dist/, so this copies them after every build.
import { cpSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const srcDir = `${packageRoot}/src`;
const distDir = `${packageRoot}/dist`;

const ASSET_EXTENSIONS = new Set(['.html', '.css']);

cpSync(srcDir, distDir, {
  recursive: true,
  filter: (source) => {
    if (statSync(source).isDirectory()) return true;
    return ASSET_EXTENSIONS.has(extname(source));
  },
});
