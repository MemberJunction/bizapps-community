-- =============================================================================
--  BizApps Community — Baseline Tables, IsA Subtypes, Constraints, and Access TVF
--
--  Schema: __mj_BizAppsCommunity (${flyway:defaultSchema})
--  Core Schema: __mj (${mjSchema})
--  Upstream Schemas: __mj_BizAppsCollaboration, __mj_BizAppsCommon,
--                    __mj_BizAppsTasks, __mj_BizAppsForms
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CommunitySpace (IsA subtype of __mj_BizAppsCollaboration.Space)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[CommunitySpace] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [Slug] NVARCHAR(120) NOT NULL,
    [CommunityKind] NVARCHAR(50) NOT NULL CONSTRAINT [DF_CommunitySpace_CommunityKind] DEFAULT (N'Association Wide'),
    [CommunityKindDetails] NVARCHAR(200) NULL,
    [AnonymousReadMode] NVARCHAR(30) NOT NULL CONSTRAINT [DF_CommunitySpace_AnonymousReadMode] DEFAULT (N'Teaser Only'),
    [AskFirstEnabled] BIT NOT NULL CONSTRAINT [DF_CommunitySpace_AskFirstEnabled] DEFAULT (1),
    [DefaultDigestCadence] NVARCHAR(30) NOT NULL CONSTRAINT [DF_CommunitySpace_DefaultDigestCadence] DEFAULT (N'Daily Digest'),
    [BannerImageURL] NVARCHAR(500) NULL,
    [WelcomeMarkdown] NVARCHAR(MAX) NULL,
    [DefaultForumID] UNIQUEIDENTIFIER NULL,
    CONSTRAINT [PK_CommunitySpace] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_CommunitySpace_Space] FOREIGN KEY ([ID]) REFERENCES [__mj_BizAppsCollaboration].[Space]([ID]),
    CONSTRAINT [UQ_CommunitySpace_Slug] UNIQUE ([Slug]),
    CONSTRAINT [CK_CommunitySpace_CommunityKind] CHECK ([CommunityKind] IN (N'Association Wide', N'Special Interest Group', N'Product Community', N'Working Group', N'Other')),
    CONSTRAINT [CK_CommunitySpace_AnonymousReadMode] CHECK ([AnonymousReadMode] IN (N'None', N'Teaser Only', N'Full Read')),
    CONSTRAINT [CK_CommunitySpace_DefaultDigestCadence] CHECK ([DefaultDigestCadence] IN (N'Every Post', N'Daily Digest', N'Weekly Digest', N'Highlights Only', N'Muted'))
);
GO

-- -----------------------------------------------------------------------------
-- 2. ForumType (Metadata-driven forum behavior & driver registry)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Icon] NVARCHAR(100) NULL,
    [ServerDriverClass] NVARCHAR(200) NULL,
    [UIDriverClass] NVARCHAR(200) NULL,
    [ExtensionEntity] NVARCHAR(255) NULL,
    [Configuration] NVARCHAR(MAX) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_ForumType_IsActive] DEFAULT (1),
    CONSTRAINT [PK_ForumType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_ForumType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO

-- -----------------------------------------------------------------------------
-- 3. PostType (Metadata-driven post behavior & driver registry)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[PostType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_PostType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Icon] NVARCHAR(100) NULL,
    [ServerDriverClass] NVARCHAR(200) NULL,
    [UIDriverClass] NVARCHAR(200) NULL,
    [ExtensionEntity] NVARCHAR(255) NULL,
    [PlacementRule] NVARCHAR(20) NOT NULL CONSTRAINT [DF_PostType_PlacementRule] DEFAULT (N'Both'),
    [AllowsNestedReplies] BIT NOT NULL CONSTRAINT [DF_PostType_AllowsNestedReplies] DEFAULT (1),
    [TriggersThreadSynthesis] BIT NOT NULL CONSTRAINT [DF_PostType_TriggersThreadSynthesis] DEFAULT (1),
    [IndexedInCorpus] BIT NOT NULL CONSTRAINT [DF_PostType_IndexedInCorpus] DEFAULT (1),
    [Configuration] NVARCHAR(MAX) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_PostType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_PostType_IsActive] DEFAULT (1),
    CONSTRAINT [PK_PostType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_PostType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_PostType_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_PostType_PlacementRule] CHECK ([PlacementRule] IN (N'Root Only', N'Reply Only', N'Both')),
    CONSTRAINT [CK_PostType_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO

-- -----------------------------------------------------------------------------
-- 4. ForumRoleType (Role capability flags inside forums)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumRoleType] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumRoleType_ID] DEFAULT (NEWSEQUENTIALID()),
    [Code] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Level] INT NOT NULL CONSTRAINT [DF_ForumRoleType_Level] DEFAULT (100),
    [CanConfigureForum] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanConfigureForum] DEFAULT (0),
    [CanModerateQueue] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanModerateQueue] DEFAULT (0),
    [CanPinOrLock] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanPinOrLock] DEFAULT (0),
    [CanAcceptAnswers] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanAcceptAnswers] DEFAULT (0),
    [CanVerifyCanon] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanVerifyCanon] DEFAULT (0),
    [CanPromoteToSpace] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanPromoteToSpace] DEFAULT (0),
    [CanCreateRootPost] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanCreateRootPost] DEFAULT (1),
    [CanReply] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanReply] DEFAULT (1),
    [CanCoEditDocs] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_CanCoEditDocs] DEFAULT (0),
    [VoteWeightMultiplier] DECIMAL(5,2) NOT NULL CONSTRAINT [DF_ForumRoleType_VoteWeightMultiplier] DEFAULT (1.00),
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumRoleType_Sequence] DEFAULT (0),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_ForumRoleType_IsActive] DEFAULT (1),
    CONSTRAINT [PK_ForumRoleType] PRIMARY KEY ([ID]),
    CONSTRAINT [UQ_ForumRoleType_Code] UNIQUE ([Code]),
    CONSTRAINT [UQ_ForumRoleType_Name] UNIQUE ([Name])
);
GO

-- -----------------------------------------------------------------------------
-- 5. Forum (Channels inside a CommunitySpace)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[Forum] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Forum_ID] DEFAULT (NEWSEQUENTIALID()),
    [SpaceID] UNIQUEIDENTIFIER NOT NULL,
    [ParentForumID] UNIQUEIDENTIFIER NULL,
    [ForumTypeID] UNIQUEIDENTIFIER NOT NULL,
    [Slug] NVARCHAR(120) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Icon] NVARCHAR(100) NULL,
    [ColorHex] NVARCHAR(20) NULL,
    [VisibilityBand] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Forum_VisibilityBand] DEFAULT (N'Shared'),
    [AnonymousReadMode] NVARCHAR(30) NULL,
    [InheritsSpaceMembers] BIT NOT NULL CONSTRAINT [DF_Forum_InheritsSpaceMembers] DEFAULT (1),
    [PostingPolicy] NVARCHAR(30) NOT NULL CONSTRAINT [DF_Forum_PostingPolicy] DEFAULT (N'Open'),
    [InboundEmailAlias] NVARCHAR(150) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_Forum_Sequence] DEFAULT (0),
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_Forum_Status] DEFAULT (N'Active'),
    [Configuration] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_Forum] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_Forum_CommunitySpace] FOREIGN KEY ([SpaceID]) REFERENCES [${flyway:defaultSchema}].[CommunitySpace]([ID]),
    CONSTRAINT [FK_Forum_ParentForum] FOREIGN KEY ([ParentForumID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]),
    CONSTRAINT [FK_Forum_ForumType] FOREIGN KEY ([ForumTypeID]) REFERENCES [${flyway:defaultSchema}].[ForumType]([ID]),
    CONSTRAINT [UQ_Forum_Space_Slug] UNIQUE ([SpaceID], [Slug]),
    CONSTRAINT [CK_Forum_VisibilityBand] CHECK ([VisibilityBand] IN (N'Shared', N'Team', N'PrivateForum')),
    CONSTRAINT [CK_Forum_AnonymousReadMode] CHECK ([AnonymousReadMode] IS NULL OR [AnonymousReadMode] IN (N'None', N'Teaser Only', N'Full Read')),
    CONSTRAINT [CK_Forum_PostingPolicy] CHECK ([PostingPolicy] IN (N'Open', N'Moderated', N'ReadOnly')),
    CONSTRAINT [CK_Forum_Status] CHECK ([Status] IN (N'Active', N'Archived', N'Locked')),
    CONSTRAINT [CK_Forum_Configuration_JSON] CHECK ([Configuration] IS NULL OR ISJSON([Configuration]) = 1)
);
GO

ALTER TABLE [${flyway:defaultSchema}].[CommunitySpace]
ADD CONSTRAINT [FK_CommunitySpace_DefaultForum] FOREIGN KEY ([DefaultForumID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]);
GO

-- -----------------------------------------------------------------------------
-- 6. ForumIdeaCampaign (IsA subtype of Forum)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumIdeaCampaign] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [DefaultBudgetPoints] INT NOT NULL CONSTRAINT [DF_ForumIdeaCampaign_DefaultBudgetPoints] DEFAULT (100),
    [AllocationMode] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumIdeaCampaign_AllocationMode] DEFAULT (N'Point Allocation'),
    [MaxPointsPerIdea] INT NULL,
    [SubmissionsCloseAt] DATETIMEOFFSET NULL,
    [VotingClosesAt] DATETIMEOFFSET NULL,
    CONSTRAINT [PK_ForumIdeaCampaign] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumIdeaCampaign_Forum] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]),
    CONSTRAINT [CK_ForumIdeaCampaign_AllocationMode] CHECK ([AllocationMode] IN (N'Point Allocation', N'Quadratic'))
);
GO

-- -----------------------------------------------------------------------------
-- 7. ForumMember (Explicit membership for private/moderated forums & overrides)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumMember] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumMember_ID] DEFAULT (NEWSEQUENTIALID()),
    [ForumID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [ForumRoleTypeID] UNIQUEIDENTIFIER NOT NULL,
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumMember_Status] DEFAULT (N'Active'),
    CONSTRAINT [PK_ForumMember] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumMember_Forum] FOREIGN KEY ([ForumID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]),
    CONSTRAINT [FK_ForumMember_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_ForumMember_ForumRoleType] FOREIGN KEY ([ForumRoleTypeID]) REFERENCES [${flyway:defaultSchema}].[ForumRoleType]([ID]),
    CONSTRAINT [UQ_ForumMember_Forum_User] UNIQUE ([ForumID], [UserID]),
    CONSTRAINT [CK_ForumMember_Status] CHECK ([Status] IN (N'Active', N'Invited', N'Muted', N'Removed'))
);
GO

-- -----------------------------------------------------------------------------
-- 8. ForumTopicTag (Space-scoped taxonomy tags linked to MJ: Tags)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumTopicTag] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumTopicTag_ID] DEFAULT (NEWSEQUENTIALID()),
    [SpaceID] UNIQUEIDENTIFIER NOT NULL,
    [ParentTagID] UNIQUEIDENTIFIER NULL,
    [TagID] UNIQUEIDENTIFIER NULL,
    [Slug] NVARCHAR(100) NOT NULL,
    [Name] NVARCHAR(120) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [ColorHex] NVARCHAR(20) NULL,
    [IsOfficial] BIT NOT NULL CONSTRAINT [DF_ForumTopicTag_IsOfficial] DEFAULT (0),
    [PostCount] INT NOT NULL CONSTRAINT [DF_ForumTopicTag_PostCount] DEFAULT (0),
    CONSTRAINT [PK_ForumTopicTag] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumTopicTag_Space] FOREIGN KEY ([SpaceID]) REFERENCES [${flyway:defaultSchema}].[CommunitySpace]([ID]),
    CONSTRAINT [FK_ForumTopicTag_ParentTag] FOREIGN KEY ([ParentTagID]) REFERENCES [${flyway:defaultSchema}].[ForumTopicTag]([ID]),
    CONSTRAINT [FK_ForumTopicTag_MJTag] FOREIGN KEY ([TagID]) REFERENCES [${mjSchema}].[Tag]([ID]),
    CONSTRAINT [UQ_ForumTopicTag_Space_Slug] UNIQUE ([SpaceID], [Slug])
);
GO

-- -----------------------------------------------------------------------------
-- 9. ForumPost (Unified parent table for root threads and nested replies)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumPost_ID] DEFAULT (NEWSEQUENTIALID()),
    [ForumID] UNIQUEIDENTIFIER NOT NULL,
    [PostTypeID] UNIQUEIDENTIFIER NOT NULL,
    [RootPostID] UNIQUEIDENTIFIER NULL,
    [ParentPostID] UNIQUEIDENTIFIER NULL,
    [ReplyDepth] INT NOT NULL CONSTRAINT [DF_ForumPost_ReplyDepth] DEFAULT (0),
    [AuthorUserID] UNIQUEIDENTIFIER NULL,
    [AuthorPersonID] UNIQUEIDENTIFIER NULL,
    [AuthorAgentID] UNIQUEIDENTIFIER NULL,
    [Title] NVARCHAR(300) NULL,
    [Slug] NVARCHAR(320) NULL,
    [BodyMarkdown] NVARCHAR(MAX) NOT NULL,
    [SummaryMarkdown] NVARCHAR(MAX) NULL,
    [SummaryGeneratedAt] DATETIMEOFFSET NULL,
    [SummaryReplyWatermark] INT NOT NULL CONSTRAINT [DF_ForumPost_SummaryReplyWatermark] DEFAULT (0),
    [VisibilityBand] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ForumPost_VisibilityBand] DEFAULT (N'Shared'),
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumPost_Status] DEFAULT (N'Published'),
    [IsPinned] BIT NOT NULL CONSTRAINT [DF_ForumPost_IsPinned] DEFAULT (0),
    [IsLocked] BIT NOT NULL CONSTRAINT [DF_ForumPost_IsLocked] DEFAULT (0),
    [IsFeatured] BIT NOT NULL CONSTRAINT [DF_ForumPost_IsFeatured] DEFAULT (0),
    [ReplyCount] INT NOT NULL CONSTRAINT [DF_ForumPost_ReplyCount] DEFAULT (0),
    [ParticipantCount] INT NOT NULL CONSTRAINT [DF_ForumPost_ParticipantCount] DEFAULT (1),
    [ReactionScore] INT NOT NULL CONSTRAINT [DF_ForumPost_ReactionScore] DEFAULT (0),
    [ViewCount] INT NOT NULL CONSTRAINT [DF_ForumPost_ViewCount] DEFAULT (0),
    [LastActivityAt] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_ForumPost_LastActivityAt] DEFAULT (SYSDATETIMEOFFSET()),
    [PromotedToSpaceID] UNIQUEIDENTIFIER NULL,
    [LinkedTaskID] UNIQUEIDENTIFIER NULL,
    CONSTRAINT [PK_ForumPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumPost_Forum] FOREIGN KEY ([ForumID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]),
    CONSTRAINT [FK_ForumPost_PostType] FOREIGN KEY ([PostTypeID]) REFERENCES [${flyway:defaultSchema}].[PostType]([ID]),
    CONSTRAINT [FK_ForumPost_RootPost] FOREIGN KEY ([RootPostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPost_ParentPost] FOREIGN KEY ([ParentPostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPost_AuthorUser] FOREIGN KEY ([AuthorUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_ForumPost_AuthorPerson] FOREIGN KEY ([AuthorPersonID]) REFERENCES [__mj_BizAppsCommon].[Person]([ID]),
    CONSTRAINT [FK_ForumPost_AuthorAgent] FOREIGN KEY ([AuthorAgentID]) REFERENCES [${mjSchema}].[AIAgent]([ID]),
    CONSTRAINT [FK_ForumPost_PromotedToSpace] FOREIGN KEY ([PromotedToSpaceID]) REFERENCES [__mj_BizAppsCollaboration].[Space]([ID]),
    CONSTRAINT [FK_ForumPost_LinkedTask] FOREIGN KEY ([LinkedTaskID]) REFERENCES [__mj_BizAppsTasks].[Task]([ID]),
    CONSTRAINT [CK_ForumPost_VisibilityBand] CHECK ([VisibilityBand] IN (N'Shared', N'Team')),
    CONSTRAINT [CK_ForumPost_Status] CHECK ([Status] IN (N'Draft', N'PendingModeration', N'Published', N'Answered', N'Resolved', N'Archived', N'Redacted'))
);
GO

-- -----------------------------------------------------------------------------
-- 10. ForumPost IsA Subtype Tables
-- -----------------------------------------------------------------------------

-- 10a. ForumQuestionPost (IsA ForumPost)
CREATE TABLE [${flyway:defaultSchema}].[ForumQuestionPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [AcceptedAnswerPostID] UNIQUEIDENTIFIER NULL,
    [AICanonAnswerPostID] UNIQUEIDENTIFIER NULL,
    [BountyPoints] INT NOT NULL CONSTRAINT [DF_ForumQuestionPost_BountyPoints] DEFAULT (0),
    [ResolvedAt] DATETIMEOFFSET NULL,
    [DeflectionCount] INT NOT NULL CONSTRAINT [DF_ForumQuestionPost_DeflectionCount] DEFAULT (0),
    CONSTRAINT [PK_ForumQuestionPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumQuestionPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumQuestionPost_AcceptedAnswer] FOREIGN KEY ([AcceptedAnswerPostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumQuestionPost_AICanonAnswer] FOREIGN KEY ([AICanonAnswerPostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID])
);
GO

-- 10b. ForumAnswerPost (IsA ForumPost)
CREATE TABLE [${flyway:defaultSchema}].[ForumAnswerPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [QuestionPostID] UNIQUEIDENTIFIER NOT NULL,
    [IsAcceptedByAuthor] BIT NOT NULL CONSTRAINT [DF_ForumAnswerPost_IsAcceptedByAuthor] DEFAULT (0),
    [IsVerifiedByModerator] BIT NOT NULL CONSTRAINT [DF_ForumAnswerPost_IsVerifiedByModerator] DEFAULT (0),
    [VerifiedByUserID] UNIQUEIDENTIFIER NULL,
    [VerifiedAt] DATETIMEOFFSET NULL,
    [AIEpistemicStatus] NVARCHAR(40) NULL,
    [AIConfidenceScore] DECIMAL(4,3) NULL,
    [AIRationaleMarkdown] NVARCHAR(MAX) NULL,
    [FreshnessReviewDueAt] DATETIMEOFFSET NULL,
    CONSTRAINT [PK_ForumAnswerPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumAnswerPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumAnswerPost_QuestionPost] FOREIGN KEY ([QuestionPostID]) REFERENCES [${flyway:defaultSchema}].[ForumQuestionPost]([ID]),
    CONSTRAINT [FK_ForumAnswerPost_VerifiedByUser] FOREIGN KEY ([VerifiedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [CK_ForumAnswerPost_EpistemicStatus] CHECK ([AIEpistemicStatus] IS NULL OR [AIEpistemicStatus] IN (N'Canon Verified', N'Novel Insight', N'Partially Outdated', N'Conflicts With Canon'))
);
GO

-- 10c. ForumIdeaPost (IsA ForumPost)
CREATE TABLE [${flyway:defaultSchema}].[ForumIdeaPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [IdeaStatus] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumIdeaPost_IdeaStatus] DEFAULT (N'Under Consideration'),
    [TotalPointsAllocated] INT NOT NULL CONSTRAINT [DF_ForumIdeaPost_TotalPointsAllocated] DEFAULT (0),
    [EffectiveQuadraticVotes] DECIMAL(10,2) NOT NULL CONSTRAINT [DF_ForumIdeaPost_EffectiveQuadraticVotes] DEFAULT (0),
    [UniqueBackerCount] INT NOT NULL CONSTRAINT [DF_ForumIdeaPost_UniqueBackerCount] DEFAULT (0),
    [TargetReleaseOrQuarter] NVARCHAR(50) NULL,
    [StatusRationaleMarkdown] NVARCHAR(MAX) NULL,
    [MergedIntoIdeaPostID] UNIQUEIDENTIFIER NULL,
    CONSTRAINT [PK_ForumIdeaPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumIdeaPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumIdeaPost_MergedIntoIdea] FOREIGN KEY ([MergedIntoIdeaPostID]) REFERENCES [${flyway:defaultSchema}].[ForumIdeaPost]([ID]),
    CONSTRAINT [CK_ForumIdeaPost_IdeaStatus] CHECK ([IdeaStatus] IN (N'Under Consideration', N'Planned', N'In Progress', N'Shipped', N'Declined'))
);
GO

-- 10d. ForumFormPost (IsA ForumPost)
CREATE TABLE [${flyway:defaultSchema}].[ForumFormPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [FormID] UNIQUEIDENTIFIER NOT NULL,
    [ShowLiveResultsInline] BIT NOT NULL CONSTRAINT [DF_ForumFormPost_ShowLiveResultsInline] DEFAULT (1),
    [RequirePostReplyOnSubmit] BIT NOT NULL CONSTRAINT [DF_ForumFormPost_RequirePostReplyOnSubmit] DEFAULT (0),
    [ClosesAt] DATETIMEOFFSET NULL,
    CONSTRAINT [PK_ForumFormPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumFormPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumFormPost_Form] FOREIGN KEY ([FormID]) REFERENCES [__mj_BizAppsForms].[Form]([ID])
);
GO

-- 10e. ForumArtifactPost (IsA ForumPost — Docs, Sheets, Slides via MJ Artifacts + SpaceItem)
CREATE TABLE [${flyway:defaultSchema}].[ForumArtifactPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [ArtifactID] UNIQUEIDENTIFIER NOT NULL,
    [PinnedArtifactVersionID] UNIQUEIDENTIFIER NULL,
    [SpaceItemID] UNIQUEIDENTIFIER NOT NULL,
    [ArtifactModality] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ForumArtifactPost_Modality] DEFAULT (N'Document'),
    [CollaborationMode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ForumArtifactPost_CollabMode] DEFAULT (N'Suggest'),
    [ShowInlinePreview] BIT NOT NULL CONSTRAINT [DF_ForumArtifactPost_ShowInlinePreview] DEFAULT (1),
    CONSTRAINT [PK_ForumArtifactPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumArtifactPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumArtifactPost_Artifact] FOREIGN KEY ([ArtifactID]) REFERENCES [${mjSchema}].[Artifact]([ID]),
    CONSTRAINT [FK_ForumArtifactPost_ArtifactVersion] FOREIGN KEY ([PinnedArtifactVersionID]) REFERENCES [${mjSchema}].[ArtifactVersion]([ID]),
    CONSTRAINT [FK_ForumArtifactPost_SpaceItem] FOREIGN KEY ([SpaceItemID]) REFERENCES [__mj_BizAppsCollaboration].[SpaceItem]([ID]),
    CONSTRAINT [CK_ForumArtifactPost_Modality] CHECK ([ArtifactModality] IN (N'Document', N'Spreadsheet', N'Presentation')),
    CONSTRAINT [CK_ForumArtifactPost_CollabMode] CHECK ([CollaborationMode] IN (N'Suggest', N'Edit', N'Comment Only'))
);
GO

-- 10f. ForumCasePost (IsA ForumPost — Structured Peer Case Review)
CREATE TABLE [${flyway:defaultSchema}].[ForumCasePost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [SituationMarkdown] NVARCHAR(MAX) NOT NULL,
    [ActionTakenMarkdown] NVARCHAR(MAX) NOT NULL,
    [OutcomeMarkdown] NVARCHAR(MAX) NULL,
    [IsAnonymized] BIT NOT NULL CONSTRAINT [DF_ForumCasePost_IsAnonymized] DEFAULT (0),
    [AnonymizedAuthorAlias] NVARCHAR(100) NULL,
    [RedactionConfirmedByUserID] UNIQUEIDENTIFIER NULL,
    CONSTRAINT [PK_ForumCasePost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumCasePost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumCasePost_RedactionConfirmedBy] FOREIGN KEY ([RedactionConfirmedByUserID]) REFERENCES [${mjSchema}].[User]([ID])
);
GO

-- 10g. ForumAMAPost (IsA ForumPost — Live AMA / Town Hall)
CREATE TABLE [${flyway:defaultSchema}].[ForumAMAPost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [HostUserID] UNIQUEIDENTIFIER NOT NULL,
    [ScheduledStartAt] DATETIMEOFFSET NOT NULL,
    [ScheduledEndAt] DATETIMEOFFSET NOT NULL,
    [QuestionsOpenAt] DATETIMEOFFSET NOT NULL,
    [IsLiveNow] BIT NOT NULL CONSTRAINT [DF_ForumAMAPost_IsLiveNow] DEFAULT (0),
    [RecordingURL] NVARCHAR(500) NULL,
    [RecapMarkdown] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_ForumAMAPost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumAMAPost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumAMAPost_HostUser] FOREIGN KEY ([HostUserID]) REFERENCES [${mjSchema}].[User]([ID])
);
GO

-- 10h. ForumInteractivePost (IsA ForumPost — Sandboxed MJ Component Artifact Mini-Apps & Games)
CREATE TABLE [${flyway:defaultSchema}].[ForumInteractivePost] (
    [ID] UNIQUEIDENTIFIER NOT NULL,
    [ComponentArtifactID] UNIQUEIDENTIFIER NOT NULL,
    [PinnedArtifactVersionID] UNIQUEIDENTIFIER NULL,
    [SpaceItemID] UNIQUEIDENTIFIER NULL,
    [ExperienceKind] NVARCHAR(40) NOT NULL CONSTRAINT [DF_ForumInteractivePost_Kind] DEFAULT (N'Quiz'),
    [ExperienceKindDetails] NVARCHAR(200) NULL,
    [PromptUsed] NVARCHAR(MAX) NULL,
    [ScoringMode] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumInteractivePost_ScoringMode] DEFAULT (N'Best Score'),
    [ShowLeaderboard] BIT NOT NULL CONSTRAINT [DF_ForumInteractivePost_ShowLeaderboard] DEFAULT (1),
    [MaxAttemptsPerMember] INT NULL,
    [PlayCount] INT NOT NULL CONSTRAINT [DF_ForumInteractivePost_PlayCount] DEFAULT (0),
    [ExpiresAt] DATETIMEOFFSET NULL,
    CONSTRAINT [PK_ForumInteractivePost] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumInteractivePost_ForumPost] FOREIGN KEY ([ID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumInteractivePost_Artifact] FOREIGN KEY ([ComponentArtifactID]) REFERENCES [${mjSchema}].[Artifact]([ID]),
    CONSTRAINT [FK_ForumInteractivePost_ArtifactVersion] FOREIGN KEY ([PinnedArtifactVersionID]) REFERENCES [${mjSchema}].[ArtifactVersion]([ID]),
    CONSTRAINT [FK_ForumInteractivePost_SpaceItem] FOREIGN KEY ([SpaceItemID]) REFERENCES [__mj_BizAppsCollaboration].[SpaceItem]([ID]),
    CONSTRAINT [CK_ForumInteractivePost_Kind] CHECK ([ExperienceKind] IN (N'Quiz', N'Trivia', N'Calculator', N'Simulation', N'Flashcards', N'Poll Game', N'Other')),
    CONSTRAINT [CK_ForumInteractivePost_ScoringMode] CHECK ([ScoringMode] IN (N'Best Score', N'Fastest Time', N'Streak', N'Completion', N'None'))
);
GO

-- -----------------------------------------------------------------------------
-- 11. ForumInteractiveSession (Per-member scores & state for interactive posts)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumInteractiveSession] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumInteractiveSession_ID] DEFAULT (NEWSEQUENTIALID()),
    [InteractivePostID] UNIQUEIDENTIFIER NOT NULL,
    [ArtifactVersionID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [AttemptNumber] INT NOT NULL CONSTRAINT [DF_ForumInteractiveSession_AttemptNumber] DEFAULT (1),
    [Score] DECIMAL(12,2) NULL,
    [DurationSeconds] INT NULL,
    [Completed] BIT NOT NULL CONSTRAINT [DF_ForumInteractiveSession_Completed] DEFAULT (0),
    [OutcomeSummary] NVARCHAR(300) NULL,
    [SessionStateJSON] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_ForumInteractiveSession] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumInteractiveSession_InteractivePost] FOREIGN KEY ([InteractivePostID]) REFERENCES [${flyway:defaultSchema}].[ForumInteractivePost]([ID]),
    CONSTRAINT [FK_ForumInteractiveSession_ArtifactVersion] FOREIGN KEY ([ArtifactVersionID]) REFERENCES [${mjSchema}].[ArtifactVersion]([ID]),
    CONSTRAINT [FK_ForumInteractiveSession_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_ForumInteractiveSession_Post_User_Attempt] UNIQUE ([InteractivePostID], [UserID], [AttemptNumber]),
    CONSTRAINT [CK_ForumInteractiveSession_State_JSON] CHECK ([SessionStateJSON] IS NULL OR ISJSON([SessionStateJSON]) = 1)
);
GO

-- -----------------------------------------------------------------------------
-- 12. Supporting Tables (Tags, Reactions, Attachments, Idea Allocations, Profiles, Subscriptions, Flags)
-- -----------------------------------------------------------------------------
CREATE TABLE [${flyway:defaultSchema}].[ForumPostTag] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumPostTag_ID] DEFAULT (NEWSEQUENTIALID()),
    [PostID] UNIQUEIDENTIFIER NOT NULL,
    [TopicTagID] UNIQUEIDENTIFIER NOT NULL,
    [AssignedByAI] BIT NOT NULL CONSTRAINT [DF_ForumPostTag_AssignedByAI] DEFAULT (0),
    CONSTRAINT [PK_ForumPostTag] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumPostTag_Post] FOREIGN KEY ([PostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPostTag_TopicTag] FOREIGN KEY ([TopicTagID]) REFERENCES [${flyway:defaultSchema}].[ForumTopicTag]([ID]),
    CONSTRAINT [UQ_ForumPostTag_Post_TopicTag] UNIQUE ([PostID], [TopicTagID])
);
GO

CREATE TABLE [${flyway:defaultSchema}].[ForumPostReaction] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumPostReaction_ID] DEFAULT (NEWSEQUENTIALID()),
    [PostID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [ReactionKind] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumPostReaction_Kind] DEFAULT (N'Upvote'),
    [Weight] DECIMAL(5,2) NOT NULL CONSTRAINT [DF_ForumPostReaction_Weight] DEFAULT (1.00),
    CONSTRAINT [PK_ForumPostReaction] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumPostReaction_Post] FOREIGN KEY ([PostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPostReaction_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_ForumPostReaction_Post_User_Kind] UNIQUE ([PostID], [UserID], [ReactionKind]),
    CONSTRAINT [CK_ForumPostReaction_Kind] CHECK ([ReactionKind] IN (N'Upvote', N'Helpful', N'Insightful', N'Agree', N'Celebrate', N'Curious'))
);
GO

CREATE TABLE [${flyway:defaultSchema}].[ForumPostAttachment] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumPostAttachment_ID] DEFAULT (NEWSEQUENTIALID()),
    [PostID] UNIQUEIDENTIFIER NOT NULL,
    [SpaceItemID] UNIQUEIDENTIFIER NOT NULL,
    [Caption] NVARCHAR(300) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_ForumPostAttachment_Sequence] DEFAULT (0),
    CONSTRAINT [PK_ForumPostAttachment] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumPostAttachment_Post] FOREIGN KEY ([PostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPostAttachment_SpaceItem] FOREIGN KEY ([SpaceItemID]) REFERENCES [__mj_BizAppsCollaboration].[SpaceItem]([ID]),
    CONSTRAINT [UQ_ForumPostAttachment_Post_SpaceItem] UNIQUE ([PostID], [SpaceItemID])
);
GO

CREATE TABLE [${flyway:defaultSchema}].[ForumIdeaAllocation] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumIdeaAllocation_ID] DEFAULT (NEWSEQUENTIALID()),
    [IdeaPostID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [PointsAllocated] INT NOT NULL,
    [QuadraticVotes] DECIMAL(10,2) NOT NULL,
    [RationaleComment] NVARCHAR(500) NULL,
    CONSTRAINT [PK_ForumIdeaAllocation] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumIdeaAllocation_IdeaPost] FOREIGN KEY ([IdeaPostID]) REFERENCES [${flyway:defaultSchema}].[ForumIdeaPost]([ID]),
    CONSTRAINT [FK_ForumIdeaAllocation_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_ForumIdeaAllocation_Idea_User] UNIQUE ([IdeaPostID], [UserID]),
    CONSTRAINT [CK_ForumIdeaAllocation_PositivePoints] CHECK ([PointsAllocated] > 0)
);
GO

CREATE TABLE [${flyway:defaultSchema}].[CommunityMemberProfile] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_CommunityMemberProfile_ID] DEFAULT (NEWSEQUENTIALID()),
    [SpaceID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [PersonID] UNIQUEIDENTIFIER NULL,
    [BioMarkdown] NVARCHAR(1000) NULL,
    [ExpertiseTagsJSON] NVARCHAR(MAX) NULL,
    [HelpfulAnswerCount] INT NOT NULL CONSTRAINT [DF_CommunityMemberProfile_HelpfulAnswerCount] DEFAULT (0),
    [AcceptedAnswerCount] INT NOT NULL CONSTRAINT [DF_CommunityMemberProfile_AcceptedAnswerCount] DEFAULT (0),
    [ReputationScore] INT NOT NULL CONSTRAINT [DF_CommunityMemberProfile_ReputationScore] DEFAULT (0),
    [DigestCadence] NVARCHAR(30) NOT NULL CONSTRAINT [DF_CommunityMemberProfile_DigestCadence] DEFAULT (N'Daily Digest'),
    [OpenToPeerMentoring] BIT NOT NULL CONSTRAINT [DF_CommunityMemberProfile_OpenToPeerMentoring] DEFAULT (0),
    CONSTRAINT [PK_CommunityMemberProfile] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_CommunityMemberProfile_Space] FOREIGN KEY ([SpaceID]) REFERENCES [${flyway:defaultSchema}].[CommunitySpace]([ID]),
    CONSTRAINT [FK_CommunityMemberProfile_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_CommunityMemberProfile_Person] FOREIGN KEY ([PersonID]) REFERENCES [__mj_BizAppsCommon].[Person]([ID]),
    CONSTRAINT [UQ_CommunityMemberProfile_Space_User] UNIQUE ([SpaceID], [UserID]),
    CONSTRAINT [CK_CommunityMemberProfile_DigestCadence] CHECK ([DigestCadence] IN (N'Every Post', N'Daily Digest', N'Weekly Digest', N'Highlights Only', N'Muted')),
    CONSTRAINT [CK_CommunityMemberProfile_Expertise_JSON] CHECK ([ExpertiseTagsJSON] IS NULL OR ISJSON([ExpertiseTagsJSON]) = 1)
);
GO

CREATE TABLE [${flyway:defaultSchema}].[ForumSubscription] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumSubscription_ID] DEFAULT (NEWSEQUENTIALID()),
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [ForumID] UNIQUEIDENTIFIER NULL,
    [RootPostID] UNIQUEIDENTIFIER NULL,
    [TopicTagID] UNIQUEIDENTIFIER NULL,
    [DeliveryLevel] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumSubscription_DeliveryLevel] DEFAULT (N'Every Post'),
    CONSTRAINT [PK_ForumSubscription] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumSubscription_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_ForumSubscription_Forum] FOREIGN KEY ([ForumID]) REFERENCES [${flyway:defaultSchema}].[Forum]([ID]),
    CONSTRAINT [FK_ForumSubscription_RootPost] FOREIGN KEY ([RootPostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumSubscription_TopicTag] FOREIGN KEY ([TopicTagID]) REFERENCES [${flyway:defaultSchema}].[ForumTopicTag]([ID]),
    CONSTRAINT [CK_ForumSubscription_Target] CHECK (
        (CASE WHEN [ForumID] IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN [RootPostID] IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN [TopicTagID] IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    CONSTRAINT [CK_ForumSubscription_DeliveryLevel] CHECK ([DeliveryLevel] IN (N'Every Post', N'First Post Only', N'Digest Only', N'Muted'))
);
GO

CREATE TABLE [${flyway:defaultSchema}].[ForumPostFlag] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_ForumPostFlag_ID] DEFAULT (NEWSEQUENTIALID()),
    [PostID] UNIQUEIDENTIFIER NOT NULL,
    [ReportedByUserID] UNIQUEIDENTIFIER NULL,
    [ReportedByAgentID] UNIQUEIDENTIFIER NULL,
    [ReasonCategory] NVARCHAR(40) NOT NULL,
    [ReasonDetails] NVARCHAR(1000) NULL,
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_ForumPostFlag_Status] DEFAULT (N'Open'),
    [ResolvedByUserID] UNIQUEIDENTIFIER NULL,
    [ResolvedAt] DATETIMEOFFSET NULL,
    [ResolutionOutcome] NVARCHAR(40) NULL,
    CONSTRAINT [PK_ForumPostFlag] PRIMARY KEY ([ID]),
    CONSTRAINT [FK_ForumPostFlag_Post] FOREIGN KEY ([PostID]) REFERENCES [${flyway:defaultSchema}].[ForumPost]([ID]),
    CONSTRAINT [FK_ForumPostFlag_ReportedByUser] FOREIGN KEY ([ReportedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_ForumPostFlag_ReportedByAgent] FOREIGN KEY ([ReportedByAgentID]) REFERENCES [${mjSchema}].[AIAgent]([ID]),
    CONSTRAINT [FK_ForumPostFlag_ResolvedByUser] FOREIGN KEY ([ResolvedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [CK_ForumPostFlag_ReasonCategory] CHECK ([ReasonCategory] IN (N'Off Topic', N'Spam', N'Harassment', N'Outdated Advice', N'Needs Redaction', N'Other')),
    CONSTRAINT [CK_ForumPostFlag_Status] CHECK ([Status] IN (N'Open', N'Dismissed', N'ActionTaken')),
    CONSTRAINT [CK_ForumPostFlag_ResolutionOutcome] CHECK ([ResolutionOutcome] IS NULL OR [ResolutionOutcome] IN (N'Dismissed', N'Edited', N'Redacted', N'Hidden', N'Author Muted'))
);
GO

-- -----------------------------------------------------------------------------
-- 13. Foreign-Key & Hot-Query Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX [IX_Forum_SpaceID_Sequence] ON [${flyway:defaultSchema}].[Forum]([SpaceID], [Sequence]);
CREATE INDEX [IX_Forum_ForumTypeID] ON [${flyway:defaultSchema}].[Forum]([ForumTypeID]);
CREATE INDEX [IX_ForumMember_UserID] ON [${flyway:defaultSchema}].[ForumMember]([UserID], [ForumID]);
CREATE INDEX [IX_ForumPost_ForumID_LastActivity] ON [${flyway:defaultSchema}].[ForumPost]([ForumID], [IsPinned] DESC, [LastActivityAt] DESC) WHERE [RootPostID] IS NULL;
CREATE INDEX [IX_ForumPost_RootPostID_Depth] ON [${flyway:defaultSchema}].[ForumPost]([RootPostID], [ReplyDepth]);
CREATE INDEX [IX_ForumPost_AuthorUserID] ON [${flyway:defaultSchema}].[ForumPost]([AuthorUserID]);
CREATE INDEX [IX_ForumAnswerPost_QuestionPostID] ON [${flyway:defaultSchema}].[ForumAnswerPost]([QuestionPostID]);
CREATE INDEX [IX_ForumInteractiveSession_Score] ON [${flyway:defaultSchema}].[ForumInteractiveSession]([InteractivePostID], [Score] DESC, [DurationSeconds] ASC);
GO

-- -----------------------------------------------------------------------------
-- 14. Extended Properties (Table Descriptions)
-- -----------------------------------------------------------------------------
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'IsA subtype of Collaboration Space representing an online community hub with forums, Ask-First AI deflection, and digest settings.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'CommunitySpace';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Metadata registry of forum types, binding each forum archetype to optional server/UI drivers and IsA extension entities.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'ForumType';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Metadata registry of post types, binding each post archetype to optional server/UI drivers, placement rules, and IsA extension entities.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'PostType';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Metadata registry of forum role types and capability flags for posting, moderation, canon verification, co-editing, and space graduation.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'ForumRoleType';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Discussion, Q&A, ideation, document co-authoring, case review, or live event channels inside a Community Space.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'Forum';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'IsA subtype of Forum configuring 100-Point Wallet or Quadratic Voting parameters for an ideation campaign.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'ForumIdeaCampaign';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Unified parent entity for all root threads and nested replies across every forum type.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'ForumPost';
EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'IsA subtype of ForumPost for sandboxed interactive mini-apps, calculators, quizzes, and simulations backed by MJ Component Artifacts.', @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}', @level1type = N'TABLE', @level1name = N'ForumInteractivePost';
GO

-- -----------------------------------------------------------------------------
-- 15. Inline Table-Valued Function: fnCommunityForumAccess
--     Evaluates Collaboration Space access, Space open/post-close read window,
--     and private/moderated Forum overrides in a single composable TVF.
-- -----------------------------------------------------------------------------
CREATE FUNCTION [${flyway:defaultSchema}].[fnCommunityForumAccess](@UserID UNIQUEIDENTIFIER)
RETURNS TABLE
AS
RETURN (
    WITH SpaceOpenWindow AS (
        SELECT
            s.ID AS SpaceID,
            CAST(
                CASE
                    WHEN s.ClosedAt IS NULL THEN 1
                    WHEN COALESCE(s.PostCloseAccess, st.PostCloseAccess, N'None') = N'ReadOnly' THEN 1
                    WHEN COALESCE(s.PostCloseAccess, st.PostCloseAccess, N'None') = N'ReadOnlyWindow'
                         AND COALESCE(s.PostCloseAccessDays, st.PostCloseAccessDays) IS NOT NULL
                         AND DATEDIFF(DAY, s.ClosedAt, SYSDATETIMEOFFSET()) <= COALESCE(s.PostCloseAccessDays, st.PostCloseAccessDays) THEN 1
                    ELSE 0
                END AS BIT
            ) AS IsReadable,
            CAST(CASE WHEN s.ClosedAt IS NULL THEN 1 ELSE 0 END AS BIT) AS IsOpenForWrites
        FROM [__mj_BizAppsCollaboration].[Space] AS s
        INNER JOIN [__mj_BizAppsCollaboration].[SpaceType] AS st ON st.ID = s.SpaceTypeID
    )
    SELECT
        f.ID AS ForumID,
        f.SpaceID,
        sa.CanSeeTeam,
        CAST(
            CASE
                WHEN f.Status = N'Locked' THEN 0
                WHEN sow.IsOpenForWrites = 0 THEN 0
                WHEN fm.Status = N'Muted' THEN 0
                WHEN fr.CanCreateRootPost = 0 AND fr.CanReply = 0 THEN 0
                WHEN f.PostingPolicy = N'ReadOnly' AND ISNULL(fr.CanConfigureForum, 0) = 0 THEN 0
                ELSE 1
            END AS BIT
        ) AS CanPost,
        CAST(ISNULL(fr.CanModerateQueue, 0) AS BIT) AS CanModerate
    FROM [${flyway:defaultSchema}].[Forum] AS f
    INNER JOIN [__mj_BizAppsCollaboration].[fnCollaborationAccess](@UserID) AS sa
        ON sa.SpaceID = f.SpaceID
    INNER JOIN SpaceOpenWindow AS sow
        ON sow.SpaceID = f.SpaceID AND sow.IsReadable = 1
    LEFT JOIN [${flyway:defaultSchema}].[ForumMember] AS fm
        ON fm.ForumID = f.ID AND fm.UserID = @UserID
    LEFT JOIN [${flyway:defaultSchema}].[ForumRoleType] AS fr
        ON fr.ID = fm.ForumRoleTypeID
    WHERE
        (
            f.InheritsSpaceMembers = 1
            AND (
                f.VisibilityBand = N'Shared'
                OR (f.VisibilityBand = N'Team' AND sa.CanSeeTeam = 1)
            )
            AND (fm.ID IS NULL OR fm.Status IN (N'Active', N'Muted'))
        )
        OR (
            fm.Status = N'Active'
        )
);
GO
