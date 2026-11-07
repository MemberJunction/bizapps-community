import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  CommunityEngine,
  CommunitySpaceServerDriver,
  ForumDriverRegistry,
  LoadBizAppsCommunityCoreEntitiesServer,
  PostDriverRegistry,
  type IForumPostSummary,
  type IForumSummary,
  type IForumTypeDescriptor,
  type IPostTypeDescriptor,
} from '../dist/index.js';

const QA_FORUM_TYPE: IForumTypeDescriptor = {
  ID: 'C8A17100-4E12-4B8F-9A10-100000000002',
  Code: 'qa-knowledge-base',
  Name: 'Q&A Knowledge Base',
  Description: null,
  Icon: 'fa-solid fa-circle-question',
  ServerDriverClass: 'QAForumServerDriver',
  UIDriverClass: 'QAForumUIDriver',
  ExtensionEntity: null,
  Configuration:
    '{"Posts":{"AllowedPostTypeCodes":["question","answer","comment"],"DefaultRootPostTypeCode":"question","MaxReplyDepth":2},"ForumOverridable":["Synthesis.AutoSummarizeThreshold"]}',
  Sequence: 20,
  IsActive: true,
};

const QUESTION_POST_TYPE: IPostTypeDescriptor = {
  ID: 'C8A17200-4E12-4B8F-9A10-100000000004',
  Code: 'question',
  Name: 'Question',
  Description: null,
  Icon: 'fa-solid fa-circle-question',
  ServerDriverClass: 'QuestionPostServerDriver',
  UIDriverClass: 'QuestionPostUIDriver',
  ExtensionEntity: 'MJ_BizApps_Community: Forum Question Posts',
  PlacementRule: 'Root Only',
  AllowsNestedReplies: true,
  TriggersThreadSynthesis: true,
  IndexedInCorpus: true,
  Configuration: null,
  Sequence: 40,
  IsActive: true,
};

const SAMPLE_FORUM: IForumSummary = {
  ID: 'f-1',
  SpaceID: 's-1',
  ParentForumID: null,
  ForumTypeID: QA_FORUM_TYPE.ID,
  Slug: 'regulatory-qa',
  Name: 'Regulatory Q&A',
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
    ForumID: SAMPLE_FORUM.ID,
    PostTypeID: QUESTION_POST_TYPE.ID,
    RootPostID: null,
    ParentPostID: null,
    ReplyDepth: 0,
    AuthorUserID: 'u-1',
    AuthorPersonID: null,
    AuthorAgentID: null,
    Title: 'How do we handle multi-state nexus thresholds?',
    Slug: 'multi-state-nexus-thresholds',
    BodyMarkdown: 'Looking for the current threshold table.',
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

describe('@mj-biz-apps/community-core-entities-server drivers and engine', () => {
  beforeEach(() => {
    ForumDriverRegistry.Instance.Clear();
    PostDriverRegistry.Instance.Clear();
    LoadBizAppsCommunityCoreEntitiesServer();
    CommunityEngine.Instance.HydrateMetadata({
      forumTypes: [QA_FORUM_TYPE],
      postTypes: [QUESTION_POST_TYPE],
    });
  });

  it('resolves QAForumServerDriver and enforces Question root posts vs Answer/Comment replies', async () => {
    const driver = ForumDriverRegistry.Instance.Resolve(QA_FORUM_TYPE);
    assert.ok(driver, 'Expected QAForumServerDriver to resolve');

    const validRoot = await driver.ValidatePostInForum({
      forum: SAMPLE_FORUM,
      forumType: QA_FORUM_TYPE,
      currentUserId: 'u-1',
      post: makePost({ RootPostID: null }),
      postTypeCode: 'question',
    });
    assert.equal(validRoot.allowed, true);

    const invalidRoot = await driver.ValidatePostInForum({
      forum: SAMPLE_FORUM,
      forumType: QA_FORUM_TYPE,
      currentUserId: 'u-1',
      post: makePost({ RootPostID: null }),
      postTypeCode: 'discussion',
    });
    assert.equal(invalidRoot.allowed, false);
    assert.match(invalidRoot.reason ?? '', /Question post type/);
  });

  it('resolves QuestionPostServerDriver and rejects Question posts used as replies', async () => {
    const postDriver = PostDriverRegistry.Instance.Resolve(QUESTION_POST_TYPE);
    assert.ok(postDriver, 'Expected QuestionPostServerDriver to resolve');

    const asReply = await postDriver.ValidatePostChange({
      post: makePost({ RootPostID: 'root-1', ParentPostID: 'root-1', ReplyDepth: 1 }),
      postType: QUESTION_POST_TYPE,
      forum: SAMPLE_FORUM,
      currentUserId: 'u-1',
    });
    assert.equal(asReply.allowed, false);
    assert.match(asReply.reason ?? '', /top-level root post/);
  });

  it('validates CommunitySpace slugs and builds Space Agent context summaries', () => {
    const spaceDriver = new CommunitySpaceServerDriver();
    assert.equal(spaceDriver.ValidateCommunitySlug('global-tax-leaders').allowed, true);
    assert.equal(spaceDriver.ValidateCommunitySlug('Invalid Slug!').allowed, false);

    const agentContext = spaceDriver.BuildCommunityAgentContext({
      spaceName: 'Global Tax Leaders',
      slug: 'global-tax-leaders',
      activeForumCount: 5,
      canonAnswerCount: 42,
    });
    assert.match(agentContext.summary, /Global Tax Leaders/);
    assert.equal(agentContext.data.canonAnswerCount, 42);
  });
});
