import type { ActionResultSimple } from '@memberjunction/actions-base';

/**
 * Awaits `entity.Save()` and returns a structured `SAVE_FAILED`-style action failure when it
 * returns `false` (MJ's documented signal for a rejected save — a validation/trigger rejection,
 * never a thrown exception on its own), or `null` when the save succeeded. Mirrors
 * `SaveOrThrow` in `@mj-biz-apps/community-server`'s `resolvers.ts`, adapted to an Action's
 * return-a-result convention instead of throwing.
 */
export async function SaveOrFail(
  entity: { Save(): Promise<boolean> },
  failureResultCode: string,
  failureMessage: string,
): Promise<ActionResultSimple | null> {
  const saved = await entity.Save();
  if (!saved) {
    return { Success: false, ResultCode: failureResultCode, Message: failureMessage };
  }
  return null;
}
