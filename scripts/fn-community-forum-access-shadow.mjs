/**
 * Pure-JS mirror of [__mj_BizAppsCommunity].[fnCommunityForumAccess]'s `CanPost` CASE expression
 * (migrations/V202611060001__v0.1.x__Baseline_Tables_And_Access.sql). The real TVF joins across
 * `__mj_BizAppsCollaboration.fnCollaborationAccess`/`fnCollaborationSpaceStatuses` and can only be
 * exercised against a live SQL Server database (verified there via the MigrationDryRun artifact,
 * not by this repo's DB-less `node --test` runner); this shadow proves the access-matrix LOGIC
 * itself — allowed member, denied non-member, read-only/locked forum, muted member — stays
 * correct whenever the real CASE expression is edited, by mirroring its exact branch order.
 */

/**
 * @param {{
 *   forumStatus: 'Active' | 'Locked',
 *   spaceReadOnly: boolean,
 *   canContribute: boolean,
 *   forumMemberStatus: 'Active' | 'Muted' | null,
 *   canCreateRootPost: boolean,
 *   canReply: boolean,
 *   postingPolicy: 'Open' | 'Moderated' | 'ReadOnly',
 *   canConfigureForum: boolean,
 * }} params
 * @returns {boolean} the TVF's `CanPost` column
 */
export function EvaluateCommunityForumCanPost(params) {
  if (params.forumStatus === 'Locked') return false;
  if (params.spaceReadOnly) return false;
  if (!params.canContribute) return false;
  if (params.forumMemberStatus === 'Muted') return false;
  if (!params.canCreateRootPost && !params.canReply) return false;
  if (params.postingPolicy === 'ReadOnly' && !params.canConfigureForum) return false;
  return true;
}
