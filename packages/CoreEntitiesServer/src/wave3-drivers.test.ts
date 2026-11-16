import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  AMAPostServerDriver,
  AnswerPostServerDriver,
  CasePostServerDriver,
  CaseRoundsForumServerDriver,
  ForumDriverRegistry,
  IdeaPostServerDriver,
  InteractivePostServerDriver,
  FormPostServerDriver,
  LiveEventsForumServerDriver,
  LoadBizAppsCommunityCoreEntitiesServer,
  PlaybooksForumServerDriver,
  PostDriverRegistry,
  type ForumPostValidationContext,
  type IForumPostSummary,
  type IForumSummary,
  type IForumTypeDescriptor,
} from '../dist/index.js';

const BASE_FORUM: IForumSummary = {
  ID: 'f-1',
  SpaceID: 's-1',
  ParentForumID: null,
  ForumTypeID: 'ft-1',
  Slug: 'wave3-forum',
  Name: 'Wave 3 Forum',
  Description: null,
  Icon: null,
  ColorHex: null,
  VisibilityBand: 'Shared',
  AnonymousReadMode: null,
  InheritsSpaceMembers: true,
  PostingPolicy: 'Open',
  InboundEmailAlias: null,
  Sequence: 10,
  Status: 'Active',
  Configuration: null,
};

function makePost(overrides: Partial<IForumPostSummary>): IForumPostSummary {
  return {
    ID: 'p-1',
    ForumID: BASE_FORUM.ID,
    PostTypeID: 'pt-1',
    RootPostID: null,
    ParentPostID: null,
    ReplyDepth: 0,
    AuthorUserID: 'u-1',
    AuthorPersonID: null,
    AuthorAgentID: null,
    Title: 'Sample',
    Slug: 'sample',
    BodyMarkdown: 'Body',
    SummaryMarkdown: null,
    SummaryGeneratedAt: null,
    SummaryReplyWatermark: 0,
    VisibilityBand: 'Shared',
    Status: 'Published',
    IsPinned: false,
    IsLocked: false,
    IsFeatured: false,
    ReplyCount: 0,
    ParticipantCount: 1,
    ReactionScore: 0,
    ViewCount: 0,
    LastActivityAt: new Date(),
    PromotedToSpaceID: null,
    LinkedTaskID: null,
    ...overrides,
  };
}

function makeForumType(overrides: Partial<IForumTypeDescriptor>): IForumTypeDescriptor {
  return {
    ID: 'ft-1',
    Code: 'wave3',
    Name: 'Wave 3',
    Description: null,
    Icon: null,
    ServerDriverClass: null,
    UIDriverClass: null,
    ExtensionEntity: null,
    Configuration: null,
    Sequence: 10,
    IsActive: true,
    ...overrides,
  };
}

function makeCtx(postTypeCode: string, rootPostId: string | null = null): ForumPostValidationContext {
  return {
    forum: BASE_FORUM,
    forumType: makeForumType({}),
    currentUserId: 'u-1',
    post: makePost({ RootPostID: rootPostId }),
    postTypeCode,
  };
}

describe('@mj-biz-apps/community-core-entities-server Wave 3 drivers', () => {
  beforeEach(() => {
    ForumDriverRegistry.Instance.Clear();
    PostDriverRegistry.Instance.Clear();
    LoadBizAppsCommunityCoreEntitiesServer();
  });

  describe('New Forum drivers resolve by DriverClass and by ForumType.Code', () => {
    it('resolves PlaybooksForumServerDriver and restricts root posts to Artifact subtypes', async () => {
      const driver = ForumDriverRegistry.Instance.Resolve({
        Code: 'playbooks-and-docs',
        ServerDriverClass: 'PlaybooksForumServerDriver',
      });
      assert.ok(driver instanceof PlaybooksForumServerDriver);

      assert.equal((await driver!.ValidatePostInForum(makeCtx('collaborative-doc'))).allowed, true);
      const rejected = await driver!.ValidatePostInForum(makeCtx('discussion'));
      assert.equal(rejected.allowed, false);
      assert.match(rejected.reason ?? '', /Document, Spreadsheet, or Presentation/);
    });

    it('resolves CaseRoundsForumServerDriver and restricts root posts to Peer Case Review', async () => {
      const driver = ForumDriverRegistry.Instance.Resolve({
        Code: 'peer-case-rounds',
        ServerDriverClass: 'CaseRoundsForumServerDriver',
      });
      assert.ok(driver instanceof CaseRoundsForumServerDriver);
      assert.equal((await driver!.ValidatePostInForum(makeCtx('case-review'))).allowed, true);
      assert.equal((await driver!.ValidatePostInForum(makeCtx('discussion'))).allowed, false);
    });

    it('resolves LiveEventsForumServerDriver and restricts root posts to Live AMA or Question', async () => {
      const driver = ForumDriverRegistry.Instance.Resolve({
        Code: 'live-events-and-amas',
        ServerDriverClass: 'LiveEventsForumServerDriver',
      });
      assert.ok(driver instanceof LiveEventsForumServerDriver);
      assert.equal((await driver!.ValidatePostInForum(makeCtx('live-ama'))).allowed, true);
      assert.equal((await driver!.ValidatePostInForum(makeCtx('question'))).allowed, true);
      assert.equal((await driver!.ValidatePostInForum(makeCtx('discussion'))).allowed, false);
    });

    it('replies (non-root posts) are not restricted by post-type in Wave 3 forum drivers', async () => {
      const driver = ForumDriverRegistry.Instance.Resolve({
        Code: 'peer-case-rounds',
        ServerDriverClass: 'CaseRoundsForumServerDriver',
      });
      assert.equal((await driver!.ValidatePostInForum(makeCtx('comment', 'root-1'))).allowed, true);
    });
  });

  describe('IdeaPostServerDriver.ValidateAllocationChange (quadratic voting)', () => {
    it('allows a fresh allocation within budget and computes EffectiveVotes = sqrt(points)', () => {
      const driver = new IdeaPostServerDriver();
      const result = driver.ValidateAllocationChange({
        campaign: { AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
        existingAllocations: [],
        ideaPost: { ID: 'idea-1' },
        newPointsAllocated: 49,
      });
      assert.equal(result.valid, true);
      assert.equal(result.effectiveVotesByIdea['idea-1'], 7);
    });

    it('refunds the prior spend on the same idea before re-checking the budget on revision', () => {
      const driver = new IdeaPostServerDriver();
      const result = driver.ValidateAllocationChange({
        campaign: { AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
        existingAllocations: [{ IdeaPostID: 'idea-1', PointsAllocated: 81 }],
        ideaPost: { ID: 'idea-1' },
        newPointsAllocated: 16,
      });
      assert.equal(result.valid, true);
      assert.equal(result.totalPointsUsed, 16);
    });

    it('rejects an allocation that would exceed the 100-Point Wallet across other ideas', () => {
      const driver = new IdeaPostServerDriver();
      const result = driver.ValidateAllocationChange({
        campaign: { AllocationMode: 'Point Allocation', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
        existingAllocations: [{ IdeaPostID: 'idea-2', PointsAllocated: 90 }],
        ideaPost: { ID: 'idea-1' },
        newPointsAllocated: 20,
      });
      assert.equal(result.valid, false);
    });

    it('rejects a negative or zero-forcing allocation attempt distinctly from a full-refund removal', () => {
      const driver = new IdeaPostServerDriver();
      assert.equal(
        driver.ValidateAllocationChange({
          campaign: { AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
          existingAllocations: [],
          ideaPost: { ID: 'idea-1' },
          newPointsAllocated: -10,
        }).valid,
        false,
      );
      const removal = driver.ValidateAllocationChange({
        campaign: { AllocationMode: 'Quadratic', DefaultBudgetPoints: 100, MaxPointsPerIdea: null },
        existingAllocations: [{ IdeaPostID: 'idea-1', PointsAllocated: 25 }],
        ideaPost: { ID: 'idea-1' },
        newPointsAllocated: 0,
      });
      assert.equal(removal.valid, true);
      assert.equal(removal.totalPointsUsed, 0);
    });
  });

  describe('AnswerPostServerDriver.ValidateAcceptedAnswerChange', () => {
    it('allows the question author to accept an answer when none is accepted yet', () => {
      const driver = new AnswerPostServerDriver();
      const decision = driver.ValidateAcceptedAnswerChange({
        answerPostId: 'ans-1',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: null,
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, true);
    });

    it('rejects accepting a second answer while another is already accepted', () => {
      const driver = new AnswerPostServerDriver();
      const decision = driver.ValidateAcceptedAnswerChange({
        answerPostId: 'ans-2',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: 'ans-1',
        isQuestionAuthor: true,
      });
      assert.equal(decision.allowed, false);
    });

    it('rejects a non-author trying to accept an answer', () => {
      const driver = new AnswerPostServerDriver();
      const decision = driver.ValidateAcceptedAnswerChange({
        answerPostId: 'ans-1',
        settingAccepted: true,
        currentlyAcceptedAnswerPostId: null,
        isQuestionAuthor: false,
      });
      assert.equal(decision.allowed, false);
    });
  });

  describe('FormPostServerDriver.ValidatePollResponse', () => {
    it('enforces single-choice polls and accepts valid multi-choice responses', () => {
      const driver = new FormPostServerDriver();
      assert.equal(
        driver.ValidatePollResponse({
          allowMultipleSelections: false,
          availableOptionIds: ['a', 'b'],
          selectedOptionIds: ['a', 'b'],
        }).allowed,
        false,
      );
      assert.equal(
        driver.ValidatePollResponse({
          allowMultipleSelections: true,
          availableOptionIds: ['a', 'b'],
          selectedOptionIds: ['a', 'b'],
        }).allowed,
        true,
      );
    });
  });

  describe('InteractivePostServerDriver attempt limits & session scoring', () => {
    it('enforces MaxAttemptsPerMember and resolves the Best Score session', () => {
      const driver = new InteractivePostServerDriver();
      const decision = driver.ValidateAttempt({
        interactivePost: { MaxAttemptsPerMember: 2 },
        existingSessions: [{ AttemptNumber: 1 }, { AttemptNumber: 2 }],
      });
      assert.equal(decision.allowed, false);

      const best = driver.ResolveLeaderboardSession({
        interactivePost: { ScoringMode: 'Best Score' },
        sessions: [
          { AttemptNumber: 1, Score: 10, DurationSeconds: 30, Completed: true },
          { AttemptNumber: 2, Score: 95, DurationSeconds: 25, Completed: true },
        ],
      });
      assert.equal(best?.attemptNumber, 2);
    });
  });

  describe('New Post drivers resolve by DriverClass and by PostType.Code', () => {
    it('resolves CasePostServerDriver for case-review', () => {
      const driver = PostDriverRegistry.Instance.Resolve({
        Code: 'case-review',
        ServerDriverClass: 'CasePostServerDriver',
      });
      assert.ok(driver instanceof CasePostServerDriver);
    });

    it('resolves AMAPostServerDriver for live-ama', () => {
      const driver = PostDriverRegistry.Instance.Resolve({
        Code: 'live-ama',
        ServerDriverClass: 'AMAPostServerDriver',
      });
      assert.ok(driver instanceof AMAPostServerDriver);
    });
  });
});
