import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CompositeKey, Metadata, RunView, TransactionGroupBase, type TransactionResult, UserInfo } from '@memberjunction/core';
import type { AppContext } from '@memberjunction/server';

const prevDbDatabase = process.env.DB_DATABASE;
const prevDbUsername = process.env.DB_USERNAME;
const prevDbPassword = process.env.DB_PASSWORD;
if (!process.env.DB_DATABASE) process.env.DB_DATABASE = 'mj_ci_unit_test';
if (!process.env.DB_USERNAME) process.env.DB_USERNAME = 'mj_ci_unit_test';
if (!process.env.DB_PASSWORD) process.env.DB_PASSWORD = 'mj_ci_unit_test_placeholder';

const {
  BuildDeterministicGraduationUUID,
  CommunityDocumentBlocks,
  CommunityGraduationResolver,
  CommunityPublicEdgeService,
  DeduplicateUUIDsCaseInsensitive,
  LoadBizAppsCommunityServer,
  RESOLVER_PATHS,
  SaveOrThrow,
  ThreadGraduationService,
  ValidateCanonPromotionCrossReferences,
} = await (async () => {
  try {
    return await import('../dist/index.js');
  } finally {
    if (prevDbDatabase === undefined) delete process.env.DB_DATABASE;
    else process.env.DB_DATABASE = prevDbDatabase;
    if (prevDbUsername === undefined) delete process.env.DB_USERNAME;
    else process.env.DB_USERNAME = prevDbUsername;
    if (prevDbPassword === undefined) delete process.env.DB_PASSWORD;
    else process.env.DB_PASSWORD = prevDbPassword;
  }
})();

class InMemoryTransactionGroup extends TransactionGroupBase {
  public submitCalls = 0;

  public override async Submit(allowRetryOfFailedTransaction?: boolean): Promise<boolean> {
    this.submitCalls += 1;
    return super.Submit(allowRetryOfFailedTransaction);
  }

  protected override async HandleSubmit(): Promise<TransactionResult[]> {
    return [];
  }
}

const ROOT_POST_ID = '23acc7cf-c227-4d33-8bb1-2558d9729711';
const USER_1 = 'e128dd44-893f-4f2b-829f-6b9bb333d9a3';
const USER_2 = '49cfc209-95a9-4d2f-875f-0ba5df5ea205';
const EXISTING_SPACE_ID = 'ff1d29fc-6392-41b1-a86e-c23a178102c9';
const QUESTION_POST_ID = '7b860684-f57e-4915-bd52-340f019562a1';
const ANSWER_POST_ID = '6ee7db14-5a44-44c0-b771-60849abf2afa';
const OTHER_QUESTION_POST_ID = '12b3c4d5-6e7f-4890-abcd-ef0123456789';
const FORUM_1_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const FORUM_2_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const SQL_INJECTION = "' OR '1'='1";

describe('@mj-biz-apps/community-server services and document blocks', () => {
  it('bootstraps Community server registrations cleanly', () => {
    LoadBizAppsCommunityServer();
  });

  it('projects public edge threads with Teaser Only redaction and excludes Team posts', () => {
    const edge = new CommunityPublicEdgeService();
    const projected = edge.ProjectPublicThreadList({
      spaceVisibility: 'Open',
      spaceAnonymousReadMode: 'Teaser Only',
      forum: {
        Slug: 'general',
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
      },
      teaserMaxChars: 40,
      posts: [
        {
          ID: 'post-shared',
          ForumID: 'f-1',
          PostTypeID: 'pt-1',
          RootPostID: null,
          ParentPostID: null,
          ReplyDepth: 0,
          AuthorUserID: 'u-1',
          AuthorPersonID: null,
          AuthorAgentID: null,
          Title: '2026 Compliance Checklist',
          Slug: '2026-compliance-checklist',
          BodyMarkdown:
            'Here is the complete 50-state compliance guide for association chapters and regional boards.',
          SummaryMarkdown: null,
          SummaryGeneratedAt: null,
          SummaryReplyWatermark: 0,
          VisibilityBand: 'Shared',
          Status: 'Published',
          IsPinned: true,
          IsLocked: false,
          IsFeatured: false,
          ReplyCount: 12,
          ParticipantCount: 8,
          ReactionScore: 29,
          ViewCount: 140,
          LastActivityAt: new Date(),
          PromotedToSpaceID: null,
          LinkedTaskID: null,
        },
        {
          ID: 'post-team',
          ForumID: 'f-1',
          PostTypeID: 'pt-1',
          RootPostID: null,
          ParentPostID: null,
          ReplyDepth: 0,
          AuthorUserID: 'u-1',
          AuthorPersonID: null,
          AuthorAgentID: null,
          Title: 'Internal Staff Notes',
          Slug: 'internal-staff-notes',
          BodyMarkdown: 'Confidential internal staff note',
          SummaryMarkdown: null,
          SummaryGeneratedAt: null,
          SummaryReplyWatermark: 0,
          VisibilityBand: 'Team',
          Status: 'Published',
          IsPinned: false,
          IsLocked: false,
          IsFeatured: false,
          ReplyCount: 0,
          ParticipantCount: 1,
          ReactionScore: 0,
          ViewCount: 2,
          LastActivityAt: new Date(),
          PromotedToSpaceID: null,
          LinkedTaskID: null,
        },
      ],
    });

    assert.equal(projected.length, 1);
    assert.equal(projected[0].postId, 'post-shared');
    assert.equal(projected[0].isTeaser, true);
    assert.ok(projected[0].contentMarkdown.endsWith('…'));
  });

  it('graduates a high-momentum thread into any allowed peer Collaboration SpaceType', () => {
    const graduation = new ThreadGraduationService();
    const result = graduation.ValidateAndBuildGraduationPlan({
      request: {
        rootPostId: ROOT_POST_ID,
        targetSpaceTypeCode: 'working-group',
        targetSpaceName: 'AI Policy Working Group',
        seedInitialTaskTitle: 'Draft v1 Charter',
        includeParticipantUserIds: [USER_1, USER_2, USER_1],
      },
      allowedChildSpaceTypeCodes: ['working-group', 'cohort', 'project'],
      userCanPromoteToSpace: true,
    });

    assert.equal(result.targetSpaceTypeCode, 'working-group');
    assert.equal(result.invitedParticipantCount, 2);
    // Deterministic, genuinely-valid UUIDv4s — never a fabricated `graduated-<id>`/`task-<id>` string.
    assert.match(result.promotedToSpaceId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.match(result.seededTaskId ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('is idempotent: re-graduating an already-promoted thread returns the existing Space without re-seeding a Task', () => {
    const graduation = new ThreadGraduationService();
    const result = graduation.ValidateAndBuildGraduationPlan({
      request: {
        rootPostId: ROOT_POST_ID,
        targetSpaceTypeCode: 'working-group',
        targetSpaceName: 'AI Policy Working Group',
        seedInitialTaskTitle: 'Draft v1 Charter',
        includeParticipantUserIds: [USER_1, USER_2],
      },
      allowedChildSpaceTypeCodes: ['working-group', 'cohort', 'project'],
      userCanPromoteToSpace: true,
      currentPromotedToSpaceId: EXISTING_SPACE_ID,
    });

    assert.equal(result.promotedToSpaceId, EXISTING_SPACE_ID);
    assert.equal(result.seededTaskId, null);
    assert.equal(result.invitedParticipantCount, 0);
  });

  it('rejects graduation into a SpaceType not in AllowedTypeCodes', () => {
    const graduation = new ThreadGraduationService();
    assert.throws(
      () =>
        graduation.ValidateAndBuildGraduationPlan({
          request: {
            rootPostId: ROOT_POST_ID,
            targetSpaceTypeCode: 'governance-board',
            targetSpaceName: 'Not Allowed',
            includeParticipantUserIds: [],
          },
          allowedChildSpaceTypeCodes: ['working-group'],
          userCanPromoteToSpace: true,
        }),
      /not in AllowedTypeCodes/,
    );
  });

  it('rejects graduation from a member without the CanPromoteToSpace capability', () => {
    const graduation = new ThreadGraduationService();
    assert.throws(
      () =>
        graduation.ValidateAndBuildGraduationPlan({
          request: {
            rootPostId: ROOT_POST_ID,
            targetSpaceTypeCode: 'working-group',
            targetSpaceName: 'AI Policy Working Group',
            includeParticipantUserIds: [],
          },
          allowedChildSpaceTypeCodes: ['working-group'],
          userCanPromoteToSpace: false,
        }),
      /CanPromoteToSpace/,
    );
  });

  it('rejects a malformed or SQL-injection-shaped rootPostId before any persistence is attempted', () => {
    const graduation = new ThreadGraduationService();
    for (const badId of ['not-a-uuid', SQL_INJECTION]) {
      assert.throws(() =>
        graduation.ValidateAndBuildGraduationPlan({
          request: {
            rootPostId: badId,
            targetSpaceTypeCode: 'working-group',
            targetSpaceName: 'AI Policy Working Group',
            includeParticipantUserIds: [],
          },
          allowedChildSpaceTypeCodes: ['working-group'],
          userCanPromoteToSpace: true,
        }),
      );
    }
  });

  it('rejects a malformed or SQL-injection-shaped participant user ID', () => {
    const graduation = new ThreadGraduationService();
    for (const badId of ['not-a-uuid', SQL_INJECTION]) {
      assert.throws(() =>
        graduation.ValidateAndBuildGraduationPlan({
          request: {
            rootPostId: ROOT_POST_ID,
            targetSpaceTypeCode: 'working-group',
            targetSpaceName: 'AI Policy Working Group',
            includeParticipantUserIds: [badId],
          },
          allowedChildSpaceTypeCodes: ['working-group'],
          userCanPromoteToSpace: true,
        }),
      );
    }
  });

  it('promotes an answer to Knowledge Canon, access-checked and idempotent', () => {
    const graduation = new ThreadGraduationService();

    const firstPromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: null,
      answerAlreadyReflectsPromotion: false,
    });
    assert.equal(firstPromotion.alreadyPromoted, false);

    const rePromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: ANSWER_POST_ID,
      answerAlreadyReflectsPromotion: true,
    });
    assert.equal(rePromotion.alreadyPromoted, true);

    // Mixed-case regression: the SAME UUID value, differently cased, is still "already promoted" (UUIDsEqual, not ===).
    const mixedCaseRePromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: ANSWER_POST_ID.toUpperCase(),
      answerAlreadyReflectsPromotion: true,
    });
    assert.equal(mixedCaseRePromotion.alreadyPromoted, true);

    // Partial-failure repair: the question side already matches, but the answer side does not —
    // alreadyPromoted must be false so ApplyCanonPromotion knows to repair the answer.
    const partialRepairNeeded = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: ANSWER_POST_ID,
      answerAlreadyReflectsPromotion: false,
    });
    assert.equal(partialRepairNeeded.alreadyPromoted, false);

    assert.throws(
      () =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
          isQuestionAuthorOrModerator: false,
          currentAICanonAnswerPostId: null,
          answerAlreadyReflectsPromotion: false,
        }),
      /Only the question author or a forum moderator/,
    );
  });

  it('rejects a malformed or SQL-injection-shaped questionPostId/canonAnswerPostId in canon promotion', () => {
    const graduation = new ThreadGraduationService();
    for (const badId of ['not-a-uuid', SQL_INJECTION]) {
      assert.throws(() =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: badId, canonAnswerPostId: ANSWER_POST_ID },
          isQuestionAuthorOrModerator: true,
          currentAICanonAnswerPostId: null,
          answerAlreadyReflectsPromotion: false,
        }),
      );
      assert.throws(() =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: badId },
          isQuestionAuthorOrModerator: true,
          currentAICanonAnswerPostId: null,
          answerAlreadyReflectsPromotion: false,
        }),
      );
    }
  });

  it('ValidateCanonPromotionCrossReferences rejects an answer that answers a DIFFERENT question (cross-question rejection)', () => {
    assert.throws(
      () =>
        ValidateCanonPromotionCrossReferences({
          requestedQuestionPostId: QUESTION_POST_ID,
          answerQuestionPostId: OTHER_QUESTION_POST_ID,
          questionForumId: FORUM_1_ID,
          answerForumId: FORUM_1_ID,
        }),
      /not the requested Question/,
    );
  });

  it('ValidateCanonPromotionCrossReferences accepts mixed-case-equal UUIDs (UUIDsEqual, not ===)', () => {
    assert.doesNotThrow(() =>
      ValidateCanonPromotionCrossReferences({
        requestedQuestionPostId: QUESTION_POST_ID,
        answerQuestionPostId: QUESTION_POST_ID.toUpperCase(),
        questionForumId: FORUM_1_ID,
        answerForumId: FORUM_1_ID.toUpperCase(),
      }),
    );
  });

  it('ValidateCanonPromotionCrossReferences rejects an answer scoped to a different Forum than its question', () => {
    assert.throws(
      () =>
        ValidateCanonPromotionCrossReferences({
          requestedQuestionPostId: QUESTION_POST_ID,
          answerQuestionPostId: QUESTION_POST_ID,
          questionForumId: FORUM_1_ID,
          answerForumId: FORUM_2_ID,
        }),
      /must belong to the same Forum/,
    );
  });

  it('SaveOrThrow throws the supplied message when Save() returns false (unauthorized caller / rejected save)', async () => {
    const rejectingEntity = { Save: async () => false };
    await assert.rejects(() => SaveOrThrow(rejectingEntity, 'SAVE_FAILED: did not persist'), /SAVE_FAILED/);
  });

  it('SaveOrThrow resolves cleanly when Save() returns true', async () => {
    const acceptingEntity = { Save: async () => true };
    await assert.doesNotReject(() => SaveOrThrow(acceptingEntity, 'should not throw'));
  });

  it('DeduplicateUUIDsCaseInsensitive dedupes case-insensitively and trims, keeping first-seen order', () => {
    assert.deepEqual(
      DeduplicateUUIDsCaseInsensitive([USER_1, USER_1.toUpperCase(), ` ${USER_2} `, USER_2]),
      [USER_1, USER_2],
    );
    assert.deepEqual(DeduplicateUUIDsCaseInsensitive([]), []);
  });

  // GraduateThreadToSpace's full provider-backed orchestration (actual Space/Task/SpaceMember
  // creation) is not exercised by this DB-less node:test runner — same documented constraint as
  // ApplyCanonPromotion's real persistence and fnCommunityForumAccess. The CONTROL-FLOW structure
  // (prerequisite resolution strictly before any Save(), the reply/authorization rejections, the
  // deterministic role-type preference) is verified directly against the real, uncommented source.
  describe('GraduateThreadToSpace orchestration (static source verification — see comment above)', () => {
    const HERE = dirname(fileURLToPath(import.meta.url));
    const resolversSource = readFileSync(join(HERE, 'resolvers.ts'), 'utf8');

    it('rejects a reply post (ParentPostID set) before resolving anything else', () => {
      assert.match(resolversSource, /if \(rootPost\.ParentPostID !== null\) \{\s*\n\s*throw new Error/);
    });

    it('derives userCanPromoteToSpace server-side from contextUser — never accepts it as a caller-supplied parameter', () => {
      assert.doesNotMatch(resolversSource, /GraduateThreadToSpace\(params: \{[\s\S]{0,400}userCanPromoteToSpace/);
      assert.match(resolversSource, /const userCanPromoteToSpace = await this\.ResolveForumPromoteToSpaceCapability/);
    });

    it('resolves the SpaceType, Space Role Type, and Task Type prerequisites — and throws on any missing one — before the first SaveOrThrow', () => {
      const body = resolversSource.split('private async executeGraduateThreadToSpace')[1] ?? '';
      const firstSaveIndex = body.indexOf('await SaveOrThrow(space,');
      const spaceTypeCheckIndex = body.indexOf("throw new Error(`No Collaboration SpaceType found");
      const roleTypeCheckIndex = body.indexOf('No active Space Role Type is configured');
      const taskTypeCheckIndex = body.indexOf('No Task Type is configured');
      assert.ok(firstSaveIndex > 0, 'could not find the Space SaveOrThrow call');
      assert.ok(spaceTypeCheckIndex > -1 && spaceTypeCheckIndex < firstSaveIndex, 'SpaceType must be resolved before the first save');
      assert.ok(roleTypeCheckIndex > -1 && roleTypeCheckIndex < firstSaveIndex, 'Space Role Type must be resolved before the first save');
      assert.ok(taskTypeCheckIndex > -1 && taskTypeCheckIndex < firstSaveIndex, 'Task Type must be resolved before the first save');
    });

    it('always explicitly sets LinkedTaskID (to the new Task ID or null) — never leaves it unset when no Task was created', () => {
      assert.match(resolversSource, /rootPost\.LinkedTaskID = createStarterTask \? plan\.seededTaskId : null;/);
    });

    it('prefers an active least-privilege ("Member"/"Contributor") Space Role Type and excludes Admin/Owner in fallback', () => {
      assert.match(resolversSource, /IsActive = 1 AND Name IN \('Member', 'Contributor'\)/);
      assert.match(resolversSource, /ExtraFilter: `IsActive = 1 AND IsOwnerRole = 0 AND CanPromoteBand = 0 AND Code NOT IN \('admin', 'owner'\)`/);
      assert.match(resolversSource, /OrderBy: 'Level ASC, Name ASC'/);
    });

    it('rejects caller-widened allowedChildSpaceTypeCodes beyond parent SpaceType policy with zero writes at runtime', async () => {
      let saveCalls = 0;
      const service = new ThreadGraduationService();
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';

      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return {
            ID: ROOT_POST_ID,
            ParentPostID: null,
            ForumID: FORUM_1_ID,
            PromotedToSpaceID: null,
            Save: async () => { saveCalls++; return true; },
          };
        }
        if (entityName === 'MJ_BizApps_Community: Forums') {
          return {
            ID: FORUM_1_ID,
            SpaceID: parentSpaceId,
            Save: async () => { saveCalls++; return true; },
          };
        }
        return {
          Save: async () => { saveCalls++; return true; },
        };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: true, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          return {
            Success: true,
            Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
          };
        }
        return { Success: true, Results: [] };
      });

      const user = new UserInfo(undefined, { ID: USER_1 });
      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              forumId: FORUM_1_ID,
              parentSpaceId,
              targetSpaceTypeCode: 'workspace',
              targetSpaceName: 'Escalated Space',
              includeParticipantUserIds: [USER_1],
              seedInitialTaskTitle: null,
            },
            allowedChildSpaceTypeCodes: ['working-group', 'workspace'],
            contextUser: user,
          }),
        /exceed parent Space Type "community" Children\.AllowedTypeCodes policy/,
      );
      assert.equal(saveCalls, 0);
      mock.restoreAll();
    });

    it('CR-17: ApplyCanonPromotion sets both AIEpistemicStatus and IsAcceptedByAuthor and repairs mismatched AcceptedAnswerPostID', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const prevAnswerId = '99999999-9999-4999-8999-999999999999';
      const txGroup = new InMemoryTransactionGroup();

      const questionRow: {
        ID: string;
        AcceptedAnswerPostID: string | null;
        AICanonAnswerPostID: string | null;
        TransactionGroup?: TransactionGroupBase;
        Save: () => Promise<boolean>;
      } = {
        ID: QUESTION_POST_ID,
        AcceptedAnswerPostID: prevAnswerId,
        AICanonAnswerPostID: ANSWER_POST_ID,
        Save: async () => true,
      };
      const answerRow: {
        ID: string;
        QuestionPostID: string;
        AIEpistemicStatus: string | null;
        IsAcceptedByAuthor: boolean;
        TransactionGroup?: TransactionGroupBase;
        Save: () => Promise<boolean>;
      } = {
        ID: ANSWER_POST_ID,
        QuestionPostID: QUESTION_POST_ID,
        AIEpistemicStatus: 'Canon Verified',
        IsAcceptedByAuthor: false,
        Save: async () => true,
      };
      const prevAnswerRow: {
        ID: string;
        QuestionPostID: string;
        IsAcceptedByAuthor: boolean;
        TransactionGroup?: TransactionGroupBase;
        Save: () => Promise<boolean>;
      } = {
        ID: prevAnswerId,
        QuestionPostID: QUESTION_POST_ID,
        IsAcceptedByAuthor: true,
        Save: async () => true,
      };

      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => txGroup);
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string, key?: CompositeKey) => {
        const keyStr = JSON.stringify(key ?? '');
        if (entityName === 'MJ_BizApps_Community: Forum Question Posts') return questionRow;
        if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
          return keyStr.includes(prevAnswerId) ? prevAnswerRow : answerRow;
        }
        return { ID: QUESTION_POST_ID, ForumID: FORUM_1_ID, AuthorUserID: USER_1, Save: async () => true };
      });

      const res = await service.ApplyCanonPromotion({
        request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
        contextUser: user,
      });

      assert.equal(res.alreadyPromoted, false);
      assert.equal(questionRow.AcceptedAnswerPostID, ANSWER_POST_ID);
      assert.equal(questionRow.AICanonAnswerPostID, ANSWER_POST_ID);
      assert.equal(answerRow.IsAcceptedByAuthor, true);
      assert.equal(prevAnswerRow.IsAcceptedByAuthor, false);
      assert.equal(questionRow.TransactionGroup, txGroup);
      assert.equal(answerRow.TransactionGroup, txGroup);
      assert.equal(prevAnswerRow.TransactionGroup, txGroup);
      assert.equal(txGroup.submitCalls, 1);
      mock.restoreAll();

      // Without atomic TransactionGroup support, ApplyCanonPromotion must fail closed
      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => {
        throw new Error('No TransactionGroup');
      });
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Question Posts') {
          return { ID: QUESTION_POST_ID, AcceptedAnswerPostID: null, AICanonAnswerPostID: null, Save: async () => true };
        }
        if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
          return { ID: ANSWER_POST_ID, QuestionPostID: QUESTION_POST_ID, AIEpistemicStatus: 'Unverified', IsAcceptedByAuthor: false, Save: async () => true };
        }
        return { ID: QUESTION_POST_ID, ForumID: FORUM_1_ID, AuthorUserID: USER_1, Save: async () => true };
      });
      await assert.rejects(
        () =>
          service.ApplyCanonPromotion({
            request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
            contextUser: user,
          }),
        /Atomic transaction support is required for Canon promotion/,
      );
      mock.restoreAll();
    });

    it('CR-18: GraduateThreadToSpace rolls back Space/Task on late failure and uses deterministic IDs', async () => {
      const id1 = BuildDeterministicGraduationUUID('space', ROOT_POST_ID);
      const id2 = BuildDeterministicGraduationUUID('space', ROOT_POST_ID.toUpperCase());
      assert.equal(id1, id2);
      assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      let deletedSpaces = 0;

      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return {
            ID: ROOT_POST_ID,
            ParentPostID: null,
            ForumID: FORUM_1_ID,
            PromotedToSpaceID: null,
            LinkedTaskID: null,
            Save: async () => false, // simulate late rootPost failure after Space created
          };
        }
        if (entityName === 'MJ_BizApps_Community: Forums') {
          return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => true };
        }
        if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
          return {
            Save: async () => true,
            Delete: async () => { deletedSpaces++; return true; },
          };
        }
        return { Save: async () => true, Delete: async () => true };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string; ExtraFilter?: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: true, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          if (query.ExtraFilter?.includes(parentSpaceId)) {
            return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
          }
          return { Success: true, Results: [] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          if (query.ExtraFilter?.includes(parentSpaceTypeId)) {
            return {
              Success: true,
              Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
            };
          }
          return { Success: true, Results: [{ ID: 'st-wg' }] };
        }
        return { Success: true, Results: [] };
      });

      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              forumId: FORUM_1_ID,
              parentSpaceId,
              targetSpaceTypeCode: 'working-group',
              targetSpaceName: 'Atomic Test Group',
              includeParticipantUserIds: [],
              seedInitialTaskTitle: null,
            },
            contextUser: user,
          }),
        /Failed to persist graduation onto root Forum Post/,
      );
      assert.equal(deletedSpaces, 1);
      mock.restoreAll();
    });

    it('CR-19: ResolveLeastPrivilegeSpaceRoleTypeId refuses to fall back to admin/owner roles', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      let saveCalls = 0;

      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return { ID: ROOT_POST_ID, ParentPostID: null, ForumID: FORUM_1_ID, PromotedToSpaceID: null, Save: async () => { saveCalls++; return true; } };
        }
        if (entityName === 'MJ_BizApps_Community: Forums') {
          return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => { saveCalls++; return true; } };
        }
        return { Save: async () => { saveCalls++; return true; } };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string; ExtraFilter?: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: true, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          if (query.ExtraFilter?.includes(parentSpaceTypeId)) {
            return {
              Success: true,
              Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
            };
          }
          return { Success: true, Results: [{ ID: 'st-wg' }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Role Types') {
          // Simulate an org where ONLY Administrator exists (excluded by IsOwnerRole=0 / CanPromoteBand=0 / Code NOT IN)
          assert.ok(
            query.ExtraFilter?.includes("Name IN ('Member', 'Contributor')") ||
              (query.ExtraFilter?.includes('IsOwnerRole = 0') && query.ExtraFilter?.includes("Code NOT IN ('admin', 'owner')")),
          );
          return { Success: true, Results: [] };
        }
        return { Success: true, Results: [] };
      });

      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              forumId: FORUM_1_ID,
              parentSpaceId,
              targetSpaceTypeCode: 'working-group',
              targetSpaceName: 'Escalated Space',
              includeParticipantUserIds: [USER_2],
              seedInitialTaskTitle: null,
            },
            contextUser: user,
          }),
        /No active Space Role Type is configured/,
      );
      assert.equal(saveCalls, 0);
      mock.restoreAll();
    });
  });

  it('serializes custom DocumentBlocks with plain-text fallbacks for MJ Collaborative Docs', () => {
    const block = CommunityDocumentBlocks.CreateCanonAnswerBlock({
      questionPostId: 'q-1',
      answerPostId: 'a-1',
      questionTitle: 'When does ASC 606 apply to multi-year chapter dues?',
      answerMarkdown: 'Recognize performance obligations ratably over the membership term.',
      epistemicStatus: 'Canon Verified',
      verifiedByDisplayName: 'Elena Rostova, CPA',
    });

    assert.equal(block.blockType, 'community-canon-answer');
    assert.match(block.plainTextFallback, /Canon Verified/);
  });

  describe('CommunityGraduationResolver GraphQL mutations', () => {
    it('rejects unauthenticated requests on both GraduateCommunityThread and PromoteCommunityAnswerToCanon', async () => {
      const resolver = new CommunityGraduationResolver();
      mock.method(resolver, 'GetUserFromPayload', () => null);
      const unauthContext: Pick<AppContext, 'userPayload'> = {
        userPayload: { email: '', userRecord: null, sessionId: '' },
      };

      const gradRes = await resolver.GraduateCommunityThread(
        {
          RootPostID: ROOT_POST_ID,
          TargetSpaceTypeCode: 'working-group',
          TargetSpaceName: 'Tax Working Group',
        },
        unauthContext,
      );
      assert.equal(gradRes.Success, false);
      assert.match(gradRes.ErrorMessage ?? '', /authenticated user/i);

      const canonRes = await resolver.PromoteCommunityAnswerToCanon(
        {
          QuestionPostID: QUESTION_POST_ID,
          CanonAnswerPostID: ANSWER_POST_ID,
        },
        unauthContext,
      );
      assert.equal(canonRes.Success, false);
      assert.match(canonRes.ErrorMessage ?? '', /authenticated user/i);
      mock.restoreAll();
    });

    it('GraduateCommunityThread delegates to ThreadGraduationService.GraduateThreadToSpace with contextUser', async () => {
      const resolver = new CommunityGraduationResolver();
      const user = new UserInfo(undefined, { ID: USER_1 });
      mock.method(resolver, 'GetUserFromPayload', () => user);

      let capturedContextUserId: string | null = null;
      let capturedRootPostId: string | null = null;
      mock.method(
        ThreadGraduationService.prototype,
        'GraduateThreadToSpace',
        async (params: {
          request: { rootPostId: string };
          contextUser: UserInfo;
        }) => {
          capturedContextUserId = params.contextUser.ID;
          capturedRootPostId = params.request.rootPostId;
          return {
            promotedToSpaceId: EXISTING_SPACE_ID,
            targetSpaceTypeCode: 'working-group',
            seededTaskId: '11111111-1111-4111-8111-111111111111',
            invitedParticipantCount: 2,
          };
        },
      );

      const res = await resolver.GraduateCommunityThread(
        {
          RootPostID: ROOT_POST_ID,
          TargetSpaceTypeCode: 'working-group',
          TargetSpaceName: 'Tax Working Group',
          SeedInitialTaskTitle: 'Draft charter',
          IncludeParticipantUserIDs: [USER_1, USER_2],
        },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );
      mock.restoreAll();

      assert.equal(res.Success, true);
      assert.equal(res.PromotedToSpaceID, EXISTING_SPACE_ID);
      assert.equal(res.TargetSpaceTypeCode, 'working-group');
      assert.equal(res.SeededTaskID, '11111111-1111-4111-8111-111111111111');
      assert.equal(res.InvitedParticipantCount, 2);
      assert.equal(capturedContextUserId, USER_1);
      assert.equal(capturedRootPostId, ROOT_POST_ID);
    });

    it('GraduateCommunityThread returns Success: false when service rejects unauthorized caller', async () => {
      const resolver = new CommunityGraduationResolver();
      const user = new UserInfo(undefined, { ID: USER_2 });
      mock.method(resolver, 'GetUserFromPayload', () => user);
      mock.method(ThreadGraduationService.prototype, 'GraduateThreadToSpace', async () => {
        throw new Error('Current member does not hold the CanPromoteToSpace capability in this forum.');
      });

      const res = await resolver.GraduateCommunityThread(
        {
          RootPostID: ROOT_POST_ID,
          TargetSpaceTypeCode: 'working-group',
          TargetSpaceName: 'Unauthorized Group',
        },
        { userPayload: { email: 'u2@example.com', userRecord: user, sessionId: 's-2' } },
      );
      mock.restoreAll();

      assert.equal(res.Success, false);
      assert.match(res.ErrorMessage ?? '', /CanPromoteToSpace/);
    });

    it('PromoteCommunityAnswerToCanon delegates to ThreadGraduationService.ApplyCanonPromotion with contextUser', async () => {
      const resolver = new CommunityGraduationResolver();
      const user = new UserInfo(undefined, { ID: USER_1 });
      mock.method(resolver, 'GetUserFromPayload', () => user);

      let capturedQuestionId: string | null = null;
      let capturedAnswerId: string | null = null;
      let capturedUserId: string | null = null;
      mock.method(
        ThreadGraduationService.prototype,
        'ApplyCanonPromotion',
        async (params: {
          request: { questionPostId: string; canonAnswerPostId: string };
          contextUser: UserInfo;
        }) => {
          capturedQuestionId = params.request.questionPostId;
          capturedAnswerId = params.request.canonAnswerPostId;
          capturedUserId = params.contextUser.ID;
          return {
            questionPostId: params.request.questionPostId,
            canonAnswerPostId: params.request.canonAnswerPostId,
            alreadyPromoted: false,
          };
        },
      );

      const res = await resolver.PromoteCommunityAnswerToCanon(
        {
          QuestionPostID: QUESTION_POST_ID,
          CanonAnswerPostID: ANSWER_POST_ID,
        },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );
      mock.restoreAll();

      assert.equal(res.Success, true);
      assert.equal(res.QuestionPostID, QUESTION_POST_ID);
      assert.equal(res.CanonAnswerPostID, ANSWER_POST_ID);
      assert.equal(res.AlreadyPromoted, false);
      assert.equal(capturedQuestionId, QUESTION_POST_ID);
      assert.equal(capturedAnswerId, ANSWER_POST_ID);
      assert.equal(capturedUserId, USER_1);
    });

    it('PromoteCommunityAnswerToCanon returns Success: false when ApplyCanonPromotion denies permission', async () => {
      const resolver = new CommunityGraduationResolver();
      const user = new UserInfo(undefined, { ID: USER_2 });
      mock.method(resolver, 'GetUserFromPayload', () => user);
      mock.method(ThreadGraduationService.prototype, 'ApplyCanonPromotion', async () => {
        throw new Error('Only the question author or a forum moderator may promote an answer to Knowledge Canon.');
      });

      const res = await resolver.PromoteCommunityAnswerToCanon(
        {
          QuestionPostID: QUESTION_POST_ID,
          CanonAnswerPostID: ANSWER_POST_ID,
        },
        { userPayload: { email: 'u2@example.com', userRecord: user, sessionId: 's-2' } },
      );
      mock.restoreAll();

      assert.equal(res.Success, false);
      assert.match(res.ErrorMessage ?? '', /question author or a forum moderator/i);
    });

    it('ToggleCommunityPostReaction rejects unauthenticated or invalid PostID and toggles reactions cleanly', async () => {
      const resolver = new CommunityGraduationResolver();
      mock.method(resolver, 'GetUserFromPayload', () => null);
      const unauthRes = await resolver.ToggleCommunityPostReaction(
        { PostID: ROOT_POST_ID, ReactionType: 'Upvote' },
        { userPayload: { email: '', userRecord: null, sessionId: '' } },
      );
      assert.equal(unauthRes.Success, false);
      assert.match(unauthRes.ErrorMessage ?? '', /authenticated user/i);
      mock.restoreAll();

      const user = new UserInfo(undefined, { ID: USER_1 });
      mock.method(resolver, 'GetUserFromPayload', () => user);
      const badIdRes = await resolver.ToggleCommunityPostReaction(
        { PostID: SQL_INJECTION, ReactionType: 'Upvote' },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );
      assert.equal(badIdRes.Success, false);
      assert.match(badIdRes.ErrorMessage ?? '', /UUID/i);

      // Toggle ON when no existing reaction exists
      let saveCalls = 0;
      let deleteCalls = 0;
      mock.method(RunView.prototype, 'RunView', async () => ({ Success: true, Results: [] }));
      mock.method(Metadata.prototype, 'GetEntityObject', async () => ({
        PostID: '',
        UserID: '',
        ReactionKind: 'Upvote',
        Save: async () => { saveCalls++; return true; },
      }));
      const toggleOn = await resolver.ToggleCommunityPostReaction(
        { PostID: ROOT_POST_ID, ReactionType: 'Upvote' },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );
      assert.equal(toggleOn.Success, true);
      assert.equal(toggleOn.Reacted, true);
      assert.equal(saveCalls, 1);
      mock.restoreAll();

      // Toggle OFF when existing reaction exists
      mock.method(resolver, 'GetUserFromPayload', () => user);
      mock.method(RunView.prototype, 'RunView', async () => ({
        Success: true,
        Results: [{ ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
      }));
      mock.method(Metadata.prototype, 'GetEntityObject', async () => ({
        Delete: async () => { deleteCalls++; return true; },
      }));
      const toggleOff = await resolver.ToggleCommunityPostReaction(
        { PostID: ROOT_POST_ID, ReactionType: 'Upvote' },
        { userPayload: { email: 'u@example.com', userRecord: user, sessionId: 's-1' } },
      );
      assert.equal(toggleOff.Success, true);
      assert.equal(toggleOff.Reacted, false);
      assert.equal(deleteCalls, 1);
      mock.restoreAll();
    });
  });

  describe('ThreadGraduationService — Idempotency, Transaction Atomicity & Permission Edge Cases', () => {
    it('returns alreadyGraduated: true with zero writes when PromotedToSpaceID is already set on the root post', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      let saveCalls = 0;

      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return {
            ID: ROOT_POST_ID,
            ParentPostID: null,
            ForumID: FORUM_1_ID,
            PromotedToSpaceID: EXISTING_SPACE_ID,
            LinkedTaskID: null,
            Save: async () => { saveCalls++; return true; },
          };
        }
        if (entityName === 'MJ_BizApps_Community: Forums') {
          return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => { saveCalls++; return true; } };
        }
        return { Save: async () => { saveCalls++; return true; } };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: false, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          return {
            Success: true,
            Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
          };
        }
        return { Success: true, Results: [] };
      });

      try {
        const res = await service.GraduateThreadToSpace({
          request: {
            rootPostId: ROOT_POST_ID,
            targetSpaceTypeCode: 'working-group',
            targetSpaceName: 'Already Graduated WG',
            seedInitialTaskTitle: 'Should Not Seed',
            includeParticipantUserIds: [USER_1, USER_2],
          },
          contextUser: user,
        });
        assert.equal(res.alreadyGraduated, true);
        assert.equal(res.promotedToSpaceId, EXISTING_SPACE_ID);
        assert.equal(res.seededTaskId, null);
        assert.equal(res.invitedParticipantCount, 0);
        assert.equal(saveCalls, 0);
      } finally {
        mock.restoreAll();
      }
    });

    it('recovers idempotently from an interrupted prior run where deterministic Space/Task/Members already exist', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      const expectedSpaceId = BuildDeterministicGraduationUUID('space', ROOT_POST_ID);
      const expectedTaskId = BuildDeterministicGraduationUUID('task', ROOT_POST_ID);
      const txGroup = new InMemoryTransactionGroup();

      let spaceSaves = 0;
      let taskSaves = 0;
      const savedMemberUserIds: string[] = [];
      const rootPostState = {
        ID: ROOT_POST_ID,
        ParentPostID: null,
        ForumID: FORUM_1_ID,
        Title: 'Recovery Thread',
        BodyMarkdown: 'Recovering partial run',
        SummaryMarkdown: 'Existing summary',
        PromotedToSpaceID: null as string | null,
        LinkedTaskID: null as string | null,
        Save: async () => true,
      };

      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => txGroup);
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') return rootPostState;
        if (entityName === 'MJ_BizApps_Community: Forums') return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => true };
        if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
          return { Save: async () => { spaceSaves++; return true; } };
        }
        if (entityName === 'MJ: Tasks') {
          return { Save: async () => { taskSaves++; return true; } };
        }
        if (entityName === 'MJ_BizApps_Collaboration: Space Members') {
          const rec = {
            UserID: '',
            Save: async () => { savedMemberUserIds.push(rec.UserID); return true; },
          };
          return rec;
        }
        return { Save: async () => true };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string; ExtraFilter?: string }) => {
        const filter = query.ExtraFilter ?? '';
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: false, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          if (filter.includes(parentSpaceId)) {
            return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
          }
          // Deterministic Space already exists from interrupted prior run
          return { Success: true, Results: [{ ID: expectedSpaceId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          if (filter.includes(parentSpaceTypeId)) {
            return {
              Success: true,
              Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
            };
          }
          return { Success: true, Results: [{ ID: 'st-wg' }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Role Types') {
          return { Success: true, Results: [{ ID: 'srt-member' }] };
        }
        if (query.EntityName === 'MJ: Task Types') {
          return { Success: true, Results: [{ ID: 'tt-1' }] };
        }
        if (query.EntityName === 'MJ: Tasks') {
          // Deterministic Task already exists
          return { Success: true, Results: [{ ID: expectedTaskId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Members') {
          // USER_1 already invited; USER_2 still missing
          return { Success: true, Results: [{ UserID: USER_1 }] };
        }
        return { Success: true, Results: [] };
      });

      try {
        const res = await service.GraduateThreadToSpace({
          request: {
            rootPostId: ROOT_POST_ID,
            targetSpaceTypeCode: 'working-group',
            targetSpaceName: 'Recovered WG',
            seedInitialTaskTitle: 'Task 1',
            includeParticipantUserIds: [USER_1, USER_2],
          },
          contextUser: user,
        });
        assert.equal(res.promotedToSpaceId, expectedSpaceId);
        assert.equal(res.seededTaskId, expectedTaskId);
        assert.equal(spaceSaves, 0, 'existing deterministic Space must not be re-created');
        assert.equal(taskSaves, 0, 'existing deterministic Task must not be re-created');
        assert.deepEqual(savedMemberUserIds, [USER_2], 'only missing participant USER_2 is invited');
        assert.equal(rootPostState.PromotedToSpaceID, expectedSpaceId);
        assert.equal(rootPostState.LinkedTaskID, expectedTaskId);
        assert.equal(txGroup.submitCalls, 1);
      } finally {
        mock.restoreAll();
      }
    });

    it('rolls back non-transactional Space, Task, and SpaceMember in reverse order on late failure', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      const deleteOrder: string[] = [];

      // Simulate environment without TransactionGroup support
      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => {
        throw new Error('No TransactionGroup');
      });
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return {
            ID: ROOT_POST_ID,
            ParentPostID: null,
            ForumID: FORUM_1_ID,
            Title: 'Rollback Thread',
            BodyMarkdown: 'Body',
            SummaryMarkdown: 'Summary',
            PromotedToSpaceID: null,
            LinkedTaskID: null,
            Save: async () => false, // fails at final step
          };
        }
        if (entityName === 'MJ_BizApps_Community: Forums') {
          return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => true };
        }
        if (entityName === 'MJ_BizApps_Collaboration: Spaces') {
          return {
            Save: async () => true,
            Delete: async () => { deleteOrder.push('space'); return true; },
          };
        }
        if (entityName === 'MJ: Tasks') {
          return {
            Save: async () => true,
            Delete: async () => { deleteOrder.push('task'); return true; },
          };
        }
        if (entityName === 'MJ_BizApps_Collaboration: Space Members') {
          return {
            Save: async () => true,
            Delete: async () => { deleteOrder.push('member'); return true; },
          };
        }
        return { Save: async () => true };
      });

      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string; ExtraFilter?: string }) => {
        const filter = query.ExtraFilter ?? '';
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: false, CanPromoteToSpace: true }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          return filter.includes(parentSpaceId)
            ? { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] }
            : { Success: true, Results: [] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          return filter.includes(parentSpaceTypeId)
            ? { Success: true, Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }] }
            : { Success: true, Results: [{ ID: 'st-wg' }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Role Types') {
          return { Success: true, Results: [{ ID: 'srt-member' }] };
        }
        if (query.EntityName === 'MJ: Task Types') {
          return { Success: true, Results: [{ ID: 'tt-1' }] };
        }
        return { Success: true, Results: [] };
      });

      try {
        await assert.rejects(
          () =>
            service.GraduateThreadToSpace({
              request: {
                rootPostId: ROOT_POST_ID,
                targetSpaceTypeCode: 'working-group',
                targetSpaceName: 'Reverse Rollback Space',
                seedInitialTaskTitle: 'Task 1',
                includeParticipantUserIds: [USER_2],
              },
              contextUser: user,
            }),
          /Failed to persist graduation onto root Forum Post/,
        );
        assert.deepEqual(deleteOrder, ['member', 'task', 'space']);
      } finally {
        mock.restoreAll();
      }
    });

    it('enforces server-side CanPromoteToSpace, root-only graduation, and author/moderator Canon promotion permissions', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const nonAuthorUser = new UserInfo(undefined, { ID: USER_2 });
      const parentSpaceId = 'cccccccc-3333-4333-8333-333333333333';
      const parentSpaceTypeId = 'dddddddd-4444-4444-8444-444444444444';
      const roleTypeId = 'eeeeeeee-5555-4555-8555-555555555555';
      let saveCalls = 0;

      // 1. Reply post cannot be graduated
      mock.method(Metadata.prototype, 'GetEntityObject', async () => ({
        ID: ROOT_POST_ID,
        ParentPostID: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        ForumID: FORUM_1_ID,
        Save: async () => { saveCalls++; return true; },
      }));
      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              targetSpaceTypeCode: 'working-group',
              targetSpaceName: 'Reply Graduation',
              includeParticipantUserIds: [],
            },
            contextUser: user,
          }),
        /only a root post may be graduated/i,
      );
      mock.restoreAll();

      // 2. Member with CanModerateQueue=true but CanPromoteToSpace=false is rejected
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Posts') {
          return { ID: ROOT_POST_ID, ParentPostID: null, ForumID: FORUM_1_ID, PromotedToSpaceID: null, Save: async () => { saveCalls++; return true; } };
        }
        return { ID: FORUM_1_ID, SpaceID: parentSpaceId, Save: async () => { saveCalls++; return true; } };
      });
      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: true, CanPromoteToSpace: false }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Spaces') {
          return { Success: true, Results: [{ ID: parentSpaceId, SpaceTypeID: parentSpaceTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Collaboration: Space Types') {
          return {
            Success: true,
            Results: [{ ID: parentSpaceTypeId, Code: 'community', Configuration: JSON.stringify({ Children: { AllowedTypeCodes: ['working-group'] } }) }],
          };
        }
        return { Success: true, Results: [] };
      });

      await assert.rejects(
        () =>
          service.GraduateThreadToSpace({
            request: {
              rootPostId: ROOT_POST_ID,
              targetSpaceTypeCode: 'working-group',
              targetSpaceName: 'Denied WG',
              includeParticipantUserIds: [],
            },
            contextUser: user,
          }),
        /CanPromoteToSpace/,
      );
      mock.restoreAll();

      // 3. ApplyCanonPromotion: non-author, non-moderator is rejected with zero writes; author is allowed & idempotent
      const txGroup = new InMemoryTransactionGroup();
      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => txGroup);
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Question Posts') {
          return {
            ID: QUESTION_POST_ID,
            AcceptedAnswerPostID: ANSWER_POST_ID,
            AICanonAnswerPostID: ANSWER_POST_ID,
            Save: async () => { saveCalls++; return true; },
          };
        }
        if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
          return {
            ID: ANSWER_POST_ID,
            QuestionPostID: QUESTION_POST_ID,
            AIEpistemicStatus: 'Canon Verified',
            IsAcceptedByAuthor: true,
            Save: async () => { saveCalls++; return true; },
          };
        }
        // AuthorUserID is USER_1
        return { ID: QUESTION_POST_ID, ForumID: FORUM_1_ID, AuthorUserID: USER_1, Save: async () => { saveCalls++; return true; } };
      });
      mock.method(RunView.prototype, 'RunView', async (query: { EntityName: string }) => {
        if (query.EntityName === 'MJ_BizApps_Community: Forum Members') {
          return { Success: true, Results: [{ ForumRoleTypeID: roleTypeId }] };
        }
        if (query.EntityName === 'MJ_BizApps_Community: Forum Role Types') {
          return { Success: true, Results: [{ CanModerateQueue: false, CanPromoteToSpace: false }] };
        }
        return { Success: true, Results: [] };
      });

      // Non-author non-moderator rejected
      await assert.rejects(
        () =>
          service.ApplyCanonPromotion({
            request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
            contextUser: nonAuthorUser,
          }),
        /Only the question author or a forum moderator/,
      );

      // Author (even without CanModerateQueue) succeeds idempotently with 0 transaction writes
      const idempotentRes = await service.ApplyCanonPromotion({
        request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
        contextUser: user,
      });
      assert.equal(idempotentRes.alreadyPromoted, true);
      assert.equal(txGroup.submitCalls, 0);
      assert.equal(saveCalls, 0);
      mock.restoreAll();
    });

    it('ApplyCanonPromotion fails when TransactionGroup.Submit() returns false', async () => {
      const service = new ThreadGraduationService();
      const user = new UserInfo(undefined, { ID: USER_1 });
      const failingTxGroup = new InMemoryTransactionGroup();
      failingTxGroup.Submit = async () => false;

      mock.method(Metadata.prototype, 'CreateTransactionGroup', async () => failingTxGroup);
      mock.method(Metadata.prototype, 'GetEntityObject', async (entityName: string) => {
        if (entityName === 'MJ_BizApps_Community: Forum Question Posts') {
          return { ID: QUESTION_POST_ID, AcceptedAnswerPostID: null, AICanonAnswerPostID: null, Save: async () => true };
        }
        if (entityName === 'MJ_BizApps_Community: Forum Answer Posts') {
          return { ID: ANSWER_POST_ID, QuestionPostID: QUESTION_POST_ID, AIEpistemicStatus: 'Unverified', IsAcceptedByAuthor: false, Save: async () => true };
        }
        return { ID: QUESTION_POST_ID, ForumID: FORUM_1_ID, AuthorUserID: USER_1, Save: async () => true };
      });

      try {
        await assert.rejects(
          () =>
            service.ApplyCanonPromotion({
              request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
              contextUser: user,
            }),
          /Transactional commit failed/,
        );
      } finally {
        mock.restoreAll();
      }
    });
  });

  it('exports RESOLVER_PATHS including generated entity GraphQL resolvers and custom Community resolvers', () => {
    assert.ok(Array.isArray(RESOLVER_PATHS), 'RESOLVER_PATHS must be an array');
    assert.ok(
      RESOLVER_PATHS.some((p: string) => p.endsWith('/generated/generated.{js,ts}')),
      `RESOLVER_PATHS must include generated/generated.{js,ts}: ${JSON.stringify(RESOLVER_PATHS)}`,
    );
    assert.ok(
      RESOLVER_PATHS.some((p: string) => p.endsWith('/resolvers.{js,ts}')),
      `RESOLVER_PATHS must include resolvers.{js,ts}: ${JSON.stringify(RESOLVER_PATHS)}`,
    );
  });
});
