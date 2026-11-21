import {
  BaseEntity,
  CompositeKey,
  Metadata,
  RunView,
  type UserInfo,
} from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
  AssertValidUUID,
  COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH,
  COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
  COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
  ClassifyAttachmentKind,
  CommunityRules,
  ComputeAttachmentContentByteLength,
  EscapeSqlLiteral,
  IsAllowedAttachmentMimeType,
  IsFeaturedLibraryFolder,
  IsTemporaryOrPlaceholderAttachmentUrl,
  NormalizeAttachmentMimeType,
  ResolveAttachmentSpaceItemFolder,
  ResolveAuthoritativeFileUrl,
  ResolveDefaultFeatureInLibrary,
  SanitizeCommunityAttachmentUrl,
  SanitizePersistedAttachmentUrl,
  ValidateAttachmentBatchLimits,
  ValidateAuthoritativeArtifactVersionRecord,
  ValidateAuthoritativeFileRecord,
  ValidateCommunityAttachmentInput,
  type AuthoritativeArtifactVersionRowInput,
  type AuthoritativeFileRowInput,
  type CommunityArtifactAttachmentItem,
  type CommunityArtifactCollaborationMode,
  type CommunityArtifactModality,
  type CommunityAttachmentEntryType,
  type CommunityAttachmentItem,
  type CommunityAttachmentKind,
  type CommunityFileAttachmentItem,
  type CommunitySpaceItemFolder,
  type CommunityVisibilityBand,
  type ForumAccessDecision,
  type ForumVisibilityBand,
} from '@mj-biz-apps/community-core';
import {
  COMMUNITY_ENTITY_NAMES,
  type mjBizAppsCommunityForumArtifactPostEntity,
  type mjBizAppsCommunityForumEntity,
  type mjBizAppsCommunityForumMemberEntity,
  type mjBizAppsCommunityForumPostAttachmentEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumRoleTypeEntity,
} from '@mj-biz-apps/community-entities';
import { SaveOrThrow } from './resolvers.ts';

const COLLABORATION_SPACES_ENTITY = 'MJ_BizApps_Collaboration: Spaces';
const COLLABORATION_SPACE_MEMBERS_ENTITY = 'MJ_BizApps_Collaboration: Space Members';
const COLLABORATION_SPACE_ITEMS_ENTITY = 'MJ_BizApps_Collaboration: Space Items';
const MJ_ARTIFACTS_ENTITY = 'MJ: Artifacts';
const MJ_ARTIFACT_VERSIONS_ENTITY = 'MJ: Artifact Versions';
const MJ_ARTIFACT_TYPES_ENTITY = 'MJ: Artifact Types';
const MJ_FILES_ENTITY = 'MJ: Files';
const MJ_ENTITIES_ENTITY = 'MJ: Entities';

const DEFAULT_LIBRARY_PAGE_SIZE = 50;
const MAX_LIBRARY_PAGE_SIZE = 100;
const MAX_FORUMS_PER_SPACE = 200;
const MAX_ATTACHMENTS_SCAN = 500;

const PUBLICLY_READABLE_POST_STATUSES = new Set<mjBizAppsCommunityForumPostEntity['Status']>([
  'Published',
  'Answered',
  'Resolved',
]);

/**
 * Minimal structural view of `MJ_BizApps_Collaboration: Space Items` to avoid cross-package
 * `BaseEntity` type-identity mismatches in CI while retaining strict field typing.
 */
interface CollaborationSpaceItemEntityView extends BaseEntity {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  PromotedAt: Date | null;
  PromotedByUserID: string | null;
  Folder: string | null;
  ArtifactVersionID: string | null;
}

interface CollaborationSpaceRow {
  ID: string;
  OwnerID: string;
  Name?: string | null;
}

interface CollaborationSpaceMemberRow {
  ID: string;
  SpaceID: string;
  UserID: string;
  Band: 'Shared' | 'Team';
  Status: 'Active' | 'Invited' | 'Removed';
}

interface CollaborationSpaceItemRow {
  ID: string;
  SpaceID: string;
  EntityID: string;
  RecordID: string;
  Band: 'Shared' | 'Team';
  Folder: string | null;
  ArtifactVersionID: string | null;
  __mj_CreatedAt?: Date | string | null;
}

interface ForumRow {
  ID: string;
  SpaceID: string;
  Name: string;
  VisibilityBand: ForumVisibilityBand;
  InheritsSpaceMembers: boolean;
  PostingPolicy: mjBizAppsCommunityForumEntity['PostingPolicy'];
  Status: mjBizAppsCommunityForumEntity['Status'];
}

interface ForumMemberRow {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: mjBizAppsCommunityForumMemberEntity['Status'];
}

type ForumRoleCapabilitiesRow = Pick<
  mjBizAppsCommunityForumRoleTypeEntity,
  'ID' | 'CanConfigureForum' | 'CanModerateQueue' | 'CanCreateRootPost' | 'CanReply'
>;

interface ForumPostRow {
  ID: string;
  ForumID: string;
  ParentPostID: string | null;
  AuthorUserID: string | null;
  AuthorUser?: string | null;
  Title: string | null;
  VisibilityBand: CommunityVisibilityBand;
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  IsLocked: boolean;
  __mj_CreatedAt?: Date | string | null;
}

interface ForumPostAttachmentRow {
  ID: string;
  PostID: string;
  SpaceItemID: string;
  Caption: string | null;
  Sequence: number;
  __mj_CreatedAt?: Date | string | null;
}

interface ForumArtifactPostRow {
  ID: string;
  ArtifactID: string;
  PinnedArtifactVersionID: string | null;
  SpaceItemID: string;
  ArtifactModality: CommunityArtifactModality;
  CollaborationMode: CommunityArtifactCollaborationMode;
  ShowInlinePreview: boolean;
}

interface MJArtifactRow {
  ID: string;
  Name: string;
  TypeID: string;
  Type?: string | null;
}

interface MJArtifactTypeRow {
  ID: string;
  Name: string;
  ContentType: string | null;
  IsEnabled?: boolean | null;
}

interface MJArtifactEntityView extends BaseEntity {
  ID: string;
  Name: string;
  Description: string | null;
  TypeID: string;
  UserID: string;
  Visibility: 'Always' | 'System Only';
}

interface MJArtifactVersionEntityView extends BaseEntity {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  UserID: string;
  ContentMode: 'File' | 'Text';
  Content: string | null;
  FileID: string | null;
  FileName: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
}

interface MJArtifactVersionRow extends AuthoritativeArtifactVersionRowInput {
  ID: string;
  ArtifactID: string;
  VersionNumber: number;
  Name: string | null;
  ContentMode: string | null;
  Content: string | null;
  FileID: string | null;
  FileName: string | null;
  MimeType: string | null;
  ContentSizeBytes: number | null;
}

interface MJFileRow extends AuthoritativeFileRowInput {
  ID: string;
  Name: string;
  ContentType: string | null;
  ProviderKey?: string | null;
  Status?: string | null;
}

interface MJEntityRow {
  ID: string;
  Name: string;
}

export interface SpaceAccessResolution {
  spaceId: string;
  canReadSpace: boolean;
  canSeeTeamBand: boolean;
  isSpaceOpenForWrites: boolean;
  isOwner: boolean;
}

export interface AuthorizedForumContext {
  forum: ForumRow;
  decision: ForumAccessDecision;
  hasActiveForumMembership: boolean;
}

export interface AuthorizedPostContext {
  post: ForumPostRow;
  forumContext: AuthorizedForumContext;
  spaceAccess: SpaceAccessResolution;
}

export interface PersistArtifactAttachmentInput {
  kind: 'artifact';
  artifactId: string;
  artifactVersionId?: string | null;
  artifactName?: string | null;
  artifactTypeName?: string | null;
  caption?: string | null;
  sequence?: number;
  featureInLibrary?: boolean;
  existingSpaceItemId?: string | null;
  linkAsForumArtifactPost?: boolean;
  modality?: CommunityArtifactModality;
  collaborationMode?: CommunityArtifactCollaborationMode;
  showInlinePreview?: boolean;
}

export interface PersistFileAttachmentInput {
  kind: 'image' | 'video' | 'audio' | 'file';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url?: string | null;
  posterUrl?: string | null;
  durationSeconds?: number | null;
  fileId?: string | null;
  artifactVersionId?: string | null;
  caption?: string | null;
  sequence?: number;
  featureInLibrary?: boolean;
  existingSpaceItemId?: string | null;
}

export type PersistCommunityAttachmentInput =
  | PersistArtifactAttachmentInput
  | PersistFileAttachmentInput;

export interface PersistPostAttachmentsParams {
  postId: string;
  attachments: ReadonlyArray<PersistCommunityAttachmentInput>;
  entryType?: CommunityAttachmentEntryType;
  contextUser: UserInfo;
  /** Deprecated: pre-existing SpaceItems are restored to their snapshot rather than deleted on failure. */
  cleanupSpaceItemOnFailure?: boolean;
  /** Must be explicitly true (alongside Space owner or Forum moderator privileges) to promote a Team SpaceItem to Shared. */
  allowBandPromotion?: boolean;
}

export interface UpdateAttachmentLibraryStateParams {
  postId: string;
  attachmentId: string;
  featureInLibrary?: boolean;
  caption?: string | null;
  sequence?: number;
  contextUser: UserInfo;
}

export interface UpdateAttachmentLibraryStateResult {
  attachmentId: string;
  spaceItemId: string;
  featureInLibrary: boolean;
  folder: CommunitySpaceItemFolder;
  caption: string | null;
  sequence: number;
}

export interface QuerySpaceMediaLibraryParams {
  spaceId: string;
  contextUser: UserInfo;
  folder?: 'Library' | 'Post Media' | 'All';
  kind?: CommunityAttachmentKind;
  forumId?: string;
  searchText?: string;
  maxRows?: number;
  startRow?: number;
}

export interface SpaceMediaLibraryQueryResult {
  items: CommunityAttachmentItem[];
  totalCount: number;
  hasMore: boolean;
}

function requireValidContextUser(contextUser: UserInfo | null | undefined, actionLabel: string): string {
  if (!contextUser || !contextUser.ID) {
    throw new Error(`${actionLabel} requires an authenticated contextUser.`);
  }
  return AssertValidUUID(contextUser.ID, 'contextUser.ID');
}

function buildSqlInUuidList(ids: ReadonlyArray<string>, label: string): string {
  const valid = ids.map((id, idx) => AssertValidUUID(id, `${label}[${idx}]`));
  return valid.map((id) => `'${id}'`).join(', ');
}

function extractRecordUuid(recordId: string): string | null {
  const trimmed = recordId.trim();
  const raw = trimmed.toLowerCase().startsWith('id|') ? trimmed.slice(3).trim() : trimmed;
  try {
    return AssertValidUUID(raw, 'RecordID');
  } catch {
    return null;
  }
}

/**
 * Fail-closed server service for authorizing, persisting, updating, and querying Community post/reply
 * attachments and Space Media & Artifacts Library entries (`SpaceItem` + `ForumPostAttachment` /
 * `ForumArtifactPost`).
 */
export class CommunityAttachmentServerService {
  /**
   * Resolves a user's read/write/band access to a Collaboration Space using `contextUser`-scoped
   * `RunView` queries. Fails closed if the space is missing, queries fail, or the caller holds
   * neither ownership nor an active `SpaceMember` seat.
   */
  public async ResolveSpaceAccess(spaceId: string, contextUser: UserInfo): Promise<SpaceAccessResolution> {
    const validUserId = requireValidContextUser(contextUser, 'Space access check');
    const validSpaceId = AssertValidUUID(spaceId, 'spaceId');
    const rv = new RunView();

    const spaceRes = await rv.RunView<CollaborationSpaceRow>(
      {
        EntityName: COLLABORATION_SPACES_ENTITY,
        ExtraFilter: `ID = '${validSpaceId}'`,
        Fields: ['ID', 'OwnerID', 'Name'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    if (!spaceRes?.Success) {
      throw new Error(`Unable to verify Collaboration Space ${validSpaceId}: ${spaceRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const space = spaceRes.Results?.[0];
    if (!space) {
      throw new Error(`Collaboration Space ${validSpaceId} was not found or access is denied.`);
    }

    const isOwner = UUIDsEqual(space.OwnerID, validUserId);
    const memberRes = await rv.RunView<CollaborationSpaceMemberRow>(
      {
        EntityName: COLLABORATION_SPACE_MEMBERS_ENTITY,
        ExtraFilter: `SpaceID = '${validSpaceId}' AND UserID = '${validUserId}' AND Status = 'Active'`,
        Fields: ['ID', 'SpaceID', 'UserID', 'Band', 'Status'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    if (!memberRes?.Success) {
      throw new Error(`Unable to verify Space membership for Space ${validSpaceId}: ${memberRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const activeMember = memberRes.Results?.[0] ?? null;

    if (!isOwner && !activeMember) {
      return {
        spaceId: validSpaceId,
        canReadSpace: false,
        canSeeTeamBand: false,
        isSpaceOpenForWrites: false,
        isOwner: false,
      };
    }

    return {
      spaceId: validSpaceId,
      canReadSpace: true,
      canSeeTeamBand: isOwner || activeMember?.Band === 'Team',
      isSpaceOpenForWrites: true,
      isOwner,
    };
  }

  /**
   * Evaluates a user's access to a Forum given resolved Space access. Enforces `PrivateForum`
   * explicit active membership and `Team`-band ceiling rules via `CommunityRules.EvaluateForumAccess`.
   */
  public async ResolveForumAccess(
    forum: ForumRow,
    spaceAccess: SpaceAccessResolution,
    contextUser: UserInfo,
  ): Promise<AuthorizedForumContext> {
    const validUserId = requireValidContextUser(contextUser, 'Forum access check');
    const validForumId = AssertValidUUID(forum.ID, 'forum.ID');
    const rv = new RunView();

    const memberRes = await rv.RunView<ForumMemberRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
        ExtraFilter: `ForumID = '${validForumId}' AND UserID = '${validUserId}'`,
        Fields: ['ID', 'ForumID', 'UserID', 'ForumRoleTypeID', 'Status'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    if (!memberRes?.Success) {
      throw new Error(`Unable to verify Forum membership for Forum ${validForumId}: ${memberRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const member = memberRes.Results?.[0] ?? null;

    let roleType: ForumRoleCapabilitiesRow | null = null;
    if (member) {
      const validRoleId = AssertValidUUID(member.ForumRoleTypeID, 'ForumRoleTypeID');
      const roleRes = await rv.RunView<ForumRoleCapabilitiesRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
          ExtraFilter: `ID = '${validRoleId}'`,
          Fields: ['ID', 'CanConfigureForum', 'CanModerateQueue', 'CanCreateRootPost', 'CanReply'],
          ResultType: 'simple',
          MaxRows: 1,
        },
        contextUser,
      );
      if (!roleRes?.Success || !roleRes.Results?.[0]) {
        throw new Error(`Unable to resolve ForumRoleType ${validRoleId} for Forum ${validForumId}.`);
      }
      roleType = roleRes.Results[0];
    }

    const decision = CommunityRules.EvaluateForumAccess({
      spaceAccess: {
        canReadSpace: spaceAccess.canReadSpace,
        canSeeTeamBand: spaceAccess.canSeeTeamBand,
        isSpaceOpenForWrites: spaceAccess.isSpaceOpenForWrites,
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

    const hasActiveForumMembership = member?.Status === 'Active';
    if (forum.VisibilityBand === 'PrivateForum' && !hasActiveForumMembership) {
      return {
        forum,
        hasActiveForumMembership: false,
        decision: {
          canReadForum: false,
          canSeeTeamPosts: false,
          canCreateRootPost: false,
          canReply: false,
          canModerateQueue: false,
          requiresModerationQueue: false,
        },
      };
    }

    return {
      forum,
      hasActiveForumMembership,
      decision,
    };
  }

  /**
   * Authorizes read or write access to attachments on a specific ForumPost. Fails closed if
   * the post, forum, or space cannot be resolved or the caller lacks sufficient permission.
   */
  public async AuthorizePostAccess(
    postId: string,
    mode: 'read' | 'write',
    contextUser: UserInfo,
  ): Promise<AuthorizedPostContext> {
    const validUserId = requireValidContextUser(contextUser, 'Post attachment authorization');
    const validPostId = AssertValidUUID(postId, 'postId');
    const rv = new RunView();

    const postRes = await rv.RunView<ForumPostRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `ID = '${validPostId}'`,
        Fields: [
          'ID',
          'ForumID',
          'ParentPostID',
          'AuthorUserID',
          'AuthorUser',
          'Title',
          'VisibilityBand',
          'Status',
          'IsLocked',
          '__mj_CreatedAt',
        ],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    if (!postRes?.Success || !postRes.Results?.[0]) {
      throw new Error(`ForumPost ${validPostId} was not found or access is denied.`);
    }
    const post = postRes.Results[0];

    const validForumId = AssertValidUUID(post.ForumID, 'post.ForumID');
    const forumRes = await rv.RunView<ForumRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.Forums,
        ExtraFilter: `ID = '${validForumId}'`,
        Fields: ['ID', 'SpaceID', 'Name', 'VisibilityBand', 'InheritsSpaceMembers', 'PostingPolicy', 'Status'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    if (!forumRes?.Success || !forumRes.Results?.[0]) {
      throw new Error(`Forum ${validForumId} was not found or access is denied.`);
    }
    const forum = forumRes.Results[0];

    const spaceAccess = await this.ResolveSpaceAccess(forum.SpaceID, contextUser);
    if (!spaceAccess.canReadSpace) {
      throw new Error(`Caller is not authorized to access Collaboration Space ${forum.SpaceID}.`);
    }

    const forumContext = await this.ResolveForumAccess(forum, spaceAccess, contextUser);
    if (!forumContext.decision.canReadForum) {
      throw new Error(`Caller is not authorized to read Forum ${forum.ID}.`);
    }

    if (post.VisibilityBand === 'Team' && !forumContext.decision.canSeeTeamPosts) {
      throw new Error(`Caller is not authorized to access Team-band post ${post.ID}.`);
    }

    if (mode === 'read') {
      const isAuthor = post.AuthorUserID !== null && UUIDsEqual(post.AuthorUserID, validUserId);
      if (!PUBLICLY_READABLE_POST_STATUSES.has(post.Status) && !isAuthor && !forumContext.decision.canModerateQueue) {
        throw new Error(`Post ${post.ID} is not published and caller lacks moderation access.`);
      }
      return { post, forumContext, spaceAccess };
    }

    if (forum.Status !== 'Active') {
      throw new Error(`Forum "${forum.Name}" has status "${forum.Status}" and does not accept attachment writes.`);
    }

    const isModerator = forumContext.decision.canModerateQueue;
    if (post.IsLocked && !isModerator) {
      throw new Error(`Post ${post.ID} is locked; attachments cannot be modified.`);
    }

    const isAuthor = post.AuthorUserID !== null && UUIDsEqual(post.AuthorUserID, validUserId);
    if (!isAuthor && !isModerator) {
      throw new Error('Only the post author or a forum moderator may modify attachments on this post.');
    }

    const isReply = post.ParentPostID !== null;
    if (isAuthor && !isModerator) {
      if (!isReply && !forumContext.decision.canCreateRootPost) {
        throw new Error('Caller does not hold permission to create or attach media to root posts in this forum.');
      }
      if (isReply && !forumContext.decision.canReply) {
        throw new Error('Caller does not hold permission to attach media to replies in this forum.');
      }
    }

    return { post, forumContext, spaceAccess };
  }

  /**
   * Validates and persists one or more post/reply attachments atomically with compensating rollback:
   * creates or links `SpaceItem` (with `'Library'` or `'Post Media'` folder routing), creates
   * `ForumPostAttachment`, and optionally creates/updates `ForumArtifactPost` for primary artifact posts.
   */
  public async PersistPostAttachments(
    params: PersistPostAttachmentsParams,
  ): Promise<CommunityAttachmentItem[]> {
    const validUserId = requireValidContextUser(params.contextUser, 'Persist post attachments');
    if (params.attachments.length === 0) {
      return [];
    }

    const auth = await this.AuthorizePostAccess(params.postId, 'write', params.contextUser);
    const { post, forumContext, spaceAccess } = auth;
    const { forum } = forumContext;
    const rv = new RunView();
    const md = new Metadata();

    // Load existing attachments on this post to enforce combined count & aggregate byte ceilings
    const existingAttRes = await rv.RunView<ForumPostAttachmentRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
        ExtraFilter: `PostID = '${AssertValidUUID(post.ID, 'post.ID')}'`,
        Fields: ['ID', 'PostID', 'SpaceItemID', 'Caption', 'Sequence'],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      params.contextUser,
    );
    if (!existingAttRes?.Success) {
      throw new Error(`Unable to inspect existing attachments on Post ${post.ID}: ${existingAttRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const existingAttachments = existingAttRes.Results ?? [];
    const existingCount = existingAttachments.length;

    if (existingCount + params.attachments.length > COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST) {
      throw new Error(
        `Attachment count (${existingCount + params.attachments.length}) exceeds the maximum of ${COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST} attachments per post.`,
      );
    }

    const existingSizeEntries = await this.resolveExistingAttachmentSizes(existingAttachments, params.contextUser);

    // Validate every attachment and verify ContextUser-scoped target access (and aggregate byte limits) BEFORE writing any record
    const preparedItems = await this.validateAndPrepareAttachments({
      attachments: params.attachments,
      post,
      forum,
      spaceAccess,
      forumContext,
      entryType: params.entryType ?? (post.ParentPostID ? 'reply' : 'post'),
      existingCount,
      existingSizeEntries,
      allowBandPromotion: Boolean(params.allowBandPromotion),
      md,
      contextUser: params.contextUser,
    });

    interface RollbackNewRecord {
      label: string;
      entity: { Delete?: () => Promise<boolean>; LatestResult?: { CompleteMessage?: string | null; Message?: string | null } | null };
    }
    interface RollbackSnapshot {
      label: string;
      restore: () => Promise<void>;
    }

    const newlyCreatedForRollback: RollbackNewRecord[] = [];
    const mutatedSnapshotsForRollback: RollbackSnapshot[] = [];
    const persistedResults: CommunityAttachmentItem[] = [];

    try {
      for (const prepared of preparedItems) {
        let resolvedTargetEntityId = prepared.targetEntityId;
        let resolvedTargetRecordId = prepared.targetRecordId;
        let resolvedArtifactVersionId = prepared.artifactVersionId;
        let resolvedArtifactId = prepared.kind === 'artifact' ? prepared.artifactId : prepared.artifactId;

        if (prepared.kind !== 'artifact' && prepared.needsCreateArtifact) {
          const artifact = await md.GetEntityObject<MJArtifactEntityView>(
            MJ_ARTIFACTS_ENTITY,
            params.contextUser,
          );
          if (!artifact) {
            throw new Error('Failed to instantiate MJ: Artifacts entity for uploaded file.');
          }
          artifact.Name = prepared.fileName.slice(0, 255);
          artifact.Description = prepared.caption ? prepared.caption.slice(0, 500) : null;
          artifact.TypeID = prepared.artifactTypeId!;
          artifact.UserID = validUserId;
          artifact.Visibility = 'System Only';
          await SaveOrThrow(artifact, `Failed to persist MJ: Artifacts record for "${prepared.fileName}".`);
          newlyCreatedForRollback.push({ label: `MJ: Artifacts ${artifact.ID}`, entity: artifact });

          const artifactVersion = await md.GetEntityObject<MJArtifactVersionEntityView>(
            MJ_ARTIFACT_VERSIONS_ENTITY,
            params.contextUser,
          );
          if (!artifactVersion) {
            throw new Error('Failed to instantiate MJ: Artifact Versions entity for uploaded file.');
          }
          artifactVersion.ArtifactID = artifact.ID;
          artifactVersion.VersionNumber = 1;
          artifactVersion.Name = prepared.fileName.slice(0, 255);
          artifactVersion.UserID = validUserId;
          artifactVersion.ContentMode = 'File';
          artifactVersion.Content = prepared.url;
          artifactVersion.FileID = prepared.fileId;
          artifactVersion.FileName = prepared.fileName.slice(0, 500);
          artifactVersion.MimeType = prepared.mimeType.slice(0, 200);
          artifactVersion.ContentSizeBytes = prepared.sizeBytes;
          await SaveOrThrow(
            artifactVersion,
            `Failed to persist MJ: Artifact Versions record for "${prepared.fileName}".`,
          );
          newlyCreatedForRollback.push({
            label: `MJ: Artifact Versions ${artifactVersion.ID}`,
            entity: artifactVersion,
          });

          resolvedArtifactId = artifact.ID;
          resolvedArtifactVersionId = artifactVersion.ID;
          if (!prepared.fileId) {
            resolvedTargetEntityId = prepared.artifactsEntityId;
            resolvedTargetRecordId = artifact.ID;
          }
        }

        let spaceItem: CollaborationSpaceItemEntityView | null = null;
        let effectiveBand: CommunityVisibilityBand = prepared.band;

        if (prepared.existingSpaceItemId) {
          spaceItem = await md.GetEntityObject<CollaborationSpaceItemEntityView>(
            COLLABORATION_SPACE_ITEMS_ENTITY,
            CompositeKey.FromID(prepared.existingSpaceItemId),
            params.contextUser,
          );
          if (!spaceItem || !spaceItem.ID) {
            throw new Error(`SpaceItem ${prepared.existingSpaceItemId} was not found or access is denied.`);
          }
          if (!UUIDsEqual(spaceItem.SpaceID, forum.SpaceID)) {
            throw new Error(`SpaceItem ${spaceItem.ID} belongs to a different Space and cannot be attached here.`);
          }
          if (!UUIDsEqual(spaceItem.EntityID, resolvedTargetEntityId)) {
            throw new Error(
              `SpaceItem ${spaceItem.ID} EntityID (${spaceItem.EntityID}) does not match target entity (${resolvedTargetEntityId}).`,
            );
          }
          const existingRecordUuid = extractRecordUuid(spaceItem.RecordID);
          if (!existingRecordUuid || !UUIDsEqual(existingRecordUuid, resolvedTargetRecordId)) {
            throw new Error(
              `SpaceItem ${spaceItem.ID} RecordID (${spaceItem.RecordID}) does not match target record (${resolvedTargetRecordId}).`,
            );
          }
          const versionMismatch =
            (spaceItem.ArtifactVersionID != null) !== (resolvedArtifactVersionId != null) ||
            (spaceItem.ArtifactVersionID != null &&
              resolvedArtifactVersionId != null &&
              !UUIDsEqual(spaceItem.ArtifactVersionID, resolvedArtifactVersionId));
          if (versionMismatch) {
            throw new Error(
              `SpaceItem ${spaceItem.ID} ArtifactVersionID (${spaceItem.ArtifactVersionID ?? 'null'}) does not match validated version (${resolvedArtifactVersionId ?? 'null'}).`,
            );
          }

          if (spaceItem.Band === 'Team' && prepared.band === 'Shared') {
            const canPromote =
              Boolean(params.allowBandPromotion) &&
              (spaceAccess.isOwner || forumContext.decision.canModerateQueue);
            if (!canPromote) {
              throw new Error(
                `SpaceItem ${spaceItem.ID} is in the Team band and cannot be attached to a Shared post without promotion authorization.`,
              );
            }
          }

          const snapshot = {
            SpaceID: spaceItem.SpaceID,
            EntityID: spaceItem.EntityID,
            RecordID: spaceItem.RecordID,
            Band: spaceItem.Band,
            PromotedAt: spaceItem.PromotedAt,
            PromotedByUserID: spaceItem.PromotedByUserID,
            Folder: spaceItem.Folder,
            ArtifactVersionID: spaceItem.ArtifactVersionID,
          };

          const targetBand: CommunityVisibilityBand =
            spaceItem.Band === 'Shared' && prepared.band === 'Team' ? 'Shared' : prepared.band;
          effectiveBand = targetBand;

          spaceItem.Folder = prepared.folder;
          spaceItem.Band = targetBand;
          if (targetBand === 'Shared') {
            spaceItem.PromotedAt = spaceItem.PromotedAt ?? new Date();
            spaceItem.PromotedByUserID = spaceItem.PromotedByUserID ?? validUserId;
          }
          await SaveOrThrow(spaceItem, `Failed to update SpaceItem ${spaceItem.ID} for post attachment.`);
          const capturedSpaceItem = spaceItem;
          mutatedSnapshotsForRollback.push({
            label: `SpaceItem ${capturedSpaceItem.ID}`,
            restore: async () => {
              capturedSpaceItem.SpaceID = snapshot.SpaceID;
              capturedSpaceItem.EntityID = snapshot.EntityID;
              capturedSpaceItem.RecordID = snapshot.RecordID;
              capturedSpaceItem.Band = snapshot.Band;
              capturedSpaceItem.PromotedAt = snapshot.PromotedAt;
              capturedSpaceItem.PromotedByUserID = snapshot.PromotedByUserID;
              capturedSpaceItem.Folder = snapshot.Folder;
              capturedSpaceItem.ArtifactVersionID = snapshot.ArtifactVersionID;
              await SaveOrThrow(
                capturedSpaceItem,
                `Failed to restore SpaceItem ${capturedSpaceItem.ID} to pre-batch snapshot.`,
              );
            },
          });
        } else {
          spaceItem = await md.GetEntityObject<CollaborationSpaceItemEntityView>(
            COLLABORATION_SPACE_ITEMS_ENTITY,
            params.contextUser,
          );
          if (!spaceItem) {
            throw new Error('Failed to instantiate Collaboration SpaceItem entity.');
          }
          spaceItem.SpaceID = forum.SpaceID;
          spaceItem.EntityID = resolvedTargetEntityId;
          spaceItem.RecordID = `ID|${resolvedTargetRecordId}`;
          spaceItem.Band = prepared.band;
          spaceItem.PromotedAt = prepared.band === 'Shared' ? new Date() : null;
          spaceItem.PromotedByUserID = prepared.band === 'Shared' ? validUserId : null;
          spaceItem.Folder = prepared.folder;
          spaceItem.ArtifactVersionID = resolvedArtifactVersionId;
          await SaveOrThrow(spaceItem, `Failed to persist SpaceItem in Space ${forum.SpaceID}.`);
          newlyCreatedForRollback.push({ label: `SpaceItem ${spaceItem.ID}`, entity: spaceItem });
        }

        const postAttachment = await md.GetEntityObject<mjBizAppsCommunityForumPostAttachmentEntity>(
          COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
          params.contextUser,
        );
        if (!postAttachment) {
          throw new Error('Failed to instantiate ForumPostAttachment entity.');
        }
        postAttachment.PostID = post.ID;
        postAttachment.SpaceItemID = spaceItem.ID;
        postAttachment.Caption = prepared.caption;
        postAttachment.Sequence = prepared.sequence;
        await SaveOrThrow(
          postAttachment,
          `Failed to persist ForumPostAttachment linking SpaceItem ${spaceItem.ID} to Post ${post.ID}.`,
        );
        newlyCreatedForRollback.push({
          label: `ForumPostAttachment ${postAttachment.ID}`,
          entity: postAttachment,
        });

        if (prepared.kind === 'artifact' && prepared.linkAsForumArtifactPost) {
          const existingArtifactPost = await md.GetEntityObject<mjBizAppsCommunityForumArtifactPostEntity>(
            COMMUNITY_ENTITY_NAMES.ForumArtifactPosts,
            CompositeKey.FromID(post.ID),
            params.contextUser,
          );
          const artifactPost =
            existingArtifactPost && existingArtifactPost.ID
              ? existingArtifactPost
              : await md.GetEntityObject<mjBizAppsCommunityForumArtifactPostEntity>(
                  COMMUNITY_ENTITY_NAMES.ForumArtifactPosts,
                  params.contextUser,
                );
          if (!artifactPost) {
            throw new Error(`Failed to instantiate ForumArtifactPost entity for Post ${post.ID}.`);
          }
          const isNewArtifactPost = !artifactPost.IsSaved;
          const apSnapshot = isNewArtifactPost
            ? null
            : {
                ArtifactID: artifactPost.ArtifactID,
                PinnedArtifactVersionID: artifactPost.PinnedArtifactVersionID,
                SpaceItemID: artifactPost.SpaceItemID,
                ArtifactModality: artifactPost.ArtifactModality,
                CollaborationMode: artifactPost.CollaborationMode,
                ShowInlinePreview: artifactPost.ShowInlinePreview,
              };
          artifactPost.ID = post.ID;
          artifactPost.ArtifactID = prepared.artifactId;
          artifactPost.PinnedArtifactVersionID = resolvedArtifactVersionId;
          artifactPost.SpaceItemID = spaceItem.ID;
          artifactPost.ArtifactModality = prepared.modality;
          artifactPost.CollaborationMode = prepared.collaborationMode;
          artifactPost.ShowInlinePreview = prepared.showInlinePreview;
          await SaveOrThrow(artifactPost, `Failed to persist ForumArtifactPost for Post ${post.ID}.`);
          if (isNewArtifactPost) {
            newlyCreatedForRollback.push({ label: `ForumArtifactPost ${artifactPost.ID}`, entity: artifactPost });
          } else if (apSnapshot) {
            const capturedArtifactPost = artifactPost;
            mutatedSnapshotsForRollback.push({
              label: `ForumArtifactPost ${capturedArtifactPost.ID}`,
              restore: async () => {
                capturedArtifactPost.ArtifactID = apSnapshot.ArtifactID;
                capturedArtifactPost.PinnedArtifactVersionID = apSnapshot.PinnedArtifactVersionID;
                capturedArtifactPost.SpaceItemID = apSnapshot.SpaceItemID;
                capturedArtifactPost.ArtifactModality = apSnapshot.ArtifactModality;
                capturedArtifactPost.CollaborationMode = apSnapshot.CollaborationMode;
                capturedArtifactPost.ShowInlinePreview = apSnapshot.ShowInlinePreview;
                await SaveOrThrow(
                  capturedArtifactPost,
                  `Failed to restore ForumArtifactPost ${capturedArtifactPost.ID} to pre-batch snapshot.`,
                );
              },
            });
          }
        }

        const resolvedItemId = postAttachment.ID || spaceItem.ID;
        if (prepared.kind === 'artifact') {
          const artifactItem: CommunityArtifactAttachmentItem = {
            id: resolvedItemId,
            kind: 'artifact',
            spaceId: forum.SpaceID,
            postId: post.ID,
            spaceItemId: spaceItem.ID,
            forumPostAttachmentId: postAttachment.ID,
            artifactId: prepared.artifactId,
            artifactVersionId: resolvedArtifactVersionId,
            artifactTypeName: prepared.artifactTypeName,
            artifactName: prepared.artifactName,
            previewContent: prepared.previewContent,
            contentType: prepared.contentType,
            versionNumber: prepared.versionNumber,
            modality: prepared.modality,
            collaborationMode: prepared.collaborationMode,
            showInlinePreview: prepared.showInlinePreview,
            caption: prepared.caption,
            sequence: prepared.sequence,
            featureInLibrary: prepared.featureInLibrary,
            folder: prepared.folder,
            band: effectiveBand,
            authorUserId: post.AuthorUserID,
            authorName: post.AuthorUser ?? null,
            postTitle: post.Title,
            forumId: forum.ID,
            forumName: forum.Name,
          };
          persistedResults.push(artifactItem);
        } else {
          const fileItem: CommunityFileAttachmentItem = {
            id: resolvedItemId,
            kind: prepared.kind,
            spaceId: forum.SpaceID,
            postId: post.ID,
            spaceItemId: spaceItem.ID,
            forumPostAttachmentId: postAttachment.ID,
            fileId: prepared.fileId,
            fileName: prepared.fileName,
            mimeType: prepared.mimeType,
            sizeBytes: prepared.sizeBytes,
            url: prepared.url,
            posterUrl: prepared.posterUrl,
            durationSeconds: prepared.durationSeconds,
            artifactId: resolvedArtifactId,
            artifactVersionId: resolvedArtifactVersionId,
            caption: prepared.caption,
            sequence: prepared.sequence,
            featureInLibrary: prepared.featureInLibrary,
            folder: prepared.folder,
            band: effectiveBand,
            authorUserId: post.AuthorUserID,
            authorName: post.AuthorUser ?? null,
            postTitle: post.Title,
            forumId: forum.ID,
            forumName: forum.Name,
          };
          persistedResults.push(fileItem);
        }
      }
    } catch (err) {
      const compensationFailures: string[] = [];

      for (const snap of mutatedSnapshotsForRollback.reverse()) {
        try {
          await snap.restore();
        } catch (restoreErr) {
          compensationFailures.push(
            `${snap.label}: ${restoreErr instanceof Error ? restoreErr.message : 'restore failed'}`,
          );
        }
      }

      for (const created of newlyCreatedForRollback.reverse()) {
        if (typeof created.entity.Delete === 'function') {
          try {
            const deleted = await created.entity.Delete();
            if (!deleted) {
              const reason =
                created.entity.LatestResult?.CompleteMessage?.trim() ||
                created.entity.LatestResult?.Message?.trim() ||
                'Delete() returned false';
              compensationFailures.push(`${created.label}: ${reason}`);
            }
          } catch (delErr) {
            compensationFailures.push(
              `${created.label}: ${delErr instanceof Error ? delErr.message : 'Delete() threw an error'}`,
            );
          }
        }
      }

      if (compensationFailures.length > 0) {
        const baseMsg = err instanceof Error ? err.message : 'Failed to persist post attachments.';
        throw new Error(`${baseMsg} (Rollback compensation failures: ${compensationFailures.join('; ')})`);
      }
      throw err;
    }

    return persistedResults;
  }

  /**
   * Updates `Feature in Space Library` (`SpaceItem.Folder`), `Caption`, or `Sequence` for an
   * existing `ForumPostAttachment` after verifying post write authorization and Space ownership.
   */
  public async UpdateAttachmentLibraryState(
    params: UpdateAttachmentLibraryStateParams,
  ): Promise<UpdateAttachmentLibraryStateResult> {
    const validUserId = requireValidContextUser(params.contextUser, 'Update attachment library state');
    const validAttachmentId = AssertValidUUID(params.attachmentId, 'attachmentId');
    const auth = await this.AuthorizePostAccess(params.postId, 'write', params.contextUser);
    const md = new Metadata();

    if (params.caption && params.caption.length > COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH) {
      throw new Error(`Caption exceeds maximum length of ${COMMUNITY_ATTACHMENT_MAX_CAPTION_LENGTH} characters.`);
    }

    const attachment = await md.GetEntityObject<mjBizAppsCommunityForumPostAttachmentEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
      CompositeKey.FromID(validAttachmentId),
      params.contextUser,
    );
    if (!attachment || !attachment.ID) {
      throw new Error(`ForumPostAttachment ${validAttachmentId} was not found or access is denied.`);
    }
    if (!UUIDsEqual(attachment.PostID, auth.post.ID)) {
      throw new Error(`ForumPostAttachment ${validAttachmentId} does not belong to Post ${auth.post.ID}.`);
    }

    const spaceItem = await md.GetEntityObject<CollaborationSpaceItemEntityView>(
      COLLABORATION_SPACE_ITEMS_ENTITY,
      CompositeKey.FromID(AssertValidUUID(attachment.SpaceItemID, 'attachment.SpaceItemID')),
      params.contextUser,
    );
    if (!spaceItem || !spaceItem.ID) {
      throw new Error(`SpaceItem ${attachment.SpaceItemID} was not found or access is denied.`);
    }
    if (!UUIDsEqual(spaceItem.SpaceID, auth.forumContext.forum.SpaceID)) {
      throw new Error(`SpaceItem ${spaceItem.ID} does not belong to Space ${auth.forumContext.forum.SpaceID}.`);
    }

    const prevFolder = spaceItem.Folder;
    let spaceItemMutated = false;
    let nextFeature = IsFeaturedLibraryFolder(spaceItem.Folder);

    try {
      if (params.featureInLibrary !== undefined) {
        nextFeature = params.featureInLibrary;
        spaceItem.Folder = ResolveAttachmentSpaceItemFolder(nextFeature);
        await SaveOrThrow(spaceItem, `Failed to update SpaceItem ${spaceItem.ID} folder.`);
        spaceItemMutated = true;
      }

      let attachmentChanged = false;
      if (params.caption !== undefined) {
        attachment.Caption = params.caption?.trim() ? params.caption.trim() : null;
        attachmentChanged = true;
      }
      if (params.sequence !== undefined) {
        attachment.Sequence = params.sequence;
        attachmentChanged = true;
      }
      if (attachmentChanged) {
        await SaveOrThrow(attachment, `Failed to update ForumPostAttachment ${attachment.ID}.`);
      }
    } catch (err) {
      if (spaceItemMutated) {
        try {
          spaceItem.Folder = prevFolder;
          await SaveOrThrow(spaceItem, `Failed to restore SpaceItem ${spaceItem.ID} folder after attachment error.`);
        } catch (restoreErr) {
          const baseMsg = err instanceof Error ? err.message : 'Failed to update attachment library state.';
          const restoreMsg = restoreErr instanceof Error ? restoreErr.message : 'Folder restore failed.';
          throw new Error(`${baseMsg} (Rollback compensation failure: ${restoreMsg})`);
        }
      }
      throw err;
    }

    void validUserId;
    return {
      attachmentId: attachment.ID,
      spaceItemId: spaceItem.ID,
      featureInLibrary: nextFeature,
      folder: ResolveAttachmentSpaceItemFolder(nextFeature),
      caption: attachment.Caption,
      sequence: attachment.Sequence,
    };
  }

  /**
   * Queries attachments for a single authorized post (fail-closed if caller lacks read access).
   */
  public async QueryPostAttachments(params: {
    postId: string;
    contextUser: UserInfo;
  }): Promise<CommunityAttachmentItem[]> {
    const auth = await this.AuthorizePostAccess(params.postId, 'read', params.contextUser);
    const { post, forumContext, spaceAccess } = auth;
    const { forum } = forumContext;
    const rv = new RunView();

    const attRes = await rv.RunView<ForumPostAttachmentRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
        ExtraFilter: `PostID = '${AssertValidUUID(post.ID, 'post.ID')}'`,
        Fields: ['ID', 'PostID', 'SpaceItemID', 'Caption', 'Sequence', '__mj_CreatedAt'],
        OrderBy: 'Sequence ASC, __mj_CreatedAt ASC',
        ResultType: 'simple',
        MaxRows: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST * 2,
      },
      params.contextUser,
    );
    if (!attRes?.Success) {
      throw new Error(`Unable to load attachments for Post ${post.ID}: ${attRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const rows = attRes.Results ?? [];
    if (rows.length === 0) {
      return [];
    }

    const spaceItemIds = Array.from(new Set(rows.map((r) => r.SpaceItemID)));
    const spaceItemsMap = await this.loadSpaceItemsMap(spaceItemIds, forum.SpaceID, spaceAccess.canSeeTeamBand, params.contextUser);
    const postMap = new Map<string, ForumPostRow>([[post.ID.toLowerCase(), post]]);
    const forumMap = new Map<string, ForumRow>([[forum.ID.toLowerCase(), forum]]);

    return this.hydrateAttachmentItems({
      attachments: rows,
      spaceItemsMap,
      postMap,
      forumMap,
      contextUser: params.contextUser,
    });
  }

  /**
   * Queries the Space Media & Artifacts Library scoped strictly to authorized spaces and forums.
   * Never leaks `PrivateForum` or `Team`-band media to unauthorized callers, enforces bounded
   * pagination (`maxRows` <= 100), and sanitizes every returned URL.
   */
  public async QuerySpaceMediaLibrary(
    params: QuerySpaceMediaLibraryParams,
  ): Promise<SpaceMediaLibraryQueryResult> {
    requireValidContextUser(params.contextUser, 'Space media library query');
    const validSpaceId = AssertValidUUID(params.spaceId, 'spaceId');
    const rv = new RunView();

    const spaceAccess = await this.ResolveSpaceAccess(validSpaceId, params.contextUser);
    if (!spaceAccess.canReadSpace) {
      throw new Error(`Caller is not authorized to query media library for Space ${validSpaceId}.`);
    }

    const forumsRes = await rv.RunView<ForumRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.Forums,
        ExtraFilter: `SpaceID = '${validSpaceId}'`,
        Fields: ['ID', 'SpaceID', 'Name', 'VisibilityBand', 'InheritsSpaceMembers', 'PostingPolicy', 'Status'],
        ResultType: 'simple',
        MaxRows: MAX_FORUMS_PER_SPACE,
      },
      params.contextUser,
    );
    if (!forumsRes?.Success) {
      throw new Error(`Unable to load Forums for Space ${validSpaceId}: ${forumsRes?.ErrorMessage ?? 'query failed'}.`);
    }

    const authorizedForums = new Map<string, ForumRow>();
    for (const forum of forumsRes.Results ?? []) {
      const forumAccess = await this.ResolveForumAccess(forum, spaceAccess, params.contextUser);
      if (forumAccess.decision.canReadForum) {
        authorizedForums.set(forum.ID.toLowerCase(), forum);
      }
    }

    if (params.forumId) {
      const validRequestedForumId = AssertValidUUID(params.forumId, 'forumId');
      const requested = authorizedForums.get(validRequestedForumId.toLowerCase());
      if (!requested) {
        throw new Error(`Caller is not authorized to access Forum ${validRequestedForumId} in Space ${validSpaceId}.`);
      }
      authorizedForums.clear();
      authorizedForums.set(requested.ID.toLowerCase(), requested);
    }

    if (authorizedForums.size === 0) {
      return { items: [], totalCount: 0, hasMore: false };
    }

    const pageSize = Math.max(
      1,
      Math.min(MAX_LIBRARY_PAGE_SIZE, Math.floor(params.maxRows ?? DEFAULT_LIBRARY_PAGE_SIZE)),
    );
    const startRow = Math.max(0, Math.floor(params.startRow ?? 0));

    // Build bounded SpaceItem filter scoped to SpaceID, optional Folder, and optional Band ceiling
    const spaceFilterParts = [`SpaceID = '${validSpaceId}'`];
    if (params.folder === 'Library' || params.folder === 'Post Media') {
      spaceFilterParts.push(`Folder = '${EscapeSqlLiteral(params.folder)}'`);
    }
    if (!spaceAccess.canSeeTeamBand) {
      spaceFilterParts.push(`Band = 'Shared'`);
    }

    const spaceItemsRes = await rv.RunView<CollaborationSpaceItemRow>(
      {
        EntityName: COLLABORATION_SPACE_ITEMS_ENTITY,
        ExtraFilter: spaceFilterParts.join(' AND '),
        Fields: ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Band', 'Folder', 'ArtifactVersionID', '__mj_CreatedAt'],
        OrderBy: '__mj_CreatedAt DESC',
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      params.contextUser,
    );
    if (!spaceItemsRes?.Success) {
      throw new Error(`Unable to query SpaceItems for Space ${validSpaceId}: ${spaceItemsRes?.ErrorMessage ?? 'query failed'}.`);
    }

    const spaceItemsMap = new Map<string, CollaborationSpaceItemRow>();
    const spaceItemIds: string[] = [];
    for (const si of spaceItemsRes.Results ?? []) {
      if (!spaceAccess.canSeeTeamBand && si.Band === 'Team') {
        continue;
      }
      spaceItemsMap.set(si.ID.toLowerCase(), si);
      spaceItemIds.push(si.ID);
    }

    if (spaceItemIds.length === 0) {
      return { items: [], totalCount: 0, hasMore: false };
    }

    const attRes = await rv.RunView<ForumPostAttachmentRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPostAttachments,
        ExtraFilter: `SpaceItemID IN (${buildSqlInUuidList(spaceItemIds, 'spaceItemIds')})`,
        Fields: ['ID', 'PostID', 'SpaceItemID', 'Caption', 'Sequence', '__mj_CreatedAt'],
        OrderBy: '__mj_CreatedAt DESC, Sequence ASC',
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      params.contextUser,
    );
    if (!attRes?.Success) {
      throw new Error(`Unable to query ForumPostAttachments for Space ${validSpaceId}: ${attRes?.ErrorMessage ?? 'query failed'}.`);
    }

    const attachmentRows = attRes.Results ?? [];
    if (attachmentRows.length === 0) {
      return { items: [], totalCount: 0, hasMore: false };
    }

    const postIds = Array.from(new Set(attachmentRows.map((a) => a.PostID)));
    const postsRes = await rv.RunView<ForumPostRow>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumPosts,
        ExtraFilter: `ID IN (${buildSqlInUuidList(postIds, 'postIds')})`,
        Fields: [
          'ID',
          'ForumID',
          'ParentPostID',
          'AuthorUserID',
          'AuthorUser',
          'Title',
          'VisibilityBand',
          'Status',
          'IsLocked',
          '__mj_CreatedAt',
        ],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      params.contextUser,
    );
    if (!postsRes?.Success) {
      throw new Error(`Unable to verify source posts for Space ${validSpaceId}: ${postsRes?.ErrorMessage ?? 'query failed'}.`);
    }

    const authorizedPostMap = new Map<string, ForumPostRow>();
    for (const p of postsRes.Results ?? []) {
      const forum = authorizedForums.get(p.ForumID.toLowerCase());
      if (!forum) {
        continue;
      }
      if (!PUBLICLY_READABLE_POST_STATUSES.has(p.Status)) {
        continue;
      }
      if (p.VisibilityBand === 'Team' && !spaceAccess.canSeeTeamBand) {
        continue;
      }
      authorizedPostMap.set(p.ID.toLowerCase(), p);
    }

    const authorizedAttachments = attachmentRows.filter((a) => authorizedPostMap.has(a.PostID.toLowerCase()));
    if (authorizedAttachments.length === 0) {
      return { items: [], totalCount: 0, hasMore: false };
    }

    const hydrated = await this.hydrateAttachmentItems({
      attachments: authorizedAttachments,
      spaceItemsMap,
      postMap: authorizedPostMap,
      forumMap: authorizedForums,
      contextUser: params.contextUser,
    });

    const normalizedSearch = params.searchText?.trim().toLowerCase() ?? '';
    const filtered = hydrated.filter((item) => {
      if (params.folder === 'Library' && !item.featureInLibrary) {
        return false;
      }
      if (params.folder === 'Post Media' && item.featureInLibrary) {
        return false;
      }
      if (params.kind && item.kind !== params.kind) {
        return false;
      }
      if (normalizedSearch) {
        const haystacks = [
          item.caption ?? '',
          item.postTitle ?? '',
          item.forumName ?? '',
          item.authorName ?? '',
          item.kind === 'artifact' ? item.artifactName : item.fileName,
          item.kind === 'artifact' ? item.artifactTypeName : item.mimeType,
        ];
        const matched = haystacks.some((h) => h.toLowerCase().includes(normalizedSearch));
        if (!matched) {
          return false;
        }
      }
      return true;
    });

    const totalCount = filtered.length;
    const paged = filtered.slice(startRow, startRow + pageSize);
    return {
      items: paged,
      totalCount,
      hasMore: startRow + paged.length < totalCount,
    };
  }

  private async resolveExistingAttachmentSizes(
    existingAttachments: ReadonlyArray<ForumPostAttachmentRow>,
    contextUser: UserInfo,
  ): Promise<Array<{ sizeBytes: number }>> {
    if (existingAttachments.length === 0) {
      return [];
    }
    const rv = new RunView();
    const spaceItemIds = Array.from(new Set(existingAttachments.map((a) => a.SpaceItemID)));
    const siRes = await rv.RunView<Pick<CollaborationSpaceItemRow, 'ID' | 'EntityID' | 'RecordID' | 'ArtifactVersionID'>>(
      {
        EntityName: COLLABORATION_SPACE_ITEMS_ENTITY,
        ExtraFilter: `ID IN (${buildSqlInUuidList(spaceItemIds, 'existingSpaceItemIds')})`,
        Fields: ['ID', 'EntityID', 'RecordID', 'ArtifactVersionID'],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      contextUser,
    );
    if (!siRes?.Success) {
      throw new Error(`Unable to resolve existing SpaceItems for attachment size checks: ${siRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const siById = new Map<string, Pick<CollaborationSpaceItemRow, 'ID' | 'EntityID' | 'RecordID' | 'ArtifactVersionID'>>(
      (siRes.Results ?? []).map((si) => [si.ID.toLowerCase(), si]),
    );
    for (const siId of spaceItemIds) {
      if (!siById.has(siId.toLowerCase())) {
        throw new Error(`Existing attachment SpaceItem ${siId} was not found or access is denied.`);
      }
    }

    const entityIds = Array.from(new Set((siRes.Results ?? []).map((si) => si.EntityID)));
    const entRes = await rv.RunView<MJEntityRow>(
      {
        EntityName: MJ_ENTITIES_ENTITY,
        ExtraFilter: `ID IN (${buildSqlInUuidList(entityIds, 'existingEntityIds')})`,
        Fields: ['ID', 'Name'],
        ResultType: 'simple',
        MaxRows: entityIds.length + 5,
      },
      contextUser,
    );
    if (!entRes?.Success) {
      throw new Error(`Unable to resolve Entity metadata for existing attachments: ${entRes?.ErrorMessage ?? 'query failed'}.`);
    }
    const entityNameById = new Map<string, string>(
      (entRes.Results ?? []).map((e) => [e.ID.toLowerCase(), e.Name]),
    );

    const pinnedVersionIds = new Set<string>();
    const unpinnedArtifactIds = new Set<string>();
    const unpinnedFileIds = new Set<string>();
    for (const si of siRes.Results ?? []) {
      const targetEntityName = entityNameById.get(si.EntityID.toLowerCase());
      const recUuid = extractRecordUuid(si.RecordID);
      if ((targetEntityName !== MJ_FILES_ENTITY && targetEntityName !== MJ_ARTIFACTS_ENTITY) || !recUuid) {
        throw new Error(`Existing SpaceItem ${si.ID} has an unsupported or invalid target (${targetEntityName ?? 'unknown'}).`);
      }
      if (si.ArtifactVersionID) {
        pinnedVersionIds.add(AssertValidUUID(si.ArtifactVersionID, 'existingArtifactVersionId'));
      } else if (targetEntityName === MJ_ARTIFACTS_ENTITY) {
        unpinnedArtifactIds.add(recUuid);
      } else {
        unpinnedFileIds.add(recUuid);
      }
    }

    const versionById = new Map<string, MJArtifactVersionRow>();
    if (pinnedVersionIds.size > 0) {
      const verRes = await rv.RunView<MJArtifactVersionRow>(
        {
          EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
          ExtraFilter: `ID IN (${buildSqlInUuidList(Array.from(pinnedVersionIds), 'existingArtifactVersionIds')})`,
          Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        contextUser,
      );
      if (!verRes?.Success) {
        throw new Error(`Unable to load pinned Artifact Versions for existing attachments: ${verRes?.ErrorMessage ?? 'query failed'}.`);
      }
      for (const v of verRes.Results ?? []) {
        versionById.set(v.ID.toLowerCase(), v);
      }
    }

    const latestVersionByArtifactId = new Map<string, MJArtifactVersionRow>();
    if (unpinnedArtifactIds.size > 0) {
      const artVerRes = await rv.RunView<MJArtifactVersionRow>(
        {
          EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
          ExtraFilter: `ArtifactID IN (${buildSqlInUuidList(Array.from(unpinnedArtifactIds), 'existingArtifactIds')})`,
          Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        contextUser,
      );
      if (!artVerRes?.Success) {
        throw new Error(`Unable to load Artifact Versions for existing unpinned artifacts: ${artVerRes?.ErrorMessage ?? 'query failed'}.`);
      }
      for (const v of artVerRes.Results ?? []) {
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
        allFileIdsToLoad.add(AssertValidUUID(v.FileID, 'existingVersion.FileID'));
      }
    }
    for (const v of latestVersionByArtifactId.values()) {
      if (v.FileID) {
        allFileIdsToLoad.add(AssertValidUUID(v.FileID, 'existingLatestVersion.FileID'));
      }
    }

    const fileById = new Map<string, MJFileRow>();
    if (allFileIdsToLoad.size > 0) {
      const fileRes = await rv.RunView<MJFileRow>(
        {
          EntityName: MJ_FILES_ENTITY,
          ExtraFilter: `ID IN (${buildSqlInUuidList(Array.from(allFileIdsToLoad), 'existingFileIds')})`,
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        contextUser,
      );
      if (!fileRes?.Success) {
        throw new Error(`Unable to load MJ: Files records for existing attachments: ${fileRes?.ErrorMessage ?? 'query failed'}.`);
      }
      for (const f of fileRes.Results ?? []) {
        fileById.set(f.ID.toLowerCase(), f);
      }
    }

    const filesNeedingCompanion = Array.from(unpinnedFileIds).filter((fid) => {
      const f = fileById.get(fid.toLowerCase());
      return f != null && f.ContentSizeBytes == null && f.Size == null;
    });
    const companionByFileId = new Map<string, MJArtifactVersionRow>();
    if (filesNeedingCompanion.length > 0) {
      const compRes = await rv.RunView<MJArtifactVersionRow>(
        {
          EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
          ExtraFilter: `FileID IN (${buildSqlInUuidList(filesNeedingCompanion, 'existingCompanionFileIds')})`,
          Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        contextUser,
      );
      if (!compRes?.Success) {
        throw new Error(`Unable to load companion Artifact Versions for existing MJ: Files attachments: ${compRes?.ErrorMessage ?? 'query failed'}.`);
      }
      for (const v of compRes.Results ?? []) {
        if (!v.FileID) continue;
        const key = v.FileID.toLowerCase();
        const existing = companionByFileId.get(key);
        if (!existing || (v.VersionNumber ?? 0) > (existing.VersionNumber ?? 0)) {
          companionByFileId.set(key, v);
        }
      }
    }

    const sizeBySpaceItem = new Map<string, number>();
    for (const si of siRes.Results ?? []) {
      const targetEntityName = entityNameById.get(si.EntityID.toLowerCase()) as 'MJ: Files' | 'MJ: Artifacts';
      const recUuid = extractRecordUuid(si.RecordID)!;

      if (si.ArtifactVersionID) {
        const ver = versionById.get(si.ArtifactVersionID.toLowerCase());
        if (!ver) {
          throw new Error(`Existing attachment Artifact Version ${si.ArtifactVersionID} was not found or access is denied.`);
        }
        let linkedFile: MJFileRow | null = null;
        if (targetEntityName === MJ_FILES_ENTITY) {
          linkedFile = fileById.get(recUuid.toLowerCase()) ?? null;
          if (!linkedFile) {
            throw new Error(`Existing attachment File ${recUuid} was not found or access is denied.`);
          }
        } else if (ver.FileID) {
          linkedFile = fileById.get(ver.FileID.toLowerCase()) ?? null;
          if (!linkedFile) {
            throw new Error(`Existing attachment File ${ver.FileID} was not found or access is denied.`);
          }
        }
        const verCheck = ValidateAuthoritativeArtifactVersionRecord(ver, {
          targetEntityName,
          targetRecordUuid: recUuid,
          expectedFileId: targetEntityName === MJ_FILES_ENTITY ? recUuid : null,
          linkedFileRow: linkedFile,
        });
        if (!verCheck.valid || typeof verCheck.sizeBytes !== 'number' || verCheck.sizeBytes <= 0) {
          throw new Error(verCheck.error ?? `Unable to resolve authoritative size for existing SpaceItem ${si.ID}.`);
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), verCheck.sizeBytes);
      } else if (targetEntityName === MJ_ARTIFACTS_ENTITY) {
        const latestVer = latestVersionByArtifactId.get(recUuid.toLowerCase());
        if (!latestVer) {
          throw new Error(`Existing unpinned Artifact ${recUuid} has no Artifact Version to resolve authoritative size.`);
        }
        let linkedFile: MJFileRow | null = null;
        if (latestVer.FileID) {
          linkedFile = fileById.get(latestVer.FileID.toLowerCase()) ?? null;
          if (!linkedFile) {
            throw new Error(`Existing attachment File ${latestVer.FileID} was not found or access is denied.`);
          }
        }
        const verCheck = ValidateAuthoritativeArtifactVersionRecord(latestVer, {
          targetEntityName: 'MJ: Artifacts',
          targetRecordUuid: recUuid,
          linkedFileRow: linkedFile,
        });
        if (!verCheck.valid || typeof verCheck.sizeBytes !== 'number' || verCheck.sizeBytes <= 0) {
          throw new Error(verCheck.error ?? `Unable to resolve authoritative size for existing Artifact ${recUuid}.`);
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), verCheck.sizeBytes);
      } else {
        const fileRow = fileById.get(recUuid.toLowerCase());
        if (!fileRow) {
          throw new Error(`Existing attachment File ${recUuid} was not found or access is denied.`);
        }
        const companionVer =
          fileRow.ContentSizeBytes == null && fileRow.Size == null
            ? companionByFileId.get(fileRow.ID.toLowerCase()) ?? null
            : null;
        const fileCheck = ValidateAuthoritativeFileRecord(fileRow, undefined, companionVer);
        if (!fileCheck.valid || typeof fileCheck.sizeBytes !== 'number' || fileCheck.sizeBytes <= 0) {
          throw new Error(fileCheck.error ?? `Unable to resolve authoritative size for existing File ${recUuid}.`);
        }
        sizeBySpaceItem.set(si.ID.toLowerCase(), fileCheck.sizeBytes);
      }
    }

    return existingAttachments.map((a) => {
      const sz = sizeBySpaceItem.get(a.SpaceItemID.toLowerCase());
      if (typeof sz !== 'number' || !Number.isFinite(sz) || sz <= 0) {
        throw new Error(`Unable to resolve authoritative size for existing ForumPostAttachment ${a.ID}.`);
      }
      return { sizeBytes: sz };
    });
  }

  private async validateAndPrepareAttachments(params: {
    attachments: ReadonlyArray<PersistCommunityAttachmentInput>;
    post: ForumPostRow;
    forum: ForumRow;
    spaceAccess: SpaceAccessResolution;
    forumContext: AuthorizedForumContext;
    entryType: CommunityAttachmentEntryType;
    existingCount: number;
    existingSizeEntries: ReadonlyArray<{ sizeBytes?: number | null }>;
    allowBandPromotion: boolean;
    md: Metadata;
    contextUser: UserInfo;
  }): Promise<
    Array<
      | {
          kind: 'artifact';
          artifactId: string;
          artifactVersionId: string | null;
          artifactName: string;
          artifactTypeName: string;
          previewContent: string | null;
          contentType: string | null;
          versionNumber: number | null;
          sizeBytes: number;
          targetEntityId: string;
          targetRecordId: string;
          existingSpaceItemId: string | null;
          folder: CommunitySpaceItemFolder;
          featureInLibrary: boolean;
          band: CommunityVisibilityBand;
          caption: string | null;
          sequence: number;
          linkAsForumArtifactPost: boolean;
          modality: CommunityArtifactModality;
          collaborationMode: CommunityArtifactCollaborationMode;
          showInlinePreview: boolean;
        }
      | {
          kind: 'image' | 'video' | 'audio' | 'file';
          fileId: string | null;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          url: string;
          posterUrl: string | null;
          durationSeconds: number | null;
          artifactId: string | null;
          artifactVersionId: string | null;
          artifactTypeId: string | null;
          needsCreateArtifact: boolean;
          artifactsEntityId: string;
          targetEntityId: string;
          targetRecordId: string;
          existingSpaceItemId: string | null;
          folder: CommunitySpaceItemFolder;
          featureInLibrary: boolean;
          band: CommunityVisibilityBand;
          caption: string | null;
          sequence: number;
        }
    >
  > {
    const rv = new RunView();
    const resolvedBand = CommunityRules.ResolvePostVisibilityBand({
      forumVisibilityBand: params.forum.VisibilityBand,
      requestedBand: params.post.VisibilityBand,
      authorCanSeeTeamBand: params.spaceAccess.canSeeTeamBand,
    });

    const artifactsEntityId = await this.resolveEntityId(params.md, MJ_ARTIFACTS_ENTITY, params.contextUser);
    const filesEntityId = await this.resolveEntityId(params.md, MJ_FILES_ENTITY, params.contextUser);

    const prepared: Array<
      | {
          kind: 'artifact';
          artifactId: string;
          artifactVersionId: string | null;
          artifactName: string;
          artifactTypeName: string;
          previewContent: string | null;
          contentType: string | null;
          versionNumber: number | null;
          sizeBytes: number;
          targetEntityId: string;
          targetRecordId: string;
          existingSpaceItemId: string | null;
          folder: CommunitySpaceItemFolder;
          featureInLibrary: boolean;
          band: CommunityVisibilityBand;
          caption: string | null;
          sequence: number;
          linkAsForumArtifactPost: boolean;
          modality: CommunityArtifactModality;
          collaborationMode: CommunityArtifactCollaborationMode;
          showInlinePreview: boolean;
        }
      | {
          kind: 'image' | 'video' | 'audio' | 'file';
          fileId: string | null;
          fileName: string;
          mimeType: string;
          sizeBytes: number;
          url: string;
          posterUrl: string | null;
          durationSeconds: number | null;
          artifactId: string | null;
          artifactVersionId: string | null;
          artifactTypeId: string | null;
          needsCreateArtifact: boolean;
          artifactsEntityId: string;
          targetEntityId: string;
          targetRecordId: string;
          existingSpaceItemId: string | null;
          folder: CommunitySpaceItemFolder;
          featureInLibrary: boolean;
          band: CommunityVisibilityBand;
          caption: string | null;
          sequence: number;
        }
    > = [];

    for (let idx = 0; idx < params.attachments.length; idx += 1) {
      const raw = params.attachments[idx];
      const existingSpaceItemId = raw.existingSpaceItemId
        ? AssertValidUUID(raw.existingSpaceItemId, `attachments[${idx}].existingSpaceItemId`)
        : null;
      const sequence = raw.sequence ?? params.existingCount + idx;
      const caption = raw.caption?.trim() ? raw.caption.trim() : null;

      if (raw.kind === 'artifact') {
        const validArtifactId = AssertValidUUID(raw.artifactId, `attachments[${idx}].artifactId`);
        const artifactRes = await rv.RunView<MJArtifactRow>(
          {
            EntityName: MJ_ARTIFACTS_ENTITY,
            ExtraFilter: `ID = '${validArtifactId}'`,
            Fields: ['ID', 'Name', 'TypeID', 'Type'],
            ResultType: 'simple',
            MaxRows: 1,
          },
          params.contextUser,
        );
        if (!artifactRes?.Success || !artifactRes.Results?.[0]) {
          throw new Error(`Artifact ${validArtifactId} was not found or caller lacks read access.`);
        }
        const artifactRow = artifactRes.Results[0];

        let versionRow: MJArtifactVersionRow | null = null;
        if (raw.artifactVersionId) {
          const validVersionId = AssertValidUUID(raw.artifactVersionId, `attachments[${idx}].artifactVersionId`);
          const verRes = await rv.RunView<MJArtifactVersionRow>(
            {
              EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
              ExtraFilter: `ID = '${validVersionId}' AND ArtifactID = '${validArtifactId}'`,
              Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!verRes?.Success || !verRes.Results?.[0]) {
            throw new Error(`Artifact Version ${validVersionId} for Artifact ${validArtifactId} was not found or access is denied.`);
          }
          versionRow = verRes.Results[0];
        } else {
          const latestRes = await rv.RunView<MJArtifactVersionRow>(
            {
              EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
              ExtraFilter: `ArtifactID = '${validArtifactId}'`,
              Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
              OrderBy: 'VersionNumber DESC',
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!latestRes?.Success) {
            throw new Error(`Unable to verify versions for Artifact ${validArtifactId}: ${latestRes?.ErrorMessage ?? 'query failed'}.`);
          }
          if (latestRes.Results?.[0]) {
            versionRow = latestRes.Results[0];
          }
        }

        if (!versionRow) {
          throw new Error(
            `attachments[${idx}]: Artifact ${validArtifactId} has no published Artifact Version to resolve authoritative size and content.`,
          );
        }

        let linkedFileForArt: MJFileRow | null = null;
        if (versionRow.FileID) {
          const validVerFileId = AssertValidUUID(versionRow.FileID, 'versionRow.FileID');
          const linkedFileRes = await rv.RunView<MJFileRow>(
            {
              EntityName: MJ_FILES_ENTITY,
              ExtraFilter: `ID = '${validVerFileId}'`,
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!linkedFileRes?.Success || !linkedFileRes.Results?.[0]) {
            throw new Error(`File ${validVerFileId} for Artifact Version ${versionRow.ID} was not found or access is denied.`);
          }
          linkedFileForArt = linkedFileRes.Results[0];
        }
        const verCheck = ValidateAuthoritativeArtifactVersionRecord(versionRow, {
          targetEntityName: 'MJ: Artifacts',
          targetRecordUuid: validArtifactId,
          expectedKind: 'artifact',
          linkedFileRow: linkedFileForArt,
        });
        if (!verCheck.valid || typeof verCheck.sizeBytes !== 'number' || verCheck.sizeBytes <= 0) {
          throw new Error(`attachments[${idx}]: ${verCheck.error ?? 'Artifact Version lacks a valid positive authoritative byte size.'}`);
        }
        const artifactSizeBytes = verCheck.sizeBytes;

        const artifactName = raw.artifactName?.trim() || artifactRow.Name;
        const validation = ValidateCommunityAttachmentInput({
          kind: 'artifact',
          artifactId: validArtifactId,
          artifactName,
          caption,
        });
        if (!validation.valid) {
          throw new Error(`attachments[${idx}]: ${validation.errors.join(' ')}`);
        }

        const featureInLibrary =
          raw.featureInLibrary ?? ResolveDefaultFeatureInLibrary('artifact', params.entryType);
        const folder = ResolveAttachmentSpaceItemFolder(featureInLibrary);

        prepared.push({
          kind: 'artifact',
          artifactId: validArtifactId,
          artifactVersionId: versionRow.ID,
          artifactName,
          artifactTypeName: raw.artifactTypeName?.trim() || artifactRow.Type?.trim() || 'Artifact',
          previewContent: versionRow.Content ?? null,
          contentType: verCheck.mimeType ?? versionRow.MimeType ?? null,
          versionNumber: versionRow.VersionNumber ?? null,
          sizeBytes: artifactSizeBytes,
          targetEntityId: artifactsEntityId,
          targetRecordId: validArtifactId,
          existingSpaceItemId,
          folder,
          featureInLibrary,
          band: resolvedBand,
          caption,
          sequence,
          linkAsForumArtifactPost: Boolean(raw.linkAsForumArtifactPost),
          modality: raw.modality ?? 'Document',
          collaborationMode: raw.collaborationMode ?? 'Suggest',
          showInlinePreview: raw.showInlinePreview ?? true,
        });
      } else {
        if (IsTemporaryOrPlaceholderAttachmentUrl(raw.url)) {
          throw new Error(
            `attachments[${idx}]: Temporary or placeholder URLs (blob:/attachments.local) cannot be persisted.`,
          );
        }
        if (IsTemporaryOrPlaceholderAttachmentUrl(raw.posterUrl)) {
          throw new Error(
            `attachments[${idx}]: Temporary or placeholder poster URLs (blob:/attachments.local) cannot be persisted.`,
          );
        }
        const validation = ValidateCommunityAttachmentInput({
          kind: raw.kind,
          fileName: raw.fileName,
          mimeType: raw.mimeType,
          sizeBytes: raw.sizeBytes,
          url: raw.url ?? null,
          posterUrl: raw.posterUrl ?? null,
          caption,
        });
        if (!validation.valid) {
          throw new Error(`attachments[${idx}]: ${validation.errors.join(' ')}`);
        }

        const validFileId = raw.fileId
          ? AssertValidUUID(raw.fileId, `attachments[${idx}].fileId`)
          : null;
        let fileRow: MJFileRow | null = null;
        if (validFileId) {
          const fileRes = await rv.RunView<MJFileRow>(
            {
              EntityName: MJ_FILES_ENTITY,
              ExtraFilter: `ID = '${validFileId}'`,
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!fileRes?.Success || !fileRes.Results?.[0]) {
            throw new Error(`File ${validFileId} was not found or caller lacks read access.`);
          }
          fileRow = fileRes.Results[0];
        }

        const validArtifactVersionId = raw.artifactVersionId
          ? AssertValidUUID(raw.artifactVersionId, `attachments[${idx}].artifactVersionId`)
          : null;

        let effectiveFileName = raw.fileName.trim();
        let effectiveMimeType = validation.normalizedMimeType ?? NormalizeAttachmentMimeType(raw.mimeType);
        let effectiveSizeBytes = raw.sizeBytes;
        let effectiveUrl = validation.sanitizedUrl ?? '';
        let resolvedArtifactId: string | null = null;
        let resolvedArtifactTypeId: string | null = null;
        let needsCreateArtifact = false;

        if (validArtifactVersionId) {
          const verRes = await rv.RunView<MJArtifactVersionRow>(
            {
              EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
              ExtraFilter: `ID = '${validArtifactVersionId}'`,
              Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!verRes?.Success || !verRes.Results?.[0]) {
            throw new Error(
              `Artifact Version ${validArtifactVersionId} was not found or caller lacks read access.`,
            );
          }
          const versionRow = verRes.Results[0];

          const parentArtRes = await rv.RunView<MJArtifactRow>(
            {
              EntityName: MJ_ARTIFACTS_ENTITY,
              ExtraFilter: `ID = '${AssertValidUUID(versionRow.ArtifactID, 'versionRow.ArtifactID')}'`,
              Fields: ['ID', 'Name', 'TypeID', 'Type'],
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!parentArtRes?.Success || !parentArtRes.Results?.[0]) {
            throw new Error(
              `Parent Artifact ${versionRow.ArtifactID} for Artifact Version ${validArtifactVersionId} was not found or caller lacks read access.`,
            );
          }
          resolvedArtifactId = parentArtRes.Results[0].ID;

          if (versionRow.FileID && !fileRow) {
            const linkedFileId = AssertValidUUID(versionRow.FileID, 'versionRow.FileID');
            const linkedFileRes = await rv.RunView<MJFileRow>(
              {
                EntityName: MJ_FILES_ENTITY,
                ExtraFilter: `ID = '${linkedFileId}'`,
                ResultType: 'simple',
                MaxRows: 1,
              },
              params.contextUser,
            );
            if (!linkedFileRes?.Success || !linkedFileRes.Results?.[0]) {
              throw new Error(`File ${linkedFileId} for Artifact Version ${validArtifactVersionId} was not found or access is denied.`);
            }
            fileRow = linkedFileRes.Results[0];
          }

          const verCheck = ValidateAuthoritativeArtifactVersionRecord(versionRow, {
            targetEntityName: validFileId ? 'MJ: Files' : 'MJ: Artifacts',
            targetRecordUuid: validFileId ?? versionRow.ArtifactID,
            expectedFileId: validFileId,
            expectedKind: raw.kind,
            linkedFileRow: fileRow,
          });
          if (!verCheck.valid) {
            throw new Error(`attachments[${idx}]: ${verCheck.error ?? 'Invalid Artifact Version target.'}`);
          }

          effectiveFileName = verCheck.fileName ?? effectiveFileName;
          effectiveMimeType = verCheck.mimeType ?? effectiveMimeType;
          effectiveSizeBytes = verCheck.sizeBytes ?? effectiveSizeBytes;
          effectiveUrl = verCheck.url ?? '';
        } else if (validFileId) {
          let companionVer: MJArtifactVersionRow | null = null;
          if (fileRow!.ContentSizeBytes == null && fileRow!.Size == null) {
            const compRes = await rv.RunView<MJArtifactVersionRow>(
              {
                EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
                ExtraFilter: `FileID = '${validFileId}'`,
                Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
                OrderBy: 'VersionNumber DESC',
                ResultType: 'simple',
                MaxRows: 1,
              },
              params.contextUser,
            );
            if (!compRes?.Success) {
              throw new Error(`Unable to verify metadata versions for File ${validFileId}: ${compRes?.ErrorMessage ?? 'query failed'}.`);
            }
            companionVer = compRes.Results?.[0] ?? null;
          }
          const fileCheck = ValidateAuthoritativeFileRecord(fileRow!, raw.kind, companionVer);
          if (!fileCheck.valid) {
            throw new Error(`attachments[${idx}]: ${fileCheck.error ?? 'Invalid MJ: Files target.'}`);
          }
          effectiveFileName = fileCheck.fileName ?? effectiveFileName;
          effectiveMimeType = fileCheck.mimeType ?? effectiveMimeType;
          effectiveSizeBytes = fileCheck.sizeBytes ?? effectiveSizeBytes;
          effectiveUrl = fileCheck.url ?? '';
        } else {
          const persistedUrl = SanitizePersistedAttachmentUrl(raw.url ?? null, raw.kind);
          if (!persistedUrl) {
            throw new Error(
              `attachments[${idx}]: Newly uploaded file attachment requires a safe, durable data: or http(s): URL.`,
            );
          }
          effectiveUrl = persistedUrl;
          if (existingSpaceItemId) {
            throw new Error(
              `attachments[${idx}]: existingSpaceItemId cannot be paired with an unpersisted file upload lacking fileId and artifactVersionId.`,
            );
          }
          resolvedArtifactTypeId = await this.resolveArtifactTypeIdForKind(
            rv,
            raw.kind,
            effectiveMimeType,
            params.contextUser,
          );
          needsCreateArtifact = true;
        }

        const featureInLibrary =
          raw.featureInLibrary ?? ResolveDefaultFeatureInLibrary(raw.kind, params.entryType);
        const folder = ResolveAttachmentSpaceItemFolder(featureInLibrary);

        prepared.push({
          kind: raw.kind,
          fileId: validFileId,
          fileName: effectiveFileName,
          mimeType: effectiveMimeType,
          sizeBytes: effectiveSizeBytes,
          url: effectiveUrl,
          posterUrl: validation.sanitizedPosterUrl ?? null,
          durationSeconds: raw.durationSeconds ?? null,
          artifactId: resolvedArtifactId,
          artifactVersionId: validArtifactVersionId,
          artifactTypeId: resolvedArtifactTypeId,
          needsCreateArtifact,
          artifactsEntityId,
          targetEntityId: validFileId ? filesEntityId : artifactsEntityId,
          targetRecordId: validFileId ?? resolvedArtifactId ?? '',
          existingSpaceItemId,
          folder,
          featureInLibrary,
          band: resolvedBand,
          caption,
          sequence,
        });
      }
    }

    // Re-verify combined post count & aggregate byte limits using authoritative sizes for BOTH artifacts and files
    const preparedSizeEntries: Array<{ sizeBytes: number }> = prepared.map((item) => ({
      sizeBytes: item.sizeBytes,
    }));
    const authoritativeBatchCheck = ValidateAttachmentBatchLimits(
      [...params.existingSizeEntries, ...preparedSizeEntries],
      {
        maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
        maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
        maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
      },
    );
    if (!authoritativeBatchCheck.valid) {
      throw new Error(authoritativeBatchCheck.errors.join(' '));
    }

    return prepared;
  }

  private async resolveArtifactTypeIdForKind(
    rv: Pick<RunView, 'RunView'>,
    kind: 'image' | 'video' | 'audio' | 'file',
    mimeType: string,
    contextUser: UserInfo,
  ): Promise<string> {
    const resolved = await this.tryResolveArtifactTypeIdForKind(rv, kind, mimeType, contextUser);
    if (!resolved) {
      throw new Error(
        `No enabled MJ: Artifact Types record was found to durably store "${kind}" (${mimeType}) attachment.`,
      );
    }
    return resolved;
  }

  private async tryResolveArtifactTypeIdForKind(
    rv: Pick<RunView, 'RunView'>,
    kind: 'image' | 'video' | 'audio' | 'file',
    mimeType: string,
    contextUser: UserInfo,
  ): Promise<string | null> {
    const res = await rv.RunView<MJArtifactTypeRow>(
      {
        EntityName: MJ_ARTIFACT_TYPES_ENTITY,
        ExtraFilter: 'IsEnabled = 1',
        Fields: ['ID', 'Name', 'ContentType', 'IsEnabled'],
        ResultType: 'simple',
        MaxRows: 100,
      },
      contextUser,
    );
    const rows = res?.Success ? res.Results ?? [] : [];
    if (rows.length === 0) {
      return null;
    }

    const normalizedMime = NormalizeAttachmentMimeType(mimeType);
    const exactMime = rows.find(
      (r) => r.ContentType && NormalizeAttachmentMimeType(r.ContentType) === normalizedMime,
    );
    if (exactMime) return exactMime.ID;

    const preferredNamesByKind: Record<'image' | 'video' | 'audio' | 'file', string[]> = {
      image: ['image'],
      video: ['video', 'video production'],
      audio: ['audio'],
      file: ['generic binary', 'file', 'document'],
    };
    const preferredNames = preferredNamesByKind[kind];
    for (const targetName of preferredNames) {
      const byName = rows.find((r) => r.Name.trim().toLowerCase() === targetName);
      if (byName) return byName.ID;
    }

    const wildcardMime = rows.find(
      (r) => r.ContentType && r.ContentType.trim().toLowerCase() === `${kind}/*`,
    );
    if (wildcardMime) return wildcardMime.ID;

    const genericBinary = rows.find((r) => r.Name.trim().toLowerCase() === 'generic binary');
    return genericBinary?.ID ?? rows[0].ID;
  }

  private async resolveEntityId(md: Metadata, entityName: string, contextUser: UserInfo): Promise<string> {
    if (typeof md.EntityByName === 'function') {
      const entityInfo = md.EntityByName(entityName);
      if (entityInfo?.ID) {
        return entityInfo.ID;
      }
    }
    const res = await new RunView().RunView<MJEntityRow>(
      {
        EntityName: MJ_ENTITIES_ENTITY,
        ExtraFilter: `Name = '${EscapeSqlLiteral(entityName)}'`,
        Fields: ['ID', 'Name'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      contextUser,
    );
    const id = res?.Success ? res.Results?.[0]?.ID : null;
    if (!id) {
      throw new Error(`Required entity metadata "${entityName}" could not be resolved.`);
    }
    return id;
  }

  private async loadSpaceItemsMap(
    spaceItemIds: ReadonlyArray<string>,
    expectedSpaceId: string,
    canSeeTeamBand: boolean,
    contextUser: UserInfo,
  ): Promise<Map<string, CollaborationSpaceItemRow>> {
    const map = new Map<string, CollaborationSpaceItemRow>();
    if (spaceItemIds.length === 0) {
      return map;
    }
    const rv = new RunView();
    const res = await rv.RunView<CollaborationSpaceItemRow>(
      {
        EntityName: COLLABORATION_SPACE_ITEMS_ENTITY,
        ExtraFilter: `ID IN (${buildSqlInUuidList(spaceItemIds, 'spaceItemIds')})`,
        Fields: ['ID', 'SpaceID', 'EntityID', 'RecordID', 'Band', 'Folder', 'ArtifactVersionID', '__mj_CreatedAt'],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      contextUser,
    );
    if (!res?.Success) {
      throw new Error(`Unable to load SpaceItems: ${res?.ErrorMessage ?? 'query failed'}.`);
    }
    for (const si of res.Results ?? []) {
      if (!UUIDsEqual(si.SpaceID, expectedSpaceId)) {
        continue;
      }
      if (!canSeeTeamBand && si.Band === 'Team') {
        continue;
      }
      map.set(si.ID.toLowerCase(), si);
    }
    return map;
  }

  private async hydrateAttachmentItems(params: {
    attachments: ReadonlyArray<ForumPostAttachmentRow>;
    spaceItemsMap: Map<string, CollaborationSpaceItemRow>;
    postMap: Map<string, ForumPostRow>;
    forumMap: Map<string, ForumRow>;
    contextUser: UserInfo;
  }): Promise<CommunityAttachmentItem[]> {
    const md = new Metadata();
    const rv = new RunView();

    const artifactsEntityId = await this.tryResolveEntityId(md, MJ_ARTIFACTS_ENTITY, params.contextUser);
    const artifactVersionIds = new Set<string>();
    const artifactIds = new Set<string>();
    const fileIds = new Set<string>();

    for (const att of params.attachments) {
      const si = params.spaceItemsMap.get(att.SpaceItemID.toLowerCase());
      if (!si) continue;
      if (si.ArtifactVersionID) {
        artifactVersionIds.add(si.ArtifactVersionID);
      }
      const recordUuid = extractRecordUuid(si.RecordID);
      if (recordUuid) {
        if (artifactsEntityId && UUIDsEqual(si.EntityID, artifactsEntityId)) {
          artifactIds.add(recordUuid);
        } else {
          fileIds.add(recordUuid);
        }
      }
    }

    const versionMap = new Map<string, MJArtifactVersionRow>();
    if (artifactVersionIds.size > 0) {
      const verRes = await rv.RunView<MJArtifactVersionRow>(
        {
          EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
          ExtraFilter: `ID IN (${buildSqlInUuidList(Array.from(artifactVersionIds), 'artifactVersionIds')})`,
          Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        params.contextUser,
      );
      if (verRes?.Success) {
        for (const v of verRes.Results ?? []) {
          versionMap.set(v.ID.toLowerCase(), v);
          artifactIds.add(v.ArtifactID);
          if (v.FileID) {
            fileIds.add(v.FileID);
          }
        }
      }
    }

    const artifactMap = new Map<string, MJArtifactRow>();
    if (artifactIds.size > 0) {
      const artRes = await rv.RunView<MJArtifactRow>(
        {
          EntityName: MJ_ARTIFACTS_ENTITY,
          ExtraFilter: `ID IN (${buildSqlInUuidList(Array.from(artifactIds), 'artifactIds')})`,
          Fields: ['ID', 'Name', 'TypeID', 'Type'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        params.contextUser,
      );
      if (artRes?.Success) {
        for (const a of artRes.Results ?? []) {
          artifactMap.set(a.ID.toLowerCase(), a);
        }
      }
    }

    const fileMap = new Map<string, MJFileRow>();
    if (fileIds.size > 0) {
      const fileRes = await rv.RunView<MJFileRow>(
        {
          EntityName: MJ_FILES_ENTITY,
          ExtraFilter: `ID IN (${buildSqlInUuidList(Array.from(fileIds), 'fileIds')})`,
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        params.contextUser,
      );
      if (fileRes?.Success) {
        for (const f of fileRes.Results ?? []) {
          fileMap.set(f.ID.toLowerCase(), f);
        }
      }
    }

    const companionVersionByFileId = new Map<string, MJArtifactVersionRow>();
    if (fileIds.size > 0) {
      const compRes = await rv.RunView<MJArtifactVersionRow>(
        {
          EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
          ExtraFilter: `FileID IN (${buildSqlInUuidList(Array.from(fileIds), 'companionFileIds')})`,
          Fields: ['ID', 'ArtifactID', 'VersionNumber', 'Name', 'ContentMode', 'Content', 'FileID', 'FileName', 'MimeType', 'ContentSizeBytes'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        params.contextUser,
      );
      if (compRes?.Success) {
        for (const v of compRes.Results ?? []) {
          if (!v.FileID) continue;
          const key = v.FileID.toLowerCase();
          const existing = companionVersionByFileId.get(key);
          if (!existing || (v.VersionNumber ?? 0) > (existing.VersionNumber ?? 0)) {
            companionVersionByFileId.set(key, v);
          }
        }
      }
    }

    const postIds = Array.from(new Set(params.attachments.map((a) => a.PostID)));
    const artifactPostMap = new Map<string, ForumArtifactPostRow>();
    if (postIds.length > 0) {
      const apRes = await rv.RunView<ForumArtifactPostRow>(
        {
          EntityName: COMMUNITY_ENTITY_NAMES.ForumArtifactPosts,
          ExtraFilter: `ID IN (${buildSqlInUuidList(postIds, 'artifactPostIds')})`,
          Fields: ['ID', 'ArtifactID', 'PinnedArtifactVersionID', 'SpaceItemID', 'ArtifactModality', 'CollaborationMode', 'ShowInlinePreview'],
          ResultType: 'simple',
          MaxRows: MAX_ATTACHMENTS_SCAN,
        },
        params.contextUser,
      );
      if (apRes?.Success) {
        for (const ap of apRes.Results ?? []) {
          artifactPostMap.set(ap.SpaceItemID.toLowerCase(), ap);
        }
      }
    }

    const results: CommunityAttachmentItem[] = [];
    for (const att of params.attachments) {
      const si = params.spaceItemsMap.get(att.SpaceItemID.toLowerCase());
      const post = params.postMap.get(att.PostID.toLowerCase());
      if (!si || !post) {
        continue;
      }
      const forum = params.forumMap.get(post.ForumID.toLowerCase());
      const version = si.ArtifactVersionID ? versionMap.get(si.ArtifactVersionID.toLowerCase()) ?? null : null;
      const recordUuid = extractRecordUuid(si.RecordID);
      const isDirectArtifact = Boolean(artifactsEntityId && UUIDsEqual(si.EntityID, artifactsEntityId));
      const isFileBackedVersion = Boolean(version && version.ContentMode === 'File');
      const linkedArtifactPost = artifactPostMap.get(si.ID.toLowerCase()) ?? null;
      const resolvedArtifactId =
        linkedArtifactPost?.ArtifactID ??
        (!isFileBackedVersion && isDirectArtifact ? recordUuid : null) ??
        (version && version.ContentMode !== 'File' ? version.ArtifactID : null);

      const featureInLibrary = IsFeaturedLibraryFolder(si.Folder);
      const createdAt = att.__mj_CreatedAt ?? si.__mj_CreatedAt ?? post.__mj_CreatedAt ?? null;

      if (resolvedArtifactId) {
        const artifact = artifactMap.get(resolvedArtifactId.toLowerCase()) ?? null;
        const item: CommunityArtifactAttachmentItem = {
          id: att.ID,
          kind: 'artifact',
          spaceId: si.SpaceID,
          postId: post.ID,
          spaceItemId: si.ID,
          forumPostAttachmentId: att.ID,
          artifactId: resolvedArtifactId,
          artifactVersionId: linkedArtifactPost?.PinnedArtifactVersionID ?? version?.ID ?? si.ArtifactVersionID,
          artifactTypeName: artifact?.Type?.trim() || 'Artifact',
          artifactName: artifact?.Name || version?.Name || att.Caption || 'Untitled Artifact',
          previewContent: version?.Content ?? null,
          contentType: version?.MimeType ?? null,
          versionNumber: version?.VersionNumber ?? null,
          modality: linkedArtifactPost?.ArtifactModality ?? null,
          collaborationMode: linkedArtifactPost?.CollaborationMode ?? null,
          showInlinePreview: linkedArtifactPost?.ShowInlinePreview ?? true,
          caption: att.Caption,
          sequence: att.Sequence,
          featureInLibrary,
          folder: si.Folder,
          band: si.Band,
          authorUserId: post.AuthorUserID,
          authorName: post.AuthorUser ?? null,
          createdAt,
          postTitle: post.Title,
          forumId: forum?.ID ?? post.ForumID,
          forumName: forum?.Name ?? null,
        };
        results.push(item);
        continue;
      }

      const fileId = version?.FileID ?? (isDirectArtifact ? null : recordUuid);
      const companionVer = fileId ? companionVersionByFileId.get(fileId.toLowerCase()) ?? null : null;
      const artifactId = version?.ArtifactID ?? companionVer?.ArtifactID ?? (isDirectArtifact ? recordUuid : null);
      const fileRow = fileId ? fileMap.get(fileId.toLowerCase()) ?? null : null;
      const fileName = version?.FileName || fileRow?.Name || companionVer?.FileName || att.Caption || 'attachment';
      const mimeType = NormalizeAttachmentMimeType(
        version?.MimeType || fileRow?.ContentType || companionVer?.MimeType || 'application/octet-stream',
      );
      const kind = ClassifyAttachmentKind(mimeType, false);
      const normalizedKind = kind === 'artifact' ? 'file' : kind;
      const rawContentOrFileUrl =
        version?.Content ??
        (fileRow ? ResolveAuthoritativeFileUrl(fileRow, normalizedKind) : null) ??
        companionVer?.Content ??
        null;
      const safeUrl =
        SanitizePersistedAttachmentUrl(
          rawContentOrFileUrl,
          normalizedKind,
        ) ?? '';
      const resolvedSizeBytes =
        version?.ContentSizeBytes ??
        ComputeAttachmentContentByteLength(version?.Content, version?.ContentMode) ??
        fileRow?.ContentSizeBytes ??
        fileRow?.Size ??
        companionVer?.ContentSizeBytes ??
        ComputeAttachmentContentByteLength(companionVer?.Content, companionVer?.ContentMode) ??
        0;

      const item: CommunityFileAttachmentItem = {
        id: att.ID,
        kind: normalizedKind,
        spaceId: si.SpaceID,
        postId: post.ID,
        spaceItemId: si.ID,
        forumPostAttachmentId: att.ID,
        fileId,
        fileName,
        mimeType,
        sizeBytes: resolvedSizeBytes,
        url: safeUrl,
        artifactId,
        artifactVersionId: version?.ID ?? si.ArtifactVersionID ?? companionVer?.ID ?? null,
        caption: att.Caption,
        sequence: att.Sequence,
        featureInLibrary,
        folder: si.Folder,
        band: si.Band,
        authorUserId: post.AuthorUserID,
        authorName: post.AuthorUser ?? null,
        createdAt,
        postTitle: post.Title,
        forumId: forum?.ID ?? post.ForumID,
        forumName: forum?.Name ?? null,
      };
      results.push(item);
    }

    return results;
  }

  private async tryResolveEntityId(
    md: Metadata,
    entityName: string,
    contextUser: UserInfo,
  ): Promise<string | null> {
    try {
      return await this.resolveEntityId(md, entityName, contextUser);
    } catch {
      return null;
    }
  }
}
