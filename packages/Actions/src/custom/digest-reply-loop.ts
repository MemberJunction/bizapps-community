import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GetGlobalObjectStore, IsValidUUID } from '@memberjunction/global';
import type { PersonalizedPostScore } from '@mj-biz-apps/community-core';

const EPHEMERAL_SECRET_GLOBAL_KEY = '___COMMUNITY_DIGEST_REPLY_SECRET__';
const TOKEN_STORE_GLOBAL_KEY = '___COMMUNITY_DIGEST_REPLY_TOKEN_STORE__';
const DEFAULT_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
export const MAX_REGISTRY_ENTRIES = 50_000;
const COMPACT_HANDLE_MAX_CHARS = 24;
const COMPACT_HMAC_TAG_BYTES = 24; // 192-bit truncated HMAC-SHA256 tag -> 32 base64url chars
const DEFAULT_TOKEN_STORE_FILENAME = 'mj-community-digest-reply-tokens-v1.json';
const SNAPSHOT_SYNC_ENTRY_LIMIT = 200;
const SNAPSHOT_CHECKPOINT_INTERVAL = 5_000;
const DEFAULT_LOCK_TIMEOUT_MS = 15_000;
const DEFAULT_STALE_LOCK_MS = 30_000;
const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));
export const RFC_5321_MAX_LOCAL_PART_OCTETS = 64;
export const RFC_5321_MAX_ADDRESS_OCTETS = 254;

export interface DigestReplyTokenPayload {
  /** Schema version. */
  v: 1;
  /** Bound MemberJunction UserID of the digest recipient. */
  u: string;
  /** Bound ForumID of the target thread. */
  f: string;
  /** Bound RootPostID of the target thread. */
  r: string;
  /** Bound ParentPostID being replied to (equals RootPostID for root threads). */
  p: string;
  /** Normalized lowercase email address of the recipient for sender verification. */
  e?: string;
  /** Issued-at Unix epoch seconds. */
  iat: number;
  /** Expires-at Unix epoch seconds. */
  exp: number;
  /** Unique token nonce. */
  n: string;
}

export interface StoredCompactReplyTokenEntry {
  tokenId: string;
  payloadB64: string;
  binaryPayloadB64?: string;
  exp: number;
}

export interface DigestReplyCheckpointHooks {
  /** Optional deterministic hook invoked inside the exclusive lock immediately after reading the snapshot & rotated WAL. */
  onAfterWalRead?: () => Promise<void> | void;
  /** Optional deterministic hook invoked inside the exclusive lock after renaming the merged snapshot and before unlinking the rotated `.ckpt` file. */
  onBeforeWalUnlink?: () => Promise<void> | void;
}

/**
 * Pluggable durable token store interface for compact RFC 5321 digest reply handles.
 * Enables cross-process sharing and restart survival without exceeding 64-octet email local-parts.
 */
export interface IDigestReplyTokenStore {
  get(tokenId: string): StoredCompactReplyTokenEntry | undefined;
  set(tokenId: string, entry: StoredCompactReplyTokenEntry, nowEpoch: number): void;
  delete?(tokenId: string, nowEpoch?: number): boolean;
  clear(options?: { memoryOnly?: boolean }): void;
  size(): number;
}

export interface SignDigestReplyTokenInput {
  memberUserId: string;
  forumId: string;
  rootPostId: string;
  parentPostId?: string;
  recipientEmail?: string;
  signingSecret?: string;
  now?: Date;
  ttlSeconds?: number;
}

export type VerifyDigestReplyTokenResult =
  | { valid: true; payload: DigestReplyTokenPayload }
  | {
      valid: false;
      errorCode:
        | 'INVALID_TOKEN_FORMAT'
        | 'UNKNOWN_TOKEN_HANDLE'
        | 'INVALID_SIGNATURE'
        | 'TOKEN_EXPIRED'
        | 'INVALID_PAYLOAD'
        | 'SENDER_MISMATCH';
      reason: string;
    };

export interface VerifyDigestReplyTokenOptions {
  signingSecret?: string;
  expectedSenderEmail?: string | null;
  skipSenderBindingCheck?: boolean;
  now?: Date;
}

export interface ParsedInboundEmailReply {
  token: VerifyDigestReplyTokenResult;
  cleanedBody: string;
}

export interface DigestRenderItem {
  ranked: PersonalizedPostScore;
  replyToAddress: string;
  replyToken: string;
}

export interface RenderedPersonalizedDigest {
  subject: string;
  htmlBody: string;
  textBody: string;
  primaryReplyToAddress: string;
  itemCount: number;
}

/** Resolves the shared cross-process durable token store path. */
export function ResolveDigestReplyTokenStorePath(): string {
  const configured = process.env.COMMUNITY_DIGEST_TOKEN_STORE_PATH?.trim();
  if (configured) {
    return configured;
  }
  return path.join(os.tmpdir(), DEFAULT_TOKEN_STORE_FILENAME);
}

function uuidToBytes16(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error(`Invalid UUID for binary token encoding: ${uuid}`);
  }
  return Buffer.from(hex, 'hex');
}

function bytes16ToUuid(buf: Buffer): string {
  const hex = buf.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Encodes a {@link DigestReplyTokenPayload} into a compact binary layout containing four 16-byte
 * UUIDs (`u`, `f`, `r`, `p`), 4-byte uint32 `iat`/`exp`, nonce, and optional UTF-8 recipient email.
 */
export function EncodeCompactBinaryTokenPayload(payload: DigestReplyTokenPayload): string {
  const emailBuf = payload.e ? Buffer.from(payload.e.trim().toLowerCase(), 'utf8') : Buffer.alloc(0);
  const nonceBuf = Buffer.from(payload.n, 'utf8');
  const headerSize = 2 + 16 * 4 + 4 + 4 + 2 + 2; // version+flags, 4 UUIDs, iat, exp, nonceLen, emailLen
  const buf = Buffer.allocUnsafe(headerSize + nonceBuf.length + emailBuf.length);

  let offset = 0;
  buf.writeUInt8(1, offset);
  offset += 1;
  buf.writeUInt8(emailBuf.length > 0 ? 1 : 0, offset);
  offset += 1;

  uuidToBytes16(payload.u).copy(buf, offset);
  offset += 16;
  uuidToBytes16(payload.f).copy(buf, offset);
  offset += 16;
  uuidToBytes16(payload.r).copy(buf, offset);
  offset += 16;
  uuidToBytes16(payload.p).copy(buf, offset);
  offset += 16;

  buf.writeUInt32BE(Math.max(0, payload.iat >>> 0), offset);
  offset += 4;
  buf.writeUInt32BE(Math.max(0, payload.exp >>> 0), offset);
  offset += 4;

  buf.writeUInt16BE(nonceBuf.length, offset);
  offset += 2;
  buf.writeUInt16BE(emailBuf.length, offset);
  offset += 2;

  nonceBuf.copy(buf, offset);
  offset += nonceBuf.length;
  emailBuf.copy(buf, offset);

  return buf.toString('base64url');
}

/** Decodes a compact binary payload produced by {@link EncodeCompactBinaryTokenPayload}. */
export function DecodeCompactBinaryTokenPayload(encoded: string): DigestReplyTokenPayload | null {
  try {
    const buf = Buffer.from(encoded, 'base64url');
    if (buf.length < 78) return null;
    const version = buf.readUInt8(0);
    if (version !== 1) return null;
    const flags = buf.readUInt8(1);
    let offset = 2;

    const u = bytes16ToUuid(buf.subarray(offset, offset + 16));
    offset += 16;
    const f = bytes16ToUuid(buf.subarray(offset, offset + 16));
    offset += 16;
    const r = bytes16ToUuid(buf.subarray(offset, offset + 16));
    offset += 16;
    const p = bytes16ToUuid(buf.subarray(offset, offset + 16));
    offset += 16;

    const iat = buf.readUInt32BE(offset);
    offset += 4;
    const exp = buf.readUInt32BE(offset);
    offset += 4;

    const nonceLen = buf.readUInt16BE(offset);
    offset += 2;
    const emailLen = buf.readUInt16BE(offset);
    offset += 2;

    if (offset + nonceLen + emailLen > buf.length) return null;
    const n = buf.subarray(offset, offset + nonceLen).toString('utf8');
    offset += nonceLen;
    const e =
      (flags & 1) !== 0 && emailLen > 0
        ? buf.subarray(offset, offset + emailLen).toString('utf8')
        : undefined;

    return { v: 1, u, f, r, p, ...(e ? { e } : {}), iat, exp, n };
  } catch {
    return null;
  }
}

interface SnapshotFileShape {
  version: 1;
  entries: StoredCompactReplyTokenEntry[];
}

interface LockMetadataShape {
  pid?: number;
  acquiredAt?: number;
}

interface WalDeleteRecord {
  op: 'delete';
  tokenId: string;
}

interface WalSetRecord extends StoredCompactReplyTokenEntry {
  op?: 'set';
}

type ParsedWalRecord =
  | { op: 'set'; entry: StoredCompactReplyTokenEntry }
  | { op: 'delete'; tokenId: string };

type PendingSnapshotMutation =
  | { op: 'set'; entry: StoredCompactReplyTokenEntry }
  | { op: 'delete'; tokenId: string };

export interface CrossProcessLockOptions {
  timeoutMs?: number;
  staleLockMs?: number;
}

function sleepSyncMs(ms: number): void {
  if (ms <= 0) return;
  Atomics.wait(SLEEP_BUFFER, 0, 0, ms);
}

function sleepAsyncMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    return code !== 'ESRCH';
  }
}

function isLockStale(lockPath: string, staleLockMs: number): boolean {
  try {
    const stat = statSync(lockPath);
    let meta: LockMetadataShape = {};
    try {
      const raw = readFileSync(lockPath, 'utf8').trim();
      if (raw) {
        meta = JSON.parse(raw) as LockMetadataShape;
      }
    } catch {
      // Lock file may still be mid-write or corrupted; fall back to mtime.
    }
    const acquiredAt = typeof meta.acquiredAt === 'number' ? meta.acquiredAt : stat.mtimeMs;
    const ageMs = Date.now() - acquiredAt;
    if (ageMs >= staleLockMs) {
      return true;
    }
    if (typeof meta.pid === 'number' && meta.pid > 0 && ageMs >= 100 && !isProcessAlive(meta.pid)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function tryAcquireCrossProcessLock(lockPath: string, staleLockMs: number): boolean {
  let fd: number | null = null;
  try {
    fd = openSync(lockPath, 'wx');
    const metadata: LockMetadataShape = { pid: process.pid, acquiredAt: Date.now() };
    writeSync(fd, JSON.stringify(metadata), 0, 'utf8');
    closeSync(fd);
    fd = null;
    return true;
  } catch (err) {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // Ignore close error on cleanup.
      }
      fd = null;
    }
    const code = (err as { code?: string } | null)?.code;
    if (code === 'ENOENT') {
      mkdirSync(path.dirname(lockPath), { recursive: true });
      return false;
    }
    if (code !== 'EEXIST') {
      throw err;
    }
    if (isLockStale(lockPath, staleLockMs)) {
      try {
        unlinkSync(lockPath);
      } catch {
        // Ignore if another contender already unlinked the stale lock.
      }
    }
    return false;
  }
}

function releaseCrossProcessLock(lockPath: string): void {
  try {
    unlinkSync(lockPath);
  } catch {
    // Ignore if already removed.
  }
}

/**
 * Executes `fn` while holding an exclusive cross-process file lock (`<targetPath>.lock` via
 * `openSync(..., 'wx')`) with PID/timestamp stale-lock recovery and bounded spin/retry.
 */
export function withCrossProcessLock<T>(
  targetPath: string,
  fn: () => T,
  options?: CrossProcessLockOptions,
): T {
  const lockPath = `${targetPath}.lock`;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  const staleLockMs = options?.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  mkdirSync(path.dirname(targetPath), { recursive: true });

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (!tryAcquireCrossProcessLock(lockPath, staleLockMs)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for cross-process lock: ${lockPath}`);
    }
    attempt += 1;
    sleepSyncMs(Math.min(25, 1 + attempt));
  }

  try {
    return fn();
  } finally {
    releaseCrossProcessLock(lockPath);
  }
}

/**
 * Async variant of {@link withCrossProcessLock} for checkpointing with async deterministic hooks.
 */
export async function withCrossProcessLockAsync<T>(
  targetPath: string,
  fn: () => Promise<T>,
  options?: CrossProcessLockOptions,
): Promise<T> {
  const lockPath = `${targetPath}.lock`;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  const staleLockMs = options?.staleLockMs ?? DEFAULT_STALE_LOCK_MS;
  mkdirSync(path.dirname(targetPath), { recursive: true });

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (!tryAcquireCrossProcessLock(lockPath, staleLockMs)) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for cross-process lock: ${lockPath}`);
    }
    attempt += 1;
    await sleepAsyncMs(Math.min(25, 1 + attempt));
  }

  try {
    return await fn();
  } finally {
    releaseCrossProcessLock(lockPath);
  }
}

function resolveCheckpointInterval(): number {
  const configured = Number(process.env.COMMUNITY_DIGEST_CHECKPOINT_INTERVAL);
  if (Number.isFinite(configured) && configured >= 1) {
    return Math.floor(configured);
  }
  return SNAPSHOT_CHECKPOINT_INTERVAL;
}

/**
 * Shared cross-process durable file-backed token store with an in-memory cache.
 * Synchronizes via atomic JSON snapshot + append-only WAL (`<storePath>.wal`) guarded by
 * {@link withCrossProcessLock} so concurrent writer/checkpointer workers never clobber snapshots
 * or unlink unmerged WAL records. Capacity pruning removes ONLY expired entries and never evicts
 * unexpired tokens.
 */
export class FileBackedDigestReplyTokenStore implements IDigestReplyTokenStore {
  private readonly memoryMap = new Map<string, StoredCompactReplyTokenEntry>();
  private loadedPath: string | null = null;
  private writesSinceCheckpoint = 0;
  private knownOnDiskCount = 0;

  private ensureCurrentPath(): string {
    const targetPath = ResolveDigestReplyTokenStorePath();
    if (this.loadedPath !== targetPath) {
      this.memoryMap.clear();
      this.loadedPath = targetPath;
      this.writesSinceCheckpoint = 0;
      this.knownOnDiskCount = 0;
    }
    return targetPath;
  }

  private walPathFor(storePath: string): string {
    return `${storePath}.wal`;
  }

  private ckptPathFor(storePath: string): string {
    return `${storePath}.wal.ckpt`;
  }

  private listCkptPaths(storePath: string): string[] {
    const dir = path.dirname(storePath);
    if (!existsSync(dir)) return [];
    const ckptPrefix = `${path.basename(storePath)}.wal.ckpt`;
    try {
      return readdirSync(dir)
        .filter((name) => name === ckptPrefix || name.startsWith(`${ckptPrefix}.`))
        .sort()
        .map((name) => path.join(dir, name));
    } catch {
      return [];
    }
  }

  private readEntriesFromSnapshot(storePath: string): StoredCompactReplyTokenEntry[] {
    if (!existsSync(storePath)) return [];
    try {
      const raw = readFileSync(storePath, 'utf8').trim();
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SnapshotFileShape | StoredCompactReplyTokenEntry[];
      const list = Array.isArray(parsed) ? parsed : parsed?.entries;
      if (!Array.isArray(list)) return [];
      return list.filter(
        (entry): entry is StoredCompactReplyTokenEntry =>
          Boolean(entry && typeof entry.tokenId === 'string' && typeof entry.payloadB64 === 'string'),
      );
    } catch {
      return [];
    }
  }

  private readRecordsFromWal(walFilePath: string): ParsedWalRecord[] {
    if (!existsSync(walFilePath)) return [];
    try {
      const raw = readFileSync(walFilePath, 'utf8');
      if (!raw) return [];
      const out: ParsedWalRecord[] = [];
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as WalSetRecord | WalDeleteRecord;
          if (parsed && parsed.op === 'delete' && typeof parsed.tokenId === 'string') {
            out.push({ op: 'delete', tokenId: parsed.tokenId });
          } else if (
            parsed &&
            typeof parsed.tokenId === 'string' &&
            'payloadB64' in parsed &&
            typeof parsed.payloadB64 === 'string'
          ) {
            out.push({ op: 'set', entry: parsed });
          }
        } catch {
          // Skip incomplete trailing line if a concurrent writer crashed mid-append.
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  private applyWalRecords(
    targetMap: Map<string, StoredCompactReplyTokenEntry>,
    records: ReadonlyArray<ParsedWalRecord>,
    minExpEpoch?: number,
  ): void {
    for (const rec of records) {
      if (rec.op === 'delete') {
        targetMap.delete(rec.tokenId);
      } else if (minExpEpoch === undefined || rec.entry.exp >= minExpEpoch) {
        targetMap.set(rec.entry.tokenId, rec.entry);
      }
    }
  }

  private hydrateFromDisk(storePath: string): void {
    this.memoryMap.clear();
    const snapshotEntries = this.readEntriesFromSnapshot(storePath);
    for (const entry of snapshotEntries) {
      this.memoryMap.set(entry.tokenId, entry);
    }
    for (const ckptPath of this.listCkptPaths(storePath)) {
      this.applyWalRecords(this.memoryMap, this.readRecordsFromWal(ckptPath));
    }
    this.applyWalRecords(this.memoryMap, this.readRecordsFromWal(this.walPathFor(storePath)));
    this.knownOnDiskCount = this.memoryMap.size;
  }

  private pruneExpiredInMemory(nowEpoch: number): void {
    if (this.memoryMap.size < MAX_REGISTRY_ENTRIES) {
      return;
    }
    // Prune ONLY expired tokens; NEVER evict unexpired tokens even above MAX_REGISTRY_ENTRIES.
    for (const [key, entry] of this.memoryMap.entries()) {
      if (entry.exp < nowEpoch) {
        this.memoryMap.delete(key);
      }
    }
  }

  private rotateWalInsideLock(storePath: string): string[] {
    const dir = path.dirname(storePath);
    mkdirSync(dir, { recursive: true });
    const walPath = this.walPathFor(storePath);
    const ckptPaths = this.listCkptPaths(storePath);
    if (existsSync(walPath)) {
      const baseCkpt = this.ckptPathFor(storePath);
      const rotatedPath = existsSync(baseCkpt)
        ? `${baseCkpt}.${process.pid}.${randomBytes(4).toString('hex')}`
        : baseCkpt;
      renameSync(walPath, rotatedPath);
      ckptPaths.push(rotatedPath);
    }
    return ckptPaths;
  }

  private buildMergedSnapshot(
    storePath: string,
    ckptPaths: ReadonlyArray<string>,
    nowEpoch: number,
    pendingMutation?: PendingSnapshotMutation,
  ): Map<string, StoredCompactReplyTokenEntry> {
    const merged = new Map<string, StoredCompactReplyTokenEntry>();
    for (const entry of this.readEntriesFromSnapshot(storePath)) {
      if (entry.exp >= nowEpoch) merged.set(entry.tokenId, entry);
    }
    for (const ckptPath of ckptPaths) {
      this.applyWalRecords(merged, this.readRecordsFromWal(ckptPath), nowEpoch);
    }
    if (pendingMutation) {
      if (pendingMutation.op === 'delete') {
        merged.delete(pendingMutation.tokenId);
      } else if (pendingMutation.entry.exp >= nowEpoch) {
        merged.set(pendingMutation.entry.tokenId, pendingMutation.entry);
      }
    }
    return merged;
  }

  private writeFsyncedSnapshotAndRename(
    storePath: string,
    merged: Map<string, StoredCompactReplyTokenEntry>,
  ): void {
    const payload: SnapshotFileShape = {
      version: 1,
      entries: Array.from(merged.values()),
    };
    const tmpPath = `${storePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    const fd = openSync(tmpPath, 'w');
    try {
      writeSync(fd, JSON.stringify(payload), 0, 'utf8');
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmpPath, storePath);
    this.knownOnDiskCount = merged.size;
  }

  private unlinkCkptFiles(ckptPaths: ReadonlyArray<string>): void {
    for (const ckptPath of ckptPaths) {
      if (existsSync(ckptPath)) {
        try {
          unlinkSync(ckptPath);
        } catch {
          // Ignore if already removed.
        }
      }
    }
  }

  private writeSnapshotAtomicallyLocked(
    storePath: string,
    nowEpoch: number,
    pendingMutation?: PendingSnapshotMutation,
  ): void {
    const ckptPaths = this.rotateWalInsideLock(storePath);
    const merged = this.buildMergedSnapshot(storePath, ckptPaths, nowEpoch, pendingMutation);
    this.writeFsyncedSnapshotAndRename(storePath, merged);
    this.unlinkCkptFiles(ckptPaths);
  }

  /**
   * Forces a cross-process locked checkpoint of the on-disk snapshot + WAL.
   */
  public checkpoint(nowEpoch = Math.floor(Date.now() / 1000)): void {
    const storePath = this.ensureCurrentPath();
    withCrossProcessLock(storePath, () => {
      this.writeSnapshotAtomicallyLocked(storePath, nowEpoch);
      this.writesSinceCheckpoint = 0;
    });
  }

  /**
   * Executes a cross-process locked checkpoint with optional deterministic async test hooks
   * (`onAfterWalRead`, `onBeforeWalUnlink`) to exercise concurrent writer contention safely.
   */
  public async checkpointWithHook(
    nowEpoch = Math.floor(Date.now() / 1000),
    hooks?: DigestReplyCheckpointHooks,
  ): Promise<void> {
    const storePath = this.ensureCurrentPath();
    await withCrossProcessLockAsync(storePath, async () => {
      const ckptPaths = this.rotateWalInsideLock(storePath);
      const merged = this.buildMergedSnapshot(storePath, ckptPaths, nowEpoch);
      if (hooks?.onAfterWalRead) {
        await hooks.onAfterWalRead();
      }
      this.writeFsyncedSnapshotAndRename(storePath, merged);
      if (hooks?.onBeforeWalUnlink) {
        await hooks.onBeforeWalUnlink();
      }
      this.unlinkCkptFiles(ckptPaths);
      this.writesSinceCheckpoint = 0;
    });
  }

  public get(tokenId: string): StoredCompactReplyTokenEntry | undefined {
    const storePath = this.ensureCurrentPath();
    const cached = this.memoryMap.get(tokenId);
    if (cached) {
      return cached;
    }
    return withCrossProcessLock(storePath, () => {
      this.hydrateFromDisk(storePath);
      return this.memoryMap.get(tokenId);
    });
  }

  public set(tokenId: string, entry: StoredCompactReplyTokenEntry, nowEpoch: number): void {
    const storePath = this.ensureCurrentPath();
    withCrossProcessLock(storePath, () => {
      this.pruneExpiredInMemory(nowEpoch);
      this.memoryMap.set(tokenId, entry);

      const dir = path.dirname(storePath);
      mkdirSync(dir, { recursive: true });

      const walPath = this.walPathFor(storePath);
      const hasWalOrCkpt = existsSync(walPath) || this.listCkptPaths(storePath).length > 0;
      if (this.knownOnDiskCount === 0 && !hasWalOrCkpt && existsSync(storePath)) {
        // Hydrate once when attaching to an existing snapshot so we know whether >200 entries exist.
        this.hydrateFromDisk(storePath);
        this.memoryMap.set(tokenId, entry);
      }

      this.writesSinceCheckpoint += 1;
      if (
        this.memoryMap.size <= SNAPSHOT_SYNC_ENTRY_LIMIT &&
        this.knownOnDiskCount < SNAPSHOT_SYNC_ENTRY_LIMIT &&
        !hasWalOrCkpt
      ) {
        this.writeSnapshotAtomicallyLocked(storePath, nowEpoch, { op: 'set', entry });
        return;
      }

      appendFileSync(walPath, `${JSON.stringify(entry)}\n`, 'utf8');
      this.knownOnDiskCount += 1;
      if (this.writesSinceCheckpoint >= resolveCheckpointInterval()) {
        this.writesSinceCheckpoint = 0;
        this.writeSnapshotAtomicallyLocked(storePath, nowEpoch);
      }
    });
  }

  public delete(tokenId: string, nowEpoch = Math.floor(Date.now() / 1000)): boolean {
    const storePath = this.ensureCurrentPath();
    return withCrossProcessLock(storePath, () => {
      this.hydrateFromDisk(storePath);
      const existed = this.memoryMap.delete(tokenId);
      const walPath = this.walPathFor(storePath);
      const hasWalOrCkpt = existsSync(walPath) || this.listCkptPaths(storePath).length > 0;

      if (!existed && !existsSync(storePath) && !hasWalOrCkpt) {
        return false;
      }

      if (hasWalOrCkpt || this.knownOnDiskCount > SNAPSHOT_SYNC_ENTRY_LIMIT) {
        mkdirSync(path.dirname(storePath), { recursive: true });
        const tombstone: WalDeleteRecord = { op: 'delete', tokenId };
        appendFileSync(walPath, `${JSON.stringify(tombstone)}\n`, 'utf8');
        if (existed && this.knownOnDiskCount > 0) {
          this.knownOnDiskCount -= 1;
        }
      } else {
        this.writeSnapshotAtomicallyLocked(storePath, nowEpoch, { op: 'delete', tokenId });
      }
      return existed;
    });
  }

  public clear(options?: { memoryOnly?: boolean }): void {
    const storePath = this.ensureCurrentPath();
    this.memoryMap.clear();
    this.writesSinceCheckpoint = 0;
    this.knownOnDiskCount = 0;
    if (options?.memoryOnly) {
      return;
    }
    withCrossProcessLock(storePath, () => {
      const targets = [storePath, this.walPathFor(storePath), ...this.listCkptPaths(storePath)];
      for (const target of targets) {
        if (existsSync(target)) {
          try {
            unlinkSync(target);
          } catch {
            // Ignore concurrent unlink.
          }
        }
      }
    });
  }

  public size(): number {
    const storePath = this.ensureCurrentPath();
    return withCrossProcessLock(storePath, () => {
      this.hydrateFromDisk(storePath);
      return this.memoryMap.size;
    });
  }
}

const fallbackTokenStore = new FileBackedDigestReplyTokenStore();

/** Returns the active durable compact reply token store. */
export function GetDigestReplyTokenStore(): IDigestReplyTokenStore {
  const store = GetGlobalObjectStore();
  if (!store) {
    return fallbackTokenStore;
  }
  const existing = store[TOKEN_STORE_GLOBAL_KEY] as IDigestReplyTokenStore | undefined;
  if (existing && typeof existing.get === 'function' && typeof existing.set === 'function') {
    return existing;
  }
  const created = new FileBackedDigestReplyTokenStore();
  store[TOKEN_STORE_GLOBAL_KEY] = created;
  return created;
}

/** Overrides the active compact reply token store (pass `null` to restore the default file-backed store). */
export function SetDigestReplyTokenStore(customStore: IDigestReplyTokenStore | null): void {
  const store = GetGlobalObjectStore();
  if (!store) return;
  if (customStore === null) {
    store[TOKEN_STORE_GLOBAL_KEY] = new FileBackedDigestReplyTokenStore();
  } else {
    store[TOKEN_STORE_GLOBAL_KEY] = customStore;
  }
}

/**
 * Clears the compact reply token registry. When `{ memoryOnly: true }` is passed, only the
 * process-local in-memory cache is cleared while preserving the durable shared store (simulating
 * a worker restart or separate worker process).
 */
export function ClearCompactReplyTokenRegistry(options?: { memoryOnly?: boolean }): void {
  GetDigestReplyTokenStore().clear(options);
}

/** Alias for {@link ClearCompactReplyTokenRegistry}. */
export function ClearDigestReplyTokenRegistry(options?: { memoryOnly?: boolean }): void {
  ClearCompactReplyTokenRegistry(options);
}

/**
 * Resolves the HMAC signing secret: explicit override -> `COMMUNITY_DIGEST_REPLY_SECRET` env ->
 * process-wide ephemeral random 32-byte key stored in GlobalObjectStore (never a static hardcoded string).
 */
export function ResolveDigestReplySigningSecret(explicitSecret?: string): string {
  if (explicitSecret && explicitSecret.trim().length > 0) {
    return explicitSecret.trim();
  }
  const envSecret = process.env.COMMUNITY_DIGEST_REPLY_SECRET;
  if (envSecret && envSecret.trim().length > 0) {
    return envSecret.trim();
  }
  const store = GetGlobalObjectStore();
  if (store) {
    const existing = store[EPHEMERAL_SECRET_GLOBAL_KEY];
    if (typeof existing === 'string' && existing.length > 0) {
      return existing;
    }
    const generated = randomBytes(32).toString('base64url');
    store[EPHEMERAL_SECRET_GLOBAL_KEY] = generated;
    return generated;
  }
  return randomBytes(32).toString('base64url');
}

/** Extracts the raw `<id>.<sig>` (or `<payload>.<sig>`) token from a raw token or `reply+<token>@domain` address. */
export function ExtractReplyTokenFromAddress(tokenOrAddress: string): string | null {
  const trimmed = tokenOrAddress.trim();
  if (!trimmed) return null;

  // Handle "Display Name <reply+token@domain>" or "<reply+token@domain>"
  const angleMatch = trimmed.match(/<([^>]+)>/);
  const candidate = (angleMatch ? angleMatch[1] : trimmed).trim();

  if (candidate.includes('@')) {
    const atIdx = candidate.indexOf('@');
    const localPart = candidate.slice(0, atIdx);
    const plusIdx = localPart.indexOf('+');
    if (plusIdx < 0) return null;
    const tokenPart = localPart.slice(plusIdx + 1).trim();
    return tokenPart.length > 0 ? tokenPart : null;
  }

  return candidate;
}

/**
 * Builds a `reply+<token>@<domain>` address while strictly enforcing RFC 5321's 64-octet local-part
 * and 254-octet total email address limits.
 */
export function BuildReplyToEmailAddress(token: string, replyDomain: string): string {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Reply token is required to build a Reply-To email address.');
  }
  const cleanDomain = replyDomain.trim().replace(/^@+/, '') || 'reply.bizapps.local';
  const localPart = `reply+${cleanToken}`;
  const localOctets = Buffer.byteLength(localPart, 'utf8');
  if (localOctets > RFC_5321_MAX_LOCAL_PART_OCTETS) {
    throw new Error(
      `Reply-To local-part (${localOctets} octets) exceeds RFC 5321 limit of ${RFC_5321_MAX_LOCAL_PART_OCTETS} octets.`,
    );
  }
  const address = `${localPart}@${cleanDomain}`;
  const totalOctets = Buffer.byteLength(address, 'utf8');
  if (totalOctets > RFC_5321_MAX_ADDRESS_OCTETS) {
    throw new Error(
      `Reply-To address (${totalOctets} octets) exceeds RFC 5321 limit of ${RFC_5321_MAX_ADDRESS_OCTETS} octets.`,
    );
  }
  return address;
}

/**
 * Signs a member- and thread-bound digest reply token with HMAC-SHA256 and persists both the JSON
 * payload and compact binary UUID+timestamp payload in the durable shared store under a 16-char
 * handle + 32-char (192-bit) HMAC tag (`<id>.<hmac>`, 49 chars) so `reply+<token>` is strictly
 * `<= 64` octets under RFC 5321 while surviving restarts and cross-process lookups.
 */
export function SignDigestReplyToken(input: SignDigestReplyTokenInput): string {
  if (!IsValidUUID(input.memberUserId)) {
    throw new Error('memberUserId must be a valid UUID.');
  }
  if (!IsValidUUID(input.forumId)) {
    throw new Error('forumId must be a valid UUID.');
  }
  if (!IsValidUUID(input.rootPostId)) {
    throw new Error('rootPostId must be a valid UUID.');
  }
  const parentPostId = input.parentPostId ?? input.rootPostId;
  if (!IsValidUUID(parentPostId)) {
    throw new Error('parentPostId must be a valid UUID.');
  }

  const nowEpoch = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const ttl =
    input.ttlSeconds !== undefined && Number.isFinite(input.ttlSeconds) && input.ttlSeconds > 0
      ? Math.floor(input.ttlSeconds)
      : DEFAULT_TOKEN_TTL_SECONDS;

  const payload: DigestReplyTokenPayload = {
    v: 1,
    u: input.memberUserId.trim(),
    f: input.forumId.trim(),
    r: input.rootPostId.trim(),
    p: parentPostId.trim(),
    ...(input.recipientEmail?.trim() ? { e: input.recipientEmail.trim().toLowerCase() } : {}),
    iat: nowEpoch,
    exp: nowEpoch + ttl,
    n: randomBytes(6).toString('base64url'),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const binaryPayloadB64 = EncodeCompactBinaryTokenPayload(payload);
  const tokenId = randomBytes(12).toString('base64url'); // 16 chars
  const secret = ResolveDigestReplySigningSecret(input.signingSecret);
  const sigTag = createHmac('sha256', secret)
    .update(`${tokenId}.${payloadB64}`)
    .digest()
    .subarray(0, COMPACT_HMAC_TAG_BYTES)
    .toString('base64url'); // 32 chars -> reply+<16>.<32> = 55 octets <= 64 octets

  GetDigestReplyTokenStore().set(
    tokenId,
    {
      tokenId,
      payloadB64,
      binaryPayloadB64,
      exp: payload.exp,
    },
    nowEpoch,
  );

  return `${tokenId}.${sigTag}`;
}

/** Verifies an HMAC-SHA256 digest reply token (compact handle or full header token) and fails closed on any anomaly. */
export function VerifyDigestReplyToken(
  tokenOrAddress: string,
  options?: VerifyDigestReplyTokenOptions,
): VerifyDigestReplyTokenResult {
  const token = ExtractReplyTokenFromAddress(tokenOrAddress);
  if (!token) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN_FORMAT',
      reason: 'Reply token or reply+<token>@domain address is missing or malformed.',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      errorCode: 'INVALID_TOKEN_FORMAT',
      reason: 'Reply token must contain a handle/payload and signature separated by a dot.',
    };
  }

  const [partA, providedSigB64] = parts;
  const secret = ResolveDigestReplySigningSecret(options?.signingSecret);

  let providedSigBuf: Buffer;
  try {
    providedSigBuf = Buffer.from(providedSigB64, 'base64url');
  } catch {
    return {
      valid: false,
      errorCode: 'INVALID_SIGNATURE',
      reason: 'Reply token signature is not valid base64url.',
    };
  }

  let payloadB64: string;
  let binaryPayloadB64: string | undefined;
  let expectedSigBuf: Buffer;

  if (partA.length <= COMPACT_HANDLE_MAX_CHARS) {
    const entry = GetDigestReplyTokenStore().get(partA);
    if (!entry) {
      return {
        valid: false,
        errorCode: 'UNKNOWN_TOKEN_HANDLE',
        reason: 'Reply token handle is unknown or no longer registered.',
      };
    }
    payloadB64 = entry.payloadB64;
    binaryPayloadB64 = entry.binaryPayloadB64;
    expectedSigBuf = createHmac('sha256', secret)
      .update(`${partA}.${payloadB64}`)
      .digest()
      .subarray(0, COMPACT_HMAC_TAG_BYTES);
  } else {
    // Support full stateless <payloadB64>.<sigB64> or binary payload verification when delivered via header/reference.
    payloadB64 = partA;
    expectedSigBuf = createHmac('sha256', secret).update(payloadB64).digest();
  }

  if (
    providedSigBuf.length !== expectedSigBuf.length ||
    !timingSafeEqual(providedSigBuf, expectedSigBuf)
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_SIGNATURE',
      reason: 'HMAC-SHA256 signature verification failed.',
    };
  }

  let parsed: DigestReplyTokenPayload | null = null;
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    parsed = JSON.parse(json) as DigestReplyTokenPayload;
  } catch {
    parsed = DecodeCompactBinaryTokenPayload(binaryPayloadB64 ?? payloadB64);
  }

  if (!parsed) {
    return {
      valid: false,
      errorCode: 'INVALID_PAYLOAD',
      reason: 'Reply token payload could not be parsed.',
    };
  }

  if (
    typeof parsed !== 'object' ||
    parsed.v !== 1 ||
    typeof parsed.u !== 'string' ||
    typeof parsed.f !== 'string' ||
    typeof parsed.r !== 'string' ||
    typeof parsed.p !== 'string' ||
    !IsValidUUID(parsed.u) ||
    !IsValidUUID(parsed.f) ||
    !IsValidUUID(parsed.r) ||
    !IsValidUUID(parsed.p) ||
    typeof parsed.iat !== 'number' ||
    typeof parsed.exp !== 'number'
  ) {
    return {
      valid: false,
      errorCode: 'INVALID_PAYLOAD',
      reason: 'Reply token payload is missing required member/thread UUID bindings.',
    };
  }

  const nowEpoch = Math.floor((options?.now ?? new Date()).getTime() / 1000);
  if (nowEpoch > parsed.exp || parsed.iat > nowEpoch + 60) {
    return {
      valid: false,
      errorCode: 'TOKEN_EXPIRED',
      reason: `Reply token expired at epoch ${parsed.exp} (current ${nowEpoch}).`,
    };
  }

  if (!options?.skipSenderBindingCheck && parsed.e) {
    const sender = options?.expectedSenderEmail?.trim().toLowerCase();
    if (!sender || sender !== parsed.e.toLowerCase()) {
      return {
        valid: false,
        errorCode: 'SENDER_MISMATCH',
        reason: 'Inbound sender email does not match the digest recipient bound to this reply token.',
      };
    }
  }

  return { valid: true, payload: parsed };
}

/**
 * Strips quoted email reply history (`On ... wrote:`, Outlook `-----Original Message-----`,
 * `>` quote blocks, signature delimiters `-- `, and mobile footers) from an inbound email body.
 */
export function StripQuotedEmailReply(rawBody: string): string {
  const normalized = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    // Standard RFC 3676 signature separator ("-- " or "--")
    if (line === '-- ' || trimmed === '--') {
      break;
    }

    // Outlook / Exchange quote separator
    if (/^-{3,}\s*Original Message\s*-{3,}$/i.test(trimmed)) {
      break;
    }

    // Outlook header block: "From: ..." followed closely by "Sent:" or "Date:"
    if (/^From:\s+.+/i.test(trimmed) && i + 1 < lines.length && /^(Sent|Date|To):/i.test(lines[i + 1].trim())) {
      break;
    }

    // Gmail / Apple Mail attribution line: "On Mon, Nov 19, 2026 at 10:00 AM ... wrote:"
    if (/^On\s+.+wrote:\s*$/i.test(trimmed)) {
      break;
    }

    // Multi-line wrapped "On ...\n... wrote:" header
    if (
      /^On\s+.+$/i.test(trimmed) &&
      i + 1 < lines.length &&
      /wrote:\s*$/i.test(lines[i + 1].trim())
    ) {
      break;
    }

    // Underscore horizontal separator often inserted before quoted digests
    if (/^_{8,}$/.test(trimmed)) {
      break;
    }

    // Quoted ">" lines
    if (trimmed.startsWith('>')) {
      continue;
    }

    // Mobile client footers
    if (/^(Sent from my (iPhone|iPad|Android)|Get Outlook for (iOS|Android))/i.test(trimmed)) {
      continue;
    }

    kept.push(line);
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Pure helper combining HMAC-SHA256 reply token verification with email chrome stripping.
 */
export function ParseAndVerifyInboundEmailReply(params: {
  replyToAddressOrToken: string;
  rawBodyText: string;
  senderEmail?: string | null;
  signingSecret?: string;
  skipSenderBindingCheck?: boolean;
  now?: Date;
}): ParsedInboundEmailReply {
  const token = VerifyDigestReplyToken(params.replyToAddressOrToken, {
    signingSecret: params.signingSecret,
    expectedSenderEmail: params.senderEmail,
    skipSenderBindingCheck: params.skipSenderBindingCheck,
    now: params.now,
  });
  const cleanedBody = StripQuotedEmailReply(params.rawBodyText ?? '');
  return { token, cleanedBody };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders responsive HTML and plaintext personalized community digest emails with relevance badges
 * and per-thread HMAC-signed `mailto:reply+<token>@...` reply links.
 */
export function RenderPersonalizedDigestEmail(params: {
  recipientName: string;
  communityName: string;
  items: ReadonlyArray<DigestRenderItem>;
  generatedAt?: Date;
}): RenderedPersonalizedDigest {
  const generatedAt = params.generatedAt ?? new Date();
  const dateLabel = generatedAt.toISOString().slice(0, 10);
  const topItem = params.items[0];
  const primaryReplyToAddress = topItem?.replyToAddress ?? 'noreply@bizapps.local';

  const subject =
    params.items.length > 0
      ? `${params.communityName} Digest (${dateLabel}): ${topItem.ranked.post.title}`
      : `${params.communityName} Digest (${dateLabel})`;

  const textLines: string[] = [
    `${params.communityName} — Personalized Community Digest for ${params.recipientName}`,
    `Date: ${dateLabel}`,
    '',
  ];

  if (params.items.length === 0) {
    textLines.push('No new discussions matched your digest filters in this period.');
  } else {
    params.items.forEach((item, idx) => {
      const p = item.ranked.post;
      textLines.push(`${idx + 1}. ${p.title}`);
      textLines.push(`   Why this matters: ${item.ranked.explanation}`);
      if (p.epistemicStatus) {
        textLines.push(`   Verification: ${p.epistemicStatus}`);
      }
      const excerpt = (p.summaryMarkdown ?? p.bodyMarkdown).replace(/\s+/g, ' ').trim().slice(0, 220);
      textLines.push(`   ${excerpt}`);
      if (item.replyToAddress && item.replyToken) {
        textLines.push(`   Reply directly via email: ${item.replyToAddress}`);
      }
      textLines.push('');
    });
  }

  textLines.push('---');
  textLines.push('Reply directly to any thread link above to post your response into the community.');

  const htmlCards = params.items
    .map((item) => {
      const p = item.ranked.post;
      const excerpt = escapeHtml((p.summaryMarkdown ?? p.bodyMarkdown).replace(/\s+/g, ' ').trim().slice(0, 240));
      const epistemicChip = p.epistemicStatus
        ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:#ecfdf5;color:#047857;margin-left:6px;">${escapeHtml(p.epistemicStatus)}</span>`
        : '';
      const replyButton =
        item.replyToAddress && item.replyToken
          ? `<div>
            <a href="mailto:${encodeURIComponent(item.replyToAddress)}?subject=${encodeURIComponent(`Re: ${p.title}`)}" style="display:inline-block;padding:8px 14px;border-radius:6px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">
              Reply via Email
            </a>
          </div>`
          : '';
      return `
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:14px;background:#ffffff;">
          <div style="font-size:12px;color:#475569;margin-bottom:6px;">
            <strong>${escapeHtml(p.forumName ?? 'Community')}</strong>
            ${epistemicChip}
          </div>
          <h2 style="margin:0 0 8px 0;font-size:16px;line-height:1.35;color:#0f172a;">${escapeHtml(p.title)}</h2>
          <div style="display:inline-block;padding:4px 10px;border-radius:6px;background:#eef2ff;color:#3730a3;font-size:12px;margin-bottom:10px;">
            ${escapeHtml(item.ranked.explanation)}
          </div>
          <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#334155;">${excerpt}</p>
          ${replyButton}
        </div>
      `;
    })
    .join('\n');

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="padding:18px 20px;border-radius:12px;background:#0f172a;color:#ffffff;margin-bottom:18px;">
      <div style="font-size:12px;opacity:0.8;text-transform:uppercase;letter-spacing:0.06em;">Personalized Digest · ${escapeHtml(dateLabel)}</div>
      <h1 style="margin:6px 0 4px 0;font-size:20px;">${escapeHtml(params.communityName)}</h1>
      <div style="font-size:13px;opacity:0.9;">Curated for ${escapeHtml(params.recipientName)}</div>
    </div>
    ${htmlCards || '<p style="font-size:14px;color:#475569;">No new discussions matched your digest filters in this period.</p>'}
    <div style="font-size:12px;color:#64748b;text-align:center;margin-top:20px;">
      Reply directly to any thread link above to contribute from your inbox.
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    htmlBody,
    textBody: textLines.join('\n'),
    primaryReplyToAddress,
    itemCount: params.items.length,
  };
}
