import { AssertValidUUID, AssertValidUUIDList } from '@mj-biz-apps/community-core';

/**
 * Parses and validates a comma-separated list of UUIDs supplied as an action input parameter.
 * Returns `[]` when `raw` is null/empty (no forums allowed — the safe default), and throws when
 * any entry is not a well-formed UUID, rejecting SQL-injection-shaped input before it ever reaches
 * a RunView `ExtraFilter` string.
 */
export function ParseAllowedForumIDsParam(raw: string | null): string[] {
  return raw ? AssertValidUUIDList(raw, 'AllowedForumIDs') : [];
}

/** Parses and validates a single required UUID action input parameter. Throws when missing or malformed. */
export function ParseRequiredUUIDParam(raw: string | null, fieldName: string): string {
  if (!raw) {
    throw new Error(`${fieldName} is required`);
  }
  return AssertValidUUID(raw, fieldName);
}

/** Parses and validates an optional UUID action input parameter. Returns null when absent, throws when malformed. */
export function ParseOptionalUUIDParam(raw: string | null, fieldName: string): string | null {
  return raw ? AssertValidUUID(raw, fieldName) : null;
}
