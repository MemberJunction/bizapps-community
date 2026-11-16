import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CommunityDocumentBlocks,
  CommunityPublicEdgeService,
  LoadBizAppsCommunityServer,
  ThreadGraduationService,
} from './index.ts';

const ROOT_POST_ID = '23acc7cf-c227-4d33-8bb1-2558d9729711';
const USER_1 = 'e128dd44-893f-4f2b-829f-6b9bb333d9a3';
const USER_2 = '49cfc209-95a9-4d2f-875f-0ba5df5ea205';
const EXISTING_SPACE_ID = 'ff1d29fc-6392-41b1-a86e-c23a178102c9';
const QUESTION_POST_ID = '7b860684-f57e-4915-bd52-340f019562a1';
const ANSWER_POST_ID = '6ee7db14-5a44-44c0-b771-60849abf2afa';
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
    });
    assert.equal(firstPromotion.alreadyPromoted, false);

    const rePromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: ANSWER_POST_ID,
    });
    assert.equal(rePromotion.alreadyPromoted, true);

    // Mixed-case regression: the SAME UUID value, differently cased, is still "already promoted" (UUIDsEqual, not ===).
    const mixedCaseRePromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: ANSWER_POST_ID.toUpperCase(),
    });
    assert.equal(mixedCaseRePromotion.alreadyPromoted, true);

    assert.throws(
      () =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: ANSWER_POST_ID },
          isQuestionAuthorOrModerator: false,
          currentAICanonAnswerPostId: null,
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
        }),
      );
      assert.throws(() =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: QUESTION_POST_ID, canonAnswerPostId: badId },
          isQuestionAuthorOrModerator: true,
          currentAICanonAnswerPostId: null,
        }),
      );
    }
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
});
