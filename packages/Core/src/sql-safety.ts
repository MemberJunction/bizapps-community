import { IsValidUUID } from '@memberjunction/global';

/**
 * Validates that `value` is a well-formed UUID (canonical 8-4-4-4-12 hex form) before it is ever
 * interpolated into a `RunView` `ExtraFilter` string. Throws rather than silently coercing or
 * dropping the value, so a malformed or SQL-injection-shaped input (a stray quote, a `OR 1=1`
 * fragment) fails the whole call instead of reaching the database as part of a filter expression.
 *
 * @param value - The candidate UUID.
 * @param fieldName - Used only in the thrown error message, to name which parameter failed.
 * @returns The trimmed, validated UUID — safe to interpolate directly.
 */
export function AssertValidUUID(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!IsValidUUID(trimmed)) {
    throw new Error(`${fieldName} is not a valid UUID: "${value}"`);
  }
  return trimmed;
}

/**
 * Validates a comma-separated list of UUIDs (the shape `AllowedForumIDs`-style action parameters
 * arrive in), rejecting the whole list if any entry is malformed. Empty entries (from a leading,
 * trailing, or doubled comma) are dropped rather than rejected.
 */
export function AssertValidUUIDList(value: string, fieldName: string): string[] {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id, index) => AssertValidUUID(id, `${fieldName}[${index}]`));
}

/**
 * Escapes a string for safe inclusion inside a single-quoted SQL literal (doubles embedded single
 * quotes, the standard SQL escaping rule). Defense-in-depth alongside {@link AssertValidUUID} for
 * any value that is not itself UUID-shaped but still needs to reach a `RunView` `ExtraFilter`.
 */
export function EscapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
