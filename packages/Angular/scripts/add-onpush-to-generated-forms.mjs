#!/usr/bin/env node
// One-time remediation pass: generated form components did not set
// ChangeDetectionStrategy.OnPush. MJ's upstream CodeGen template does not emit it either, so a
// future `mj codegen` run will regenerate these files without this change — tracked separately
// against the upstream template, not something this package can fix at the source.
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const files = globSync(`${packageRoot}/src/lib/generated/Entities/*/*.form.component.ts`);

let changed = 0;
for (const file of files) {
  let content = readFileSync(file, 'utf8');
  if (content.includes('ChangeDetectionStrategy.OnPush')) continue;

  const before = content;
  content = content.replace(
    "import { Component } from '@angular/core';",
    "import { ChangeDetectionStrategy, Component } from '@angular/core';",
  );
  content = content.replace(
    /@Component\(\{\n(\s*)standalone: false,/,
    '@Component({\n$1standalone: false,\n$1changeDetection: ChangeDetectionStrategy.OnPush,',
  );

  if (content === before) {
    throw new Error(`No substitution applied to ${file} — pattern mismatch, aborting`);
  }
  writeFileSync(file, content);
  changed += 1;
}

console.log(`Patched ${changed} of ${files.length} generated form components with OnPush.`);
