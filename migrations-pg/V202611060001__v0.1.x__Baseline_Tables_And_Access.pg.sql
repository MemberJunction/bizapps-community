-- =============================================================================
--  BizApps Community (PostgreSQL) — Baseline Tables, IsA Subtypes, Constraints, and Access TVF
-- =============================================================================

SET search_path TO __mj_BizAppsCommunity, public;

-- -----------------------------------------------------------------------------
-- 1. CommunitySpace (IsA subtype of __mj_BizAppsCollaboration.Space)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."CommunitySpace" (
    "ID" UUID NOT NULL,
    "Slug" VARCHAR(120) NOT NULL,
    "CommunityKind" VARCHAR(50) NOT NULL DEFAULT 'Association Wide',
    "CommunityKindDetails" VARCHAR(200) NULL,
    "AnonymousReadMode" VARCHAR(30) NOT NULL DEFAULT 'Teaser Only',
    "AskFirstEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "DefaultDigestCadence" VARCHAR(30) NOT NULL DEFAULT 'Daily Digest',
    "BannerImageURL" VARCHAR(500) NULL,
    "WelcomeMarkdown" TEXT NULL,
    "DefaultForumID" UUID NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_CommunitySpace" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_CommunitySpace_Space" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCollaboration."Space"("ID"),
    CONSTRAINT "UQ_CommunitySpace_Slug" UNIQUE ("Slug"),
    CONSTRAINT "CK_CommunitySpace_CommunityKind" CHECK ("CommunityKind" IN ('Association Wide', 'Special Interest Group', 'Product Community', 'Working Group', 'Other')),
    CONSTRAINT "CK_CommunitySpace_AnonymousReadMode" CHECK ("AnonymousReadMode" IN ('None', 'Teaser Only', 'Full Read')),
    CONSTRAINT "CK_CommunitySpace_DefaultDigestCadence" CHECK ("DefaultDigestCadence" IN ('Every Post', 'Daily Digest', 'Weekly Digest', 'Highlights Only', 'Muted'))
);

-- -----------------------------------------------------------------------------
-- 2. ForumType (Metadata-driven forum behavior & driver registry)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumType" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "Code" VARCHAR(100) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT NULL,
    "Icon" VARCHAR(100) NULL,
    "ServerDriverClass" VARCHAR(200) NULL,
    "UIDriverClass" VARCHAR(200) NULL,
    "ExtensionEntity" VARCHAR(255) NULL,
    "Configuration" TEXT NULL,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumType" PRIMARY KEY ("ID"),
    CONSTRAINT "UQ_ForumType_Code" UNIQUE ("Code"),
    CONSTRAINT "UQ_ForumType_Name" UNIQUE ("Name")
);

-- -----------------------------------------------------------------------------
-- 3. PostType (Metadata-driven post behavior & driver registry)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."PostType" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "Code" VARCHAR(100) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT NULL,
    "Icon" VARCHAR(100) NULL,
    "ServerDriverClass" VARCHAR(200) NULL,
    "UIDriverClass" VARCHAR(200) NULL,
    "ExtensionEntity" VARCHAR(255) NULL,
    "PlacementRule" VARCHAR(20) NOT NULL DEFAULT 'Both',
    "AllowsNestedReplies" BOOLEAN NOT NULL DEFAULT TRUE,
    "TriggersThreadSynthesis" BOOLEAN NOT NULL DEFAULT TRUE,
    "IndexedInCorpus" BOOLEAN NOT NULL DEFAULT TRUE,
    "Configuration" TEXT NULL,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_PostType" PRIMARY KEY ("ID"),
    CONSTRAINT "UQ_PostType_Code" UNIQUE ("Code"),
    CONSTRAINT "UQ_PostType_Name" UNIQUE ("Name"),
    CONSTRAINT "CK_PostType_PlacementRule" CHECK ("PlacementRule" IN ('Root Only', 'Reply Only', 'Both'))
);

-- -----------------------------------------------------------------------------
-- 4. ForumRoleType (Role capability flags inside forums)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumRoleType" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "Code" VARCHAR(100) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT NULL,
    "Level" INTEGER NOT NULL DEFAULT 100,
    "CanConfigureForum" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanModerateQueue" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanPinOrLock" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanAcceptAnswers" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanVerifyCanon" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanPromoteToSpace" BOOLEAN NOT NULL DEFAULT FALSE,
    "CanCreateRootPost" BOOLEAN NOT NULL DEFAULT TRUE,
    "CanReply" BOOLEAN NOT NULL DEFAULT TRUE,
    "CanCoEditDocs" BOOLEAN NOT NULL DEFAULT FALSE,
    "VoteWeightMultiplier" NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumRoleType" PRIMARY KEY ("ID"),
    CONSTRAINT "UQ_ForumRoleType_Code" UNIQUE ("Code"),
    CONSTRAINT "UQ_ForumRoleType_Name" UNIQUE ("Name")
);

-- -----------------------------------------------------------------------------
-- 5. Forum (Channels inside a CommunitySpace)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."Forum" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "SpaceID" UUID NOT NULL,
    "ParentForumID" UUID NULL,
    "ForumTypeID" UUID NOT NULL,
    "Slug" VARCHAR(120) NOT NULL,
    "Name" VARCHAR(200) NOT NULL,
    "Description" TEXT NULL,
    "Icon" VARCHAR(100) NULL,
    "ColorHex" VARCHAR(20) NULL,
    "VisibilityBand" VARCHAR(20) NOT NULL DEFAULT 'Shared',
    "AnonymousReadMode" VARCHAR(30) NULL,
    "InheritsSpaceMembers" BOOLEAN NOT NULL DEFAULT TRUE,
    "PostingPolicy" VARCHAR(30) NOT NULL DEFAULT 'Open',
    "InboundEmailAlias" VARCHAR(150) NULL,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "Configuration" TEXT NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_Forum" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_Forum_CommunitySpace" FOREIGN KEY ("SpaceID") REFERENCES __mj_BizAppsCommunity."CommunitySpace"("ID"),
    CONSTRAINT "FK_Forum_ParentForum" FOREIGN KEY ("ParentForumID") REFERENCES __mj_BizAppsCommunity."Forum"("ID"),
    CONSTRAINT "FK_Forum_ForumType" FOREIGN KEY ("ForumTypeID") REFERENCES __mj_BizAppsCommunity."ForumType"("ID"),
    CONSTRAINT "UQ_Forum_Space_Slug" UNIQUE ("SpaceID", "Slug"),
    CONSTRAINT "CK_Forum_VisibilityBand" CHECK ("VisibilityBand" IN ('Shared', 'Team', 'PrivateForum')),
    CONSTRAINT "CK_Forum_AnonymousReadMode" CHECK ("AnonymousReadMode" IS NULL OR "AnonymousReadMode" IN ('None', 'Teaser Only', 'Full Read')),
    CONSTRAINT "CK_Forum_PostingPolicy" CHECK ("PostingPolicy" IN ('Open', 'Moderated', 'ReadOnly')),
    CONSTRAINT "CK_Forum_Status" CHECK ("Status" IN ('Active', 'Archived', 'Locked'))
);

ALTER TABLE __mj_BizAppsCommunity."CommunitySpace"
ADD CONSTRAINT "FK_CommunitySpace_DefaultForum" FOREIGN KEY ("DefaultForumID") REFERENCES __mj_BizAppsCommunity."Forum"("ID");

-- -----------------------------------------------------------------------------
-- 6. ForumIdeaCampaign (IsA subtype of Forum)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumIdeaCampaign" (
    "ID" UUID NOT NULL,
    "DefaultBudgetPoints" INTEGER NOT NULL DEFAULT 100,
    "AllocationMode" VARCHAR(30) NOT NULL DEFAULT 'Point Allocation',
    "MaxPointsPerIdea" INTEGER NULL,
    "SubmissionsCloseAt" TIMESTAMPTZ NULL,
    "VotingClosesAt" TIMESTAMPTZ NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumIdeaCampaign" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumIdeaCampaign_Forum" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."Forum"("ID"),
    CONSTRAINT "CK_ForumIdeaCampaign_AllocationMode" CHECK ("AllocationMode" IN ('Point Allocation', 'Quadratic'))
);

-- -----------------------------------------------------------------------------
-- 7. ForumMember (Explicit membership for private/moderated forums & overrides)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumMember" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ForumID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "ForumRoleTypeID" UUID NOT NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Active',
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumMember" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumMember_Forum" FOREIGN KEY ("ForumID") REFERENCES __mj_BizAppsCommunity."Forum"("ID"),
    CONSTRAINT "FK_ForumMember_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "FK_ForumMember_ForumRoleType" FOREIGN KEY ("ForumRoleTypeID") REFERENCES __mj_BizAppsCommunity."ForumRoleType"("ID"),
    CONSTRAINT "UQ_ForumMember_Forum_User" UNIQUE ("ForumID", "UserID"),
    CONSTRAINT "CK_ForumMember_Status" CHECK ("Status" IN ('Active', 'Invited', 'Muted', 'Removed'))
);

-- -----------------------------------------------------------------------------
-- 8. ForumTopicTag (Space-scoped taxonomy tags linked to MJ: Tags)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumTopicTag" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "SpaceID" UUID NOT NULL,
    "ParentTagID" UUID NULL,
    "TagID" UUID NULL,
    "Slug" VARCHAR(100) NOT NULL,
    "Name" VARCHAR(120) NOT NULL,
    "Description" VARCHAR(500) NULL,
    "ColorHex" VARCHAR(20) NULL,
    "IsOfficial" BOOLEAN NOT NULL DEFAULT FALSE,
    "PostCount" INTEGER NOT NULL DEFAULT 0,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumTopicTag" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumTopicTag_Space" FOREIGN KEY ("SpaceID") REFERENCES __mj_BizAppsCommunity."CommunitySpace"("ID"),
    CONSTRAINT "FK_ForumTopicTag_ParentTag" FOREIGN KEY ("ParentTagID") REFERENCES __mj_BizAppsCommunity."ForumTopicTag"("ID"),
    CONSTRAINT "FK_ForumTopicTag_MJTag" FOREIGN KEY ("TagID") REFERENCES __mj."Tag"("ID"),
    CONSTRAINT "UQ_ForumTopicTag_Space_Slug" UNIQUE ("SpaceID", "Slug")
);

-- -----------------------------------------------------------------------------
-- 9. ForumPost (Unified parent table for root threads and nested replies)
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumPost" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ForumID" UUID NOT NULL,
    "PostTypeID" UUID NOT NULL,
    "RootPostID" UUID NULL,
    "ParentPostID" UUID NULL,
    "ReplyDepth" INTEGER NOT NULL DEFAULT 0,
    "AuthorUserID" UUID NULL,
    "AuthorPersonID" UUID NULL,
    "AuthorAgentID" UUID NULL,
    "Title" VARCHAR(300) NULL,
    "Slug" VARCHAR(320) NULL,
    "BodyMarkdown" TEXT NOT NULL,
    "SummaryMarkdown" TEXT NULL,
    "SummaryGeneratedAt" TIMESTAMPTZ NULL,
    "SummaryReplyWatermark" INTEGER NOT NULL DEFAULT 0,
    "VisibilityBand" VARCHAR(20) NOT NULL DEFAULT 'Shared',
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Published',
    "IsPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsLocked" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsFeatured" BOOLEAN NOT NULL DEFAULT FALSE,
    "ReplyCount" INTEGER NOT NULL DEFAULT 0,
    "ParticipantCount" INTEGER NOT NULL DEFAULT 1,
    "ReactionScore" INTEGER NOT NULL DEFAULT 0,
    "ViewCount" INTEGER NOT NULL DEFAULT 0,
    "LastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "PromotedToSpaceID" UUID NULL,
    "LinkedTaskID" UUID NULL,
    "LinkedEntityID" UUID NULL,
    "LinkedRecordID" VARCHAR(450) NULL,
    "ConversationID" UUID NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumPost_Forum" FOREIGN KEY ("ForumID") REFERENCES __mj_BizAppsCommunity."Forum"("ID"),
    CONSTRAINT "FK_ForumPost_PostType" FOREIGN KEY ("PostTypeID") REFERENCES __mj_BizAppsCommunity."PostType"("ID"),
    CONSTRAINT "FK_ForumPost_RootPost" FOREIGN KEY ("RootPostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPost_ParentPost" FOREIGN KEY ("ParentPostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPost_AuthorUser" FOREIGN KEY ("AuthorUserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "FK_ForumPost_AuthorPerson" FOREIGN KEY ("AuthorPersonID") REFERENCES __mj_BizAppsCommon."Person"("ID"),
    CONSTRAINT "FK_ForumPost_AuthorAgent" FOREIGN KEY ("AuthorAgentID") REFERENCES __mj."AIAgent"("ID"),
    CONSTRAINT "FK_ForumPost_PromotedToSpace" FOREIGN KEY ("PromotedToSpaceID") REFERENCES __mj_BizAppsCollaboration."Space"("ID"),
    CONSTRAINT "FK_ForumPost_LinkedTask" FOREIGN KEY ("LinkedTaskID") REFERENCES __mj_BizAppsTasks."Task"("ID"),
    CONSTRAINT "FK_ForumPost_LinkedEntity" FOREIGN KEY ("LinkedEntityID") REFERENCES __mj."Entity"("ID"),
    CONSTRAINT "FK_ForumPost_Conversation" FOREIGN KEY ("ConversationID") REFERENCES __mj."Conversation"("ID"),
    CONSTRAINT "CK_ForumPost_VisibilityBand" CHECK ("VisibilityBand" IN ('Shared', 'Team')),
    CONSTRAINT "CK_ForumPost_Status" CHECK ("Status" IN ('Draft', 'PendingModeration', 'Published', 'Answered', 'Resolved', 'Archived', 'Redacted'))
);

-- -----------------------------------------------------------------------------
-- 10. ForumPost IsA Subtype Tables
-- -----------------------------------------------------------------------------

CREATE TABLE __mj_BizAppsCommunity."ForumQuestionPost" (
    "ID" UUID NOT NULL,
    "AcceptedAnswerPostID" UUID NULL,
    "AICanonAnswerPostID" UUID NULL,
    "BountyPoints" INTEGER NOT NULL DEFAULT 0,
    "ResolvedAt" TIMESTAMPTZ NULL,
    "DeflectionCount" INTEGER NOT NULL DEFAULT 0,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumQuestionPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumQuestionPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumQuestionPost_AcceptedAnswer" FOREIGN KEY ("AcceptedAnswerPostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumQuestionPost_AICanonAnswer" FOREIGN KEY ("AICanonAnswerPostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumAnswerPost" (
    "ID" UUID NOT NULL,
    "QuestionPostID" UUID NOT NULL,
    "IsAcceptedByAuthor" BOOLEAN NOT NULL DEFAULT FALSE,
    "IsVerifiedByModerator" BOOLEAN NOT NULL DEFAULT FALSE,
    "VerifiedByUserID" UUID NULL,
    "VerifiedAt" TIMESTAMPTZ NULL,
    "AIEpistemicStatus" VARCHAR(40) NULL,
    "AIConfidenceScore" NUMERIC(4,3) NULL,
    "AIRationaleMarkdown" TEXT NULL,
    "FreshnessReviewDueAt" TIMESTAMPTZ NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumAnswerPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumAnswerPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumAnswerPost_QuestionPost" FOREIGN KEY ("QuestionPostID") REFERENCES __mj_BizAppsCommunity."ForumQuestionPost"("ID"),
    CONSTRAINT "FK_ForumAnswerPost_VerifiedByUser" FOREIGN KEY ("VerifiedByUserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "CK_ForumAnswerPost_EpistemicStatus" CHECK ("AIEpistemicStatus" IS NULL OR "AIEpistemicStatus" IN ('Canon Verified', 'Novel Insight', 'Partially Outdated', 'Conflicts With Canon'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumIdeaPost" (
    "ID" UUID NOT NULL,
    "IdeaStatus" VARCHAR(30) NOT NULL DEFAULT 'Under Consideration',
    "TotalPointsAllocated" INTEGER NOT NULL DEFAULT 0,
    "EffectiveQuadraticVotes" NUMERIC(10,2) NOT NULL DEFAULT 0,
    "UniqueBackerCount" INTEGER NOT NULL DEFAULT 0,
    "TargetReleaseOrQuarter" VARCHAR(50) NULL,
    "StatusRationaleMarkdown" TEXT NULL,
    "MergedIntoIdeaPostID" UUID NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumIdeaPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumIdeaPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumIdeaPost_MergedIntoIdea" FOREIGN KEY ("MergedIntoIdeaPostID") REFERENCES __mj_BizAppsCommunity."ForumIdeaPost"("ID"),
    CONSTRAINT "CK_ForumIdeaPost_IdeaStatus" CHECK ("IdeaStatus" IN ('Under Consideration', 'Planned', 'In Progress', 'Shipped', 'Declined'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumFormPost" (
    "ID" UUID NOT NULL,
    "FormID" UUID NOT NULL,
    "FormDistributionID" UUID NULL,
    "ShowLiveResultsInline" BOOLEAN NOT NULL DEFAULT TRUE,
    "RequirePostReplyOnSubmit" BOOLEAN NOT NULL DEFAULT FALSE,
    "ClosesAt" TIMESTAMPTZ NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumFormPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumFormPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumFormPost_Form" FOREIGN KEY ("FormID") REFERENCES __mj_BizAppsForms."Form"("ID"),
    CONSTRAINT "FK_ForumFormPost_FormDistribution" FOREIGN KEY ("FormDistributionID") REFERENCES __mj_BizAppsForms."FormDistribution"("ID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumArtifactPost" (
    "ID" UUID NOT NULL,
    "ArtifactID" UUID NOT NULL,
    "PinnedArtifactVersionID" UUID NULL,
    "SpaceItemID" UUID NOT NULL,
    "ArtifactModality" VARCHAR(20) NOT NULL DEFAULT 'Document',
    "CollaborationMode" VARCHAR(20) NOT NULL DEFAULT 'Suggest',
    "ShowInlinePreview" BOOLEAN NOT NULL DEFAULT TRUE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumArtifactPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumArtifactPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumArtifactPost_Artifact" FOREIGN KEY ("ArtifactID") REFERENCES __mj."Artifact"("ID"),
    CONSTRAINT "FK_ForumArtifactPost_ArtifactVersion" FOREIGN KEY ("PinnedArtifactVersionID") REFERENCES __mj."ArtifactVersion"("ID"),
    CONSTRAINT "FK_ForumArtifactPost_SpaceItem" FOREIGN KEY ("SpaceItemID") REFERENCES __mj_BizAppsCollaboration."SpaceItem"("ID"),
    CONSTRAINT "CK_ForumArtifactPost_Modality" CHECK ("ArtifactModality" IN ('Document', 'Spreadsheet', 'Presentation')),
    CONSTRAINT "CK_ForumArtifactPost_CollabMode" CHECK ("CollaborationMode" IN ('Suggest', 'Edit', 'Comment Only'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumCasePost" (
    "ID" UUID NOT NULL,
    "SituationMarkdown" TEXT NOT NULL,
    "ActionTakenMarkdown" TEXT NOT NULL,
    "OutcomeMarkdown" TEXT NULL,
    "IsAnonymized" BOOLEAN NOT NULL DEFAULT FALSE,
    "AnonymizedAuthorAlias" VARCHAR(100) NULL,
    "RedactionConfirmedByUserID" UUID NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumCasePost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumCasePost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumCasePost_RedactionConfirmedBy" FOREIGN KEY ("RedactionConfirmedByUserID") REFERENCES __mj."User"("ID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumAMAPost" (
    "ID" UUID NOT NULL,
    "HostUserID" UUID NOT NULL,
    "ScheduledStartAt" TIMESTAMPTZ NOT NULL,
    "ScheduledEndAt" TIMESTAMPTZ NOT NULL,
    "QuestionsOpenAt" TIMESTAMPTZ NOT NULL,
    "IsLiveNow" BOOLEAN NOT NULL DEFAULT FALSE,
    "RecordingURL" VARCHAR(500) NULL,
    "RecapMarkdown" TEXT NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumAMAPost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumAMAPost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumAMAPost_HostUser" FOREIGN KEY ("HostUserID") REFERENCES __mj."User"("ID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumInteractivePost" (
    "ID" UUID NOT NULL,
    "ComponentArtifactID" UUID NOT NULL,
    "PinnedArtifactVersionID" UUID NULL,
    "SpaceItemID" UUID NULL,
    "ExperienceKind" VARCHAR(40) NOT NULL DEFAULT 'Quiz',
    "ExperienceKindDetails" VARCHAR(200) NULL,
    "PromptUsed" TEXT NULL,
    "ScoringMode" VARCHAR(30) NOT NULL DEFAULT 'Best Score',
    "ShowLeaderboard" BOOLEAN NOT NULL DEFAULT TRUE,
    "MaxAttemptsPerMember" INTEGER NULL,
    "PlayCount" INTEGER NOT NULL DEFAULT 0,
    "ExpiresAt" TIMESTAMPTZ NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumInteractivePost" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumInteractivePost_ForumPost" FOREIGN KEY ("ID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumInteractivePost_Artifact" FOREIGN KEY ("ComponentArtifactID") REFERENCES __mj."Artifact"("ID"),
    CONSTRAINT "FK_ForumInteractivePost_ArtifactVersion" FOREIGN KEY ("PinnedArtifactVersionID") REFERENCES __mj."ArtifactVersion"("ID"),
    CONSTRAINT "FK_ForumInteractivePost_SpaceItem" FOREIGN KEY ("SpaceItemID") REFERENCES __mj_BizAppsCollaboration."SpaceItem"("ID"),
    CONSTRAINT "CK_ForumInteractivePost_Kind" CHECK ("ExperienceKind" IN ('Quiz', 'Trivia', 'Calculator', 'Simulation', 'Flashcards', 'Poll Game', 'Other')),
    CONSTRAINT "CK_ForumInteractivePost_ScoringMode" CHECK ("ScoringMode" IN ('Best Score', 'Fastest Time', 'Streak', 'Completion', 'None'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumInteractiveSession" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "InteractivePostID" UUID NOT NULL,
    "ArtifactVersionID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "AttemptNumber" INTEGER NOT NULL DEFAULT 1,
    "Score" NUMERIC(12,2) NULL,
    "DurationSeconds" INTEGER NULL,
    "Completed" BOOLEAN NOT NULL DEFAULT FALSE,
    "OutcomeSummary" VARCHAR(300) NULL,
    "SessionStateJSON" TEXT NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumInteractiveSession" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumInteractiveSession_InteractivePost" FOREIGN KEY ("InteractivePostID") REFERENCES __mj_BizAppsCommunity."ForumInteractivePost"("ID"),
    CONSTRAINT "FK_ForumInteractiveSession_ArtifactVersion" FOREIGN KEY ("ArtifactVersionID") REFERENCES __mj."ArtifactVersion"("ID"),
    CONSTRAINT "FK_ForumInteractiveSession_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "UQ_ForumInteractiveSession_Post_User_Attempt" UNIQUE ("InteractivePostID", "UserID", "AttemptNumber")
);

-- -----------------------------------------------------------------------------
-- 12. Supporting Tables
-- -----------------------------------------------------------------------------
CREATE TABLE __mj_BizAppsCommunity."ForumPostTag" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "PostID" UUID NOT NULL,
    "TopicTagID" UUID NOT NULL,
    "AssignedByAI" BOOLEAN NOT NULL DEFAULT FALSE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumPostTag" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumPostTag_Post" FOREIGN KEY ("PostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPostTag_TopicTag" FOREIGN KEY ("TopicTagID") REFERENCES __mj_BizAppsCommunity."ForumTopicTag"("ID"),
    CONSTRAINT "UQ_ForumPostTag_Post_TopicTag" UNIQUE ("PostID", "TopicTagID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumPostReaction" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "PostID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "ReactionKind" VARCHAR(30) NOT NULL DEFAULT 'Upvote',
    "Weight" NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumPostReaction" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumPostReaction_Post" FOREIGN KEY ("PostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPostReaction_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "UQ_ForumPostReaction_Post_User_Kind" UNIQUE ("PostID", "UserID", "ReactionKind"),
    CONSTRAINT "CK_ForumPostReaction_Kind" CHECK ("ReactionKind" IN ('Upvote', 'Helpful', 'Insightful', 'Agree', 'Celebrate', 'Curious'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumPostAttachment" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "PostID" UUID NOT NULL,
    "SpaceItemID" UUID NOT NULL,
    "Caption" VARCHAR(300) NULL,
    "Sequence" INTEGER NOT NULL DEFAULT 0,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumPostAttachment" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumPostAttachment_Post" FOREIGN KEY ("PostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPostAttachment_SpaceItem" FOREIGN KEY ("SpaceItemID") REFERENCES __mj_BizAppsCollaboration."SpaceItem"("ID"),
    CONSTRAINT "UQ_ForumPostAttachment_Post_SpaceItem" UNIQUE ("PostID", "SpaceItemID")
);

CREATE TABLE __mj_BizAppsCommunity."ForumIdeaAllocation" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "IdeaPostID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "PointsAllocated" INTEGER NOT NULL,
    "QuadraticVotes" NUMERIC(10,2) NOT NULL,
    "RationaleComment" VARCHAR(500) NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumIdeaAllocation" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumIdeaAllocation_IdeaPost" FOREIGN KEY ("IdeaPostID") REFERENCES __mj_BizAppsCommunity."ForumIdeaPost"("ID"),
    CONSTRAINT "FK_ForumIdeaAllocation_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "UQ_ForumIdeaAllocation_Idea_User" UNIQUE ("IdeaPostID", "UserID"),
    CONSTRAINT "CK_ForumIdeaAllocation_PositivePoints" CHECK ("PointsAllocated" > 0)
);

CREATE TABLE __mj_BizAppsCommunity."CommunityMemberProfile" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "SpaceID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "PersonID" UUID NULL,
    "BioMarkdown" VARCHAR(1000) NULL,
    "ExpertiseTagsJSON" TEXT NULL,
    "HelpfulAnswerCount" INTEGER NOT NULL DEFAULT 0,
    "AcceptedAnswerCount" INTEGER NOT NULL DEFAULT 0,
    "ReputationScore" INTEGER NOT NULL DEFAULT 0,
    "DigestCadence" VARCHAR(30) NOT NULL DEFAULT 'Daily Digest',
    "OpenToPeerMentoring" BOOLEAN NOT NULL DEFAULT FALSE,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_CommunityMemberProfile" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_CommunityMemberProfile_Space" FOREIGN KEY ("SpaceID") REFERENCES __mj_BizAppsCommunity."CommunitySpace"("ID"),
    CONSTRAINT "FK_CommunityMemberProfile_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "FK_CommunityMemberProfile_Person" FOREIGN KEY ("PersonID") REFERENCES __mj_BizAppsCommon."Person"("ID"),
    CONSTRAINT "UQ_CommunityMemberProfile_Space_User" UNIQUE ("SpaceID", "UserID"),
    CONSTRAINT "CK_CommunityMemberProfile_DigestCadence" CHECK ("DigestCadence" IN ('Every Post', 'Daily Digest', 'Weekly Digest', 'Highlights Only', 'Muted'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumSubscription" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "UserID" UUID NOT NULL,
    "ForumID" UUID NULL,
    "RootPostID" UUID NULL,
    "TopicTagID" UUID NULL,
    "DeliveryLevel" VARCHAR(30) NOT NULL DEFAULT 'Every Post',
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumSubscription" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumSubscription_User" FOREIGN KEY ("UserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "FK_ForumSubscription_Forum" FOREIGN KEY ("ForumID") REFERENCES __mj_BizAppsCommunity."Forum"("ID"),
    CONSTRAINT "FK_ForumSubscription_RootPost" FOREIGN KEY ("RootPostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumSubscription_TopicTag" FOREIGN KEY ("TopicTagID") REFERENCES __mj_BizAppsCommunity."ForumTopicTag"("ID"),
    CONSTRAINT "CK_ForumSubscription_Target" CHECK (
        (CASE WHEN "ForumID" IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN "RootPostID" IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN "TopicTagID" IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    CONSTRAINT "CK_ForumSubscription_DeliveryLevel" CHECK ("DeliveryLevel" IN ('Every Post', 'First Post Only', 'Digest Only', 'Muted'))
);

CREATE TABLE __mj_BizAppsCommunity."ForumPostFlag" (
    "ID" UUID NOT NULL DEFAULT gen_random_uuid(),
    "PostID" UUID NOT NULL,
    "ReportedByUserID" UUID NULL,
    "ReportedByAgentID" UUID NULL,
    "ReasonCategory" VARCHAR(40) NOT NULL,
    "ReasonDetails" VARCHAR(1000) NULL,
    "Status" VARCHAR(30) NOT NULL DEFAULT 'Open',
    "ResolvedByUserID" UUID NULL,
    "ResolvedAt" TIMESTAMPTZ NULL,
    "ResolutionOutcome" VARCHAR(40) NULL,
    "__mj_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "__mj_UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PK_ForumPostFlag" PRIMARY KEY ("ID"),
    CONSTRAINT "FK_ForumPostFlag_Post" FOREIGN KEY ("PostID") REFERENCES __mj_BizAppsCommunity."ForumPost"("ID"),
    CONSTRAINT "FK_ForumPostFlag_ReportedByUser" FOREIGN KEY ("ReportedByUserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "FK_ForumPostFlag_ReportedByAgent" FOREIGN KEY ("ReportedByAgentID") REFERENCES __mj."AIAgent"("ID"),
    CONSTRAINT "FK_ForumPostFlag_ResolvedByUser" FOREIGN KEY ("ResolvedByUserID") REFERENCES __mj."User"("ID"),
    CONSTRAINT "CK_ForumPostFlag_ReasonCategory" CHECK ("ReasonCategory" IN ('Off Topic', 'Spam', 'Harassment', 'Outdated Advice', 'Needs Redaction', 'Other')),
    CONSTRAINT "CK_ForumPostFlag_Status" CHECK ("Status" IN ('Open', 'Dismissed', 'ActionTaken')),
    CONSTRAINT "CK_ForumPostFlag_ResolutionOutcome" CHECK ("ResolutionOutcome" IS NULL OR "ResolutionOutcome" IN ('Dismissed', 'Edited', 'Redacted', 'Hidden', 'Author Muted'))
);

-- -----------------------------------------------------------------------------
-- 13. Foreign-Key, Polymorphic & Hot-Query Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX "IX_Forum_SpaceID_Sequence" ON __mj_BizAppsCommunity."Forum"("SpaceID", "Sequence");
CREATE INDEX "IX_Forum_ForumTypeID" ON __mj_BizAppsCommunity."Forum"("ForumTypeID");
CREATE INDEX "IX_ForumMember_UserID" ON __mj_BizAppsCommunity."ForumMember"("UserID", "ForumID");
CREATE INDEX "IX_ForumPost_ForumID_LastActivity" ON __mj_BizAppsCommunity."ForumPost"("ForumID", "IsPinned" DESC, "LastActivityAt" DESC) WHERE "RootPostID" IS NULL;
CREATE INDEX "IX_ForumPost_RootPostID_Depth" ON __mj_BizAppsCommunity."ForumPost"("RootPostID", "ReplyDepth");
CREATE INDEX "IX_ForumPost_AuthorUserID" ON __mj_BizAppsCommunity."ForumPost"("AuthorUserID");
CREATE INDEX "IX_ForumPost_LinkedEntity_Record" ON __mj_BizAppsCommunity."ForumPost"("LinkedEntityID", "LinkedRecordID") WHERE "LinkedEntityID" IS NOT NULL;
CREATE INDEX "IX_ForumPost_ConversationID" ON __mj_BizAppsCommunity."ForumPost"("ConversationID") WHERE "ConversationID" IS NOT NULL;
CREATE INDEX "IX_ForumAnswerPost_QuestionPostID" ON __mj_BizAppsCommunity."ForumAnswerPost"("QuestionPostID");
CREATE INDEX "IX_ForumInteractiveSession_Score" ON __mj_BizAppsCommunity."ForumInteractiveSession"("InteractivePostID", "Score" DESC, "DurationSeconds" ASC);

-- -----------------------------------------------------------------------------
-- 14. Inline Table-Valued Function: fnCommunityForumAccess (PostgreSQL)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION __mj_BizAppsCommunity."fnCommunityForumAccess"(p_userid UUID)
RETURNS TABLE (
    "ForumID" UUID,
    "SpaceID" UUID,
    "CanSeeTeam" BOOLEAN,
    "CanPost" BOOLEAN,
    "CanModerate" BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        f."ID" AS "ForumID",
        f."SpaceID",
        sa."CanSeeTeam",
        (
            CASE
                WHEN f."Status" = 'Locked' THEN FALSE
                WHEN ss."ReadOnly" = TRUE THEN FALSE
                WHEN sa."CanContribute" = FALSE THEN FALSE
                WHEN fm."Status" = 'Muted' THEN FALSE
                WHEN fr."CanCreateRootPost" = FALSE AND fr."CanReply" = FALSE THEN FALSE
                WHEN f."PostingPolicy" = 'ReadOnly' AND COALESCE(fr."CanConfigureForum", FALSE) = FALSE THEN FALSE
                ELSE TRUE
            END
        ) AS "CanPost",
        COALESCE(fr."CanModerateQueue", FALSE) AS "CanModerate"
    FROM __mj_BizAppsCommunity."Forum" AS f
    INNER JOIN __mj_BizAppsCollaboration."fnCollaborationAccess"(p_userid) AS sa
        ON sa."SpaceID" = f."SpaceID"
    INNER JOIN __mj_BizAppsCollaboration."fnCollaborationSpaceStatuses"() AS ss
        ON ss."SpaceID" = f."SpaceID" AND ss."Visible" = TRUE
    LEFT JOIN __mj_BizAppsCommunity."ForumMember" AS fm
        ON fm."ForumID" = f."ID" AND fm."UserID" = p_userid
    LEFT JOIN __mj_BizAppsCommunity."ForumRoleType" AS fr
        ON fr."ID" = fm."ForumRoleTypeID"
    WHERE
        (
            f."InheritsSpaceMembers" = TRUE
            AND (
                f."VisibilityBand" = 'Shared'
                OR (f."VisibilityBand" = 'Team' AND sa."CanSeeTeam" = TRUE)
            )
            AND (fm."ID" IS NULL OR fm."Status" IN ('Active', 'Muted'))
        )
        OR (
            fm."Status" = 'Active'
        );
$$;


















































-- =============================================================================
-- GENERATED BY MemberJunction CodeGen — DO NOT EDIT BY HAND
--
-- This section will contain the CodeGen output appended during the Wave 1 CodeGen
-- pass (EntityField inserts, generated views, spCreate/spUpdate/spDelete procedures,
-- and triggers).
-- =============================================================================
