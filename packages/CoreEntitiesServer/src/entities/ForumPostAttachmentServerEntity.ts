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
  ComputeAttachmentContentByteLength,
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

const MJ_FILE_FIELDS: string[] = ['ID', 'Name', 'ContentType', 'ProviderKey', 'Status'];

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
        MJ_FILE_FIELDS,
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
          MJ_FILE_FIELDS,
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
      const fileCheck = ValidateAuthoritativeFileRecord(loadedFileRow!);
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
      if (latestVer) {
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
            MJ_FILE_FIELDS,
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

    const existingSizeEntries = await this.resolveExistingAttachmentSizes(otherAttachments);
    const batchCheck = ValidateAttachmentBatchLimits(
      [...existingSizeEntries, { sizeBytes: currentAttachmentBytes }],
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
  ): Promise<Array<{ sizeBytes?: number | null }>> {
    if (existingAttachments.length === 0) {
      return [];
    }
    const spaceItemIds = Array.from(
      new Set(
        existingAttachments
          .map((a) => validUuidOrNull(a.SpaceItemID))
          .filter((id): id is string => id !== null),
      ),
    );
    if (spaceItemIds.length === 0) {
      return existingAttachments.map(() => ({ sizeBytes: null }));
    }

    const siFilter = `ID IN (${spaceItemIds.map((id) => `'${id}'`).join(', ')})`;
    const siRes = await loadRows<AttachmentSpaceItemRow>(
      this,
      'MJ_BizApps_Collaboration: Space Items',
      siFilter,
      ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Band', 'Folder', 'ArtifactVersionID'],
      COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
    );
    if (!siRes.success) {
      return existingAttachments.map(() => ({ sizeBytes: null }));
    }

    const versionIds = Array.from(
      new Set(
        siRes.rows
          .map((si) => validUuidOrNull(si.ArtifactVersionID))
          .filter((id): id is string => id !== null),
      ),
    );
    const sizeByVersion = new Map<string, number | null>();
    if (versionIds.length > 0) {
      const verRes = await loadRows<AttachmentArtifactVersionRow>(
        this,
        'MJ: Artifact Versions',
        `ID IN (${versionIds.map((id) => `'${id}'`).join(', ')})`,
        ARTIFACT_VERSION_FIELDS,
        COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
      );
      if (verRes.success) {
        for (const v of verRes.rows) {
          const sz =
            v.ContentSizeBytes != null
              ? v.ContentSizeBytes
              : ComputeAttachmentContentByteLength(v.Content, v.ContentMode);
          sizeByVersion.set(v.ID.toLowerCase(), sz);
        }
      }
    }

    const fileIds = Array.from(
      new Set(
        siRes.rows
          .filter((si) => !si.ArtifactVersionID)
          .map((si) => extractRecordUuid(si.RecordID))
          .filter((id): id is string => id !== null),
      ),
    );
    const sizeByFile = new Map<string, number | null>();
    if (fileIds.length > 0) {
      const fileRes = await loadRows<AttachmentFileRow>(
        this,
        'MJ: Files',
        `ID IN (${fileIds.map((id) => `'${id}'`).join(', ')})`,
        MJ_FILE_FIELDS,
        COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST + 5,
      );
      if (fileRes.success) {
        for (const f of fileRes.rows) {
          sizeByFile.set(f.ID.toLowerCase(), f.ContentSizeBytes ?? f.Size ?? null);
        }
      }
    }

    const sizeBySpaceItem = new Map<string, number | null>();
    for (const si of siRes.rows) {
      if (si.ArtifactVersionID) {
        sizeBySpaceItem.set(si.ID.toLowerCase(), sizeByVersion.get(si.ArtifactVersionID.toLowerCase()) ?? null);
      } else {
        const recUuid = extractRecordUuid(si.RecordID);
        sizeBySpaceItem.set(si.ID.toLowerCase(), recUuid ? sizeByFile.get(recUuid.toLowerCase()) ?? null : null);
      }
    }

    return existingAttachments.map((a) => ({
      sizeBytes: sizeBySpaceItem.get(a.SpaceItemID.toLowerCase()) ?? null,
    }));
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
