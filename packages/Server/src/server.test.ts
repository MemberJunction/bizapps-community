import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CommunityDocumentBlocks,
  CommunityPublicEdgeService,
  LoadBizAppsCommunityServer,
  ThreadGraduationService,
} from './index.ts';

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
        rootPostId: 'thread-42',
        targetSpaceTypeCode: 'working-group',
        targetSpaceName: 'AI Policy Working Group',
        seedInitialTaskTitle: 'Draft v1 Charter',
        includeParticipantUserIds: ['u-1', 'u-2', 'u-1'],
      },
      allowedChildSpaceTypeCodes: ['working-group', 'cohort', 'project'],
      userCanPromoteToSpace: true,
    });

    assert.equal(result.targetSpaceTypeCode, 'working-group');
    assert.equal(result.invitedParticipantCount, 2);
    assert.equal(result.seededTaskId, 'task-thread-42');
  });

  it('is idempotent: re-graduating an already-promoted thread returns the existing Space without re-seeding a Task', () => {
    const graduation = new ThreadGraduationService();
    const result = graduation.ValidateAndBuildGraduationPlan({
      request: {
        rootPostId: 'thread-42',
        targetSpaceTypeCode: 'working-group',
        targetSpaceName: 'AI Policy Working Group',
        seedInitialTaskTitle: 'Draft v1 Charter',
        includeParticipantUserIds: ['u-1', 'u-2'],
      },
      allowedChildSpaceTypeCodes: ['working-group', 'cohort', 'project'],
      userCanPromoteToSpace: true,
      currentPromotedToSpaceId: 'space-already-created-123',
    });

    assert.equal(result.promotedToSpaceId, 'space-already-created-123');
    assert.equal(result.seededTaskId, null);
    assert.equal(result.invitedParticipantCount, 0);
  });

  it('rejects graduation into a SpaceType not in AllowedTypeCodes', () => {
    const graduation = new ThreadGraduationService();
    assert.throws(
      () =>
        graduation.ValidateAndBuildGraduationPlan({
          request: {
            rootPostId: 'thread-42',
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
            rootPostId: 'thread-42',
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

  it('promotes an answer to Knowledge Canon, access-checked and idempotent', () => {
    const graduation = new ThreadGraduationService();

    const firstPromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: 'q-1', canonAnswerPostId: 'ans-1' },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: null,
    });
    assert.equal(firstPromotion.alreadyPromoted, false);

    const rePromotion = graduation.ValidateAndBuildCanonPromotion({
      request: { questionPostId: 'q-1', canonAnswerPostId: 'ans-1' },
      isQuestionAuthorOrModerator: true,
      currentAICanonAnswerPostId: 'ans-1',
    });
    assert.equal(rePromotion.alreadyPromoted, true);

    assert.throws(
      () =>
        graduation.ValidateAndBuildCanonPromotion({
          request: { questionPostId: 'q-1', canonAnswerPostId: 'ans-1' },
          isQuestionAuthorOrModerator: false,
          currentAICanonAnswerPostId: null,
        }),
      /Only the question author or a forum moderator/,
    );
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
