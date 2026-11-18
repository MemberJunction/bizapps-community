import { createHash } from 'node:crypto';
import { BaseEntity, CompositeKey, LogError, Metadata, RunView, type TransactionGroupBase, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Resolver,
  ResolverBase,
  type AppContext,
} from '@memberjunction/server';
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

/** Derives a deterministic RFC-4122 UUID from a fixed namespace + root post ID so retries and crash
 * recovery across processes converge on the exact same Space/Task primary key rather than creating
 * duplicate rows on every retry. */
export function BuildDeterministicGraduationUUID(scope: 'space' | 'task', rootPostId: string): string {
  const hash = createHash('sha256').update(`mj-bizapps-community:graduation:${scope}:${rootPostId.trim().toLowerCase()}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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
  private static readonly inFlightGraduations = new Map<string, Promise<ThreadGraduationResult>>();
  private static readonly inFlightCanonPromotions = new Map<string, Promise<CanonPromotionResult>>();
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

    // Deterministic UUID keyed by `rootPostId` so concurrent retries or partial-failure recovery
    // never allocate a second Collaboration Space or starter Task ID.
    return {
      promotedToSpaceId: BuildDeterministicGraduationUUID('space', params.request.rootPostId),
      targetSpaceTypeCode: normalizedType,
      seededTaskId: params.request.seedInitialTaskTitle
        ? BuildDeterministicGraduationUUID('task', params.request.rootPostId)
        : null,
      invitedParticipantCount: uniqueParticipantIds.length,
    };
  }

  /**
   * Validates and plans promoting a Q&A answer into the forum's Knowledge Canon. Only the question's
   * author or a forum moderator may promote. `currentAICanonAnswerPostId` and `currentAcceptedAnswerPostId`
   * are checked TOGETHER so partial states (e.g. AcceptedAnswerPostID differs or IsAcceptedByAuthor
   * is false) are repaired on retry rather than skipped.
   */
  public ValidateAndBuildCanonPromotion(params: {
    request: CanonPromotionRequest;
    isQuestionAuthorOrModerator: boolean;
    currentAICanonAnswerPostId: string | null;
    currentAcceptedAnswerPostId?: string | null;
    /** Whether the ANSWER post already reflects the promotion (`AIEpistemicStatus === 'Canon Verified'`
     * AND `IsAcceptedByAuthor === true`). */
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
    if (params.currentAcceptedAnswerPostId) {
      AssertValidUUID(params.currentAcceptedAnswerPostId, 'currentAcceptedAnswerPostId');
    }

    const aiMatches =
      params.currentAICanonAnswerPostId !== null &&
      UUIDsEqual(params.currentAICanonAnswerPostId, params.request.canonAnswerPostId);
    const acceptedMatches =
      params.currentAcceptedAnswerPostId === undefined ||
      (params.currentAcceptedAnswerPostId !== null &&
        UUIDsEqual(params.currentAcceptedAnswerPostId, params.request.canonAnswerPostId));

    return {
      questionPostId: params.request.questionPostId,
      canonAnswerPostId: params.request.canonAnswerPostId,
      alreadyPromoted: aiMatches && acceptedMatches && params.answerAlreadyReflectsPromotion,
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
  public ApplyCanonPromotion(params: { request: CanonPromotionRequest; contextUser: UserInfo }): Promise<CanonPromotionResult> {
    AssertValidUUID(params.request.questionPostId, 'questionPostId');
    AssertValidUUID(params.request.canonAnswerPostId, 'canonAnswerPostId');

    const lockKey = params.request.questionPostId.trim().toLowerCase();
    const prior = ThreadGraduationService.inFlightCanonPromotions.get(lockKey);
    const next = (prior ? prior.catch(() => undefined) : Promise.resolve()).then(() =>
      this.executeApplyCanonPromotion(params),
    );
    ThreadGraduationService.inFlightCanonPromotions.set(lockKey, next);
    return next.finally(() => {
      if (ThreadGraduationService.inFlightCanonPromotions.get(lockKey) === next) {
        ThreadGraduationService.inFlightCanonPromotions.delete(lockKey);
      }
    });
  }

  private async executeApplyCanonPromotion(params: { request: CanonPromotionRequest; contextUser: UserInfo }): Promise<CanonPromotionResult> {
    const md = new Metadata();
    const question = await md.GetEntityObject<mjBizAppsCommunityForumQuestionPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
      CompositeKey.FromID(params.request.questionPostId),
      params.contextUser,
    );
    if (!question) {
      throw new Error(`Forum Question Post ${params.request.questionPostId} was not found.`);
    }
    const answer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
      CompositeKey.FromID(params.request.canonAnswerPostId),
      params.contextUser,
    );
    if (!answer) {
      throw new Error(`Forum Answer Post ${params.request.canonAnswerPostId} was not found.`);
    }
    const questionPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.questionPostId),
      params.contextUser,
    );
    if (!questionPost) {
      throw new Error(`Forum Post ${params.request.questionPostId} was not found.`);
    }
    const answerPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.canonAnswerPostId),
      params.contextUser,
    );
    if (!answerPost) {
      throw new Error(`Forum Post ${params.request.canonAnswerPostId} was not found.`);
    }

    ValidateCanonPromotionCrossReferences({
      requestedQuestionPostId: params.request.questionPostId,
      answerQuestionPostId: answer.QuestionPostID,
      questionForumId: questionPost.ForumID,
      answerForumId: answerPost.ForumID,
    });

    const isAuthor = questionPost.AuthorUserID !== null && UUIDsEqual(questionPost.AuthorUserID, params.contextUser.ID);
    const isModerator = isAuthor ? false : await this.ResolveForumModeratorCapability(questionPost.ForumID, params.contextUser);

    const previouslyAcceptedAnswerPostId = question.AcceptedAnswerPostID;
    const answerAlreadyReflectsPromotion =
      answer.AIEpistemicStatus === 'Canon Verified' && answer.IsAcceptedByAuthor === true;

    const result = this.ValidateAndBuildCanonPromotion({
      request: params.request,
      isQuestionAuthorOrModerator: isAuthor || isModerator,
      currentAICanonAnswerPostId: question.AICanonAnswerPostID,
      currentAcceptedAnswerPostId: question.AcceptedAnswerPostID,
      answerAlreadyReflectsPromotion,
    });

    if (result.alreadyPromoted) {
      return result;
    }

    const questionAlreadyPromoted =
      question.AICanonAnswerPostID !== null &&
      UUIDsEqual(question.AICanonAnswerPostID, params.request.canonAnswerPostId) &&
      question.AcceptedAnswerPostID !== null &&
      UUIDsEqual(question.AcceptedAnswerPostID, params.request.canonAnswerPostId);

    const txGroup = await this.tryCreateTransactionGroup(md);
    const revertActions: Array<() => Promise<void>> = [];

    try {
      if (!questionAlreadyPromoted) {
        if (previouslyAcceptedAnswerPostId && !UUIDsEqual(previouslyAcceptedAnswerPostId, params.request.canonAnswerPostId)) {
          const previousAnswer = await md.GetEntityObject<mjBizAppsCommunityForumAnswerPostEntity>(
            COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
            CompositeKey.FromID(previouslyAcceptedAnswerPostId),
            params.contextUser,
          );
          if (previousAnswer?.IsAcceptedByAuthor) {
            previousAnswer.IsAcceptedByAuthor = false;
            if (txGroup) previousAnswer.TransactionGroup = txGroup;
            await SaveOrThrow(previousAnswer, `Failed to clear IsAcceptedByAuthor on the previously accepted answer ${previouslyAcceptedAnswerPostId}.`);
            if (!txGroup) {
              revertActions.push(async () => {
                previousAnswer.IsAcceptedByAuthor = true;
                await previousAnswer.Save();
              });
            }
          }
        }

        const prevAccepted = question.AcceptedAnswerPostID;
        const prevCanon = question.AICanonAnswerPostID;
        question.AcceptedAnswerPostID = params.request.canonAnswerPostId;
        question.AICanonAnswerPostID = params.request.canonAnswerPostId;
        if (txGroup) question.TransactionGroup = txGroup;
        await SaveOrThrow(question, `Failed to save canon promotion onto Forum Question Post ${params.request.questionPostId}.`);
        if (!txGroup) {
          revertActions.push(async () => {
            question.AcceptedAnswerPostID = prevAccepted;
            question.AICanonAnswerPostID = prevCanon;
            await question.Save();
          });
        }
      }

      if (!answerAlreadyReflectsPromotion) {
        answer.AIEpistemicStatus = 'Canon Verified';
        answer.IsAcceptedByAuthor = true;
        if (txGroup) answer.TransactionGroup = txGroup;
        await SaveOrThrow(answer, `Failed to mark Forum Answer Post ${params.request.canonAnswerPostId} as Canon Verified.`);
      }

      if (txGroup) {
        await this.commitTransactionGroup(txGroup, `canon promotion for Question ${params.request.questionPostId}`);
      }
    } catch (err) {
      if (!txGroup) {
        for (const revert of revertActions.reverse()) {
          try {
            await revert();
          } catch {
            // Best-effort compensating rollback when provider lacks TransactionGroup
          }
        }
      }
      throw err;
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
    AssertValidUUID(forumId, 'forumId');
    AssertValidUUID(user.ID, 'user.ID');
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

    AssertValidUUID(forumRoleTypeId, 'forumRoleTypeId');
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
    allowedChildSpaceTypeCodes?: ReadonlyArray<string>;
    contextUser: UserInfo;
  }): Promise<ThreadGraduationResult> {
    const lockKey = params.request.rootPostId.trim().toLowerCase();
    const prior = ThreadGraduationService.inFlightGraduations.get(lockKey);
    const run = (prior ? prior.catch(() => undefined) : Promise.resolve()).then(() =>
      this.executeGraduateThreadToSpace(params),
    );
    ThreadGraduationService.inFlightGraduations.set(lockKey, run);
    try {
      return await run;
    } finally {
      if (ThreadGraduationService.inFlightGraduations.get(lockKey) === run) {
        ThreadGraduationService.inFlightGraduations.delete(lockKey);
      }
    }
  }

  private async tryCreateTransactionGroup(md: Metadata): Promise<TransactionGroupBase | null> {
    if (typeof md.CreateTransactionGroup !== 'function') {
      return null;
    }
    const provider = Metadata.Provider;
    if (!provider || typeof provider.CreateTransactionGroup !== 'function') {
      return null;
    }
    try {
      return await md.CreateTransactionGroup();
    } catch {
      return null;
    }
  }

  private async commitTransactionGroup(txGroup: TransactionGroupBase, label: string): Promise<void> {
    const committed = await txGroup.Submit();
    if (!committed) {
      throw new Error(`Transactional commit failed for ${label}.`);
    }
  }

  private async executeGraduateThreadToSpace(params: {
    request: ThreadGraduationRequest;
    allowedChildSpaceTypeCodes?: ReadonlyArray<string>;
    contextUser: UserInfo;
  }): Promise<ThreadGraduationResult> {
    AssertValidUUID(params.request.rootPostId, 'rootPostId');
    const md = new Metadata();
    const rootPost = await md.GetEntityObject<mjBizAppsCommunityForumPostEntity>(
      COMMUNITY_ENTITY_NAMES.ForumPosts,
      CompositeKey.FromID(params.request.rootPostId),
      params.contextUser,
    );
    if (!rootPost) {
      throw new Error(`Forum Post ${params.request.rootPostId} was not found.`);
    }

    if (rootPost.ParentPostID !== null) {
      throw new Error(`Forum Post ${params.request.rootPostId} is a reply (ParentPostID is set) — only a root post may be graduated.`);
    }

    const forum = await md.GetEntityObject<mjBizAppsCommunityForumEntity>(
      COMMUNITY_ENTITY_NAMES.Forums,
      CompositeKey.FromID(rootPost.ForumID),
      params.contextUser,
    );
    if (!forum) {
      throw new Error(`Forum ${rootPost.ForumID} was not found for Forum Post ${params.request.rootPostId}.`);
    }

    // Server-derived, never caller-supplied: rejects an unauthorized caller or widened child policy before any write.
    const userCanPromoteToSpace = await this.ResolveForumPromoteToSpaceCapability(forum.ID, params.contextUser);
    const authoritativeAllowedChildSpaceTypeCodes = await this.ResolveAuthoritativeChildSpaceTypeCodes(
      forum.SpaceID,
      params.allowedChildSpaceTypeCodes,
      params.contextUser,
    );

    if (rootPost.PromotedToSpaceID) {
      // Idempotent retry: already graduated — hand back the existing Space, create nothing new.
      return this.ValidateAndBuildGraduationPlan({
        request: params.request,
        allowedChildSpaceTypeCodes: authoritativeAllowedChildSpaceTypeCodes,
        userCanPromoteToSpace,
        currentPromotedToSpaceId: rootPost.PromotedToSpaceID,
      });
    }

    const plan = this.ValidateAndBuildGraduationPlan({
      request: params.request,
      allowedChildSpaceTypeCodes: authoritativeAllowedChildSpaceTypeCodes,
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

    // Check whether deterministic Space / Task / Member rows already exist from an interrupted prior run
    const existingSpaceId = await this.ResolveIdByFilter(
      'MJ_BizApps_Collaboration: Spaces',
      `ID = '${AssertValidUUID(plan.promotedToSpaceId, 'promotedToSpaceId')}'`,
      params.contextUser,
    );
    const existingTaskId =
      createStarterTask && plan.seededTaskId
        ? await this.ResolveIdByFilter(
            'MJ: Tasks',
            `ID = '${AssertValidUUID(plan.seededTaskId, 'seededTaskId')}'`,
            params.contextUser,
          )
        : null;
    const existingMemberRes =
      uniqueParticipantIds.length > 0
        ? await new RunView().RunView<{ UserID: string }>(
            {
              EntityName: 'MJ_BizApps_Collaboration: Space Members',
              ExtraFilter: `SpaceID = '${plan.promotedToSpaceId}'`,
              Fields: ['UserID'],
              ResultType: 'simple',
              MaxRows: 500,
            },
            params.contextUser,
          )
        : null;
    const existingMemberUserIds = new Set(
      (existingMemberRes?.Success ? existingMemberRes.Results ?? [] : []).map((m) => m.UserID.trim().toLowerCase()),
    );

    // --- All prerequisites resolved: commit parent Space first so SpaceMemberEntityServer.ValidateAsync()
    // sees the committed Space row in DB, then atomically persist Task/Members/RootPost in TransactionGroup
    // with explicit reverse-order Delete() rollback of any created rows on failure. ---
    const createdForRollback: Array<{ Delete?: () => Promise<boolean> }> = [];
    let txGroup: TransactionGroupBase | null = null;

    try {
      if (!existingSpaceId) {
        const space = await md.GetEntityObject<CollaborationSpaceEntityView>(
          'MJ_BizApps_Collaboration: Spaces',
          params.contextUser,
        );
        if (!space) {
          throw new Error(`Failed to instantiate Collaboration Space entity for thread ${params.request.rootPostId}.`);
        }
        space.ID = plan.promotedToSpaceId;
        space.SpaceTypeID = spaceTypeId;
        space.ParentID = forum.SpaceID;
        space.Name = params.request.targetSpaceName;
        space.OwnerID = params.contextUser.ID;
        space.InheritsMembership = false;
        space.AgentRetrieval = 'Included';
        space.StartedAt = new Date();
        await SaveOrThrow(space, `Failed to create the Collaboration Space graduated from thread ${params.request.rootPostId}.`);
        createdForRollback.push(space);
      }

      txGroup = await this.tryCreateTransactionGroup(md);

      if (createStarterTask && taskTypeId && plan.seededTaskId && !existingTaskId) {
        const task = await md.GetEntityObject<MJTaskEntity>('MJ: Tasks', params.contextUser);
        if (!task) {
          throw new Error(`Failed to instantiate Task entity for thread ${params.request.rootPostId}.`);
        }
        task.ID = plan.seededTaskId;
        task.Name = params.request.seedInitialTaskTitle ?? 'Graduated Thread Follow-Up';
        task.TypeID = taskTypeId;
        if (txGroup) task.TransactionGroup = txGroup;
        await SaveOrThrow(task, `Failed to seed the starter Task for graduated thread ${params.request.rootPostId}.`);
        if (!txGroup) createdForRollback.push(task);
      }

      if (spaceRoleTypeId) {
        for (const participantUserId of uniqueParticipantIds) {
          if (existingMemberUserIds.has(participantUserId.trim().toLowerCase())) {
            continue;
          }
          const member = await md.GetEntityObject<CollaborationSpaceMemberEntityView>(
            'MJ_BizApps_Collaboration: Space Members',
            params.contextUser,
          );
          if (!member) {
            throw new Error(`Failed to instantiate Collaboration Space Member entity for user ${participantUserId}.`);
          }
          member.SpaceID = plan.promotedToSpaceId;
          member.UserID = participantUserId;
          member.SpaceRoleTypeID = spaceRoleTypeId;
          member.Band = 'Shared';
          member.Status = 'Invited';
          if (txGroup) member.TransactionGroup = txGroup;
          await SaveOrThrow(member, `Failed to invite User ${participantUserId} to the graduated Space.`);
          if (!txGroup) createdForRollback.push(member);
        }
      }

      rootPost.PromotedToSpaceID = plan.promotedToSpaceId;
      // Always explicit: the new Task's ID, or null when no Task was requested/created — never left
      // unset to whatever LinkedTaskID previously held.
      rootPost.LinkedTaskID = createStarterTask ? plan.seededTaskId : null;
      if (txGroup) rootPost.TransactionGroup = txGroup;
      await SaveOrThrow(rootPost, `Failed to persist graduation onto root Forum Post ${params.request.rootPostId}.`);

      if (txGroup) {
        await this.commitTransactionGroup(txGroup, `thread graduation for rootPostId ${params.request.rootPostId}`);
      }
    } catch (err) {
      for (const created of createdForRollback.reverse()) {
        if (typeof created.Delete === 'function') {
          try {
            await created.Delete();
          } catch {
            // Best-effort compensating rollback for any committed entities before failure
          }
        }
      }
      throw err;
    }

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

  /** Derives the parent Space's SpaceType Configuration.Children.AllowedTypeCodes on the server
   * so callers cannot widen permitted child SpaceTypes past Collaboration policy. */
  private async ResolveAuthoritativeChildSpaceTypeCodes(
    parentSpaceId: string,
    callerRequestedCodes: ReadonlyArray<string> | undefined,
    user: UserInfo,
  ): Promise<string[]> {
    const validSpaceId = AssertValidUUID(parentSpaceId, 'parentSpaceId');
    const spaceRes = await new RunView().RunView<{ ID: string; SpaceTypeID: string }>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Spaces',
        ExtraFilter: `ID = '${validSpaceId}'`,
        Fields: ['ID', 'SpaceTypeID'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    const parentSpace = spaceRes?.Success ? spaceRes.Results?.[0] : null;
    if (!parentSpace?.SpaceTypeID) {
      throw new Error(`Could not resolve parent Collaboration Space ${parentSpaceId} or its SpaceTypeID.`);
    }

    const validSpaceTypeId = AssertValidUUID(parentSpace.SpaceTypeID, 'parentSpaceTypeId');
    const spaceTypeRes = await new RunView().RunView<{ ID: string; Code: string; Configuration: string | null }>(
      {
        EntityName: 'MJ_BizApps_Collaboration: Space Types',
        ExtraFilter: `ID = '${validSpaceTypeId}'`,
        Fields: ['ID', 'Code', 'Configuration'],
        ResultType: 'simple',
        MaxRows: 1,
      },
      user,
    );
    const spaceType = spaceTypeRes?.Success ? spaceTypeRes.Results?.[0] : null;
    if (!spaceType) {
      throw new Error(`Could not load parent Collaboration Space Type ${validSpaceTypeId}.`);
    }

    let authoritativeCodes: string[] = [];
    if (spaceType.Configuration) {
      try {
        const parsed = JSON.parse(spaceType.Configuration) as { Children?: { AllowedTypeCodes?: string[] } };
        if (Array.isArray(parsed?.Children?.AllowedTypeCodes)) {
          authoritativeCodes = parsed.Children.AllowedTypeCodes
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
        }
      } catch {
        throw new Error(`Parent Collaboration Space Type "${spaceType.Code}" has malformed Configuration JSON.`);
      }
    }

    if (callerRequestedCodes && callerRequestedCodes.length > 0) {
      const normalizedAuth = new Set(authoritativeCodes.map((c) => c.toLowerCase()));
      const disallowed = callerRequestedCodes.filter((c) => !normalizedAuth.has(c.trim().toLowerCase()));
      if (disallowed.length > 0) {
        throw new Error(
          `Caller-supplied child SpaceType(s) [${disallowed.join(', ')}] exceed parent Space Type "${spaceType.Code}" Children.AllowedTypeCodes policy.`,
        );
      }
      return callerRequestedCodes.map((c) => c.trim());
    }

    return authoritativeCodes;
  }

  /** The active Space Role Type a newly-invited participant should receive: prefers 'Member' or
   * 'Contributor' by Name (least-privilege, non-administrative seats), falling back only to
   * active non-owner, non-band-promoting roles ordered by Level ASC, Name ASC (never Admin/Owner). */
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
        ExtraFilter: `IsActive = 1 AND IsOwnerRole = 0 AND CanPromoteBand = 0 AND Code NOT IN ('admin', 'owner')`,
        OrderBy: 'Level ASC, Name ASC',
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

@InputType()
export class GraduateCommunityThreadInput {
  @Field()
  RootPostID: string;

  @Field()
  TargetSpaceTypeCode: string;

  @Field()
  TargetSpaceName: string;

  @Field({ nullable: true })
  SeedInitialTaskTitle?: string;

  @Field(() => [String], { nullable: true })
  IncludeParticipantUserIDs?: string[];

  @Field(() => [String], { nullable: true })
  AllowedChildSpaceTypeCodes?: string[];
}

@ObjectType()
export class GraduateCommunityThreadPayload {
  @Field()
  Success: boolean;

  @Field({ nullable: true })
  PromotedToSpaceID?: string;

  @Field({ nullable: true })
  TargetSpaceTypeCode?: string;

  @Field({ nullable: true })
  SeededTaskID?: string;

  @Field(() => Int, { nullable: true })
  InvitedParticipantCount?: number;

  @Field({ nullable: true })
  ErrorMessage?: string;
}

@InputType()
export class PromoteCommunityAnswerToCanonInput {
  @Field()
  QuestionPostID: string;

  @Field()
  CanonAnswerPostID: string;
}

@ObjectType()
export class PromoteCommunityAnswerToCanonPayload {
  @Field()
  Success: boolean;

  @Field({ nullable: true })
  QuestionPostID?: string;

  @Field({ nullable: true })
  CanonAnswerPostID?: string;

  @Field({ nullable: true })
  AlreadyPromoted?: boolean;

  @Field({ nullable: true })
  ErrorMessage?: string;
}

/**
 * Authoritative GraphQL mutation bridge for Community thread-to-space graduation and Q&A Canon
 * promotion. Enforces authenticated `contextUser` identity and delegates to
 * {@link ThreadGraduationService}.
 */
@Resolver()
export class CommunityGraduationResolver extends ResolverBase {
  @Mutation(() => GraduateCommunityThreadPayload)
  public async GraduateCommunityThread(
    @Arg('input', () => GraduateCommunityThreadInput) input: GraduateCommunityThreadInput,
    @Ctx() context: Pick<AppContext, 'userPayload'>,
  ): Promise<GraduateCommunityThreadPayload> {
    const contextUser = this.GetUserFromPayload(context?.userPayload);
    if (!contextUser || !contextUser.ID) {
      return {
        Success: false,
        ErrorMessage: 'Graduating a community thread requires an authenticated user.',
      };
    }

    try {
      const service = new ThreadGraduationService();
      const result = await service.GraduateThreadToSpace({
        request: {
          rootPostId: input.RootPostID,
          targetSpaceTypeCode: input.TargetSpaceTypeCode,
          targetSpaceName: input.TargetSpaceName,
          seedInitialTaskTitle: input.SeedInitialTaskTitle ?? null,
          includeParticipantUserIds: input.IncludeParticipantUserIDs ?? [],
        },
        allowedChildSpaceTypeCodes: input.AllowedChildSpaceTypeCodes,
        contextUser,
      });

      return {
        Success: true,
        PromotedToSpaceID: result.promotedToSpaceId,
        TargetSpaceTypeCode: result.targetSpaceTypeCode,
        SeededTaskID: result.seededTaskId ?? undefined,
        InvitedParticipantCount: result.invitedParticipantCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      LogError(`GraduateCommunityThread failed: ${message}`);
      return {
        Success: false,
        ErrorMessage: message || 'Failed to graduate community thread.',
      };
    }
  }

  @Mutation(() => PromoteCommunityAnswerToCanonPayload)
  public async PromoteCommunityAnswerToCanon(
    @Arg('input', () => PromoteCommunityAnswerToCanonInput) input: PromoteCommunityAnswerToCanonInput,
    @Ctx() context: Pick<AppContext, 'userPayload'>,
  ): Promise<PromoteCommunityAnswerToCanonPayload> {
    const contextUser = this.GetUserFromPayload(context?.userPayload);
    if (!contextUser || !contextUser.ID) {
      return {
        Success: false,
        ErrorMessage: 'Promoting an answer to Knowledge Canon requires an authenticated user.',
      };
    }

    try {
      const service = new ThreadGraduationService();
      const result = await service.ApplyCanonPromotion({
        request: {
          questionPostId: input.QuestionPostID,
          canonAnswerPostId: input.CanonAnswerPostID,
        },
        contextUser,
      });

      return {
        Success: true,
        QuestionPostID: result.questionPostId,
        CanonAnswerPostID: result.canonAnswerPostId,
        AlreadyPromoted: result.alreadyPromoted,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      LogError(`PromoteCommunityAnswerToCanon failed: ${message}`);
      return {
        Success: false,
        ErrorMessage: message || 'Failed to promote answer to Knowledge Canon.',
      };
    }
  }
}
