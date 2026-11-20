import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  BaseEntity,
  CompositeKey,
  EntityDeleteOptions,
  EntityInfo,
  EntitySaveOptions,
  Metadata,
  RunView,
  UserInfo,
  type IEntityDataProvider,
  type IRunViewProvider,
  type RecordChange,
  type RunViewParams,
  type RunViewResult,
} from '@memberjunction/core';
import { MJGlobal, UUIDsEqual } from '@memberjunction/global';
import {
  COMMUNITY_ENTITY_NAMES,
  type IForumRoleTypeDescriptor,
  type IForumTypeDescriptor,
  type IPostTypeDescriptor,
  mjBizAppsCommunityCommunityMemberProfileEntity,
  type mjBizAppsCommunityForumAnswerPostEntity,
  type mjBizAppsCommunityForumEntity,
  type mjBizAppsCommunityForumIdeaCampaignEntity,
  mjBizAppsCommunityForumIdeaPostEntity,
  type mjBizAppsCommunityForumMemberEntity,
  type mjBizAppsCommunityForumPostEntity,
  type mjBizAppsCommunityForumPostReactionEntity,
  mjBizAppsCommunityForumTopicTagEntity,
} from '@mj-biz-apps/community-entities';
import {
  BasePostServerDriver,
  COMMUNITY_SYNTHESIS_REFRESH_EVENT_CODE,
  CommunityEngine,
  ForumAnswerPostServerEntity,
  ForumDriverRegistry,
  ForumIdeaAllocationServerEntity,
  ForumPostReactionServerEntity,
  ForumPostServerEntity,
  ForumPostTagServerEntity,
  LoadBizAppsCommunityCoreEntitiesServer,
  PostDriverRegistry,
  type PostDriverContext,
  type PostReplyChangeContext,
  type SynthesisRefreshCheckResult,
} from '../dist/index.js';

const TEST_ROLE_ID = '11111111-1111-4111-8111-111111111111';
const SPACE_1_ID = '22222222-2222-4222-8222-222222222201';
const SPACE_2_ID = '22222222-2222-4222-8222-222222222202';
const USER_1_ID = '33333333-3333-4333-8333-333333333301';
const USER_2_ID = '33333333-3333-4333-8333-333333333302';
const USER_MOD_ID = '33333333-3333-4333-8333-333333333303';
const USER_MUTED_ID = '33333333-3333-4333-8333-333333333304';
const FORUM_OPEN_ID = '44444444-4444-4444-8444-444444444401';
const FORUM_MOD_ID = '44444444-4444-4444-8444-444444444402';
const FORUM_RO_ID = '44444444-4444-4444-8444-444444444403';
const FORUM_ARCHIVED_ID = '44444444-4444-4444-8444-444444444404';
const FORUM_IDEA_ID = '44444444-4444-4444-8444-444444444405';
const FORUM_IDEA_CLOSED_ID = '44444444-4444-4444-8444-444444444406';
const FORUM_PRIVATE_ID = '44444444-4444-4444-8444-444444444407';
const FORUM_QA_2_ID = '44444444-4444-4444-8444-444444444408';

const FORUM_TYPE_GENERAL_ID = '55555555-5555-4555-8555-555555555501';
const FORUM_TYPE_QA_ID = '55555555-5555-4555-8555-555555555502';
const FORUM_TYPE_IDEA_ID = '55555555-5555-4555-8555-555555555503';

const POST_TYPE_DISCUSSION_ID = '66666666-6666-4666-8666-666666666601';
const POST_TYPE_REPLY_ID = '66666666-6666-4666-8666-666666666602';
const POST_TYPE_QUESTION_ID = '66666666-6666-4666-8666-666666666603';
const POST_TYPE_ANSWER_ID = '66666666-6666-4666-8666-666666666604';

const ROLE_CONTRIB_ID = '77777777-7777-4777-8777-777777777701';
const ROLE_MOD_ID = '77777777-7777-4777-8777-777777777702';
const ROLE_EXPERT_ID = '77777777-7777-4777-8777-777777777703';
const ROLE_OBSERVER_ID = '77777777-7777-4777-8777-777777777704';

const ROOT_POST_1_ID = '88888888-8888-4888-8888-888888888801';
const LOCKED_ROOT_ID = '88888888-8888-4888-8888-888888888802';
const QUESTION_1_ID = '88888888-8888-4888-8888-888888888803';
const QUESTION_OTHER_FORUM_ID = '88888888-8888-4888-8888-888888888804';
const ANSWER_1_ID = '88888888-8888-4888-8888-888888888805';
const ANSWER_2_ID = '88888888-8888-4888-8888-888888888806';
const IDEA_1_ID = '88888888-8888-4888-8888-888888888807';
const IDEA_2_ID = '88888888-8888-4888-8888-888888888808';

const TAG_SPACE_1_ID = '99999999-9999-4999-8999-999999999901';
const TAG_SPACE_2_ID = '99999999-9999-4999-8999-999999999902';

interface ForumRecord {
  ID: string;
  SpaceID: string;
  ParentForumID: string | null;
  ForumTypeID: string;
  Slug: string;
  Name: string;
  Description: string | null;
  Icon: string | null;
  ColorHex: string | null;
  VisibilityBand: mjBizAppsCommunityForumEntity['VisibilityBand'];
  AnonymousReadMode: mjBizAppsCommunityForumEntity['AnonymousReadMode'];
  InheritsSpaceMembers: boolean;
  PostingPolicy: mjBizAppsCommunityForumEntity['PostingPolicy'];
  InboundEmailAlias: string | null;
  Sequence: number;
  Status: mjBizAppsCommunityForumEntity['Status'];
  Configuration: string | null;
}

interface ForumMemberRecord {
  ID: string;
  ForumID: string;
  UserID: string;
  ForumRoleTypeID: string;
  Status: mjBizAppsCommunityForumMemberEntity['Status'];
}

interface ForumPostRecord {
  ID: string;
  ForumID: string;
  PostTypeID: string;
  RootPostID: string | null;
  ParentPostID: string | null;
  ReplyDepth: number;
  AuthorUserID: string | null;
  AuthorPersonID: string | null;
  AuthorAgentID: string | null;
  Title: string | null;
  Slug: string | null;
  BodyMarkdown: string;
  SummaryMarkdown: string | null;
  SummaryGeneratedAt: Date | null;
  SummaryReplyWatermark: number;
  VisibilityBand: mjBizAppsCommunityForumPostEntity['VisibilityBand'];
  Status: mjBizAppsCommunityForumPostEntity['Status'];
  IsPinned: boolean;
  IsLocked: boolean;
  IsFeatured: boolean;
  ReplyCount: number;
  ParticipantCount: number;
  ReactionScore: number;
  ViewCount: number;
  LastActivityAt: Date;
  PromotedToSpaceID: string | null;
  LinkedTaskID: string | null;
}

interface ForumAnswerPostRecord {
  ID: string;
  QuestionPostID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  VerifiedByUserID: string | null;
  VerifiedAt: Date | null;
  AIEpistemicStatus: mjBizAppsCommunityForumAnswerPostEntity['AIEpistemicStatus'];
  AIConfidenceScore: number | null;
  AIRationaleMarkdown: string | null;
  FreshnessReviewDueAt: Date | null;
}

interface ForumIdeaCampaignRecord {
  ID: string;
  DefaultBudgetPoints: number;
  AllocationMode: mjBizAppsCommunityForumIdeaCampaignEntity['AllocationMode'];
  MaxPointsPerIdea: number | null;
  SubmissionsCloseAt: Date | null;
  VotingClosesAt: Date | null;
}

interface ForumIdeaPostRecord {
  ID: string;
  IdeaStatus: mjBizAppsCommunityForumIdeaPostEntity['IdeaStatus'];
  TotalPointsAllocated: number;
  EffectiveQuadraticVotes: number;
  UniqueBackerCount: number;
  TargetReleaseOrQuarter: string | null;
  StatusRationaleMarkdown: string | null;
  MergedIntoIdeaPostID: string | null;
}

interface ForumIdeaAllocationRecord {
  ID: string;
  IdeaPostID: string;
  UserID: string;
  PointsAllocated: number;
  QuadraticVotes: number;
  RationaleComment: string | null;
}

interface ForumPostReactionRecord {
  ID: string;
  PostID: string;
  UserID: string;
  ReactionKind: mjBizAppsCommunityForumPostReactionEntity['ReactionKind'];
  Weight: number;
}

interface ForumTopicTagRecord {
  ID: string;
  SpaceID: string;
  ParentTagID: string | null;
  TagID: string | null;
  Slug: string;
  Name: string;
  Description: string | null;
  ColorHex: string | null;
  IsOfficial: boolean;
  PostCount: number;
}

interface ForumPostTagRecord {
  ID: string;
  PostID: string;
  TopicTagID: string;
  AssignedByAI: boolean;
}

interface MemberProfileRecord {
  ID: string;
  SpaceID: string;
  UserID: string;
  PersonID: string | null;
  BioMarkdown: string | null;
  ExpertiseTagsJSON: string | null;
  HelpfulAnswerCount: number;
  AcceptedAnswerCount: number;
  ReputationScore: number;
  DigestCadence: mjBizAppsCommunityCommunityMemberProfileEntity['DigestCadence'];
  OpenToPeerMentoring: boolean;
}

const FORUM_TYPES: IForumTypeDescriptor[] = [
  {
    ID: FORUM_TYPE_GENERAL_ID,
    Code: 'general-discussion',
    Name: 'General Discussion',
    Description: null,
    Icon: null,
    ServerDriverClass: null,
    UIDriverClass: null,
    ExtensionEntity: null,
    Configuration: JSON.stringify({
      Posts: { AllowedPostTypeCodes: ['discussion', 'reply'], DefaultRootPostTypeCode: 'discussion', MaxReplyDepth: 2 },
      Synthesis: { AutoSummarizeThreshold: 3 },
    }),
    Sequence: 10,
    IsActive: true,
  },
  {
    ID: FORUM_TYPE_QA_ID,
    Code: 'qa-knowledge-base',
    Name: 'Q&A Knowledge Base',
    Description: null,
    Icon: null,
    ServerDriverClass: 'QAForumServerDriver',
    UIDriverClass: null,
    ExtensionEntity: null,
    Configuration: null,
    Sequence: 20,
    IsActive: true,
  },
  {
    ID: FORUM_TYPE_IDEA_ID,
    Code: 'ideation-campaign',
    Name: 'Ideation Campaign',
    Description: null,
    Icon: null,
    ServerDriverClass: 'IdeaCampaignForumServerDriver',
    UIDriverClass: null,
    ExtensionEntity: COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns,
    Configuration: null,
    Sequence: 30,
    IsActive: true,
  },
];

const POST_TYPES: IPostTypeDescriptor[] = [
  {
    ID: POST_TYPE_DISCUSSION_ID,
    Code: 'discussion',
    Name: 'Discussion',
    Description: null,
    Icon: null,
    ServerDriverClass: null,
    UIDriverClass: null,
    ExtensionEntity: null,
    PlacementRule: 'Root Only',
    AllowsNestedReplies: true,
    TriggersThreadSynthesis: true,
    IndexedInCorpus: true,
    Configuration: null,
    Sequence: 10,
    IsActive: true,
  },
  {
    ID: POST_TYPE_REPLY_ID,
    Code: 'reply',
    Name: 'Reply',
    Description: null,
    Icon: null,
    ServerDriverClass: null,
    UIDriverClass: null,
    ExtensionEntity: null,
    PlacementRule: 'Reply Only',
    AllowsNestedReplies: true,
    TriggersThreadSynthesis: true,
    IndexedInCorpus: true,
    Configuration: null,
    Sequence: 20,
    IsActive: true,
  },
  {
    ID: POST_TYPE_QUESTION_ID,
    Code: 'question',
    Name: 'Question',
    Description: null,
    Icon: null,
    ServerDriverClass: 'QuestionPostServerDriver',
    UIDriverClass: null,
    ExtensionEntity: COMMUNITY_ENTITY_NAMES.ForumQuestionPosts,
    PlacementRule: 'Root Only',
    AllowsNestedReplies: true,
    TriggersThreadSynthesis: true,
    IndexedInCorpus: true,
    Configuration: null,
    Sequence: 30,
    IsActive: true,
  },
  {
    ID: POST_TYPE_ANSWER_ID,
    Code: 'answer',
    Name: 'Answer',
    Description: null,
    Icon: null,
    ServerDriverClass: 'AnswerPostServerDriver',
    UIDriverClass: null,
    ExtensionEntity: COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
    PlacementRule: 'Reply Only',
    AllowsNestedReplies: true,
    TriggersThreadSynthesis: true,
    IndexedInCorpus: true,
    Configuration: null,
    Sequence: 40,
    IsActive: true,
  },
];

const ROLE_TYPES: IForumRoleTypeDescriptor[] = [
  {
    ID: ROLE_CONTRIB_ID,
    Code: 'contributor',
    Name: 'Contributor',
    Description: null,
    Level: 200,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: false,
    CanVerifyCanon: false,
    CanPromoteToSpace: false,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: false,
    VoteWeightMultiplier: 1,
    Sequence: 50,
    IsActive: true,
  },
  {
    ID: ROLE_MOD_ID,
    Code: 'moderator',
    Name: 'Moderator',
    Description: null,
    Level: 800,
    CanConfigureForum: false,
    CanModerateQueue: true,
    CanPinOrLock: true,
    CanAcceptAnswers: true,
    CanVerifyCanon: true,
    CanPromoteToSpace: true,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1,
    Sequence: 20,
    IsActive: true,
  },
  {
    ID: ROLE_EXPERT_ID,
    Code: 'expert-reviewer',
    Name: 'Expert Reviewer',
    Description: null,
    Level: 500,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: true,
    CanVerifyCanon: true,
    CanPromoteToSpace: false,
    CanCreateRootPost: true,
    CanReply: true,
    CanCoEditDocs: true,
    VoteWeightMultiplier: 1.25,
    Sequence: 40,
    IsActive: true,
  },
  {
    ID: ROLE_OBSERVER_ID,
    Code: 'observer',
    Name: 'Observer',
    Description: null,
    Level: 100,
    CanConfigureForum: false,
    CanModerateQueue: false,
    CanPinOrLock: false,
    CanAcceptAnswers: false,
    CanVerifyCanon: false,
    CanPromoteToSpace: false,
    CanCreateRootPost: false,
    CanReply: false,
    CanCoEditDocs: false,
    VoteWeightMultiplier: 0,
    Sequence: 60,
    IsActive: true,
  },
];

function makeTestUser(id: string): UserInfo {
  return new UserInfo(undefined, {
    ID: id,
    Name: `User-${id.slice(-4)}`,
    Email: 'user@example.com',
    UserRoles: [{ RoleID: TEST_ROLE_ID, Role: 'Developer', UserID: id }],
  });
}

function buildEntityInfo(entityName: string, fieldNames: string[]): EntityInfo {
  return new EntityInfo({
    ID: `entity-${entityName}`,
    Name: entityName,
    Status: 'Active',
    AllowCreateAPI: true,
    AllowUpdateAPI: true,
    AllowDeleteAPI: true,
    BaseTable: entityName,
    BaseView: entityName,
    EntityFields: fieldNames.map((name) => ({
      ID: `field-${entityName}-${name}`,
      Name: name,
      DisplayName: name,
      IsPrimaryKey: name === 'ID',
      AllowsNull: true,
      Type: 'nvarchar',
      AllowUpdateAPI: true,
    })),
    EntityPermissions: [
      {
        RoleID: TEST_ROLE_ID,
        CanCreate: true,
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
      },
    ],
  });
}

const ENTITY_INFOS: Record<string, EntityInfo> = {
  [COMMUNITY_ENTITY_NAMES.ForumPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPosts, [
    'ID',
    'ForumID',
    'PostTypeID',
    'RootPostID',
    'ParentPostID',
    'ReplyDepth',
    'AuthorUserID',
    'AuthorPersonID',
    'AuthorAgentID',
    'Title',
    'Slug',
    'BodyMarkdown',
    'SummaryMarkdown',
    'SummaryGeneratedAt',
    'SummaryReplyWatermark',
    'VisibilityBand',
    'Status',
    'IsPinned',
    'IsLocked',
    'IsFeatured',
    'ReplyCount',
    'ParticipantCount',
    'ReactionScore',
    'ViewCount',
    'LastActivityAt',
    'PromotedToSpaceID',
    'LinkedTaskID',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumAnswerPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, [
    'ID',
    'QuestionPostID',
    'IsAcceptedByAuthor',
    'IsVerifiedByModerator',
    'VerifiedByUserID',
    'VerifiedAt',
    'AIEpistemicStatus',
    'AIConfidenceScore',
    'AIRationaleMarkdown',
    'FreshnessReviewDueAt',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, [
    'ID',
    'IdeaPostID',
    'UserID',
    'PointsAllocated',
    'QuadraticVotes',
    'RationaleComment',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumIdeaPosts]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumIdeaPosts, [
    'ID',
    'IdeaStatus',
    'TotalPointsAllocated',
    'EffectiveQuadraticVotes',
    'UniqueBackerCount',
    'TargetReleaseOrQuarter',
    'StatusRationaleMarkdown',
    'MergedIntoIdeaPostID',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumPostReactions]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPostReactions, [
    'ID',
    'PostID',
    'UserID',
    'ReactionKind',
    'Weight',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumPostTags]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumPostTags, [
    'ID',
    'PostID',
    'TopicTagID',
    'AssignedByAI',
  ]),
  [COMMUNITY_ENTITY_NAMES.ForumTopicTags]: buildEntityInfo(COMMUNITY_ENTITY_NAMES.ForumTopicTags, [
    'ID',
    'SpaceID',
    'ParentTagID',
    'TagID',
    'Slug',
    'Name',
    'Description',
    'ColorHex',
    'IsOfficial',
    'PostCount',
  ]),
  [COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles]: buildEntityInfo(
    COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles,
    [
      'ID',
      'SpaceID',
      'UserID',
      'PersonID',
      'BioMarkdown',
      'ExpertiseTagsJSON',
      'HelpfulAnswerCount',
      'AcceptedAnswerCount',
      'ReputationScore',
      'DigestCadence',
      'OpenToPeerMentoring',
    ],
  ),
};

interface InMemoryDatabase {
  forums: ForumRecord[];
  forumMembers: ForumMemberRecord[];
  posts: ForumPostRecord[];
  answerPosts: ForumAnswerPostRecord[];
  ideaCampaigns: ForumIdeaCampaignRecord[];
  ideaPosts: ForumIdeaPostRecord[];
  ideaAllocations: ForumIdeaAllocationRecord[];
  postReactions: ForumPostReactionRecord[];
  topicTags: ForumTopicTagRecord[];
  postTags: ForumPostTagRecord[];
  memberProfiles: MemberProfileRecord[];
}

function createSeededDb(): InMemoryDatabase {
  const now = new Date('2026-11-17T12:00:00Z');
  return {
    forums: [
      {
        ID: FORUM_OPEN_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_GENERAL_ID,
        Slug: 'open-general',
        Name: 'Open General',
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
      },
      {
        ID: FORUM_MOD_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_GENERAL_ID,
        Slug: 'moderated-general',
        Name: 'Moderated General',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Moderated',
        InboundEmailAlias: null,
        Sequence: 20,
        Status: 'Active',
        Configuration: null,
      },
      {
        ID: FORUM_RO_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_GENERAL_ID,
        Slug: 'readonly-announcements',
        Name: 'Announcements',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'ReadOnly',
        InboundEmailAlias: null,
        Sequence: 30,
        Status: 'Active',
        Configuration: null,
      },
      {
        ID: FORUM_ARCHIVED_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_GENERAL_ID,
        Slug: 'archived-forum',
        Name: 'Archived Forum',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
        InboundEmailAlias: null,
        Sequence: 40,
        Status: 'Archived',
        Configuration: null,
      },
      {
        ID: FORUM_IDEA_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_IDEA_ID,
        Slug: 'roadmap-ideas',
        Name: 'Roadmap Ideas',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
        InboundEmailAlias: null,
        Sequence: 50,
        Status: 'Active',
        Configuration: null,
      },
      {
        ID: FORUM_IDEA_CLOSED_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_IDEA_ID,
        Slug: 'closed-ideas',
        Name: 'Closed Ideas',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
        InboundEmailAlias: null,
        Sequence: 60,
        Status: 'Active',
        Configuration: null,
      },
      {
        ID: FORUM_PRIVATE_ID,
        SpaceID: SPACE_1_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_GENERAL_ID,
        Slug: 'private-forum',
        Name: 'Private Forum',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'PrivateForum',
        AnonymousReadMode: null,
        InheritsSpaceMembers: false,
        PostingPolicy: 'Open',
        InboundEmailAlias: null,
        Sequence: 70,
        Status: 'Active',
        Configuration: null,
      },
      {
        ID: FORUM_QA_2_ID,
        SpaceID: SPACE_2_ID,
        ParentForumID: null,
        ForumTypeID: FORUM_TYPE_QA_ID,
        Slug: 'qa-space-2',
        Name: 'Space 2 Q&A',
        Description: null,
        Icon: null,
        ColorHex: null,
        VisibilityBand: 'Shared',
        AnonymousReadMode: null,
        InheritsSpaceMembers: true,
        PostingPolicy: 'Open',
        InboundEmailAlias: null,
        Sequence: 80,
        Status: 'Active',
        Configuration: null,
      },
    ],
    forumMembers: [
      { ID: 'aaaaaaaa-0000-4000-8000-000000000001', ForumID: FORUM_OPEN_ID, UserID: USER_1_ID, ForumRoleTypeID: ROLE_CONTRIB_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000002', ForumID: FORUM_OPEN_ID, UserID: USER_2_ID, ForumRoleTypeID: ROLE_EXPERT_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000003', ForumID: FORUM_OPEN_ID, UserID: USER_MOD_ID, ForumRoleTypeID: ROLE_MOD_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000004', ForumID: FORUM_OPEN_ID, UserID: USER_MUTED_ID, ForumRoleTypeID: ROLE_CONTRIB_ID, Status: 'Muted' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000005', ForumID: FORUM_MOD_ID, UserID: USER_1_ID, ForumRoleTypeID: ROLE_CONTRIB_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000006', ForumID: FORUM_MOD_ID, UserID: USER_MOD_ID, ForumRoleTypeID: ROLE_MOD_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000007', ForumID: FORUM_RO_ID, UserID: USER_1_ID, ForumRoleTypeID: ROLE_CONTRIB_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000008', ForumID: FORUM_RO_ID, UserID: USER_MOD_ID, ForumRoleTypeID: ROLE_MOD_ID, Status: 'Active' },
      { ID: 'aaaaaaaa-0000-4000-8000-000000000009', ForumID: FORUM_OPEN_ID, UserID: '33333333-3333-4333-8333-333333333305', ForumRoleTypeID: ROLE_OBSERVER_ID, Status: 'Active' },
    ],
    posts: [
      {
        ID: ROOT_POST_1_ID,
        ForumID: FORUM_OPEN_ID,
        PostTypeID: POST_TYPE_DISCUSSION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Open Thread',
        Slug: 'open-thread',
        BodyMarkdown: 'Root thread body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: LOCKED_ROOT_ID,
        ForumID: FORUM_OPEN_ID,
        PostTypeID: POST_TYPE_DISCUSSION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_MOD_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Locked Thread',
        Slug: 'locked-thread',
        BodyMarkdown: 'Locked body',
        SummaryMarkdown: null,
        SummaryGeneratedAt: null,
        SummaryReplyWatermark: 0,
        VisibilityBand: 'Shared',
        Status: 'Published',
        IsPinned: false,
        IsLocked: true,
        IsFeatured: false,
        ReplyCount: 0,
        ParticipantCount: 1,
        ReactionScore: 0,
        ViewCount: 0,
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: QUESTION_1_ID,
        ForumID: FORUM_OPEN_ID,
        PostTypeID: POST_TYPE_QUESTION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Question 1',
        Slug: 'question-1',
        BodyMarkdown: 'How does this work?',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: QUESTION_OTHER_FORUM_ID,
        ForumID: FORUM_QA_2_ID,
        PostTypeID: POST_TYPE_QUESTION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Other Forum Question',
        Slug: 'other-forum-question',
        BodyMarkdown: 'In forum 2',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: ANSWER_1_ID,
        ForumID: FORUM_OPEN_ID,
        PostTypeID: POST_TYPE_ANSWER_ID,
        RootPostID: QUESTION_1_ID,
        ParentPostID: QUESTION_1_ID,
        ReplyDepth: 1,
        AuthorUserID: USER_2_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: null,
        Slug: null,
        BodyMarkdown: 'Answer 1 body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: ANSWER_2_ID,
        ForumID: FORUM_OPEN_ID,
        PostTypeID: POST_TYPE_ANSWER_ID,
        RootPostID: QUESTION_1_ID,
        ParentPostID: QUESTION_1_ID,
        ReplyDepth: 1,
        AuthorUserID: USER_2_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: null,
        Slug: null,
        BodyMarkdown: 'Answer 2 body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: IDEA_1_ID,
        ForumID: FORUM_IDEA_ID,
        PostTypeID: POST_TYPE_DISCUSSION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Idea 1',
        Slug: 'idea-1',
        BodyMarkdown: 'Idea 1 body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: IDEA_2_ID,
        ForumID: FORUM_IDEA_ID,
        PostTypeID: POST_TYPE_DISCUSSION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Idea 2',
        Slug: 'idea-2',
        BodyMarkdown: 'Idea 2 body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
      {
        ID: '88888888-8888-4888-8888-888888888809',
        ForumID: FORUM_IDEA_CLOSED_ID,
        PostTypeID: POST_TYPE_DISCUSSION_ID,
        RootPostID: null,
        ParentPostID: null,
        ReplyDepth: 0,
        AuthorUserID: USER_1_ID,
        AuthorPersonID: null,
        AuthorAgentID: null,
        Title: 'Closed Campaign Idea',
        Slug: 'closed-idea',
        BodyMarkdown: 'Closed idea body',
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
        LastActivityAt: now,
        PromotedToSpaceID: null,
        LinkedTaskID: null,
      },
    ],
    answerPosts: [],
    ideaCampaigns: [
      {
        ID: FORUM_IDEA_ID,
        DefaultBudgetPoints: 100,
        AllocationMode: 'Quadratic',
        MaxPointsPerIdea: 64,
        SubmissionsCloseAt: null,
        VotingClosesAt: new Date(Date.now() + 86_400_000),
      },
      {
        ID: FORUM_IDEA_CLOSED_ID,
        DefaultBudgetPoints: 100,
        AllocationMode: 'Quadratic',
        MaxPointsPerIdea: 100,
        SubmissionsCloseAt: null,
        VotingClosesAt: new Date(Date.now() - 86_400_000),
      },
    ],
    ideaPosts: [
      {
        ID: IDEA_1_ID,
        IdeaStatus: 'Under Consideration',
        TotalPointsAllocated: 0,
        EffectiveQuadraticVotes: 0,
        UniqueBackerCount: 0,
        TargetReleaseOrQuarter: null,
        StatusRationaleMarkdown: null,
        MergedIntoIdeaPostID: null,
      },
      {
        ID: IDEA_2_ID,
        IdeaStatus: 'Under Consideration',
        TotalPointsAllocated: 0,
        EffectiveQuadraticVotes: 0,
        UniqueBackerCount: 0,
        TargetReleaseOrQuarter: null,
        StatusRationaleMarkdown: null,
        MergedIntoIdeaPostID: null,
      },
    ],
    ideaAllocations: [],
    postReactions: [],
    topicTags: [
      {
        ID: TAG_SPACE_1_ID,
        SpaceID: SPACE_1_ID,
        ParentTagID: null,
        TagID: null,
        Slug: 'tax-policy',
        Name: 'Tax Policy',
        Description: null,
        ColorHex: null,
        IsOfficial: true,
        PostCount: 0,
      },
      {
        ID: TAG_SPACE_2_ID,
        SpaceID: SPACE_2_ID,
        ParentTagID: null,
        TagID: null,
        Slug: 'other-space-tag',
        Name: 'Other Space Tag',
        Description: null,
        ColorHex: null,
        IsOfficial: false,
        PostCount: 0,
      },
    ],
    postTags: [],
    memberProfiles: [],
  };
}

function extractQuotedValue(filter: string, fieldName: string): string | null {
  const regex = new RegExp(`\\b${fieldName}\\s*=\\s*'([^']*)'`, 'i');
  const match = regex.exec(filter);
  return match ? match[1] : null;
}

function extractInList(filter: string, fieldName: string): string[] | null {
  const regex = new RegExp(`\\b${fieldName}\\s+IN\\s*\\(([^)]*)\\)`, 'i');
  const match = regex.exec(filter);
  if (!match) return null;
  const items: string[] = [];
  const itemRegex = /'([^']*)'/g;
  let m: RegExpExecArray | null = itemRegex.exec(match[1]);
  while (m) {
    items.push(m[1]);
    m = itemRegex.exec(match[1]);
  }
  return items;
}

class InMemoryCommunityProvider implements IEntityDataProvider, IRunViewProvider {
  private readonly db: InMemoryDatabase;
  private seq = 1;

  constructor(db: InMemoryDatabase) {
    this.db = db;
  }

  public nextUuid(prefix: string = 'bbbbbbbb-bbbb-4bbb-8bbb-'): string {
    const suffix = String(this.seq++).padStart(12, '0');
    return `${prefix}${suffix}`;
  }

  public async Config(): Promise<boolean> {
    return true;
  }

  public async GetRecordChanges(): Promise<RecordChange[]> {
    return [];
  }

  public async Load(
    entity: BaseEntity,
    compositeKey: CompositeKey,
  ): Promise<Record<string, string | number | boolean | Date | null>> {
    const id = String(compositeKey.GetValueByFieldName('ID') ?? '');
    const row = this.findRow(entity.EntityInfo.Name, id);
    return row ?? {};
  }

  private assignNewId(entity: BaseEntity): void {
    const idField = entity.Fields.find((f) => f.Name === 'ID');
    if (idField && !idField.Value) {
      idField.Value = this.nextUuid();
    }
  }

  public async Save(
    entity: BaseEntity,
    _user: UserInfo,
    _options: EntitySaveOptions,
  ): Promise<Record<string, string | number | boolean | Date | null>> {
    this.assignNewId(entity);
    const entityName = entity.EntityInfo.Name;
    if (entity instanceof ForumPostServerEntity) {
      const record: ForumPostRecord = {
        ID: entity.ID,
        ForumID: entity.ForumID,
        PostTypeID: entity.PostTypeID,
        RootPostID: entity.RootPostID,
        ParentPostID: entity.ParentPostID,
        ReplyDepth: entity.ReplyDepth,
        AuthorUserID: entity.AuthorUserID,
        AuthorPersonID: entity.AuthorPersonID,
        AuthorAgentID: entity.AuthorAgentID,
        Title: entity.Title,
        Slug: entity.Slug,
        BodyMarkdown: entity.BodyMarkdown,
        SummaryMarkdown: entity.SummaryMarkdown,
        SummaryGeneratedAt: entity.SummaryGeneratedAt,
        SummaryReplyWatermark: entity.SummaryReplyWatermark ?? 0,
        VisibilityBand: entity.VisibilityBand ?? 'Shared',
        Status: entity.Status ?? 'Published',
        IsPinned: Boolean(entity.IsPinned),
        IsLocked: Boolean(entity.IsLocked),
        IsFeatured: Boolean(entity.IsFeatured),
        ReplyCount: entity.ReplyCount ?? 0,
        ParticipantCount: entity.ParticipantCount ?? 1,
        ReactionScore: entity.ReactionScore ?? 0,
        ViewCount: entity.ViewCount ?? 0,
        LastActivityAt: entity.LastActivityAt ?? new Date(),
        PromotedToSpaceID: entity.PromotedToSpaceID,
        LinkedTaskID: entity.LinkedTaskID,
      };
      this.upsert(this.db.posts, record);
      return { ...record };
    }
    if (entity instanceof ForumAnswerPostServerEntity) {
      const record: ForumAnswerPostRecord = {
        ID: entity.ID,
        QuestionPostID: entity.QuestionPostID,
        IsAcceptedByAuthor: Boolean(entity.IsAcceptedByAuthor),
        IsVerifiedByModerator: Boolean(entity.IsVerifiedByModerator),
        VerifiedByUserID: entity.VerifiedByUserID,
        VerifiedAt: entity.VerifiedAt,
        AIEpistemicStatus: entity.AIEpistemicStatus,
        AIConfidenceScore: entity.AIConfidenceScore,
        AIRationaleMarkdown: entity.AIRationaleMarkdown,
        FreshnessReviewDueAt: entity.FreshnessReviewDueAt,
      };
      this.upsert(this.db.answerPosts, record);
      return { ...record };
    }
    if (entity instanceof ForumIdeaAllocationServerEntity) {
      const record: ForumIdeaAllocationRecord = {
        ID: entity.ID,
        IdeaPostID: entity.IdeaPostID,
        UserID: entity.UserID,
        PointsAllocated: entity.PointsAllocated,
        QuadraticVotes: entity.QuadraticVotes,
        RationaleComment: entity.RationaleComment,
      };
      this.upsert(this.db.ideaAllocations, record);
      return { ...record };
    }
    if (entityName === COMMUNITY_ENTITY_NAMES.ForumIdeaPosts) {
      const idea = entity as mjBizAppsCommunityForumIdeaPostEntity;
      const record: ForumIdeaPostRecord = {
        ID: idea.ID,
        IdeaStatus: idea.IdeaStatus ?? 'Under Consideration',
        TotalPointsAllocated: idea.TotalPointsAllocated ?? 0,
        EffectiveQuadraticVotes: idea.EffectiveQuadraticVotes ?? 0,
        UniqueBackerCount: idea.UniqueBackerCount ?? 0,
        TargetReleaseOrQuarter: idea.TargetReleaseOrQuarter,
        StatusRationaleMarkdown: idea.StatusRationaleMarkdown,
        MergedIntoIdeaPostID: idea.MergedIntoIdeaPostID,
      };
      this.upsert(this.db.ideaPosts, record);
      return { ...record };
    }
    if (entity instanceof ForumPostReactionServerEntity) {
      const record: ForumPostReactionRecord = {
        ID: entity.ID,
        PostID: entity.PostID,
        UserID: entity.UserID,
        ReactionKind: entity.ReactionKind ?? 'Upvote',
        Weight: entity.Weight,
      };
      this.upsert(this.db.postReactions, record);
      return { ...record };
    }
    if (entity instanceof ForumPostTagServerEntity) {
      const record: ForumPostTagRecord = {
        ID: entity.ID,
        PostID: entity.PostID,
        TopicTagID: entity.TopicTagID,
        AssignedByAI: Boolean(entity.AssignedByAI),
      };
      this.upsert(this.db.postTags, record);
      return { ...record };
    }
    if (entityName === COMMUNITY_ENTITY_NAMES.ForumTopicTags) {
      const tag = entity as mjBizAppsCommunityForumTopicTagEntity;
      const record: ForumTopicTagRecord = {
        ID: tag.ID,
        SpaceID: tag.SpaceID,
        ParentTagID: tag.ParentTagID,
        TagID: tag.TagID,
        Slug: tag.Slug,
        Name: tag.Name,
        Description: tag.Description,
        ColorHex: tag.ColorHex,
        IsOfficial: Boolean(tag.IsOfficial),
        PostCount: tag.PostCount ?? 0,
      };
      this.upsert(this.db.topicTags, record);
      return { ...record };
    }
    if (entityName === COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles) {
      const profile = entity as mjBizAppsCommunityCommunityMemberProfileEntity;
      const record: MemberProfileRecord = {
        ID: profile.ID,
        SpaceID: profile.SpaceID,
        UserID: profile.UserID,
        PersonID: profile.PersonID,
        BioMarkdown: profile.BioMarkdown,
        ExpertiseTagsJSON: profile.ExpertiseTagsJSON,
        HelpfulAnswerCount: profile.HelpfulAnswerCount ?? 0,
        AcceptedAnswerCount: profile.AcceptedAnswerCount ?? 0,
        ReputationScore: profile.ReputationScore ?? 0,
        DigestCadence: profile.DigestCadence ?? 'Daily Digest',
        OpenToPeerMentoring: Boolean(profile.OpenToPeerMentoring),
      };
      this.upsert(this.db.memberProfiles, record);
      return { ...record };
    }
    return { ID: entity.ID };
  }

  public async Delete(
    entity: BaseEntity,
    _options: EntityDeleteOptions,
    _user: UserInfo,
  ): Promise<boolean> {
    const id = entity.ID;
    switch (entity.EntityInfo.Name) {
      case COMMUNITY_ENTITY_NAMES.ForumPosts:
        this.removeById(this.db.posts, id);
        return true;
      case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts:
        this.removeById(this.db.answerPosts, id);
        return true;
      case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations:
        this.removeById(this.db.ideaAllocations, id);
        return true;
      case COMMUNITY_ENTITY_NAMES.ForumPostReactions:
        this.removeById(this.db.postReactions, id);
        return true;
      case COMMUNITY_ENTITY_NAMES.ForumPostTags:
        this.removeById(this.db.postTags, id);
        return true;
      default:
        return true;
    }
  }

  public async RunView<T>(params: RunViewParams): Promise<RunViewResult<T>> {
    const filter = params.ExtraFilter ?? '';
    const rows = this.queryRows(params.EntityName, filter);
    const maxRows = params.MaxRows ?? rows.length;
    const sliced = rows.slice(0, maxRows) as T[];
    return {
      Success: true,
      Results: sliced,
      RowCount: sliced.length,
      TotalRowCount: rows.length,
      ExecutionTime: 1,
      ErrorMessage: '',
      UserViewGridState: undefined,
    };
  }

  public async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
    return Promise.all(params.map((p) => this.RunView<T>(p)));
  }

  public createNewEntityInstance<T extends BaseEntity>(entityName: string, user?: UserInfo): T {
    const info = ENTITY_INFOS[entityName];
    if (!info) {
      throw new Error(`Missing EntityInfo for ${entityName}`);
    }

    let instance: BaseEntity;
    switch (entityName) {
      case COMMUNITY_ENTITY_NAMES.ForumPosts:
        instance = new ForumPostServerEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts:
        instance = new ForumAnswerPostServerEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations:
        instance = new ForumIdeaAllocationServerEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts:
        instance = new mjBizAppsCommunityForumIdeaPostEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumPostReactions:
        instance = new ForumPostReactionServerEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumPostTags:
        instance = new ForumPostTagServerEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.ForumTopicTags:
        instance = new mjBizAppsCommunityForumTopicTagEntity(info, this);
        break;
      case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles:
        instance = new mjBizAppsCommunityCommunityMemberProfileEntity(info, this);
        break;
      default:
        throw new Error(`Unsupported entity ${entityName}`);
    }

    if (user) {
      instance.ContextCurrentUser = user;
    }
    return instance as T;
  }

  public async createEntityInstance<T extends BaseEntity>(
    entityName: string,
    key?: CompositeKey,
    user?: UserInfo,
  ): Promise<T | null> {
    if (!ENTITY_INFOS[entityName]) return null;
    const instance = this.createNewEntityInstance<T>(entityName, user);

    if (key) {
      const id = String(key.GetValueByFieldName('ID') ?? '');
      const row = this.findRow(entityName, id);
      if (!row) return null;
      await instance.LoadFromData(row);
    }

    return instance;
  }

  private findRow(
    entityName: string,
    id: string,
  ): Record<string, string | number | boolean | Date | null> | null {
    switch (entityName) {
      case COMMUNITY_ENTITY_NAMES.ForumPosts: {
        const found = this.db.posts.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts: {
        const found = this.db.answerPosts.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations: {
        const found = this.db.ideaAllocations.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts: {
        const found = this.db.ideaPosts.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumPostReactions: {
        const found = this.db.postReactions.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumPostTags: {
        const found = this.db.postTags.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.ForumTopicTags: {
        const found = this.db.topicTags.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles: {
        const found = this.db.memberProfiles.find((r) => UUIDsEqual(r.ID, id));
        return found ? { ...found } : null;
      }
      default:
        return null;
    }
  }

  private upsert<T extends { ID: string }>(table: T[], row: T): void {
    const idx = table.findIndex((item) => UUIDsEqual(item.ID, row.ID));
    if (idx >= 0) {
      table[idx] = row;
    } else {
      table.push(row);
    }
  }

  private removeById<T extends { ID: string }>(table: T[], id: string): void {
    const idx = table.findIndex((item) => UUIDsEqual(item.ID, id));
    if (idx >= 0) {
      table.splice(idx, 1);
    }
  }

  private queryRows(entityName: string, filter: string): object[] {
    const idFilter = extractQuotedValue(filter, 'ID');
    const forumIdFilter = extractQuotedValue(filter, 'ForumID');
    const spaceIdFilter = extractQuotedValue(filter, 'SpaceID');
    const userIdFilter = extractQuotedValue(filter, 'UserID');
    const authorUserIdFilter = extractQuotedValue(filter, 'AuthorUserID');
    const rootPostIdFilter = extractQuotedValue(filter, 'RootPostID');
    const ideaPostIdFilter = extractQuotedValue(filter, 'IdeaPostID');
    const postIdFilter = extractQuotedValue(filter, 'PostID');
    const topicTagIdFilter = extractQuotedValue(filter, 'TopicTagID');
    const idInList = extractInList(filter, 'ID');
    const forumInList = extractInList(filter, 'ForumID');
    const ideaInList = extractInList(filter, 'IdeaPostID');

    switch (entityName) {
      case COMMUNITY_ENTITY_NAMES.Forums:
        return this.db.forums.filter(
          (f) =>
            (!idFilter || UUIDsEqual(f.ID, idFilter)) &&
            (!spaceIdFilter || UUIDsEqual(f.SpaceID, spaceIdFilter)),
        );
      case COMMUNITY_ENTITY_NAMES.ForumTypes:
        return FORUM_TYPES.filter((t) => !idFilter || UUIDsEqual(t.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.PostTypes:
        return POST_TYPES.filter((t) => !idFilter || UUIDsEqual(t.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.ForumRoleTypes:
        return ROLE_TYPES.filter((r) => !idFilter || UUIDsEqual(r.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.ForumMembers:
        return this.db.forumMembers.filter(
          (m) =>
            (!forumIdFilter || UUIDsEqual(m.ForumID, forumIdFilter)) &&
            (!userIdFilter || UUIDsEqual(m.UserID, userIdFilter)),
        );
      case COMMUNITY_ENTITY_NAMES.ForumPosts:
        return this.db.posts.filter(
          (p) =>
            (!idFilter || UUIDsEqual(p.ID, idFilter)) &&
            (!forumIdFilter || UUIDsEqual(p.ForumID, forumIdFilter)) &&
            (!rootPostIdFilter || (p.RootPostID != null && UUIDsEqual(p.RootPostID, rootPostIdFilter))) &&
            (!authorUserIdFilter || (p.AuthorUserID != null && UUIDsEqual(p.AuthorUserID, authorUserIdFilter))) &&
            (!forumInList || forumInList.some((fid) => UUIDsEqual(p.ForumID, fid))) &&
            (!idInList || idInList.some((pid) => UUIDsEqual(p.ID, pid))),
        );
      case COMMUNITY_ENTITY_NAMES.ForumAnswerPosts:
        return this.db.answerPosts.filter(
          (a) =>
            (!idFilter || UUIDsEqual(a.ID, idFilter)) &&
            (!idInList || idInList.some((aid) => UUIDsEqual(a.ID, aid))),
        );
      case COMMUNITY_ENTITY_NAMES.ForumIdeaCampaigns:
        return this.db.ideaCampaigns.filter((c) => !idFilter || UUIDsEqual(c.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.ForumIdeaPosts:
        return this.db.ideaPosts.filter((i) => !idFilter || UUIDsEqual(i.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations:
        return this.db.ideaAllocations.filter(
          (a) =>
            (!userIdFilter || UUIDsEqual(a.UserID, userIdFilter)) &&
            (!ideaPostIdFilter || UUIDsEqual(a.IdeaPostID, ideaPostIdFilter)) &&
            (!ideaInList || ideaInList.some((iid) => UUIDsEqual(a.IdeaPostID, iid))),
        );
      case COMMUNITY_ENTITY_NAMES.ForumPostReactions:
        return this.db.postReactions.filter((r) => !postIdFilter || UUIDsEqual(r.PostID, postIdFilter));
      case COMMUNITY_ENTITY_NAMES.ForumTopicTags:
        return this.db.topicTags.filter((t) => !idFilter || UUIDsEqual(t.ID, idFilter));
      case COMMUNITY_ENTITY_NAMES.ForumPostTags:
        return this.db.postTags.filter((pt) => !topicTagIdFilter || UUIDsEqual(pt.TopicTagID, topicTagIdFilter));
      case COMMUNITY_ENTITY_NAMES.CommunityMemberProfiles:
        return this.db.memberProfiles.filter(
          (mp) =>
            (!spaceIdFilter || UUIDsEqual(mp.SpaceID, spaceIdFilter)) &&
            (!userIdFilter || UUIDsEqual(mp.UserID, userIdFilter)),
        );
      default:
        return [];
    }
  }
}

describe('@mj-biz-apps/community-core-entities-server Slice 1 Server BaseEntity Subclasses', () => {
  let db: InMemoryDatabase;
  let provider: InMemoryCommunityProvider;
  let user1: UserInfo;
  let user2: UserInfo;
  let modUser: UserInfo;
  let mutedUser: UserInfo;
  let observerUser: UserInfo;

  beforeEach(() => {
    ForumDriverRegistry.Instance.Clear();
    PostDriverRegistry.Instance.Clear();
    LoadBizAppsCommunityCoreEntitiesServer();
    CommunityEngine.Instance.HydrateMetadata({
      forumTypes: FORUM_TYPES,
      postTypes: POST_TYPES,
      forumRoleTypes: ROLE_TYPES,
    });

    db = createSeededDb();
    provider = new InMemoryCommunityProvider(db);
    user1 = makeTestUser(USER_1_ID);
    user2 = makeTestUser(USER_2_ID);
    modUser = makeTestUser(USER_MOD_ID);
    mutedUser = makeTestUser(USER_MUTED_ID);
    observerUser = makeTestUser('33333333-3333-4333-8333-333333333305');

    mock.method(
      Metadata.prototype,
      'GetEntityObject',
      async (
        entityName: string,
        keyOrUser?: CompositeKey | UserInfo,
        maybeUser?: UserInfo,
      ): Promise<BaseEntity | null> => {
        if (keyOrUser instanceof CompositeKey) {
          return provider.createEntityInstance(entityName, keyOrUser, maybeUser);
        }
        return provider.createEntityInstance(entityName, undefined, keyOrUser);
      },
    );
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('registers all 5 server entity subclasses in MJGlobal ClassFactory via LoadBizAppsCommunityCoreEntitiesServer()', () => {
    const cf = MJGlobal.Instance.ClassFactory;
    assert.equal(cf.GetRegistration(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPosts)?.SubClass, ForumPostServerEntity);
    assert.equal(cf.GetRegistration(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumAnswerPosts)?.SubClass, ForumAnswerPostServerEntity);
    assert.equal(cf.GetRegistration(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations)?.SubClass, ForumIdeaAllocationServerEntity);
    assert.equal(cf.GetRegistration(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostReactions)?.SubClass, ForumPostReactionServerEntity);
    assert.equal(cf.GetRegistration(BaseEntity, COMMUNITY_ENTITY_NAMES.ForumPostTags)?.SubClass, ForumPostTagServerEntity);
  });

  describe('1. ForumPostServerEntity', () => {
    it('rejects writes to non-Active (Archived) forums', async () => {
      const post = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      post.ForumID = FORUM_ARCHIVED_ID;
      post.PostTypeID = POST_TYPE_DISCUSSION_ID;
      post.AuthorUserID = USER_1_ID;
      post.Title = 'Archived write';
      post.BodyMarkdown = 'Should fail';

      const saved = await post.Save();
      assert.equal(saved, false);
      assert.match(post.LatestResult?.CompleteMessage ?? '', /Archived/i);
    });

    it('rejects ReadOnly forum writes from regular members and allows moderators', async () => {
      const memberPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      memberPost.ForumID = FORUM_RO_ID;
      memberPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      memberPost.AuthorUserID = USER_1_ID;
      memberPost.Title = 'Member write in ReadOnly';
      memberPost.BodyMarkdown = 'Should fail';

      assert.equal(await memberPost.Save(), false);
      assert.match(memberPost.LatestResult?.CompleteMessage ?? '', /ReadOnly/);

      const modPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, modUser,
      )!;
      modPost.ForumID = FORUM_RO_ID;
      modPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      modPost.AuthorUserID = USER_MOD_ID;
      modPost.Title = 'Moderator announcement';
      modPost.BodyMarkdown = 'Allowed';

      assert.equal(await modPost.Save(), true);
      assert.equal(modPost.Status, 'Published');
    });

    it('sets Status to PendingModeration in Moderated forums unless authored by a moderator', async () => {
      const memberPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      memberPost.ForumID = FORUM_MOD_ID;
      memberPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      memberPost.AuthorUserID = USER_1_ID;
      memberPost.Title = 'Needs review';
      memberPost.BodyMarkdown = 'Member post';
      memberPost.Status = 'Published';

      assert.equal(await memberPost.Save(), true);
      assert.equal(memberPost.Status, 'PendingModeration');

      const modPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, modUser,
      )!;
      modPost.ForumID = FORUM_MOD_ID;
      modPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      modPost.AuthorUserID = USER_MOD_ID;
      modPost.Title = 'Mod post';
      modPost.BodyMarkdown = 'Direct publish';
      modPost.Status = 'Published';

      assert.equal(await modPost.Save(), true);
      assert.equal(modPost.Status, 'Published');
    });

    it('enforces ForumRoleType capabilities (Observer, Muted, CanPinOrLock) and PrivateForum membership', async () => {
      const observerPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, observerUser,
      )!;
      observerPost.ForumID = FORUM_OPEN_ID;
      observerPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      observerPost.AuthorUserID = observerUser.ID;
      observerPost.Title = 'Observer post';
      observerPost.BodyMarkdown = 'Rejected';
      assert.equal(await observerPost.Save(), false);
      assert.match(observerPost.LatestResult?.CompleteMessage ?? '', /CanCreateRootPost|creating root posts/i);

      const mutedPost = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, mutedUser,
      )!;
      mutedPost.ForumID = FORUM_OPEN_ID;
      mutedPost.PostTypeID = POST_TYPE_DISCUSSION_ID;
      mutedPost.AuthorUserID = USER_MUTED_ID;
      mutedPost.Title = 'Muted post';
      mutedPost.BodyMarkdown = 'Rejected';
      assert.equal(await mutedPost.Save(), false);
      assert.match(mutedPost.LatestResult?.CompleteMessage ?? '', /Muted/);

      const pinAttempt = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      pinAttempt.ForumID = FORUM_OPEN_ID;
      pinAttempt.PostTypeID = POST_TYPE_DISCUSSION_ID;
      pinAttempt.AuthorUserID = USER_1_ID;
      pinAttempt.Title = 'Pin attempt';
      pinAttempt.BodyMarkdown = 'Rejected';
      pinAttempt.IsPinned = true;
      assert.equal(await pinAttempt.Save(), false);
      assert.match(pinAttempt.LatestResult?.CompleteMessage ?? '', /pinning or locking/i);

      const privateAttempt = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      privateAttempt.ForumID = FORUM_PRIVATE_ID;
      privateAttempt.PostTypeID = POST_TYPE_DISCUSSION_ID;
      privateAttempt.AuthorUserID = USER_1_ID;
      privateAttempt.Title = 'Private forum non-member';
      privateAttempt.BodyMarkdown = 'Rejected';
      assert.equal(await privateAttempt.Save(), false);
      assert.match(privateAttempt.LatestResult?.CompleteMessage ?? '', /ForumMember/);
    });

    it('rejects replies to locked threads and enforces Posts.MaxReplyDepth', async () => {
      const replyToLocked = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      replyToLocked.ForumID = FORUM_OPEN_ID;
      replyToLocked.PostTypeID = POST_TYPE_REPLY_ID;
      replyToLocked.ParentPostID = LOCKED_ROOT_ID;
      replyToLocked.RootPostID = LOCKED_ROOT_ID;
      replyToLocked.AuthorUserID = USER_1_ID;
      replyToLocked.BodyMarkdown = 'Trying to reply to locked thread';

      assert.equal(await replyToLocked.Save(), false);
      assert.match(replyToLocked.LatestResult?.CompleteMessage ?? '', /locked thread/i);

      // Depth 1 reply -> allowed (MaxReplyDepth = 2)
      const depth1 = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      depth1.ForumID = FORUM_OPEN_ID;
      depth1.PostTypeID = POST_TYPE_REPLY_ID;
      depth1.ParentPostID = ROOT_POST_1_ID;
      depth1.AuthorUserID = USER_1_ID;
      depth1.BodyMarkdown = 'Depth 1 reply';
      assert.equal(await depth1.Save(), true);
      assert.equal(depth1.ReplyDepth, 1);
      assert.equal(depth1.RootPostID, ROOT_POST_1_ID);

      // Depth 2 reply -> allowed
      const depth2 = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      depth2.ForumID = FORUM_OPEN_ID;
      depth2.PostTypeID = POST_TYPE_REPLY_ID;
      depth2.ParentPostID = depth1.ID;
      depth2.AuthorUserID = USER_1_ID;
      depth2.BodyMarkdown = 'Depth 2 reply';
      assert.equal(await depth2.Save(), true);
      assert.equal(depth2.ReplyDepth, 2);

      // Depth 3 reply -> rejected (MaxReplyDepth = 2)
      const depth3 = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
      )!;
      depth3.ForumID = FORUM_OPEN_ID;
      depth3.PostTypeID = POST_TYPE_REPLY_ID;
      depth3.ParentPostID = depth2.ID;
      depth3.AuthorUserID = USER_1_ID;
      depth3.BodyMarkdown = 'Depth 3 reply';
      assert.equal(await depth3.Save(), false);
      assert.match(depth3.LatestResult?.CompleteMessage ?? '', /exceeds the forum maximum depth/i);
    });

    it('invokes PostDriverRegistry hooks, maintains root ReplyCount/LastActivityAt, and checks synthesis watermark', async () => {
      let validatedCalls = 0;
      let savedCalls = 0;
      let replyAddedCalls = 0;
      const synthesisEvents: SynthesisRefreshCheckResult[] = [];

      class SpyReplyDriver extends BasePostServerDriver {
        public override async ValidatePostChange(_ctx: PostDriverContext) {
          validatedCalls += 1;
          return { allowed: true };
        }
        public override async OnPostSaved(_ctx: PostDriverContext): Promise<void> {
          savedCalls += 1;
        }
        public override async OnReplyAdded(_ctx: PostReplyChangeContext): Promise<void> {
          replyAddedCalls += 1;
        }
      }
      PostDriverRegistry.Instance.Register('reply', new SpyReplyDriver());

      const sub = MJGlobal.Instance.GetEventListener(false).subscribe((ev) => {
        if (ev.eventCode === COMMUNITY_SYNTHESIS_REFRESH_EVENT_CODE && ev.args) {
          synthesisEvents.push(ev.args as SynthesisRefreshCheckResult);
        }
      });

      try {
        const beforeActivity = db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!.LastActivityAt;
        // Threshold on general-discussion is 3
        const createdReplies: ForumPostServerEntity[] = [];
        for (let i = 1; i <= 3; i += 1) {
          const reply = provider.createNewEntityInstance<ForumPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPosts, user1,
          )!;
          reply.ForumID = FORUM_OPEN_ID;
          reply.PostTypeID = POST_TYPE_REPLY_ID;
          reply.ParentPostID = ROOT_POST_1_ID;
          reply.AuthorUserID = USER_1_ID;
          reply.BodyMarkdown = `Reply #${i}`;
          assert.equal(await reply.Save(), true);
          createdReplies.push(reply);
        }

        assert.equal(validatedCalls, 3);
        assert.equal(savedCalls, 3);
        assert.equal(replyAddedCalls, 3);

        const rootRow = db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!;
        assert.equal(rootRow.ReplyCount, 3);
        assert.ok(rootRow.LastActivityAt.getTime() >= beforeActivity.getTime());

        assert.equal(createdReplies[0].LastSynthesisCheck?.shouldRefresh, false);
        assert.equal(createdReplies[1].LastSynthesisCheck?.shouldRefresh, false);
        assert.equal(createdReplies[2].LastSynthesisCheck?.shouldRefresh, true);
        assert.equal(synthesisEvents.length, 1);
        assert.equal(synthesisEvents[0].replyCount, 3);
        assert.equal(synthesisEvents[0].threshold, 3);

        // Delete one reply -> ReplyCount decrements to 2
        assert.equal(await createdReplies[2].Delete(), true);
        assert.equal(db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!.ReplyCount, 2);
      } finally {
        sub.unsubscribe();
      }
    });
  });

  describe('2. ForumAnswerPostServerEntity', () => {
    it('rejects QuestionPostID from a different Forum and self-references', async () => {
      const wrongForumAnswer = provider.createNewEntityInstance<ForumAnswerPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, user2,
      )!;
      wrongForumAnswer.ID = ANSWER_1_ID;
      wrongForumAnswer.QuestionPostID = QUESTION_OTHER_FORUM_ID;

      assert.equal(await wrongForumAnswer.Save(), false);
      assert.match(wrongForumAnswer.LatestResult?.CompleteMessage ?? '', /different Forum/i);

      const selfRefAnswer = provider.createNewEntityInstance<ForumAnswerPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, user2,
      )!;
      selfRefAnswer.ID = ANSWER_1_ID;
      selfRefAnswer.QuestionPostID = ANSWER_1_ID;

      assert.equal(await selfRefAnswer.Save(), false);
      assert.match(selfRefAnswer.LatestResult?.CompleteMessage ?? '', /cannot reference itself/i);
    });

    it('updates CommunityMemberProfile HelpfulAnswerCount and AcceptedAnswerCount on Save and Delete', async () => {
      // CR-03: non-author, non-moderator (user2) cannot self-accept an answer
      const unauthorizedAccept = provider.createNewEntityInstance<ForumAnswerPostServerEntity>(
        COMMUNITY_ENTITY_NAMES.ForumAnswerPosts,
        user2,
      )!;
      unauthorizedAccept.ID = ANSWER_1_ID;
      unauthorizedAccept.QuestionPostID = QUESTION_1_ID;
      unauthorizedAccept.IsAcceptedByAuthor = true;
      unauthorizedAccept.IsVerifiedByModerator = false;
      assert.equal(await unauthorizedAccept.Save(), false);
      assert.match(unauthorizedAccept.LatestResult?.CompleteMessage ?? '', /question author or moderator/i);

      // Question author (user1) accepts user2's answer -> updates user2's CommunityMemberProfile
      const answer1 = provider.createNewEntityInstance<ForumAnswerPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, user1,
      )!;
      answer1.ID = ANSWER_1_ID;
      answer1.QuestionPostID = QUESTION_1_ID;
      answer1.IsAcceptedByAuthor = true;
      answer1.IsVerifiedByModerator = false;
      assert.equal(await answer1.Save(), true);

      assert.equal(db.memberProfiles.length, 1);
      assert.equal(db.memberProfiles[0].UserID, USER_2_ID);
      assert.equal(db.memberProfiles[0].SpaceID, SPACE_1_ID);
      assert.equal(db.memberProfiles[0].AcceptedAnswerCount, 1);
      assert.equal(db.memberProfiles[0].HelpfulAnswerCount, 1);

      const answer2 = provider.createNewEntityInstance<ForumAnswerPostServerEntity>(COMMUNITY_ENTITY_NAMES.ForumAnswerPosts, modUser,
      )!;
      answer2.ID = ANSWER_2_ID;
      answer2.QuestionPostID = QUESTION_1_ID;
      answer2.IsAcceptedByAuthor = false;
      answer2.IsVerifiedByModerator = true;
      assert.equal(await answer2.Save(), true);

      assert.equal(db.memberProfiles[0].AcceptedAnswerCount, 1);
      assert.equal(db.memberProfiles[0].HelpfulAnswerCount, 2);

      // Delete answer1 -> counts recompute cleanly
      assert.equal(await answer1.Delete(), true);
      assert.equal(db.memberProfiles[0].AcceptedAnswerCount, 0);
      assert.equal(db.memberProfiles[0].HelpfulAnswerCount, 1);
    });
  });

  describe('3. ForumIdeaAllocationServerEntity', () => {
    it('rejects allocations after VotingClosesAt, above MaxPointsPerIdea, or exceeding DefaultBudgetPoints', async () => {
      const closedAlloc = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user1,
      )!;
      closedAlloc.IdeaPostID = '88888888-8888-4888-8888-888888888809';
      closedAlloc.UserID = USER_1_ID;
      closedAlloc.PointsAllocated = 9;
      assert.equal(await closedAlloc.Save(), false);
      assert.match(closedAlloc.LatestResult?.CompleteMessage ?? '', /closed/i);

      const overMaxPerIdea = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user1,
      )!;
      overMaxPerIdea.IdeaPostID = IDEA_1_ID;
      overMaxPerIdea.UserID = USER_1_ID;
      overMaxPerIdea.PointsAllocated = 81; // MaxPointsPerIdea is 64
      assert.equal(await overMaxPerIdea.Save(), false);
      assert.match(overMaxPerIdea.LatestResult?.CompleteMessage ?? '', /MaxPointsPerIdea/);

      // Allocate 64 on Idea 1 -> succeeds
      const alloc1 = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user1,
      )!;
      alloc1.IdeaPostID = IDEA_1_ID;
      alloc1.UserID = USER_1_ID;
      alloc1.PointsAllocated = 64;
      assert.equal(await alloc1.Save(), true);
      assert.equal(alloc1.QuadraticVotes, 8);

      // Allocate 49 on Idea 2 -> 64 + 49 = 113 > 100 budget -> rejected
      const overBudget = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user1,
      )!;
      overBudget.IdeaPostID = IDEA_2_ID;
      overBudget.UserID = USER_1_ID;
      overBudget.PointsAllocated = 49;
      assert.equal(await overBudget.Save(), false);
      assert.match(overBudget.LatestResult?.CompleteMessage ?? '', /budget/i);

      // Revising Idea 1 from 64 down to 25 refunds prior spend -> succeeds
      alloc1.PointsAllocated = 25;
      assert.equal(await alloc1.Save(), true);
      assert.equal(alloc1.QuadraticVotes, 5);
    });

    it('recomputes parent ForumIdeaPost TotalPointsAllocated, EffectiveQuadraticVotes, and UniqueBackerCount on Save and Delete', async () => {
      const allocUser1 = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user1,
      )!;
      allocUser1.IdeaPostID = IDEA_1_ID;
      allocUser1.UserID = USER_1_ID;
      allocUser1.PointsAllocated = 25;
      assert.equal(await allocUser1.Save(), true);

      const allocUser2 = provider.createNewEntityInstance<ForumIdeaAllocationServerEntity>(COMMUNITY_ENTITY_NAMES.ForumIdeaAllocations, user2,
      )!;
      allocUser2.IdeaPostID = IDEA_1_ID;
      allocUser2.UserID = USER_2_ID;
      allocUser2.PointsAllocated = 16;
      assert.equal(await allocUser2.Save(), true);

      const idea = db.ideaPosts.find((i) => UUIDsEqual(i.ID, IDEA_1_ID))!;
      assert.equal(idea.TotalPointsAllocated, 41);
      assert.equal(idea.EffectiveQuadraticVotes, 9);
      assert.equal(idea.UniqueBackerCount, 2);

      assert.equal(await allocUser1.Delete(), true);
      const ideaAfterDelete = db.ideaPosts.find((i) => UUIDsEqual(i.ID, IDEA_1_ID))!;
      assert.equal(ideaAfterDelete.TotalPointsAllocated, 16);
      assert.equal(ideaAfterDelete.EffectiveQuadraticVotes, 4);
      assert.equal(ideaAfterDelete.UniqueBackerCount, 1);
    });
  });

  describe('4. ForumPostReactionServerEntity', () => {
    it('looks up authoritative Weight from ForumRoleType.VoteWeightMultiplier and updates ForumPost.ReactionScore on Save/Delete', async () => {
      // USER_2 has expert-reviewer role (VoteWeightMultiplier = 1.25); caller tries to spoof Weight = 99
      const expertReaction = provider.createNewEntityInstance<ForumPostReactionServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostReactions, user2,
      )!;
      expertReaction.PostID = ROOT_POST_1_ID;
      expertReaction.UserID = USER_2_ID;
      expertReaction.ReactionKind = 'Helpful';
      expertReaction.Weight = 99;

      assert.equal(await expertReaction.Save(), true);
      assert.equal(expertReaction.Weight, 1.25);
      assert.equal(db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!.ReactionScore, 1);

      // USER_1 has contributor role (VoteWeightMultiplier = 1.00) -> 1.25 + 1.00 = 2.25 -> rounds to 2
      const contribReaction = provider.createNewEntityInstance<ForumPostReactionServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostReactions, user1,
      )!;
      contribReaction.PostID = ROOT_POST_1_ID;
      contribReaction.UserID = USER_1_ID;
      contribReaction.ReactionKind = 'Upvote';

      assert.equal(await contribReaction.Save(), true);
      assert.equal(contribReaction.Weight, 1);
      assert.equal(db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!.ReactionScore, 2);

      // Delete expert reaction -> remaining weight 1.00 -> ReactionScore = 1
      assert.equal(await expertReaction.Delete(), true);
      assert.equal(db.posts.find((p) => UUIDsEqual(p.ID, ROOT_POST_1_ID))!.ReactionScore, 1);
    });

    it('rejects reactions from Muted members', async () => {
      const mutedReaction = provider.createNewEntityInstance<ForumPostReactionServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostReactions, mutedUser,
      )!;
      mutedReaction.PostID = ROOT_POST_1_ID;
      mutedReaction.UserID = USER_MUTED_ID;
      mutedReaction.ReactionKind = 'Upvote';

      assert.equal(await mutedReaction.Save(), false);
      assert.match(mutedReaction.LatestResult?.CompleteMessage ?? '', /Muted/);
    });
  });

  describe('5. ForumPostTagServerEntity', () => {
    it('validates ForumTopicTag.SpaceID matches post Forum.SpaceID and maintains ForumTopicTag.PostCount on Save/Delete', async () => {
      const wrongSpaceTag = provider.createNewEntityInstance<ForumPostTagServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostTags, user1,
      )!;
      wrongSpaceTag.PostID = ROOT_POST_1_ID;
      wrongSpaceTag.TopicTagID = TAG_SPACE_2_ID;

      assert.equal(await wrongSpaceTag.Save(), false);
      assert.match(wrongSpaceTag.LatestResult?.CompleteMessage ?? '', /SpaceID/i);

      const validTag1 = provider.createNewEntityInstance<ForumPostTagServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostTags, user1,
      )!;
      validTag1.PostID = ROOT_POST_1_ID;
      validTag1.TopicTagID = TAG_SPACE_1_ID;
      assert.equal(await validTag1.Save(), true);
      assert.equal(db.topicTags.find((t) => UUIDsEqual(t.ID, TAG_SPACE_1_ID))!.PostCount, 1);

      const validTag2 = provider.createNewEntityInstance<ForumPostTagServerEntity>(COMMUNITY_ENTITY_NAMES.ForumPostTags, user1,
      )!;
      validTag2.PostID = QUESTION_1_ID;
      validTag2.TopicTagID = TAG_SPACE_1_ID;
      assert.equal(await validTag2.Save(), true);
      assert.equal(db.topicTags.find((t) => UUIDsEqual(t.ID, TAG_SPACE_1_ID))!.PostCount, 2);

      assert.equal(await validTag1.Delete(), true);
      assert.equal(db.topicTags.find((t) => UUIDsEqual(t.ID, TAG_SPACE_1_ID))!.PostCount, 1);
    });
  });
});
