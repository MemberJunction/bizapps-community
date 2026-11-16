-- =============================================================================
--  BizApps Community — World Data Model Demo Seeds (SQL Server)
--  Contains >= 20 realistic multi-space, multi-forum, multi-archetype records.
--  100% generic MemberJunction domain entities — zero tenant/client branding.
-- =============================================================================

SET NOCOUNT ON;

-- 1. Resolve an active MemberJunction User for FK-safe ownership
DECLARE @AdminUserID UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserID = [ID] FROM [__mj].[User] ORDER BY [__mj_CreatedAt] ASC;
IF @AdminUserID IS NULL
    THROW 50001, 'Cannot seed BizApps Community world data: no User rows exist in [__mj].[User].', 1;

-- 2. Spaces (Ensure parent Collaboration Spaces exist)
DECLARE @Space1ID UNIQUEIDENTIFIER = 'C8A18000-4E12-4B8F-9A10-100000000001';
DECLARE @Space2ID UNIQUEIDENTIFIER = 'C8A18000-4E12-4B8F-9A10-100000000002';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = @Space1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCollaboration].[Space] (
        [ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [__mj_CreatedAt], [__mj_UpdatedAt], [AllowParentAssignees]
    ) VALUES (
        @Space1ID, '2B2C14A8-CCD6-4835-A1BD-969C54236D57', N'Enterprise Architecture CoP',
        N'Community of practice for distributed systems architects and platform engineers.',
        @AdminUserID, 0, N'Included', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = @Space2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCollaboration].[Space] (
        [ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [__mj_CreatedAt], [__mj_UpdatedAt], [AllowParentAssignees]
    ) VALUES (
        @Space2ID, '2B2C14A8-CCD6-4835-A1BD-969C54236D57', N'Product Design Guild',
        N'Open collaboration hub for UX researchers, interaction designers, and design system leads.',
        @AdminUserID, 0, N'Included', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1
    );
END;

-- 3. CommunitySpace Subtypes
IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = @Space1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] (
        [ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence]
    ) VALUES (
        @Space1ID, N'enterprise-architecture', N'Special Interest Group', N'Teaser Only', 1, N'Daily Digest'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = @Space2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] (
        [ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence]
    ) VALUES (
        @Space2ID, N'product-design', N'Association Wide', N'Full Read', 1, N'Weekly Digest'
    );
END;

-- 4. Forums (Across different ForumTypes)
DECLARE @Forum1ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000001'; -- General Discussion
DECLARE @Forum2ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000002'; -- Q&A Knowledge Base
DECLARE @Forum3ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000003'; -- Ideation Campaign
DECLARE @Forum4ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000004'; -- Playbooks & Docs
DECLARE @Forum5ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000005'; -- Interactive & AMAs

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum1ID, @Space1ID, 'C8A17100-4E12-4B8F-9A10-100000000001', N'architecture-watercooler',
        N'Architecture Watercooler', N'Open discussions on cloud topologies, zero-trust patterns, and tech radar items.',
        N'Shared', N'Open', 10, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum2ID, @Space1ID, 'C8A17100-4E12-4B8F-9A10-100000000002', N'patterns-qa',
        N'Design Patterns & Troubleshooting Q&A', N'Ask questions on state synchronization, caching, and resiliency.',
        N'Shared', N'Open', 20, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum3ID, @Space2ID, 'C8A17100-4E12-4B8F-9A10-100000000003', N'design-system-ideas',
        N'2027 Design System Roadmap Proposals', N'Submit and vote on design token evolutions and component additions.',
        N'Shared', N'Open', 10, N'Active'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaCampaign] (
        [ID], [DefaultBudgetPoints], [AllocationMode], [MaxPointsPerIdea]
    ) VALUES (
        @Forum3ID, 100, N'Quadratic', 30
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum4ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum4ID, @Space1ID, 'C8A17100-4E12-4B8F-9A10-100000000004', N'living-standards',
        N'Living Architecture Standards', N'Collaborative documents and playbooks governed by community consensus.',
        N'Shared', N'Open', 30, N'Active'
    );
END;

-- 5. Topic Tags
DECLARE @Tag1ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000001';
DECLARE @Tag2ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000002';
DECLARE @Tag3ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000003';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag1ID, @Space1ID, N'distributed-caching', N'Distributed Caching', 1, 5);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag2ID, @Space1ID, N'zero-trust', N'Zero Trust Security', 1, 8);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag3ID, @Space2ID, N'design-tokens', N'Design Tokens', 1, 12);
END;

-- 6. Discussion Root Post + Nested Replies
DECLARE @Post1ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000001';
DECLARE @Reply1ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000002';
DECLARE @Reply2ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000003';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @Post1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status], [ReplyCount], [ParticipantCount]
    ) VALUES (
        @Post1ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000001',
        N'Decoupled Event Sourcing with Resilient Outbox Patterns',
        N'decoupled-event-sourcing-with-resilient-outbox-patterns',
        N'How are teams handling event order guarantees under dual-region active-active deployments?',
        N'Shared', N'Published', 2, 2
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @Reply1ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000002',
        @Post1ID, @Post1ID, 1,
        N'We partition by TenantID and use vector clocks to reconcile out-of-order deliveries gracefully.',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @Reply2ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000002',
        @Post1ID, @Reply1ID, 2,
        N'Vector clocks worked well for us too. Just ensure bounded clock compaction to avoid tombstone bloat.',
        N'Shared', N'Published'
    );
END;

-- 7. Question Post + Verified Canon Answer
DECLARE @QPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000004';
DECLARE @AnsPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000005';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @QPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status], [ReplyCount]
    ) VALUES (
        @QPostID, @Forum2ID, 'C8A17200-4E12-4B8F-9A10-100000000004',
        N'When should read models bypass GraphQL caching in high-concurrency turns?',
        N'when-should-read-models-bypass-graphql-caching',
        N'Under what threshold does client-side memoization cause stale authorization state in fast-turn environments?',
        N'Shared', N'Answered', 1
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumQuestionPost] (
        [ID], [AcceptedAnswerPostID], [AICanonAnswerPostID], [BountyPoints]
    ) VALUES (
        @QPostID, NULL, NULL, 50
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @AnsPostID, @Forum2ID, 'C8A17200-4E12-4B8F-9A10-100000000005',
        @QPostID, @QPostID, 1,
        N'Bypass caching only when authorization bounds change (RLS context shifts). Normal reads should rely on BaseEngine CacheLocal with invalidation notifications.',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumAnswerPost] (
        [ID], [QuestionPostID], [IsAcceptedByAuthor], [IsVerifiedByModerator], [AIEpistemicStatus], [AIConfidenceScore]
    ) VALUES (
        @AnsPostID, @QPostID, 1, 1, N'Canon Verified', 0.985
    );

    UPDATE [__mj_BizAppsCommunity].[ForumQuestionPost]
    SET [AcceptedAnswerPostID] = @AnsPostID,
        [AICanonAnswerPostID] = @AnsPostID,
        [ResolvedAt] = SYSDATETIMEOFFSET()
    WHERE [ID] = @QPostID;
END;

-- 8. Ideation Post + Allocations
DECLARE @IdeaPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000006';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @IdeaPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @IdeaPostID, @Forum3ID, 'C8A17200-4E12-4B8F-9A10-100000000006',
        N'Semantic Container Queries in Adaptive Grid Cards',
        N'semantic-container-queries-in-adaptive-grid-cards',
        N'Propose adopting CSS container queries across all entity cards so cards respond to container bounds rather than viewport width.',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaPost] (
        [ID], [IdeaStatus], [TotalPointsAllocated], [EffectiveQuadraticVotes], [UniqueBackerCount]
    ) VALUES (
        @IdeaPostID, N'Under Consideration', 25, 5.0, 1
    );
END;

PRINT N'BizApps Community World Data Model seed populated successfully.';
