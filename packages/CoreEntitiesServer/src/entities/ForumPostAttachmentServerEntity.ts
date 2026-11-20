import {
  BaseEntity,
  type EntitySaveOptions,
  type TransactionGroupBase,
  type ValidationResult,
} from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  CommunityRules,
  type CommunityVisibilityBand,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  mjBizAppsCommunityForumPostAttachmentEntity,
} from '@mj-biz-apps/community-entities';
import {
  failValidation,
  loadRows,
  loadSingleRow,
  resolveForumMemberAndRole,
  resolveForumRow,
  validUuidOrNull,
} from './server-entity-helpers.ts';

interface AttachmentPostRow {
  ID: string;
  ForumID: string;
  ParentPostID: string | null;
  AuthorUserID: string | null;
  VisibilityBand: CommunityVisibilityBand;
  IsLocked: boolean;
}

interface AttachmentSpaceRow {
  ID: string;
  OwnerID: string;
}

interface AttachmentSpaceMemberRow {
  ID: string;
  SpaceID: string;
  UserID: string;
  Band: 'Shared' | 'Team';
  Status: 'Active' | 'Invited' | 'Removed';
}

interface AttachmentSpaceItemRow {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  Folder: string | null;
  ArtifactVersionID: string | null;
}

interface AttachmentEntityRow {
  ID: string;
  Name: string;
}

interface AttachmentArtifactVersionRow {
  ID: string;
  ArtifactID: string;
  FileID: string | null;
  ContentMode: string | null;
}

interface IdRow {
  ID: string;
}

function extractRecordUuid(recordId: string | null | undefined): string | null {
  if (typeof recordId !== 'string') return null;
  const trimmed = recordId.trim();
  const raw = trimmed.toLowerCase().startsWith('id|') ? trimmed.slice(3).trim() : trimmed;
  return validUuidOrNull(raw);
}

/**
 * Authoritative server BaseEntity subclass for `MJ_BizApps_Community: Forum Post Attachments`.
 * Enforces source-post ownership/moderator access, lock status, forum & space visibility bands,
 * cross-space isolation, target entity/record/version validity (blocking fake `ForumPost.ID`
 * file substitutions), caption bounds, and per-post attachment count ceilings even on direct saves.
 */
@RegisterClass(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostAttachments)
export class ForumPostAttachmentServerEntity extends mjBizAppsCommunityForumPostAttachmentEntity {
  public override get DefaultSkipAsyncValidation(): boolean {
    return false;
  }

  public override async ValidateAsync(): Promise<ValidationResult> {
    const result = await super.ValidateAsync();

    const contextUser = this.ContextCurrentUser;
    const callerUserId = validUuidOrNull(contextUser?.ID);
    if (!callerUserId) {
      return failValidation(result, 'PostID', 'ContextCurrentUser is required to save ForumPostAttachment.');
    }

    const validPostId = validUuidOrNull(this.PostID);
    if (!validPostId) {
      return failValidation(result, 'PostID', 'PostID must be a valid UUID.');
    }

    const validSpaceItemId = validUuidOrNull(this.SpaceItemID);
    if (!validSpaceItemId) {
      return failValidation(result, 'SpaceItemID', 'SpaceItemID must be a valid UUID.');
    }

    if (this.Caption && this.Caption.length > COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH) {
      return failValidation(
        result,
        'Caption',
        `Caption exceeds maximum length of ${COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH} characters.`,
      );
    }

    const postRes = await loadSingleRow<AttachmentPostRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      `ID = '${validPostId}'`,
      ['ID', 'ForumID', 'ParentPostID', 'AuthorUserID', 'VisibilityBand', 'IsLocked'],
    );
    if (!postRes.success || !postRes.row) {
      return failValidation(result, 'PostID', `ForumPost ${validPostId} was not found or access is denied.`);
    }
    const post = postRes.row;

    const forum = await resolveForumRow(this, post.ForumID);
    if (!forum) {
      return failValidation(result, 'PostID', `Forum ${post.ForumID} was not found or access is denied.`);
    }
    if (forum.Status !== 'Active') {
      return failValidation(
        result,
        'PostID',
        `Forum "${forum.Name}" has status "${forum.Status}" and does not accept attachment writes.`,
      );
    }

    const validSpaceId = validUuidOrNull(forum.SpaceID);
    if (!validSpaceId) {
      return failValidation(result, 'PostID', 'Forum SpaceID is invalid.');
    }

    const spaceRes = await loadSingleRow<AttachmentSpaceRow>(
      this,
      'MJ_BizApps_Collaboration: Spaces',
      `ID = '${validSpaceId}'`,
      ['ID', 'OwnerID'],
    );
    if (!spaceRes.success || !spaceRes.row) {
      return failValidation(result, 'PostID', `Collaboration Space ${validSpaceId} was not found or access is denied.`);
    }
    const isOwner = UUIDsEqual(spaceRes.row.OwnerID, callerUserId);

    const spaceMemberRes = await loadSingleRow<AttachmentSpaceMemberRow>(
      this,
      'MJ_BizApps_Collaboration: Space Members',
      `SpaceID = '${validSpaceId}' AND UserID = '${callerUserId}' AND Status = 'Active'`,
      ['ID', 'SpaceID', 'UserID', 'Band', 'Status'],
    );
    if (!spaceMemberRes.success) {
      return failValidation(result, 'PostID', 'Unable to verify Collaboration Space membership.');
    }
    const spaceMember = spaceMemberRes.row;
    if (!isOwner && !spaceMember) {
      return failValidation(result, 'PostID', `Caller is not authorized to access Space ${validSpaceId}.`);
    }
    const canSeeTeamBand = isOwner || spaceMember?.Band === 'Team';

    const { member, roleType, lookupFailed } = await resolveForumMemberAndRole(this, forum.ID, callerUserId);
    if (lookupFailed) {
      return failValidation(result, 'PostID', 'Unable to verify Forum membership.');
    }

    const decision = CommunityRules.EvaluateForumAccess({
      spaceAccess: {
        canReadSpace: true,
        canSeeTeamBand,
        isSpaceOpenForWrites: true,
      },
      forum: {
        visibilityBand: forum.VisibilityBand,
        inheritsSpaceMembers: Boolean(forum.InheritsSpaceMembers),
        postingPolicy: forum.PostingPolicy,
        status: forum.Status,
      },
      forumMembership:
        member && roleType
          ? {
              status: member.Status,
              canConfigureForum: Boolean(roleType.CanConfigureForum),
              canModerateQueue: Boolean(roleType.CanModerateQueue),
              canCreateRootPost: Boolean(roleType.CanCreateRootPost),
              canReply: Boolean(roleType.CanReply),
            }
          : null,
    });

    if (!decision.canReadForum) {
      return failValidation(result, 'PostID', `Caller is not authorized to access Forum ${forum.ID}.`);
    }
    if (post.VisibilityBand === 'Team' && !decision.canSeeTeamPosts) {
      return failValidation(result, 'PostID', `Caller is not authorized to access Team-band post ${post.ID}.`);
    }

    const isModerator = decision.canModerateQueue;
    if (post.IsLocked && !isModerator) {
      return failValidation(result, 'PostID', `Post ${post.ID} is locked; attachments cannot be modified.`);
    }

    const isAuthor = post.AuthorUserID !== null && UUIDsEqual(post.AuthorUserID, callerUserId);
    if (!isAuthor && !isModerator) {
      return failValidation(
        result,
        'PostID',
        'Only the post author or a forum moderator may modify attachments on this post.',
      );
    }

    const isReply = post.ParentPostID !== null;
    if (isAuthor && !isModerator) {
      if (!isReply && !decision.canCreateRootPost) {
        return failValidation(result, 'PostID', 'Caller lacks permission to attach media to root posts in this forum.');
      }
      if (isReply && !decision.canReply) {
        return failValidation(result, 'PostID', 'Caller lacks permission to attach media to replies in this forum.');
      }
    }

    const spaceItemRes = await loadSingleRow<AttachmentSpaceItemRow>(
      this,
      'MJ_BizApps_Collaboration: Space Items',
      `ID = '${validSpaceItemId}'`,
      ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Band', 'Folder', 'ArtifactVersionID'],
    );
    if (!spaceItemRes.success || !spaceItemRes.row) {
      return failValidation(result, 'SpaceItemID', `SpaceItem ${validSpaceItemId} was not found or access is denied.`);
    }
    const spaceItem = spaceItemRes.row;

    if (!UUIDsEqual(spaceItem.SpaceID, validSpaceId)) {
      return failValidation(
        result,
        'SpaceItemID',
        `SpaceItem ${spaceItem.ID} belongs to a different Space and cannot be attached here.`,
      );
    }

    const expectedBand = CommunityRules.ResolvePostVisibilityBand({
      forumVisibilityBand: forum.VisibilityBand,
      requestedBand: post.VisibilityBand,
      authorCanSeeTeamBand: canSeeTeamBand,
    });
    if (expectedBand === 'Team' && spaceItem.Band !== 'Team') {
      return failValidation(
        result,
        'SpaceItemID',
        `Team-band post ${post.ID} cannot attach a ${spaceItem.Band}-band SpaceItem.`,
      );
    }
    if (expectedBand === 'Shared' && spaceItem.Band === 'Team') {
      return failValidation(
        result,
        'SpaceItemID',
        `Shared post ${post.ID} cannot attach a Team-band SpaceItem without promotion authorization.`,
      );
    }

    const validEntityId = validUuidOrNull(spaceItem.EntityID);
    const recordUuid = extractRecordUuid(spaceItem.RecordID);
    if (!validEntityId || !recordUuid) {
      return failValidation(result, 'SpaceItemID', `SpaceItem ${spaceItem.ID} has an invalid EntityID or RecordID.`);
    }

    const entityRes = await loadSingleRow<AttachmentEntityRow>(
      this,
      'MJ: Entities',
      `ID = '${validEntityId}'`,
      ['ID', 'Name'],
    );
    if (!entityRes.success || !entityRes.row) {
      return failValidation(result, 'SpaceItemID', `Referenced SpaceItem EntityID ${validEntityId} was not found.`);
    }

    const targetEntityName = entityRes.row.Name;
    if (targetEntityName === 'MJ: Files') {
      if (UUIDsEqual(recordUuid, validPostId)) {
        return failValidation(
          result,
          'SpaceItemID',
          'SpaceItem RecordID cannot substitute ForumPost.ID as a fake MJ: Files target.',
        );
      }
      const fileRes = await loadSingleRow<IdRow>(this, 'MJ: Files', `ID = '${recordUuid}'`, ['ID']);
      if (!fileRes.success || !fileRes.row) {
        return failValidation(result, 'SpaceItemID', `Referenced File ${recordUuid} was not found or access is denied.`);
      }
    } else if (targetEntityName === 'MJ: Artifacts') {
      const artRes = await loadSingleRow<IdRow>(this, 'MJ: Artifacts', `ID = '${recordUuid}'`, ['ID']);
      if (!artRes.success || !artRes.row) {
        return failValidation(
          result,
          'SpaceItemID',
          `Referenced Artifact ${recordUuid} was not found or access is denied.`,
        );
      }
    } else {
      return failValidation(
        result,
        'SpaceItemID',
        `SpaceItem Entity "${targetEntityName}" is not supported for post attachments.`,
      );
    }

    if (spaceItem.ArtifactVersionID) {
      const validVersionId = validUuidOrNull(spaceItem.ArtifactVersionID);
      if (!validVersionId) {
        return failValidation(result, 'SpaceItemID', 'SpaceItem ArtifactVersionID is not a valid UUID.');
      }
      const verRes = await loadSingleRow<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `ID = '${validVersionId}'`,
        ['ID', 'ArtifactID', 'FileID', 'ContentMode'],
      );
      if (!verRes.success || !verRes.row) {
        return failValidation(
          result,
          'SpaceItemID',
          `Referenced Artifact Version ${validVersionId} was not found or access is denied.`,
        );
      }
      if (targetEntityName === 'MJ: Artifacts' && !UUIDsEqual(verRes.row.ArtifactID, recordUuid)) {
        return failValidation(
          result,
          'SpaceItemID',
          `SpaceItem ArtifactVersionID ${validVersionId} does not belong to Artifact ${recordUuid}.`,
        );
      }
      if (targetEntityName === 'MJ: Files' && verRes.row.FileID && !UUIDsEqual(verRes.row.FileID, recordUuid)) {
        return failValidation(
          result,
          'SpaceItemID',
          `SpaceItem ArtifactVersionID ${validVersionId} belongs to a different File than ${recordUuid}.`,
        );
      }
    }

    if (!this.IsSaved) {
      const existingAttsRes = await loadRows<IdRow>(
        this,
        COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
        `PostID = '${validPostId}'`,
        ['ID'],
        COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 1,
      );
      if (!existingAttsRes.success) {
        return failValidation(result, 'PostID', 'Unable to verify existing attachment count for post.');
      }
      if (existingAttsRes.rows.length >= COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST) {
        return failValidation(
          result,
          'PostID',
          `Attachment count exceeds the maximum of ${COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST} attachments per post.`,
        );
      }
    }

    return result;
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const txGroup = (options as EntitySaveOptions & { TransactionGroup?: TransactionGroupBase })?.TransactionGroup ?? null;
    if (txGroup) this.TransactionGroup = txGroup;
    return super.Save(options);
  }
}

export function LoadForumPostAttachmentServerEntity(): void {
  void ForumPostAttachmentServerEntity;
}
