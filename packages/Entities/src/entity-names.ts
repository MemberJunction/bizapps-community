import type {
  AnonymousReadMode,
  CommunityVisibilityBand,
  DigestCadence,
  EpistemicAnswerStatus,
  ForumVisibilityBand,
  IdeationAllocationMode,
  PostPlacementRule,
} from '@mj-biz-apps/community-core';

export const COMMUNITY_ENTITY_NAMES = {
  CommunitySpaces: 'MJ_BizApps_Community: Community Spaces',
  ForumTypes: 'MJ_BizApps_Community: Forum Types',
  PostTypes: 'MJ_BizApps_Community: Post Types',
  ForumRoleTypes: 'MJ_BizApps_Community: Forum Role Types',
  Forums: 'MJ_BizApps_Community: Forums',
  ForumIdeaCampaigns: 'MJ_BizApps_Community: Forum Idea Campaigns',
  ForumMembers: 'MJ_BizApps_Community: Forum Members',
  ForumTopicTags: 'MJ_BizApps_Community: Forum Topic Tags',
  ForumPosts: 'MJ_BizApps_Community: Forum Posts',
  ForumQuestionPosts: 'MJ_BizApps_Community: Forum Question Posts',
  ForumAnswerPosts: 'MJ_BizApps_Community: Forum Answer Posts',
  ForumIdeaPosts: 'MJ_BizApps_Community: Forum Idea Posts',
  ForumFormPosts: 'MJ_BizApps_Community: Forum Form Posts',
  ForumArtifactPosts: 'MJ_BizApps_Community: Forum Artifact Posts',
  ForumCasePosts: 'MJ_BizApps_Community: Forum Case Posts',
  ForumAMAPosts: 'MJ_BizApps_Community: Forum AMA Posts',
  ForumInteractivePosts: 'MJ_BizApps_Community: Forum Interactive Posts',
  ForumInteractiveSessions: 'MJ_BizApps_Community: Forum Interactive Sessions',
  ForumPostTags: 'MJ_BizApps_Community: Forum Post Tags',
  ForumPostReactions: 'MJ_BizApps_Community: Forum Post Reactions',
  ForumPostAttachments: 'MJ_BizApps_Community: Forum Post Attachments',
  ForumIdeaAllocations: 'MJ_BizApps_Community: Forum Idea Allocations',
  CommunityMemberProfiles: 'MJ_BizApps_Community: Community Member Profiles',
  ForumSubscriptions: 'MJ_BizApps_Community: Forum Subscriptions',
  ForumPostFlags: 'MJ_BizApps_Community: Forum Post Flags',
} as const;

export type CommunityKind =
  | 'Association Wide'
  | 'Special Interest Group'
  | 'Product Community'
  | 'Working Group'
  | 'Other';

export type ForumPostingPolicy = 'Open' | 'Moderated' | 'ReadOnly';
export type ForumStatus = 'Active' | 'Archived' | 'Locked';
export type ForumPostStatus =
  | 'Draft'
  | 'PendingModeration'
  | 'Published'
  | 'Answered'
  | 'Resolved'
  | 'Archived'
  | 'Redacted';

export type IdeaLifecycleStatus =
  | 'Under Consideration'
  | 'Planned'
  | 'In Progress'
  | 'Shipped'
  | 'Declined';

export type ArtifactModality = 'Document' | 'Spreadsheet' | 'Presentation';
export type ArtifactCollaborationMode = 'Suggest' | 'Edit' | 'Comment Only';

export type InteractiveExperienceKind =
  | 'Quiz'
  | 'Trivia'
  | 'Calculator'
  | 'Simulation'
  | 'Flashcards'
  | 'Poll Game'
  | 'Other';

export type InteractiveScoringMode =
  | 'Best Score'
  | 'Fastest Time'
  | 'Streak'
  | 'Completion'
  | 'None';

export interface IForumTypeDescriptor {
  ID: string;
  Code: string;
  Name: string;
  Description: string | null;
  Icon: string | null;
  ServerDriverClass: string | null;
  UIDriverClass: string | null;
  ExtensionEntity: string | null;
  Configuration: string | null;
  Sequence: number;
  IsActive: boolean;
}

export interface IPostTypeDescriptor {
  ID: string;
  Code: string;
  Name: string;
  Description: string | null;
  Icon: string | null;
  ServerDriverClass: string | null;
  UIDriverClass: string | null;
  ExtensionEntity: string | null;
  PlacementRule: PostPlacementRule;
  AllowsNestedReplies: boolean;
  TriggersThreadSynthesis: boolean;
  IndexedInCorpus: boolean;
  Configuration: string | null;
  Sequence: number;
  IsActive: boolean;
}

export interface IForumRoleTypeDescriptor {
  ID: string;
  Code: string;
  Name: string;
  Description: string | null;
  Level: number;
  CanConfigureForum: boolean;
  CanModerateQueue: boolean;
  CanPinOrLock: boolean;
  CanAcceptAnswers: boolean;
  CanVerifyCanon: boolean;
  CanPromoteToSpace: boolean;
  CanCreateRootPost: boolean;
  CanReply: boolean;
  CanCoEditDocs: boolean;
  VoteWeightMultiplier: number;
  Sequence: number;
  IsActive: boolean;
}

export interface ICommunitySpaceSummary {
  ID: string;
  Slug: string;
  CommunityKind: CommunityKind;
  CommunityKindDetails: string | null;
  AnonymousReadMode: AnonymousReadMode;
  AskFirstEnabled: boolean;
  DefaultDigestCadence: DigestCadence;
  BannerImageURL: string | null;
  WelcomeMarkdown: string | null;
  DefaultForumID: string | null;
}

export interface IForumSummary {
  ID: string;
  SpaceID: string;
  ParentForumID: string | null;
  ForumTypeID: string;
  Slug: string;
  Name: string;
  Description: string | null;
  Icon: string | null;
  ColorHex: string | null;
  VisibilityBand: ForumVisibilityBand;
  AnonymousReadMode: AnonymousReadMode | null;
  InheritsSpaceMembers: boolean;
  PostingPolicy: ForumPostingPolicy;
  InboundEmailAlias: string | null;
  Sequence: number;
  Status: ForumStatus;
  Configuration: string | null;
}

export interface IForumIdeaCampaignSummary extends IForumSummary {
  DefaultBudgetPoints: number;
  AllocationMode: IdeationAllocationMode;
  MaxPointsPerIdea: number | null;
  SubmissionsCloseAt: Date | null;
  VotingClosesAt: Date | null;
}

export interface IForumPostSummary {
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
  VisibilityBand: CommunityVisibilityBand;
  Status: ForumPostStatus;
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

export interface IForumAnswerPostDetails {
  ID: string;
  QuestionPostID: string;
  IsAcceptedByAuthor: boolean;
  IsVerifiedByModerator: boolean;
  VerifiedByUserID: string | null;
  VerifiedAt: Date | null;
  AIEpistemicStatus: EpistemicAnswerStatus | null;
  AIConfidenceScore: number | null;
  AIRationaleMarkdown: string | null;
  FreshnessReviewDueAt: Date | null;
}
