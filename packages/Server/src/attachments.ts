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
  EscapeSqlLiteral,
  IsFeaturedLibraryFolder,
  NormalizeAttachmentMimeType,
  ResolveAttachmentSpaceItemFolder,
  ResolveDefaultFeatureInLibrary,
  SanitizeCommunityAttachmentUrl,
  ValidateAttachmentBatchLimits,
  ValidateCommunityAttachmentInput,
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

interface MJArtifactVersionRow {
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

interface MJFileRow {
  ID: string;
  Name: string;
  ContentType: string | null;
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
  /** When true, deletes an existingSpaceItemId during rollback if ForumPostAttachment persistence fails. */
  cleanupSpaceItemOnFailure?: boolean;
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

    const incomingSizeEntries: Array<{ sizeBytes?: number | null }> = params.attachments.map((item) => ({
      sizeBytes: item.kind === 'artifact' ? null : item.sizeBytes,
    }));
    const existingSizeEntries = await this.resolveExistingAttachmentSizes(existingAttachments, params.contextUser);
    const batchCheck = ValidateAttachmentBatchLimits(
      [...existingSizeEntries, ...incomingSizeEntries],
      {
        maxFileBytes: COMMUNITY_ATTACHMENT_MAX_FILE_BYTES,
        maxCountPerPost: COMMUNITY_ATTACHMENT_MAX_COUNT_PER_POST,
        maxAggregateBytesPerPost: COMMUNITY_ATTACHMENT_MAX_AGGREGATE_BYTES_PER_POST,
      },
    );
    if (!batchCheck.valid) {
      throw new Error(batchCheck.errors.join(' '));
    }

    // Validate every attachment and verify ContextUser-scoped target access BEFORE writing any record
    const preparedItems = await this.validateAndPrepareAttachments({
      attachments: params.attachments,
      post,
      forum,
      spaceAccess,
      entryType: params.entryType ?? (post.ParentPostID ? 'reply' : 'post'),
      existingCount,
      md,
      contextUser: params.contextUser,
    });

    const createdForRollback: Array<{ Delete?: () => Promise<boolean> }> = [];
    const persistedResults: CommunityAttachmentItem[] = [];

    try {
      for (const prepared of preparedItems) {
        let spaceItem: CollaborationSpaceItemEntityView | null = null;
        let createdNewSpaceItem = false;

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
          spaceItem.Folder = prepared.folder;
          spaceItem.Band = prepared.band;
          if (prepared.band === 'Shared') {
            spaceItem.PromotedAt = spaceItem.PromotedAt ?? new Date();
            spaceItem.PromotedByUserID = spaceItem.PromotedByUserID ?? validUserId;
          }
          await SaveOrThrow(spaceItem, `Failed to update SpaceItem ${spaceItem.ID} for post attachment.`);
          if (params.cleanupSpaceItemOnFailure) {
            createdForRollback.push(spaceItem);
          }
        } else {
          spaceItem = await md.GetEntityObject<CollaborationSpaceItemEntityView>(
            COLLABORATION_SPACE_ITEMS_ENTITY,
            params.contextUser,
          );
          if (!spaceItem) {
            throw new Error('Failed to instantiate Collaboration SpaceItem entity.');
          }
          spaceItem.SpaceID = forum.SpaceID;
          spaceItem.EntityID = prepared.targetEntityId;
          spaceItem.RecordID = `ID|${prepared.targetRecordId}`;
          spaceItem.Band = prepared.band;
          spaceItem.PromotedAt = prepared.band === 'Shared' ? new Date() : null;
          spaceItem.PromotedByUserID = prepared.band === 'Shared' ? validUserId : null;
          spaceItem.Folder = prepared.folder;
          spaceItem.ArtifactVersionID = prepared.artifactVersionId;
          await SaveOrThrow(spaceItem, `Failed to persist SpaceItem in Space ${forum.SpaceID}.`);
          createdNewSpaceItem = true;
          createdForRollback.push(spaceItem);
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
        createdForRollback.push(postAttachment);

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
          artifactPost.ID = post.ID;
          artifactPost.ArtifactID = prepared.artifactId;
          artifactPost.PinnedArtifactVersionID = prepared.artifactVersionId;
          artifactPost.SpaceItemID = spaceItem.ID;
          artifactPost.ArtifactModality = prepared.modality;
          artifactPost.CollaborationMode = prepared.collaborationMode;
          artifactPost.ShowInlinePreview = prepared.showInlinePreview;
          await SaveOrThrow(artifactPost, `Failed to persist ForumArtifactPost for Post ${post.ID}.`);
          if (isNewArtifactPost) {
            createdForRollback.push(artifactPost);
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
            artifactVersionId: prepared.artifactVersionId,
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
            band: prepared.band,
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
            artifactVersionId: prepared.artifactVersionId,
            caption: prepared.caption,
            sequence: prepared.sequence,
            featureInLibrary: prepared.featureInLibrary,
            folder: prepared.folder,
            band: prepared.band,
            authorUserId: post.AuthorUserID,
            authorName: post.AuthorUser ?? null,
            postTitle: post.Title,
            forumId: forum.ID,
            forumName: forum.Name,
          };
          persistedResults.push(fileItem);
        }

        void createdNewSpaceItem;
      }
    } catch (err) {
      for (const created of createdForRollback.reverse()) {
        if (typeof created.Delete === 'function') {
          try {
            await created.Delete();
          } catch {
            // Best-effort compensating rollback to avoid orphaned SpaceItem / attachment records
          }
        }
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

    let nextFeature = IsFeaturedLibraryFolder(spaceItem.Folder);
    if (params.featureInLibrary !== undefined) {
      nextFeature = params.featureInLibrary;
      spaceItem.Folder = ResolveAttachmentSpaceItemFolder(nextFeature);
      await SaveOrThrow(spaceItem, `Failed to update SpaceItem ${spaceItem.ID} folder.`);
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
  ): Promise<Array<{ sizeBytes?: number | null }>> {
    if (existingAttachments.length === 0) {
      return [];
    }
    const rv = new RunView();
    const spaceItemIds = Array.from(new Set(existingAttachments.map((a) => a.SpaceItemID)));
    const siRes = await rv.RunView<Pick<CollaborationSpaceItemRow, 'ID' | 'ArtifactVersionID'>>(
      {
        EntityName: COLLABORATION_SPACE_ITEMS_ENTITY,
        ExtraFilter: `ID IN (${buildSqlInUuidList(spaceItemIds, 'existingSpaceItemIds')})`,
        Fields: ['ID', 'ArtifactVersionID'],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      contextUser,
    );
    if (!siRes?.Success) {
      throw new Error(`Unable to resolve existing SpaceItems for attachment size checks: ${siRes?.ErrorMessage ?? 'query failed'}.`);
    }

    const versionIds = Array.from(
      new Set(
        (siRes.Results ?? [])
          .map((si) => si.ArtifactVersionID)
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0),
      ),
    );
    if (versionIds.length === 0) {
      return existingAttachments.map((): { sizeBytes?: number | null } => ({ sizeBytes: null }));
    }

    const verRes = await rv.RunView<Pick<MJArtifactVersionRow, 'ID' | 'ContentSizeBytes'>>(
      {
        EntityName: MJ_ARTIFACT_VERSIONS_ENTITY,
        ExtraFilter: `ID IN (${buildSqlInUuidList(versionIds, 'existingArtifactVersionIds')})`,
        Fields: ['ID', 'ContentSizeBytes'],
        ResultType: 'simple',
        MaxRows: MAX_ATTACHMENTS_SCAN,
      },
      contextUser,
    );
    const sizeByVersion = new Map<string, number | null>();
    for (const v of verRes?.Success ? verRes.Results ?? [] : []) {
      sizeByVersion.set(v.ID.toLowerCase(), v.ContentSizeBytes);
    }

    const sizeBySpaceItem = new Map<string, number | null>();
    for (const si of siRes.Results ?? []) {
      const sz = si.ArtifactVersionID ? sizeByVersion.get(si.ArtifactVersionID.toLowerCase()) ?? null : null;
      sizeBySpaceItem.set(si.ID.toLowerCase(), sz);
    }

    return existingAttachments.map((a) => ({
      sizeBytes: sizeBySpaceItem.get(a.SpaceItemID.toLowerCase()) ?? null,
    }));
  }

  private async validateAndPrepareAttachments(params: {
    attachments: ReadonlyArray<PersistCommunityAttachmentInput>;
    post: ForumPostRow;
    forum: ForumRow;
    spaceAccess: SpaceAccessResolution;
    entryType: CommunityAttachmentEntryType;
    existingCount: number;
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
          artifactVersionId: string | null;
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
          artifactVersionId: string | null;
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
          if (latestRes?.Success && latestRes.Results?.[0]) {
            versionRow = latestRes.Results[0];
          }
        }

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
          artifactVersionId: versionRow?.ID ?? null,
          artifactName,
          artifactTypeName: raw.artifactTypeName?.trim() || artifactRow.Type?.trim() || 'Artifact',
          previewContent: versionRow?.Content ?? null,
          contentType: versionRow?.MimeType ?? null,
          versionNumber: versionRow?.VersionNumber ?? null,
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
        if (validFileId) {
          const fileRes = await rv.RunView<MJFileRow>(
            {
              EntityName: MJ_FILES_ENTITY,
              ExtraFilter: `ID = '${validFileId}'`,
              Fields: ['ID', 'Name', 'ContentType'],
              ResultType: 'simple',
              MaxRows: 1,
            },
            params.contextUser,
          );
          if (!fileRes?.Success || !fileRes.Results?.[0]) {
            throw new Error(`File ${validFileId} was not found or caller lacks read access.`);
          }
        }

        const validArtifactVersionId = raw.artifactVersionId
          ? AssertValidUUID(raw.artifactVersionId, `attachments[${idx}].artifactVersionId`)
          : null;

        if (!validFileId && !validation.sanitizedUrl) {
          throw new Error(`attachments[${idx}]: File/media attachment requires either a valid fileId or a safe URL.`);
        }

        const featureInLibrary =
          raw.featureInLibrary ?? ResolveDefaultFeatureInLibrary(raw.kind, params.entryType);
        const folder = ResolveAttachmentSpaceItemFolder(featureInLibrary);

        prepared.push({
          kind: raw.kind,
          fileId: validFileId,
          fileName: raw.fileName.trim(),
          mimeType: validation.normalizedMimeType ?? NormalizeAttachmentMimeType(raw.mimeType),
          sizeBytes: raw.sizeBytes,
          url: validation.sanitizedUrl ?? '',
          posterUrl: validation.sanitizedPosterUrl ?? null,
          durationSeconds: raw.durationSeconds ?? null,
          artifactVersionId: validArtifactVersionId,
          targetEntityId: filesEntityId,
          targetRecordId: validFileId ?? params.post.ID,
          existingSpaceItemId,
          folder,
          featureInLibrary,
          band: resolvedBand,
          caption,
          sequence,
        });
      }
    }

    return prepared;
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
          Fields: ['ID', 'Name', 'ContentType'],
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
      const linkedArtifactPost = artifactPostMap.get(si.ID.toLowerCase()) ?? null;
      const resolvedArtifactId =
        linkedArtifactPost?.ArtifactID ??
        (isDirectArtifact ? recordUuid : null) ??
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

      const fileId = version?.FileID ?? recordUuid;
      const fileRow = fileId ? fileMap.get(fileId.toLowerCase()) ?? null : null;
      const fileName = version?.FileName || fileRow?.Name || att.Caption || 'attachment';
      const mimeType = NormalizeAttachmentMimeType(version?.MimeType || fileRow?.ContentType || 'application/octet-stream');
      const kind = ClassifyAttachmentKind(mimeType, false);
      const safeUrl = SanitizeCommunityAttachmentUrl(
        version?.Content ?? null,
        kind === 'artifact' ? 'file' : kind,
      ) ?? '';

      const item: CommunityFileAttachmentItem = {
        id: att.ID,
        kind: kind === 'artifact' ? 'file' : kind,
        spaceId: si.SpaceID,
        postId: post.ID,
        spaceItemId: si.ID,
        forumPostAttachmentId: att.ID,
        fileId,
        fileName,
        mimeType,
        sizeBytes: version?.ContentSizeBytes ?? 0,
        url: safeUrl,
        artifactVersionId: si.ArtifactVersionID,
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
