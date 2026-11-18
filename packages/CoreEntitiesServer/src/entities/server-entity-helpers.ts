/* Partial update: implementing CR-02 requirements */
export async function resolveForumMemberAndRole(entity: BaseEntity, forumId: string, userId: string | null | undefined): Promise<ResolvedForumMemberRole> {
  const validForumId = validUuidOrNull(forumId);
  const validUserId = validUuidOrNull(userId);
  
  // Fail-closed if IDs are invalid
  if (!validForumId || !validUserId) {
    return { success: false, errorMessage: 'Invalid ForumID or UserID.', member: null, roleType: null };
  }

  const memberRes = await loadSingleRow<ForumMemberRow>(
    entity,
    COMMUNITY_ENTITY_NAMES.ForumMembers,
    `ForumID = '${validForumId}' AND UserID = '${validUserId}'`,
    ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
  );

  // Distinguish lookup failure from absent membership
  if (!memberRes.success) {
    return { success: false, errorMessage: 'Lookup failed', member: null, roleType: null };
  }

  if (!memberRes.row) {
    return { success: true, member: null, roleType: null };
  }

  const roleRes = await resolveForumRoleTypeDescriptorWithStatus(entity, memberRes.row.ForumRoleTypeID);
  if (!roleRes.success) {
     return { success: false, errorMessage: roleRes.errorMessage || 'Failed to resolve role.', member: memberRes.row, roleType: null };
  }
  
  return { success: true, member: memberRes.row, roleType: roleRes.roleType };
}