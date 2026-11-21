import {
  BaseEntity,
  EntitySaveOptions,
  type TransactionGroupBase,
  type ValidationResult,
} from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  CommunityRules,
  ValidateAttachmentBatchLimits,
  ValidateAuthoritativeArtifactVersionRecord,
  ValidateAuthoritativeFileRecord,
  type AuthoritativeArtifactVersionRowInput,
  type AuthoritativeFileRowInput,
  type CommunityVisibilityBand,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  mjBizAppsCommunityForumPostAttachmentEntity,
} from '@mj-biz-apps/community-entities';
import {
  failSave,
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

interface AttachmentArtifactVersionRow extends AuthoritativeArtifactVersionRowInput {
  ID: string;
  ArtifactID: string;
  FileID: string | null;
  ContentMode: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
  Content: string | null;
  FileName: string | null;
  VersionNumber: number | null;
}

interface AttachmentFileRow extends AuthoritativeFileRowInput {
  ID: string;
  Name: string;
  ContentType: string | null;
  ProviderKey?: string | null;
  Status?: string | null;
}

interface ExistingAttachmentRow {
  ID: string;
  SpaceItemID: string;
}

interface IdRow {
  ID: string;
}

const ARTIFACT_VERSION_FIELDS: string[] = [
  'ID',
  'ArtifactID',
  'FileID',
  'ContentMode',
  'MimeType',
  'ContentSizeBytes',
  'Content',
  'FileName',
  'VersionNumber',
];

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
    let loadedFileRow: AttachmentFileRow | null = null;
    let currentAttachmentBytes: number | null = null;

    if (targetEntityName === 'MJ: Files') {
      if (UUIDsEqual(recordUuid, validPostId)) {
        return failValidation(
          result,
          'SpaceItemID',
          'SpaceItem RecordID cannot substitute ForumPost.ID as a fake MJ: Files target.',
        );
      }
      const fileRes = await loadSingleRow<AttachmentFileRow>(
        this,
        'MJ: Files',
        `ID = '${recordUuid}'`,
      );
      if (!fileRes.success || !fileRes.row) {
        return failValidation(result, 'SpaceItemID', `Referenced File ${recordUuid} was not found or access is denied.`);
      }
      loadedFileRow = fileRes.row;
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
        ARTIFACT_VERSION_FIELDS,
      );
      if (!verRes.success || !verRes.row) {
        return failValidation(
          result,
          'SpaceItemID',
          `Referenced Artifact Version ${validVersionId} was not found or access is denied.`,
        );
      }
      const versionRow = verRes.row;

      if (targetEntityName === 'MJ: Files') {
        const validParentArtId = validUuidOrNull(versionRow.ArtifactID);
        if (!validParentArtId) {
          return failValidation(
            result,
            'SpaceItemID',
            `Artifact Version ${validVersionId} is missing a valid parent ArtifactID.`,
          );
        }
        const parentArtRes = await loadSingleRow<IdRow>(this, 'MJ: Artifacts', `ID = '${validParentArtId}'`, ['ID']);
        if (!parentArtRes.success || !parentArtRes.row) {
          return failValidation(
            result,
            'SpaceItemID',
            `Parent Artifact ${validParentArtId} for Artifact Version ${validVersionId} was not found or access is denied.`,
          );
        }
      } else if (versionRow.FileID) {
        const validLinkedFileId = validUuidOrNull(versionRow.FileID);
        if (!validLinkedFileId) {
          return failValidation(result, 'SpaceItemID', `Artifact Version ${validVersionId} has an invalid FileID.`);
        }
        const linkedFileRes = await loadSingleRow<AttachmentFileRow>(
          this,
          'MJ: Files',
          `ID = '${validLinkedFileId}'`,
        );
        if (!linkedFileRes.success || !linkedFileRes.row) {
          return failValidation(
            result,
            'SpaceItemID',
            `Referenced File ${validLinkedFileId} for Artifact Version ${validVersionId} was not found or access is denied.`,
          );
        }
        loadedFileRow = linkedFileRes.row;
      }

      const verCheck = ValidateAuthoritativeArtifactVersionRecord(versionRow, {
        targetEntityName,
        targetRecordUuid: recordUuid,
        expectedFileId: targetEntityName === 'MJ: Files' ? recordUuid : null,
        linkedFileRow: loadedFileRow,
      });
      if (!verCheck.valid) {
        return failValidation(result, 'SpaceItemID', verCheck.error ?? 'Invalid Artifact Version target.');
      }
      currentAttachmentBytes = verCheck.sizeBytes ?? null;
    } else if (targetEntityName === 'MJ: Files') {
      let companionVer: AttachmentArtifactVersionRow | null = null;
      if (loadedFileRow!.ContentSizeBytes == null && loadedFileRow!.Size == null) {
        const compRes = await loadRows<AttachmentArtifactVersionRow>(
          this,
          'MJ: Artifact Versions',
          `FileID = '${recordUuid}'`,
          ARTIFACT_VERSION_FIELDS,
          50,
        );
        if (!compRes.success) {
          return failValidation(result, 'SpaceItemID', `Unable to verify metadata versions for File ${recordUuid}.`);
        }
        const sortedComp = [...compRes.rows].sort(
          (a, b) => (b.VersionNumber ?? 0) - (a.VersionNumber ?? 0),
        );
        companionVer = sortedComp[0] ?? null;
      }
      const fileCheck = ValidateAuthoritativeFileRecord(loadedFileRow!, undefined, companionVer);
      if (!fileCheck.valid) {
        return failValidation(result, 'SpaceItemID', fileCheck.error ?? 'Invalid MJ: Files target.');
      }
      currentAttachmentBytes = fileCheck.sizeBytes ?? null;
    } else {
      const latestVerRes = await loadRows<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `ArtifactID = '${recordUuid}'`,
        ARTIFACT_VERSION_FIELDS,
        50,
      );
      if (!latestVerRes.success) {
        return failValidation(result, 'SpaceItemID', `Unable to verify versions for Artifact ${recordUuid}.`);
      }
      const sortedVersions = [...latestVerRes.rows].sort(
        (a, b) => (b.VersionNumber ?? 0) - (a.VersionNumber ?? 0),
      );
      const latestVer = sortedVersions[0];
      if (!latestVer) {
        return failValidation(
          result,
          'SpaceItemID',
          `Artifact ${recordUuid} has no published Artifact Version to resolve authoritative size and content.`,
        );
      }
      let linkedFileForLatest: AttachmentFileRow | null = null;
      if (latestVer.FileID) {
        const validLinkedFileId = validUuidOrNull(latestVer.FileID);
        if (!validLinkedFileId) {
          return failValidation(result, 'SpaceItemID', `Artifact Version ${latestVer.ID} has an invalid FileID.`);
        }
        const linkedFileRes = await loadSingleRow<AttachmentFileRow>(
          this,
          'MJ: Files',
          `ID = '${validLinkedFileId}'`,
        );
        if (!linkedFileRes.success || !linkedFileRes.row) {
          return failValidation(
            result,
            'SpaceItemID',
            `Referenced File ${validLinkedFileId} for Artifact Version ${latestVer.ID} was not found or access is denied.`,
          );
        }
        linkedFileForLatest = linkedFileRes.row;
      }
      const verCheck = ValidateAuthoritativeArtifactVersionRecord(latestVer, {
        targetEntityName: 'MJ: Artifacts',
        targetRecordUuid: recordUuid,
        linkedFileRow: linkedFileForLatest,
      });
      if (!verCheck.valid) {
        return failValidation(result, 'SpaceItemID', verCheck.error ?? 'Invalid Artifact Version target.');
      }
      currentAttachmentBytes = verCheck.sizeBytes ?? null;
    }

    if (
      typeof currentAttachmentBytes !== 'number' ||
      !Number.isFinite(currentAttachmentBytes) ||
      currentAttachmentBytes <= 0
    ) {
      return failValidation(
        result,
        'SpaceItemID',
        'Attachment target lacks a valid positive authoritative byte size.',
      );
    }

    const existingAttsRes = await loadRows<ExistingAttachmentRow>(
      this,
      COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
      `PostID = '${validPostId}'`,
      ['ID', 'SpaceItemID'],
      COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
    );
    if (!existingAttsRes.success) {
      return failValidation(result, 'PostID', 'Unable to verify existing attachments for post.');
    }

    const otherAttachments = this.IsSaved && this.ID
      ? existingAttsRes.rows.filter((a) => !UUIDsEqual(a.ID, this.ID))
      : existingAttsRes.rows;

    const existingSizeResult = await this.resolveExistingAttachmentSizes(otherAttachments);
    if (!existingSizeResult.ok) {
      return failValidation(result, 'PostID', existingSizeResult.error);
    }
    const batchCheck = ValidateAttachmentBatchLimits(
      [...existingSizeResult.entries, { sizeBytes: currentAttachmentBytes }],
      {
        maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
        maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
        maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
      },
    );
    if (!batchCheck.valid) {
      return failValidation(result, 'PostID', batchCheck.errors.join(' '));
    }

    return result;
  }

  private async resolveExistingAttachmentSizes(
    existingAttachments: ReadonlyArray<ExistingAttachmentRow>,
  ): Promise<{ ok: true; entries: Array<{ sizeBytes: number }> } | { ok: false; error: string }> {
    if (existingAttachments.length === 0) {
      return { ok: true, entries: [] };
    }
    const spaceItemIds: string[] = [];
    for (const att of existingAttachments) {
      const validSiId = validUuidOrNull(att.SpaceItemID);
      if (!validSiId) {
        return {
          ok: false,
          error: `Existing ForumPostAttachment ${att.ID} has an invalid SpaceItemID; cannot verify aggregate byte limits.`,
        };
      }
      spaceItemIds.push(validSiId);
    }
    const uniqueSpaceItemIds = Array.from(new Set(spaceItemIds));

    const siFilter = `ID IN (${uniqueSpaceItemIds.map((id) => `'${id}'`).join(', ')})`;
    const siRes = await loadRows<AttachmentSpaceItemRow>(
      this,
      'MJ_BizApps_Collaboration: Space Items',
      siFilter,
      ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Band', 'Folder', 'ArtifactVersionID'],
      COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
    );
    if (!siRes.success) {
      return { ok: false, error: 'Unable to load existing attachment SpaceItems to verify aggregate byte limits.' };
    }
    const siById = new Map<string, AttachmentSpaceItemRow>(
      siRes.rows.map((si) => [si.ID.toLowerCase(), si]),
    );
    for (const siId of uniqueSpaceItemIds) {
      if (!siById.has(siId.toLowerCase())) {
        return {
          ok: false,
          error: `Existing attachment SpaceItem ${siId} was not found or access is denied.`,
        };
      }
    }

    const entityIds = Array.from(
      new Set(
        siRes.rows
          .map((si) => validUuidOrNull(si.EntityID))
          .filter((id): id is string => id !== null),
      ),
    );
    if (entityIds.length !== new Set(siRes.rows.map((si) => si.EntityID.toLowerCase())).size) {
      return { ok: false, error: 'Existing attachment SpaceItem has an invalid EntityID.' };
    }
    const entRes = await loadRows<AttachmentEntityRow>(
      this,
      'MJ: Entities',
      `ID IN (${entityIds.map((id) => `'${id}'`).join(', ')})`,
      ['ID', 'Name'],
      entityIds.length + 5,
    );
    if (!entRes.success) {
      return { ok: false, error: 'Unable to resolve Entity metadata for existing post attachments.' };
    }
    const entityNameById = new Map<string, string>(
      entRes.rows.map((e) => [e.ID.toLowerCase(), e.Name]),
    );

    const pinnedVersionIds = new Set<string>();
    const unpinnedArtifactIds = new Set<string>();
    const unpinnedFileIds = new Set<string>();

    for (const si of siRes.rows) {
      const targetEntityName = entityNameById.get(si.EntityID.toLowerCase());
      const recUuid = extractRecordUuid(si.RecordID);
      if ((targetEntityName !== 'MJ: Files' && targetEntityName !== 'MJ: Artifacts') || !recUuid) {
        return {
          ok: false,
          error: `Existing SpaceItem ${si.ID} has an unsupported or invalid target (${targetEntityName ?? 'unknown'}).`,
        };
      }
      if (si.ArtifactVersionID) {
        const validVerId = validUuidOrNull(si.ArtifactVersionID);
        if (!validVerId) {
          return { ok: false, error: `Existing SpaceItem ${si.ID} has an invalid ArtifactVersionID.` };
        }
        pinnedVersionIds.add(validVerId);
      } else if (targetEntityName === 'MJ: Artifacts') {
        unpinnedArtifactIds.add(recUuid);
      } else {
        unpinnedFileIds.add(recUuid);
      }
    }

    const versionById = new Map<string, AttachmentArtifactVersionRow>();
    if (pinnedVersionIds.size > 0) {
      const verRes = await loadRows<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `ID IN (${Array.from(pinnedVersionIds).map((id) => `'${id}'`).join(', ')})`,
        ARTIFACT_VERSION_FIELDS,
        COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
      );
      if (!verRes.success) {
        return { ok: false, error: 'Unable to load pinned Artifact Versions for existing post attachments.' };
      }
      for (const v of verRes.rows) {
        versionById.set(v.ID.toLowerCase(), v);
      }
    }

    const latestVersionByArtifactId = new Map<string, AttachmentArtifactVersionRow>();
    if (unpinnedArtifactIds.size > 0) {
      const artVerRes = await loadRows<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `ArtifactID IN (${Array.from(unpinnedArtifactIds).map((id) => `'${id}'`).join(', ')})`,
        ARTIFACT_VERSION_FIELDS,
        (unpinnedArtifactIds.size + 1) * 50,
      );
      if (!artVerRes.success) {
        return { ok: false, error: 'Unable to load latest Artifact Versions for existing unpinned artifact attachments.' };
      }
      for (const v of artVerRes.rows) {
        const key = v.ArtifactID.toLowerCase();
        const existing = latestVersionByArtifactId.get(key);
        if (!existing || (v.VersionNumber ?? 0) > (existing.VersionNumber ?? 0)) {
          latestVersionByArtifactId.set(key, v);
        }
      }
    }

    const allFileIdsToLoad = new Set<string>(unpinnedFileIds);
    for (const v of versionById.values()) {
      if (v.FileID) {
        const validFid = validUuidOrNull(v.FileID);
        if (!validFid) {
          return { ok: false, error: `Existing Artifact Version ${v.ID} has an invalid FileID.` };
        }
        allFileIdsToLoad.add(validFid);
      }
    }
    for (const v of latestVersionByArtifactId.values()) {
      if (v.FileID) {
        const validFid = validUuidOrNull(v.FileID);
        if (!validFid) {
          return { ok: false, error: `Existing Artifact Version ${v.ID} has an invalid FileID.` };
        }
        allFileIdsToLoad.add(validFid);
      }
    }

    const fileById = new Map<string, AttachmentFileRow>();
    if (allFileIdsToLoad.size > 0) {
      const fileRes = await loadRows<AttachmentFileRow>(
        this,
        'MJ: Files',
        `ID IN (${Array.from(allFileIdsToLoad).map((id) => `'${id}'`).join(', ')})`,
        undefined,
        allFileIdsToLoad.size + 5,
      );
      if (!fileRes.success) {
        return { ok: false, error: 'Unable to load MJ: Files records for existing post attachments.' };
      }
      for (const f of fileRes.rows) {
        fileById.set(f.ID.toLowerCase(), f);
      }
    }

    const filesNeedingCompanion = Array.from(unpinnedFileIds).filter((fid) => {
      const f = fileById.get(fid.toLowerCase());
      return f != null && f.ContentSizeBytes == null && f.Size == null;
    });
    const companionByFileId = new Map<string, AttachmentArtifactVersionRow>();
    if (filesNeedingCompanion.length > 0) {
      const compRes = await loadRows<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `FileID IN (${filesNeedingCompanion.map((id) => `'${id}'`).join(', ')})`,
        ARTIFACT_VERSION_FIELDS,
        (filesNeedingCompanion.length + 1) * 50,
      );
      if (!compRes.success) {
        return { ok: false, error: 'Unable to load companion Artifact Versions for existing MJ: Files attachments.' };
      }
      for (const v of compRes.rows) {
        if (!v.FileID) continue;
        const key = v.FileID.toLowerCase();
        const existing = companionByFileId.get(key);
        if (!existing || (v.VersionNumber ?? 0) > (existing.VersionNumber ?? 0)) {
          companionByFileId.set(key, v);
        }
      }
    }

    const sizeBySpaceItem = new Map<string, number>();
    for (const si of siRes.rows) {
      const targetEntityName = entityNameById.get(si.EntityID.toLowerCase()) as 'MJ: Files' | 'MJ: Artifacts';
      const recUuid = extractRecordUuid(si.RecordID)!;

      if (si.ArtifactVersionID) {
        const ver = versionById.get(si.ArtifactVersionID.toLowerCase());
        if (!ver) {
          return {
            ok: false,
            error: `Existing attachment Artifact Version ${si.ArtifactVersionID} was not found or access is denied.`,
          };
        }
        let linkedFile: AttachmentFileRow | null = null;
        if (targetEntityName === 'MJ: Files') {
          linkedFile = fileById.get(recUuid.toLowerCase()) ?? null;
          if (!linkedFile) {
            return { ok: false, error: `Existing attachment File ${recUuid} was not found or access is denied.` };
          }
        } else if (ver.FileID) {
          linkedFile = fileById.get(ver.FileID.toLowerCase()) ?? null;
          if (!linkedFile) {
            return { ok: false, error: `Existing attachment File ${ver.FileID} was not found or access is denied.` };
          }
        }
        const verCheck = ValidateAuthoritativeArtifactVersionRecord(ver, {
          targetEntityName,
          targetRecordUuid: recUuid,
          expectedFileId: targetEntityName === 'MJ: Files' ? recUuid : null,
          linkedFileRow: linkedFile,
        });
        if (!verCheck.valid || typeof verCheck.sizeBytes !== 'number' || verCheck.sizeBytes <= 0) {
          return {
            ok: false,
            error: verCheck.error ?? `Unable to resolve authoritative size for existing SpaceItem ${si.ID}.`,
          };
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), verCheck.sizeBytes);
      } else if (targetEntityName === 'MJ: Artifacts') {
        const latestVer = latestVersionByArtifactId.get(recUuid.toLowerCase());
        if (!latestVer) {
          return {
            ok: false,
            error: `Existing unpinned Artifact ${recUuid} has no Artifact Version to resolve authoritative size.`,
          };
        }
        let linkedFile: AttachmentFileRow | null = null;
        if (latestVer.FileID) {
          linkedFile = fileById.get(latestVer.FileID.toLowerCase()) ?? null;
          if (!linkedFile) {
            return {
              ok: false,
              error: `Existing attachment File ${latestVer.FileID} was not found or access is denied.`,
            };
          }
        }
        const verCheck = ValidateAuthoritativeArtifactVersionRecord(latestVer, {
          targetEntityName: 'MJ: Artifacts',
          targetRecordUuid: recUuid,
          linkedFileRow: linkedFile,
        });
        if (!verCheck.valid || typeof verCheck.sizeBytes !== 'number' || verCheck.sizeBytes <= 0) {
          return {
            ok: false,
            error: verCheck.error ?? `Unable to resolve authoritative size for existing Artifact ${recUuid}.`,
          };
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), verCheck.sizeBytes);
      } else {
        const fileRow = fileById.get(recUuid.toLowerCase());
        if (!fileRow) {
          return { ok: false, error: `Existing attachment File ${recUuid} was not found or access is denied.` };
        }
        const companionVer =
          fileRow.ContentSizeBytes == null && fileRow.Size == null
            ? companionByFileId.get(fileRow.ID.toLowerCase()) ?? null
            : null;
        const fileCheck = ValidateAuthoritativeFileRecord(fileRow, undefined, companionVer);
        if (!fileCheck.valid || typeof fileCheck.sizeBytes !== 'number' || fileCheck.sizeBytes <= 0) {
          return {
            ok: false,
            error: fileCheck.error ?? `Unable to resolve authoritative size for existing File ${recUuid}.`,
          };
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), fileCheck.sizeBytes);
      }
    }

    const entries: Array<{ sizeBytes: number }> = [];
    for (const att of existingAttachments) {
      const sz = sizeBySpaceItem.get(att.SpaceItemID.toLowerCase());
      if (typeof sz !== 'number' || !Number.isFinite(sz) || sz <= 0) {
        return {
          ok: false,
          error: `Unable to resolve authoritative size for existing ForumPostAttachment ${att.ID}.`,
        };
      }
      entries.push({ sizeBytes: sz });
    }
    return { ok: true, entries };
  }

  public override async Save(options?: EntitySaveOptions): Promise<boolean> {
    const txGroup = (options as EntitySaveOptions & { TransactionGroup?: TransactionGroupBase })?.TransactionGroup ?? null;
    if (txGroup) this.TransactionGroup = txGroup;

    if (!options?.ReplayOnly) {
      const validation = await this.ValidateAsync();
      if (!validation.Success) {
        const message =
          validation.Errors.map((e) => e.Message)
            .filter((m): m is string => Boolean(m && m.trim()))
            .join(' ') || 'ForumPostAttachment validation failed.';
        return failSave(this, message);
      }
    }

    const nextOptions = new EntitySaveOptions();
    if (options) {
      Object.assign(nextOptions, options);
    }
    nextOptions.SkipAsyncValidation = true;
    return super.Save(nextOptions);
  }
}

export function LoadForumPostAttachmentServerEntity(): void {
  void ForumPostAttachmentServerEntity;
}
