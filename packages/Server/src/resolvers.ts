import { randomUUID } from 'node:crypto';
import { BaseEntity, CompositeKey, Metadata, RunView, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import type { MJTaskEntity } from '@memberjunction/core-entities';
import { AssertValidUUID, AssertValidUUIDList, CommunityRules, EscapeSqlLiteral, type AnonymousReadMode } from '@mj-biz-apps/community-core';
import type { ThreadGraduationRequest, ThreadGraduationResult } from '@mj-biz-apps/community-actions';
import {
  COMMUNITY_ENTITY_NAMES,
  type IForumPostSummary,
  type IForumSummary,
  type mjBizAppsCommunityForumAnswerPostEntity,
  type mjBizAppsCommunityForumEntity,
  type mjBizAppsCommunityForumMemberEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumQuestionPostEntity,
  type mjBizAppsCommunityForumRoleTypeEntity,
} from '@mj-biz-apps/community-entities';

/**
 * Minimal structural views of `MJ_BizApps_Collaboration: Spaces` / `Space Members`, deliberately
 * NOT importing the real `mjBizAppsCollaborationSpaceEntity`/`mjBizAppsCollaborationSpaceMemberEntity`
 * classes from `@mj-biz-apps/collaboration-entities`: that sibling package is built against its own
 * checkout of `@memberjunction/core`, and in CI (a fresh `pnpm install` resolving published
 * versions, not this monorepo's live sibling checkouts) its generated entity classes have failed
 * to structurally satisfy `GetEntityObject<T extends BaseEntity>`'s constraint even though the
 * version strings match — a cross-package type-identity issue, not a schema one. `Metadata.
 * GetEntityObject` resolves the ACTUAL runtime class purely from the entity NAME string via
 * MJGlobal's ClassFactory; the generic type parameter is a compile-time view only, so a minimal
 * interface naming just the fields this file actually sets is both safe and accurate.
 */
interface CollaborationSpaceEntityView extends BaseEntity {
  ID: string;
  SpaceTypeID: string;
  ParentID: string | null;
  Name: string;
  OwnerID: string;
  InheritsMembership: boolean;
  AgentRetrieval: 'ExcludedEntirely' | 'ExcludedFromParentScope' | 'Included';
  StartedAt: Date | null;
}

interface CollaborationSpaceMemberEntityView extends BaseEntity {
  SpaceID: string;
  UserID: string;
  SpaceRoleTypeID: string;
  Band: 'Shared' | 'Team';
  Status: 'Active' | 'Invited' | 'Removed';
}

/** Awaits `entity.Save()` and throws `message` if it returns `false` — MJ's documented signal for a failed save (validation/trigger rejection), never a thrown exception on its own. */
export async function SaveOrThrow(entity: { Save(): Promise<boolean> }, message: string): Promise<void> {
  const saved = await entity.Save();
  if (!saved) {
    throw new Error(message);
  }
}

export interface PublicCommunityThreadProjection {
  postId: string;
  forumSlug: string;
  title: string;
  isTeaser: boolean;
  contentMarkdown: string;
  replyCount: number;
  reactionScore: number;
}

/**
 * Unauthenticated / Public Edge projection service.
 * Enforces `AnonymousReadMode` (`None`, `Teaser Only`, `Full Read`) and strips `Team`-band posts.
 */
export class CommunityPublicEdgeService {
  public ProjectPublicThreadList(params: {
    spaceVisibility: 'Private' | 'Listed' | 'Open';
    spaceAnonymousReadMode: AnonymousReadMode;
    forum: Pick<IForumSummary, 'Slug' | 'VisibilityBand' | 'AnonymousReadMode'>;
    posts: ReadonlyArray<IForumPostSummary>;
    teaserMaxChars?: number;
  }): PublicCommunityThreadProjection[] {
    const output: PublicCommunityThreadProjection[] = [];
    for (const post of params.posts) {
      if (post.RootPostID !== null || post.Status === 'Draft' || post.Status === 'PendingModeration') {
        continue;
      }
      const redacted = CommunityRules.RedactForAnonymousEdge({
        spaceVisibility: params.spaceVisibility,
        spaceAnonymousReadMode: params.spaceAnonymousReadMode,
        forumAnonymousReadMode: params.forum.AnonymousReadMode,
        forumVisibilityBand: params.forum.VisibilityBand,
        postVisibilityBand: post.VisibilityBand,
        bodyMarkdown: post.SummaryMarkdown ?? post.BodyMarkdown,
        teaserMaxChars: params.teaserMaxChars,
      });

      if (redacted.visible) {
        output.push({
          postId: post.ID,
          forumSlug: params.forum.Slug,
          title: post.Title ?? 'Untitled Thread',
          isTeaser: redacted.isTeaser,
          contentMarkdown: redacted.contentMarkdown,
          replyCount: post.ReplyCount,
          reactionScore: post.ReactionScore,
        });
      }
    }
    return output;
  }
}

export interface CanonPromotionRequest {
  questionPostId: string;
  canonAnswerPostId: string;
}

export interface CanonPromotionResult {
  questionPostId: string;
  canonAnswerPostId: string;
  /** True when this promotion was already in effect (ForumQuestionPost.AICanonAnswerPostID already matched) — a no-op, not an error. */
  alreadyPromoted: boolean;
}

/**
 * Pure cross-reference check backing {@link ThreadGraduationService.ApplyCanonPromotion}: the
 * Answer Post must actually answer the requested Question (`ForumAnswerPost.QuestionPostID`, the
 * schema's direct FK for this — equivalent to, and more direct than, joining through the base
 * `ForumPost.RootPostID`), and both must live in the same Forum. Takes already-loaded field
 * values rather than entities so it is unit-testable without a database.
 */
export function ValidateCanonPromotionCrossReferences(params: {
  requestedQuestionPostId: string;
  answerQuestionPostId: string;
  questionForumId: string;
  answerForumId: string;
}): void {
  if (!UUIDsEqual(params.answerQuestionPostId, params.requestedQuestionPostId)) {
    throw new Error(
      `Answer Post answers Question ${params.answerQuestionPostId}, not the requested Question ${params.requestedQuestionPostId}.`,
    );
  }
  if (!UUIDsEqual(params.questionForumId, params.answerForumId)) {
    throw new Error('The Question Post and Answer Post must belong to the same Forum.');
  }
}

/**
 * Coordinates 1-click graduation of a high-momentum Community thread into a child Collaboration Space
 * of any allowed peer `SpaceType` (such as `working-group`, `cohort`, `project`, or governance spaces),
 * optional Task seeding on that space, and promotion of a Q&A answer into the forum's Knowledge Canon
 * (`ForumQuestionPost.AICanonAnswerPostID`). Every operation is idempotent: calling it again with the
 * thread/question already in its target state returns the existing outcome rather than erroring or
 * creating a duplicate Space/Task.
 */
export class ThreadGraduationService {
  /**
   * Validates and plans Space/Task graduation. `currentPromotedToSpaceId` is the root post's existing
   * `PromotedToSpaceID` (null if never graduated) — when already set, the plan is idempotent and
   * returns the EXISTING space without seeding a second Task or re-inviting participants.
   */
  public ValidateAndBuildGraduationPlan(params: {
    request: ThreadGraduationRequest;
    allowedChildSpaceTypeCodes: ReadonlyArray<string>;
    userCanPromoteToSpace: boolean;
    currentPromotedToSpaceId?: string | null;
  }): ThreadGraduationResult {
    if (!params.userCanPromoteToSpace) {
      throw new Error('Current member does not hold the CanPromoteToSpace capability in this forum.');
    }

    AssertValidUUID(params.request.rootPostId, 'rootPostId');
    const uniqueParticipantIds = DeduplicateUUIDsCaseInsensitive(params.request.includeParticipantUserIds);
    if (uniqueParticipantIds.length > 0) {
      AssertValidUUIDList(uniqueParticipantIds.join(','), 'includeParticipantUserIds');
    }
    if (params.currentPromotedToSpaceId) {
      AssertValidUUID(params.currentPromotedToSpaceId, 'currentPromotedToSpaceId');
    }

    const normalizedType = params.request.targetSpaceTypeCode.trim().toLowerCase();
    const allowedSet = new Set(params.allowedChildSpaceTypeCodes.map((code) => code.toLowerCase()));
    if (!allowedSet.has(normalizedType)) {
      throw new Error(
        `Target space type "${params.request.targetSpaceTypeCode}" is not in AllowedTypeCodes (${params.allowedChildSpaceTypeCodes.join(', ')}).`,
      );
    }

    if (params.currentPromotedToSpaceId) {
      return {
        promotedToSpaceId: params.currentPromotedToSpaceId,
        targetSpaceTypeCode: normalizedType,
        seededTaskId: null,
        invitedParticipantCount: 0,
      };
    }

    // Deterministic, genuinely-valid UUIDv4s — never a fabricated `graduated-<id>`/`task-<id>` string.
    // Actually creating the Space (`__mj_BizAppsCollaboration`) and Task (`__mj_BizAppsTasks`) rows that
    // these IDs are pre-assigned to is owned by the GraphQL resolver layer, which already orchestrates
    // both sibling schemas and the invite flow; this service only decides WHETHER graduation is allowed
    // and HANDS BACK the ID plan for the resolver to persist.
    return {
      promotedToSpaceId: randomUUID(),
      targetSpaceTypeCode: normalizedType,
      seededTaskId: params.request.seedInitialTaskTitle ? randomUUID() : null,
      invitedParticipantCount: uniqueParticipantIds.length,
    };
  }

  /**
   * Validates and plans promoting a Q&A answer into the forum's Knowledge Canon. Only the question's
   * author or a forum moderator may promote. `currentAICanonAnswerPostId` is the question's existing
   * `AICanonAnswerPostID` (null if none) — when it already equals `request.canonAnswerPostId`, the
   * promotion is idempotent and `alreadyPromoted` is `true`.
   */
  public ValidateAndBuildCanonPromotion(params: {
    request: CanonPromotionRequest;
    isQuestionAuthorOrModerator: boolean;
    currentAICanonAnswerPostId: string | null;
    /** Whether the ANSWER post already reflects the promotion (e.g. AIConfidenceScore already set).
     * `alreadyPromoted` requires BOTH this AND the question side to already match — a retry after a
     * partial failure (question saved, answer save failed) must still repair the answer side. */
    answerAlreadyReflectsPromotion: boolean;
  }): CanonPromotionResult {
    if (!params.isQuestionAuthorOrModerator) {
      throw new Error('Only the question author or a forum moderator may promote an answer to Knowledge Canon.');
    }

    AssertValidUUID(params.request.questionPostId, 'questionPostId');
    AssertValidUUID(params.request.canonAnswerPostId, 'canonAnswerPostId');
    if (params.currentAICanonAnswerPostId) {
      AssertValidUUID(params.currentAICanonAnswerPostId, 'currentAICanonAnswerPostId');
    }

    const questionAlreadyPromoted =
      params.currentAICanonAnswerPostId !== null &&
      UUIDsEqual(params.currentAICanonAnswerPostId, params.request.canonAnswerPostId);

    return {
      questionPostId: params.request.questionPostId,
      canonAnswerPostId: params.request.canonAnswerPostId,
      alreadyPromoted: questionAlreadyPromoted && params.answerAlreadyReflectsPromotion,
    };
  }

  /**
   * Loads the AUTHORITATIVE Question Post, Answer Post, and both posts' parent Forum Post rows
   * (never trusting a caller-supplied `isQuestionAuthorOrModerator`/`currentAICanonAnswerPostId`),
   * verifies the answer actually answers the question and both share a Forum
   * ({@link ValidateCanonPromotionCrossReferences}), derives author-or-moderator capability from
   * `contextUser` ({@link ResolveForumModeratorCapability}), and only then calls
   * {@link ValidateAndBuildCanonPromotion}. The question side (`AcceptedAnswerPostID` +
   * `AICanonAnswerPostID`) and the answer side (`AIEpistemicStatus = 'Canon Verified'`) are saved
   * INDEPENDENTLY, each skipped only when that specific record already reflects the promotion —
   * so a retry after a partial failure (e.g. the question saved but the answer save threw) still
   * repairs whichever side didn't make it, rather than being short-circuited by the other side's
   * already-applied state. If `AcceptedAnswerPostID` is changing to a DIFFERENT answer than
   * before, the previously accepted answer's `IsAcceptedByAuthor` is cleared. This schema has no
   * dedicated `VerificationStatus` column; `AIEpistemicStatus = 'Canon Verified'` is its real,
   * already-shipped equivalent of "marking an answer Canon" (not a human-moderator field — see
   * `EpistemicAnswerGradingAction`, which likewise never sets `IsVerifiedByModerator`). Throws if
   * any `.Save()` call returns `false`.
   */
  public async ApplyCanonPromotion(params: { request: CanonPromotionRequest; contextUser: UserInfo }): Promise<CanonPromotionResult> {
    AssertValidUUID(params.request.questionPostId, 'questionPostId');
    AssertValidUUID(params.request.canonAnswerPostId, 'canonAnswerPostId');

    const md = new Metadata();
    const question = await md.GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
      CompositeKey.FromID(params.request.questionPostId),
      params.contextUser,
    );
    const answer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
      CompositeKey.FromID(params.request.canonAnswerPostId),
      params.contextUser,
    );
    const questionPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.questionPostId),
      params.contextUser,
    );
    const answerPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.canonAnswerPostId),
      params.contextUser,
    );

    ValidateCanonPromotionCrossReferences({
      requestedQuestionPostId: params.request.questionPostId,
      answerQuestionPostId: answer.QuestionPostID,
      questionForumId: questionPost.ForumID,
      answerForumId: answerPost.ForumID,
    });

    const isAuthor = questionPost.AuthorUserID !== null && UUIDsEqual(questionPost.AuthorUserID, params.contextUser.ID);
    const isModerator = isAuthor ? false : await this.ResolveForumModeratorCapability(questionPost.ForumID, params.contextUser);

    const previouslyAcceptedAnswerPostId = question.AcceptedAnswerPostID;
    // AIEpistemicStatus is the only field THIS operation ever writes on the answer — AIConfidenceScore
    // is independently set by EpistemicAnswerGradingAction's ordinary grading pass (with or without a
    // promotion), so checking it here would false-positive-skip the repair for a graded-but-never-
    // promoted answer. AIEpistemicStatus === 'Canon Verified' is the precise, unambiguous signal.
    const answerAlreadyReflectsPromotion = answer.AIEpistemicStatus === 'Canon Verified';

    const result = this.ValidateAndBuildCanonPromotion({
      request: params.request,
      isQuestionAuthorOrModerator: isAuthor || isModerator,
      currentAICanonAnswerPostId: question.AICanonAnswerPostID,
      answerAlreadyReflectsPromotion,
    });

    const questionAlreadyPromoted =
      question.AICanonAnswerPostID !== null && UUIDsEqual(question.AICanonAnswerPostID, params.request.canonAnswerPostId);

    if (!questionAlreadyPromoted) {
      // Promoting a DIFFERENT answer than was previously accepted: clear the old one's
      // IsAcceptedByAuthor so exactly one answer is ever marked accepted at a time.
      if (previouslyAcceptedAnswerPostId && !UUIDsEqual(previouslyAcceptedAnswerPostId, params.request.canonAnswerPostId)) {
        const previousAnswer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
          COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
          CompositeKey.FromID(previouslyAcceptedAnswerPostId),
          params.contextUser,
        );
        previousAnswer.IsAcceptedByAuthor = false;
        await SaveOrThrow(previousAnswer, `Failed to clear IsAcceptedByAuthor on the previously accepted answer ${previouslyAcceptedAnswerPostId}.`);
      }

      question.AcceptedAnswerPostID = params.request.canonAnswerPostId;
      question.AICanonAnswerPostID = params.request.canonAnswerPostId;
      await SaveOrThrow(question, `Failed to save canon promotion onto Forum Question Post ${params.request.questionPostId}.`);
    }

    if (!answerAlreadyReflectsPromotion) {
      answer.AIEpistemicStatus = 'Canon Verified';
      await SaveOrThrow(answer, `Failed to mark Forum Answer Post ${params.request.canonAnswerPostId} as Canon Verified.`);
    }

    return result;
  }

  /** True when `user` holds an active ForumMember seat in `forumId` whose ForumRoleType grants `CanModerateQueue`. */
  private async ResolveForumModeratorCapability(forumId: string, user: UserInfo): Promise<boolean> {
    const role = await this.GetForumRoleTypeForUser(forumId, user);
    return role?.CanModerateQueue === true;
  }

  /** True when `user` holds an active ForumMember seat in `forumId` whose ForumRoleType grants `CanPromoteToSpace`. */
  private async ResolveForumPromoteToSpaceCapability(forumId: string, user: UserInfo): Promise<boolean> {
    const role = await this.GetForumRoleTypeForUser(forumId, user);
    return role?.CanPromoteToSpace === true;
  }

  /** Loads the ForumRoleType capability row for `user`'s active ForumMember seat in `forumId`, or null if they have none. */
  private async GetForumRoleTypeForUser(
    forumId: string,
    user: UserInfo,
  ): Promise<Pick<mjBizAppsCommunityForumRoleTypeEntity, 'CanModerateQueue' | 'CanPromoteToSpace'> | null> {
    const memberResult = await new RunView().RunView<Pick<mjBizAppsCommunityForumMemberEntity, 'ForumRoleTypeID'>>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumMembers,
        ExtraFilter: `ForumID = '${forumId}' AND UserID = '${user.ID}' AND Status = 'Active'`,
        Fields: ['ForumRoleTypeID'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    const forumRoleTypeId = memberResult?.Success ? memberResult.Results?.[0]?.ForumRoleTypeID : null;
    if (!forumRoleTypeId) {
      return null;
    }

    const roleResult = await new RunView().RunView<Pick<mjBizAppsCommunityForumRoleTypeEntity, 'CanModerateQueue' | 'CanPromoteToSpace'>>(
      {
        EntityName: COMMUNITY_ENTITY_NAMES.ForumRoleTypes,
        ExtraFilter: `ID = '${forumRoleTypeId}'`,
        Fields: ['CanModerateQueue', 'CanPromoteToSpace'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    return roleResult?.Success ? roleResult.Results?.[0] ?? null : null;
  }

  /**
   * Executes a validated graduation plan (see {@link ValidateAndBuildGraduationPlan}): loads the
   * authoritative root Forum Post (rejecting a reply — only a true root post, `ParentPostID ===
   * null`, may be graduated) and its parent Forum, derives `userCanPromoteToSpace` server-side
   * from `contextUser`'s active ForumMember/ForumRoleType.CanPromoteToSpace seat (never trusting a
   * caller-supplied flag), and — unless already graduated (`ForumPost.PromotedToSpaceID` already
   * set, handled as an idempotent retry that creates nothing new) — resolves EVERY prerequisite
   * (target SpaceType, an active least-privilege Space Role Type for invitations, a Task Type if a
   * starter Task is requested) and throws on any missing one BEFORE any `.Save()` call, so a
   * rejected/invalid request never leaves a partially-created Space behind. Only then creates the
   * target `MJ_BizApps_Collaboration: Spaces` row, an optional starter `MJ: Tasks` row, and a
   * `MJ_BizApps_Collaboration: Space Members` invitation per participant (deduplicated
   * case-insensitively), then persists the result onto the root post —
   * `LinkedTaskID` is always explicitly set (to the new Task's ID, or `null` when no Task was
   * requested/created, never left unset to whatever the row previously held). `MJ_BizApps_Community`
   * has no `GraduatedToEntityName`/`GraduatedToRecordID` polymorphic FK pair; `PromotedToSpaceID` /
   * `LinkedTaskID` are this schema's real, already-shipped equivalent — `PromotedToSpaceID` always
   * points at a Collaboration Space, so an entity-name discriminator would be redundant here.
   * Throws if any `.Save()` call returns `false`.
   */
  public async GraduateThreadToSpace(params: {
    request: ThreadGraduationRequest;
    allowedChildSpaceTypeCodes: ReadonlyArray<string>;
    contextUser: UserInfo;
  }): Promise<ThreadGraduationResult> {
    const md = new Metadata();
    const rootPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.rootPostId),
      params.contextUser,
    );

    if (rootPost.ParentPostID !== null) {
      throw new Error(`Forum Post ${params.request.rootPostId} is a reply (ParentPostID is set) — only a root post may be graduated.`);
    }

    const forum = await md.GetEntityObject<mjBizAppsCommunityForumEntity>(
      COMMUNITY_ENTITY_NAMES.Forums,
      CompositeKey.FromID(rootPost.ForumID),
      params.contextUser,
    );

    // Server-derived, never caller-supplied: rejects an unauthorized caller before any write.
    const userCanPromoteToSpace = await this.ResolveForumPromoteToSpaceCapability(forum.ID, params.contextUser);

    if (rootPost.PromotedToSpaceID) {
      // Idempotent retry: already graduated — hand back the existing Space, create nothing new.
      return this.ValidateAndBuildGraduationPlan({
        request: params.request,
        allowedChildSpaceTypeCodes: params.allowedChildSpaceTypeCodes,
        userCanPromoteToSpace,
        currentPromotedToSpaceId: rootPost.PromotedToSpaceID,
      });
    }

    const plan = this.ValidateAndBuildGraduationPlan({
      request: params.request,
      allowedChildSpaceTypeCodes: params.allowedChildSpaceTypeCodes,
      userCanPromoteToSpace,
    });

    // --- Resolve EVERY prerequisite before any Save() ---
    const spaceTypeId = await this.ResolveIdByFilter(
      'MJ_BizApps_Collaboration: Space Types',
      `Code = '${EscapeSqlLiteral(plan.targetSpaceTypeCode)}'`,
      params.contextUser,
    );
    if (!spaceTypeId) {
      throw new Error(`No Collaboration SpaceType found for code "${plan.targetSpaceTypeCode}".`);
    }

    const uniqueParticipantIds = DeduplicateUUIDsCaseInsensitive(params.request.includeParticipantUserIds);
    let spaceRoleTypeId: string | null = null;
    if (uniqueParticipantIds.length > 0) {
      spaceRoleTypeId = await this.ResolveLeastPrivilegeSpaceRoleTypeId(params.contextUser);
      if (!spaceRoleTypeId) {
        throw new Error('No active Space Role Type is configured — cannot invite participants to the graduated Space.');
      }
    }

    const createStarterTask = plan.seededTaskId !== null;
    let taskTypeId: string | null = null;
    if (createStarterTask) {
      taskTypeId = await this.ResolveIdByFilter('MJ: Task Types', '1=1', params.contextUser);
      if (!taskTypeId) {
        throw new Error('No Task Type is configured — cannot seed the requested starter Task.');
      }
    }

    // --- All prerequisites resolved: now perform the writes ---
    const space = await md.GetEntityObject<CollaborationSpaceEntityView>(
      'MJ_BizApps_Collaboration: Spaces',
      params.contextUser,
    );
    space.ID = plan.promotedToSpaceId;
    space.SpaceTypeID = spaceTypeId;
    space.ParentID = forum.SpaceID;
    space.Name = params.request.targetSpaceName;
    space.OwnerID = params.contextUser.ID;
    space.InheritsMembership = false;
    space.AgentRetrieval = 'Included';
    space.StartedAt = new Date();
    await SaveOrThrow(space, `Failed to create the Collaboration Space graduated from thread ${params.request.rootPostId}.`);

    if (createStarterTask && taskTypeId && plan.seededTaskId) {
      const task = await md.GetEntityObject<MJTaskEntity>('MJ: Tasks', params.contextUser);
      task.ID = plan.seededTaskId;
      task.Name = params.request.seedInitialTaskTitle ?? 'Graduated Thread Follow-Up';
      task.TypeID = taskTypeId;
      await SaveOrThrow(task, `Failed to seed the starter Task for graduated thread ${params.request.rootPostId}.`);
    }

    if (spaceRoleTypeId) {
      for (const participantUserId of uniqueParticipantIds) {
        const member = await md.GetEntityObject<CollaborationSpaceMemberEntityView>(
          'MJ_BizApps_Collaboration: Space Members',
          params.contextUser,
        );
        member.SpaceID = plan.promotedToSpaceId;
        member.UserID = participantUserId;
        member.SpaceRoleTypeID = spaceRoleTypeId;
        member.Band = 'Shared';
        member.Status = 'Invited';
        await SaveOrThrow(member, `Failed to invite User ${participantUserId} to the graduated Space.`);
      }
    }

    rootPost.PromotedToSpaceID = plan.promotedToSpaceId;
    // Always explicit: the new Task's ID, or null when no Task was requested/created — never left
    // unset to whatever LinkedTaskID previously held.
    rootPost.LinkedTaskID = createStarterTask ? plan.seededTaskId : null;
    await SaveOrThrow(rootPost, `Failed to persist graduation onto root Forum Post ${params.request.rootPostId}.`);

    return plan;
  }

  /** Resolves the first matching record's ID for a lookup entity, or null if none exists. */
  private async ResolveIdByFilter(entityName: string, extraFilter: string, user: UserInfo): Promise<string | null> {
    const result = await new RunView().RunView<{ ID: string }>(
      { EntityName: entityName, ExtraFilter: extraFilter, Fields: ['ID'], ResultType: 'simple', MaxRows: 1 },
      user,
    );
    return result?.Success ? result.Results?.[0]?.ID ?? null : null;
  }

  /** The active Space Role Type a newly-invited participant should receive: prefers 'Member' or
   * 'Contributor' by Name (least-privilege, non-administrative seats), falling back to any other
   * active role ordered deterministically by Name ASC when neither exists. */
  private async ResolveLeastPrivilegeSpaceRoleTypeId(user: UserInfo): Promise<string | null> {
    const preferred = await this.ResolveIdByFilter(
      'MJ_BizApps_Collaboration: Space Role Types',
      `IsActive = 1 AND Name IN ('Member', 'Contributor')`,
      user,
    );
    if (preferred) return preferred;

    const result = await new RunView().RunView<{ ID: string }>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Space Role Types',
        ExtraFilter: 'IsActive = 1',
        OrderBy: 'Name ASC',
        Fields: ['ID'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    return result?.Success ? result.Results?.[0]?.ID ?? null : null;
  }
}

/** Deduplicates a list of UUID strings case-insensitively (SQL Server/PostgreSQL both treat
 * UNIQUEIDENTIFIER comparisons case-insensitively; a naive `Set` would not). Returns one
 * representative (trimmed) value per distinct UUID, in first-seen order. */
export function DeduplicateUUIDsCaseInsensitive(ids: ReadonlyArray<string>): string[] {
  const seen = new Map<string, string>();
  for (const id of ids) {
    const key = id.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, id.trim());
    }
  }
  return Array.from(seen.values());
}
