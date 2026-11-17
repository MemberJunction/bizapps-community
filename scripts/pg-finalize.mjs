#!/usr/bin/env node
/**
 * pg-finalize.mjs — post-conversion patch layer for the BizApps Community PostgreSQL migrations.
 *
 * WHY THIS EXISTS
 * ---------------
 * `mj migrate convert` (the @memberjunction/sql-converter rule pipeline) translates the
 * canonical SQL Server migrations under `migrations/` into PostgreSQL under `migrations-pg/`.
 * The converter is rule/string based; a small, well-understood set of T-SQL constructs it does
 * not fully translate are corrected here as a deterministic, idempotent post-pass — the
 * "things we fix after the converter" layer (converter → this finalize pass).
 *
 * It is intentionally SURGICAL and idempotent: re-running it on already-finalized files is a no-op,
 * and `mj migrate convert` itself never regenerates a `.pg.sql` that already exists, so these fixes
 * are preserved across normal conversion runs. If a migration is ever force-regenerated, re-run this.
 *
 * Adapted from the bizapps-software-factory / bizapps-tasks pg-finalize pipelines; the patches are
 * generic, only the app schema name (`__mj_BizAppsCommunity`) and the bizapps boolean-column list
 * differ.
 *
 * PATCHES (each documented with the converter gap it compensates for):
 *
 *  1. FK-join alias quoting. CodeGen base views define their FK-join aliases quoted
 *     (`... AS "mjBizAppsCommunityForum_ForumID"`) but the converter leaves the *references*
 *     unquoted, so PostgreSQL case-folds them to lowercase and raises "missing FROM-clause entry".
 *     We quote every `mj<Entity>_<FK>.` reference so it matches its quoted definition.
 *
 *  2. Skipped-trigger / unrecognized-batch neutralization. The converter cannot translate T-SQL
 *     `AFTER UPDATE` triggers, so it emits a `-- SKIPPED: trigger ...` marker — but only comments the
 *     `CREATE TRIGGER` line, leaving the (often truncated) body live, which is invalid PostgreSQL.
 *     These are the `__mj_UpdatedAt` maintenance triggers that `mj codegen` regenerates natively on
 *     PostgreSQL, so the migration must simply not contain them. Same treatment for `-- NOTE:
 *     unrecognized batch type (UNKNOWN)` passthroughs.
 *
 *  3. Cast core boolean INSERTs. The converter emits native TRUE/FALSE for bizapps tables it sized
 *     from their CREATE TABLE, but cannot see the core `__mj` table types, so it leaves bare 0/1 —
 *     which PostgreSQL refuses to implicitly cast to boolean. Positionally cast 0/1 -> FALSE/TRUE for
 *     core `__mj` boolean columns (map in `pg-core-boolean-columns.json`).
 *
 *  4. Cast boolean comparisons. `"boolCol" = 0|1` / `<> 0|1` -> FALSE/TRUE in WHERE/UPDATE clauses
 *     (PostgreSQL has no implicit boolean=integer operator). Scoped to known boolean column names
 *     (MJ-core map ∪ the bizapps table booleans) so integer columns that legitimately equal 0/1 are
 *     never touched.
 *
 *  5. Quote core object refs. Unquoted mixed-case `__mj.vwGeneratedCodeCategories` folds to a
 *     non-existent lowercased relation; we quote mixed-case `__mj` object references.
 *
 *  6. Cast `_Clear` flag args. The CodeGen "tolerant" CRUD sprocs take boolean `<field>_Clear`
 *     flags; the converter passes integer `:= 1` / `:= 0`, which PostgreSQL cannot match to the
 *     boolean parameter. The `_Clear` suffix is the CodeGen convention, so it is a safe key.
 *
 *  7. Normalize bizapps schema unquoted. The bizapps schema identifier is normalized to UNQUOTED so
 *     PostgreSQL folds it to lowercase consistently — matching how `mj codegen` and the MJServer
 *     runtime emit schema references on PostgreSQL. Single-quoted string literals are untouched.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PG_DIR = join(HERE, '..', 'migrations-pg');

const APP_SCHEMA = '__mj_BizAppsCommunity';

const CORE_BOOL_COLS = JSON.parse(readFileSync(join(HERE, 'pg-core-boolean-columns.json'), 'utf8'));

const BIZAPPS_BOOL_COLS = [
  'AllowsNestedReplies', 'AskFirstEnabled', 'AssignedByAI', 'CanAcceptAnswers', 'CanCoEditDocs',
  'CanConfigureForum', 'CanCreateRootPost', 'CanModerateQueue', 'CanPinOrLock', 'CanPromoteToSpace',
  'CanReply', 'CanVerifyCanon', 'Completed', 'IndexedInCorpus', 'InheritsSpaceMembers',
  'IsAcceptedByAuthor', 'IsActive', 'IsAnonymized', 'IsFeatured', 'IsLiveNow', 'IsLocked', 'IsOfficial',
  'IsPinned', 'IsVerifiedByModerator', 'OpenToPeerMentoring', 'RequirePostReplyOnSubmit',
  'ShowInlinePreview', 'ShowLeaderboard', 'ShowLiveResultsInline', 'TriggersThreadSynthesis',
];
// Boolean columns from __mj_BizAppsCollaboration referenced cross-schema by
// fnCommunityForumAccess (via fnCollaborationAccess's RETURNS TABLE contract).
const COLLABORATION_BOOL_COLS = ['ReadOnly', 'CanContribute', 'Visible', 'CanSeeTeam'];
const BOOL_NAMES = new Set([...Object.values(CORE_BOOL_COLS).flat(), ...BIZAPPS_BOOL_COLS, ...COLLABORATION_BOOL_COLS]);

function splitTopLevel(s) {
  const parts = [];
  let buf = '', depth = 0, inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      buf += c;
      if (c === "'") {
        if (s[i + 1] === "'") { buf += s[++i]; }
        else inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; buf += c; continue; }
    if (c === '(') { depth++; buf += c; continue; }
    if (c === ')') { depth--; buf += c; continue; }
    if (c === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  return parts;
}

function matchParen(s, openIdx) {
  let depth = 0, inStr = false;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "'") { if (s[i + 1] === "'") i++; else inStr = false; } continue; }
    if (c === "'") inStr = true;
    else if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const unquoteIdent = (t) => t.trim().replace(/^"|"$/g, '');

function quoteFkJoinAliasReferences(sql) {
  return sql.replace(/(?<!")\b(mj[A-Z][A-Za-z0-9]*_[A-Za-z0-9]+)(?=\.)/g, '"$1"');
}

function neutralizeSkippedTriggers(sql) {
  const lines = sql.split('\n');
  const out = [];
  const commentOut = (line) => (line.trim() === '' || line.startsWith('--')) ? line : `-- ${line}`;
  const isComment = (line) => line.trim().startsWith('--');
  const isBlank = (line) => line.trim() === '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^--\s*SKIPPED:\s*trigger/i.test(line)) {
      out.push(line);
      while (i + 1 < lines.length && !isBlank(lines[i + 1])) out.push(commentOut(lines[++i]));
      continue;
    }

    if (/^--\s*NOTE:\s*unrecognized batch type.*passed through as-is/i.test(line)) {
      out.push(line);
      let alreadyNeutralized = false;
      while (i + 1 < lines.length && (isComment(lines[i + 1]) || isBlank(lines[i + 1]))) {
        if (/^--\s*(CREATE|ALTER|DECLARE|DO|BEGIN)\b/i.test(lines[i + 1].trim())) alreadyNeutralized = true;
        out.push(lines[++i]);
      }
      if (alreadyNeutralized) continue;

      let beginDepth = 0, sawBegin = false;
      while (i + 1 < lines.length) {
        const body = lines[i + 1];
        const cf = body.replace(/\bBEGIN\s+TRAN(SACTION)?\b/gi, '');
        const begins = (cf.match(/\bBEGIN\b/gi) || []).length;
        const ends = (cf.match(/\bEND\b/gi) || []).length;
        if (begins > 0) sawBegin = true;
        beginDepth += begins - ends;
        out.push(commentOut(lines[++i]));
        if (sawBegin && beginDepth <= 0) break;
        if (!sawBegin && isBlank(body)) break;
      }
      continue;
    }

    out.push(line);
  }
  return out.join('\n');
}

function castCoreBooleanInserts(sql) {
  const re = /INSERT\s+INTO\s+(?:"?__mj"?|"?\$\{mjSchema\}"?)\."?([A-Za-z0-9_]+)"?\s*\(/gi;
  let out = '', last = 0, m;
  while ((m = re.exec(sql)) !== null) {
    const table = m[1];
    const boolCols = CORE_BOOL_COLS[table];
    const colOpen = re.lastIndex - 1;
    const colClose = matchParen(sql, colOpen);
    if (colClose < 0) continue;
    const afterCols = sql.slice(colClose + 1);
    const vm = /^\s*VALUES\s*\(/i.exec(afterCols);
    if (!vm) continue;
    const valOpen = colClose + 1 + vm[0].length - 1;
    const valClose = matchParen(sql, valOpen);
    if (valClose < 0) continue;

    if (boolCols && boolCols.length) {
      const cols = splitTopLevel(sql.slice(colOpen + 1, colClose)).map(unquoteIdent);
      const vals = splitTopLevel(sql.slice(valOpen + 1, valClose));
      if (cols.length === vals.length) {
        const boolSet = new Set(boolCols);
        let touched = false;
        const newVals = vals.map((v, i) => {
          if (!boolSet.has(cols[i])) return v;
          const t = v.trim();
          if (t === '1') { touched = true; return v.replace('1', 'TRUE'); }
          if (t === '0') { touched = true; return v.replace('0', 'FALSE'); }
          return v;
        });
        if (touched) {
          out += sql.slice(last, valOpen + 1) + newVals.join(',') + sql.slice(valClose, valClose + 1);
          last = valClose + 1;
          re.lastIndex = valClose + 1;
          continue;
        }
      }
    }
    re.lastIndex = valClose + 1;
  }
  out += sql.slice(last);
  return out;
}

/**
 * Patch 4b: cast `COALESCE(boolCol, 0|1)` integer defaults to FALSE/TRUE, and the trailing
 * `= 0|1` / `<> 0|1` comparison against that same COALESCE call, if present. PostgreSQL's
 * COALESCE requires all arguments to share a type, so a boolean column with an integer-literal
 * default errors even before any outer comparison or CAST is applied.
 */
function castCoalesceBooleanDefaults(sql) {
  return sql.replace(
    /COALESCE\(((?:[A-Za-z0-9_]+\.)?"([A-Za-z0-9_]+)")\s*,\s*([01])\)(\s*(=|<>)\s*([01])\b)?/g,
    (full, colRef, colName, innerVal, cmpSuffix, cmpOp, cmpVal) => {
      if (!BOOL_NAMES.has(colName)) return full;
      const innerLit = innerVal === '1' ? 'TRUE' : 'FALSE';
      const rebuilt = `COALESCE(${colRef}, ${innerLit})`;
      if (!cmpSuffix) return rebuilt;
      const cmpLit = cmpVal === '1' ? 'TRUE' : 'FALSE';
      return `${rebuilt} ${cmpOp} ${cmpLit}`;
    }
  );
}

function castBooleanComparisons(sql) {
  return sql.replace(/"([A-Za-z0-9_]+)"(\s*(?:=|<>)\s*)([01])\b/g, (full, name, op, val) =>
    BOOL_NAMES.has(name) ? `"${name}"${op}${val === '1' ? 'TRUE' : 'FALSE'}` : full
  );
}

function quoteCoreObjectRefs(sql) {
  return sql.replace(/\b__mj\.([A-Za-z_][A-Za-z0-9_]*)\b/g, (full, name) =>
    /[A-Z]/.test(name) ? `__mj."${name}"` : full
  );
}

function castClearFlagArgs(sql) {
  return sql.replace(/(_Clear\s*:=\s*)([01])\b/g, (full, lhs, val) => `${lhs}${val === '1' ? 'TRUE' : 'FALSE'}`);
}

function normalizeBizappsSchemaUnquoted(sql) {
  return sql.replaceAll(`"${APP_SCHEMA}"`, APP_SCHEMA);
}

const PATCHES = [
  ['quote FK-join alias references', quoteFkJoinAliasReferences],
  ['neutralize skipped triggers', neutralizeSkippedTriggers],
  ['cast core boolean INSERTs', castCoreBooleanInserts],
  ['cast COALESCE boolean defaults', castCoalesceBooleanDefaults],
  ['cast boolean comparisons', castBooleanComparisons],
  ['quote core object refs', quoteCoreObjectRefs],
  ['cast _Clear flag args', castClearFlagArgs],
  ['normalize bizapps schema unquoted', normalizeBizappsSchemaUnquoted],
];

function main() {
  const files = readdirSync(PG_DIR).filter((f) => f.endsWith('.pg.sql'));
  let changed = 0;
  for (const f of files) {
    const p = join(PG_DIR, f);
    const before = readFileSync(p, 'utf8');
    let after = before;
    for (const [, fn] of PATCHES) after = fn(after);
    if (after !== before) {
      writeFileSync(p, after);
      changed++;
      console.log(`  finalized ${f}`);
    }
  }
  console.log(`pg-finalize: ${changed}/${files.length} file(s) patched (idempotent).`);
}

main();
