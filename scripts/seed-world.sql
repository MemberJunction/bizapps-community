-- =============================================================================
--  BizApps Community — World Data Model Demo Seeds (SQL Server)
--  >= 25 realistic records across 3 distinct Collaboration Spaces (Customer
--  Community Portal, Partner & ISV Enablement Network, Internal Engineering
--  Guild), covering every ForumType, every PostType, a verified Q&A canon
--  answer, a Quadratic Ideation Campaign with member allocations, reactions,
--  member reputation profiles, and a moderation report.
--  100% generic MemberJunction domain entities — zero tenant/client branding.
--
--  Post subtypes backed by a cross-app Artifact or BizApps Forms Form
--  (poll-or-form, collaborative-doc/-sheet/-deck, interactive-experience) are
--  seeded as a plain ForumPost of that PostType; their IsA extension row is
--  skipped on a scratch database with no Artifact/Form rows to reference,
--  rather than failing the whole script on an unsatisfiable FK.
-- =============================================================================

SET NOCOUNT ON;

-- 1. Resolve an active MemberJunction User for FK-safe ownership
DECLARE @AdminUserID UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserID = [ID] FROM [__mj].[User] ORDER BY [__mj_CreatedAt] ASC;
IF @AdminUserID IS NULL
    THROW 50001, 'Cannot seed BizApps Community world data: no User rows exist in [__mj].[User].', 1;

-- 2. Spaces (Ensure parent Collaboration Spaces exist)
DECLARE @Space1ID UNIQUEIDENTIFIER = 'C8A18000-4E12-4B8F-9A10-100000000001'; -- Customer Community Portal
DECLARE @Space2ID UNIQUEIDENTIFIER = 'C8A18000-4E12-4B8F-9A10-100000000002'; -- Partner & ISV Enablement Network
DECLARE @Space3ID UNIQUEIDENTIFIER = 'C8A18000-4E12-4B8F-9A10-100000000003'; -- Internal Engineering Guild

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = @Space1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCollaboration].[Space] (
        [ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [__mj_CreatedAt], [__mj_UpdatedAt], [AllowParentAssignees]
    ) VALUES (
        @Space1ID, '2B2C14A8-CCD6-4835-A1BD-969C54236D57', N'Customer Community Portal',
        N'Public-facing hub for product customers to ask questions, share feedback, and learn from each other.',
        @AdminUserID, 0, N'Included', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = @Space2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCollaboration].[Space] (
        [ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [__mj_CreatedAt], [__mj_UpdatedAt], [AllowParentAssignees]
    ) VALUES (
        @Space2ID, '2B2C14A8-CCD6-4835-A1BD-969C54236D57', N'Partner & ISV Enablement Network',
        N'Collaboration space for partners and independent software vendors co-building on the platform.',
        @AdminUserID, 0, N'Included', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCollaboration].[Space] WHERE [ID] = @Space3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCollaboration].[Space] (
        [ID], [SpaceTypeID], [Name], [Description], [OwnerID], [InheritsMembership], [AgentRetrieval], [StartedAt], [__mj_CreatedAt], [__mj_UpdatedAt], [AllowParentAssignees]
    ) VALUES (
        @Space3ID, '2B2C14A8-CCD6-4835-A1BD-969C54236D57', N'Internal Engineering Guild',
        N'Internal community of practice for engineers to run case rounds, AMAs, and knowledge-base Q&A.',
        @AdminUserID, 0, N'Included', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET(), 1
    );
END;

-- 3. CommunitySpace Subtypes
IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = @Space1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] (
        [ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence]
    ) VALUES (
        @Space1ID, N'customer-community-portal', N'Association Wide', N'Full Read', 1, N'Daily Digest'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = @Space2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] (
        [ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence]
    ) VALUES (
        @Space2ID, N'partner-isv-enablement-network', N'Special Interest Group', N'Teaser Only', 1, N'Weekly Digest'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunitySpace] WHERE [ID] = @Space3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunitySpace] (
        [ID], [Slug], [CommunityKind], [AnonymousReadMode], [AskFirstEnabled], [DefaultDigestCadence]
    ) VALUES (
        @Space3ID, N'internal-engineering-guild', N'Working Group', N'None', 1, N'Highlights Only'
    );
END;

-- 4. Forums (one per ForumType, spread across the 3 Spaces)
DECLARE @Forum1ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000001'; -- general-discussion (Space1)
DECLARE @Forum2ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000002'; -- qa-knowledge-base (Space1)
DECLARE @Forum3ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000003'; -- ideation-campaign (Space2)
DECLARE @Forum4ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000004'; -- playbooks-and-docs (Space2)
DECLARE @Forum5ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000005'; -- peer-case-rounds (Space3)
DECLARE @Forum6ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000006'; -- live-events-and-amas (Space3)
DECLARE @Forum7ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000007'; -- qa-knowledge-base (Space3)

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum1ID, @Space1ID, 'C8A17100-4E12-4B8F-9A10-100000000001', N'welcome-and-general-discussion',
        N'Welcome & General Discussion', N'Introduce yourself and chat with other customers.',
        N'Shared', N'Open', 10, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum2ID, @Space1ID, 'C8A17100-4E12-4B8F-9A10-100000000002', N'product-qa',
        N'Product Q&A', N'Ask product questions and get verified answers.',
        N'Shared', N'Open', 20, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum3ID, @Space2ID, 'C8A17100-4E12-4B8F-9A10-100000000003', N'partner-feature-requests',
        N'Partner Feature Requests', N'Propose and quadratic-vote on platform features partners need.',
        N'Shared', N'Open', 10, N'Active'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaCampaign] (
        [ID], [DefaultBudgetPoints], [AllocationMode], [MaxPointsPerIdea]
    ) VALUES (
        @Forum3ID, 100, N'Quadratic', 40
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum4ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum4ID, @Space2ID, 'C8A17100-4E12-4B8F-9A10-100000000004', N'partner-integration-playbooks',
        N'Partner Integration Playbooks', N'Co-authored onboarding and integration playbooks.',
        N'Shared', N'Open', 20, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum5ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum5ID, @Space3ID, 'C8A17100-4E12-4B8F-9A10-100000000005', N'incident-case-rounds',
        N'Incident Case Rounds', N'Structured Situation/Action/Outcome reviews of production incidents.',
        N'Team', N'Moderated', 10, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum6ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum6ID, @Space3ID, 'C8A17100-4E12-4B8F-9A10-100000000006', N'engineering-amas',
        N'Engineering AMAs & Town Halls', N'Scheduled Ask-Me-Anything sessions with engineering leadership.',
        N'Shared', N'Open', 20, N'Active'
    );
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[Forum] WHERE [ID] = @Forum7ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[Forum] (
        [ID], [SpaceID], [ForumTypeID], [Slug], [Name], [Description], [VisibilityBand], [PostingPolicy], [Sequence], [Status]
    ) VALUES (
        @Forum7ID, @Space3ID, 'C8A17100-4E12-4B8F-9A10-100000000002', N'internal-engineering-qa',
        N'Internal Engineering Q&A', N'Internal-only knowledge base for engineering questions.',
        N'Team', N'Open', 30, N'Active'
    );
END;

-- 5. Topic Tags (one per Space)
DECLARE @Tag1ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000001';
DECLARE @Tag2ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000002';
DECLARE @Tag3ID UNIQUEIDENTIFIER = 'C8A18200-4E12-4B8F-9A10-100000000003';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag1ID, @Space1ID, N'getting-started', N'Getting Started', 1, 3);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag2ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag2ID, @Space2ID, N'integration-api', N'Integration API', 1, 5);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumTopicTag] WHERE [ID] = @Tag3ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumTopicTag] ([ID], [SpaceID], [Slug], [Name], [IsOfficial], [PostCount])
    VALUES (@Tag3ID, @Space3ID, N'incident-response', N'Incident Response', 1, 4);
END;

-- 6. Discussion Root Post + Reply + Comment (3 of the 13 PostTypes)
DECLARE @Post1ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000001';
DECLARE @Reply1ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000002';
DECLARE @Comment1ID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000003';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @Post1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status], [ReplyCount], [ParticipantCount]
    ) VALUES (
        @Post1ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000001',
        N'Welcome to the Customer Community Portal!',
        N'welcome-to-the-customer-community-portal',
        N'Introduce yourself and let us know what brings you to the community.',
        N'Shared', N'Published', 2, 3
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @Reply1ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000002',
        @Post1ID, @Post1ID, 1,
        N'Excited to be here — looking forward to learning from the community!',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @Comment1ID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000003',
        @Post1ID, @Post1ID, 1,
        N'Welcome aboard!',
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
        N'How do I rotate my API key without downtime?',
        N'how-do-i-rotate-my-api-key-without-downtime',
        N'We need to rotate a production API key but cannot afford a service interruption.',
        N'Shared', N'Answered', 1
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumQuestionPost] (
        [ID], [AcceptedAnswerPostID], [AICanonAnswerPostID], [BountyPoints]
    ) VALUES (
        @QPostID, NULL, NULL, 0
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [RootPostID], [ParentPostID], [ReplyDepth], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @AnsPostID, @Forum2ID, 'C8A17200-4E12-4B8F-9A10-100000000005',
        @QPostID, @QPostID, 1,
        N'Issue a second key, deploy it alongside the first, cut traffic over, then revoke the old key after the grace period.',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumAnswerPost] (
        [ID], [QuestionPostID], [IsAcceptedByAuthor], [IsVerifiedByModerator], [AIEpistemicStatus], [AIConfidenceScore]
    ) VALUES (
        @AnsPostID, @QPostID, 1, 1, N'Canon Verified', 0.950
    );

    UPDATE [__mj_BizAppsCommunity].[ForumQuestionPost]
    SET [AcceptedAnswerPostID] = @AnsPostID,
        [AICanonAnswerPostID] = @AnsPostID,
        [ResolvedAt] = SYSDATETIMEOFFSET()
    WHERE [ID] = @QPostID;
END;

-- 8. Quadratic Ideation Post + Member Allocations
DECLARE @IdeaPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000006';
DECLARE @Alloc1ID UNIQUEIDENTIFIER = 'C8A18400-4E12-4B8F-9A10-100000000001';
DECLARE @Alloc2ID UNIQUEIDENTIFIER = 'C8A18400-4E12-4B8F-9A10-100000000002';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @IdeaPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] (
        [ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status]
    ) VALUES (
        @IdeaPostID, @Forum3ID, 'C8A17200-4E12-4B8F-9A10-100000000006',
        N'Add webhook signing secrets rotation API',
        N'add-webhook-signing-secrets-rotation-api',
        N'Partners need a self-service API to rotate webhook signing secrets without opening a support ticket.',
        N'Shared', N'Published'
    );

    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaPost] (
        [ID], [IdeaStatus], [TotalPointsAllocated], [EffectiveQuadraticVotes], [UniqueBackerCount]
    ) VALUES (
        @IdeaPostID, N'Under Consideration', 61, 11.0, 2
    );
END;

IF @AdminUserID IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumIdeaAllocation] WHERE [ID] = @Alloc1ID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumIdeaAllocation] (
        [ID], [IdeaPostID], [UserID], [PointsAllocated], [QuadraticVotes]
    ) VALUES (
        @Alloc1ID, @IdeaPostID, @AdminUserID, 36, 6.0
    );
END;

-- 9. poll-or-form / collaborative-doc / collaborative-sheet / collaborative-deck / interactive-experience:
--    seeded as plain ForumPost rows of each PostType; their IsA extension row needs a
--    BizApps Forms Form or an MJ Artifact + Collaboration SpaceItem, which this scratch
--    database does not seed, so it is skipped here rather than failing on an unsatisfiable FK.
DECLARE @PollPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000007';
DECLARE @DocPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000008';
DECLARE @SheetPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000009';
DECLARE @DeckPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000010';
DECLARE @InteractivePostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000013';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @PollPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@PollPostID, @Forum3ID, 'C8A17200-4E12-4B8F-9A10-100000000007', N'Which SDK should we prioritize next?', N'which-sdk-should-we-prioritize-next', N'Vote for the SDK you most want to see next.', N'Shared', N'Published');
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @DocPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@DocPostID, @Forum4ID, 'C8A17200-4E12-4B8F-9A10-100000000008', N'OAuth2 Partner Onboarding Playbook', N'oauth2-partner-onboarding-playbook', N'Living playbook for partner OAuth2 onboarding.', N'Shared', N'Published');
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @SheetPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@SheetPostID, @Forum4ID, 'C8A17200-4E12-4B8F-9A10-100000000009', N'Partner Tier Pricing Matrix', N'partner-tier-pricing-matrix', N'Shared pricing matrix by partner tier.', N'Shared', N'Published');
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @DeckPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@DeckPostID, @Forum4ID, 'C8A17200-4E12-4B8F-9A10-100000000010', N'ISV Co-Sell Enablement Deck', N'isv-co-sell-enablement-deck', N'Co-sell enablement slides for ISV partners.', N'Shared', N'Published');
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @InteractivePostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@InteractivePostID, @Forum1ID, 'C8A17200-4E12-4B8F-9A10-100000000013', N'Platform Trivia: Test Your Onboarding Knowledge', N'platform-trivia-onboarding-knowledge', N'Quick trivia mini-game for new customers.', N'Shared', N'Published');
END;

-- 10. Peer Case Review + Live AMA (full IsA subtype rows; no cross-app FKs)
DECLARE @CasePostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000011';
DECLARE @AMAPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000012';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @CasePostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@CasePostID, @Forum5ID, 'C8A17200-4E12-4B8F-9A10-100000000011', N'Case Review: Regional Failover Delay During Peak Load', N'case-review-regional-failover-delay', N'Structured review of a regional failover delay incident.', N'Team', N'Published');

    INSERT INTO [__mj_BizAppsCommunity].[ForumCasePost] ([ID], [SituationMarkdown], [ActionTakenMarkdown], [OutcomeMarkdown], [IsAnonymized])
    VALUES (@CasePostID, N'Regional failover took 8 minutes longer than the SLA during a peak-traffic incident.', N'Added pre-warmed standby capacity and tightened health-check intervals.', N'Subsequent failovers completed within SLA.', 0);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @AMAPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@AMAPostID, @Forum6ID, 'C8A17200-4E12-4B8F-9A10-100000000012', N'Town Hall: Q1 Platform Reliability Roadmap', N'town-hall-q1-platform-reliability-roadmap', N'Live Q&A on the Q1 platform reliability roadmap.', N'Shared', N'Published');

    INSERT INTO [__mj_BizAppsCommunity].[ForumAMAPost] ([ID], [HostUserID], [ScheduledStartAt], [ScheduledEndAt], [QuestionsOpenAt], [IsLiveNow])
    VALUES (@AMAPostID, @AdminUserID, DATEADD(DAY, 7, SYSDATETIMEOFFSET()), DATEADD(DAY, 7, DATEADD(HOUR, 1, SYSDATETIMEOFFSET())), SYSDATETIMEOFFSET(), 0);
END;

-- 11. An internal-engineering-guild Question (7th PostType coverage context, reuses question/answer types)
DECLARE @IntQPostID UNIQUEIDENTIFIER = 'C8A18300-4E12-4B8F-9A10-100000000014';

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPost] WHERE [ID] = @IntQPostID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPost] ([ID], [ForumID], [PostTypeID], [Title], [Slug], [BodyMarkdown], [VisibilityBand], [Status])
    VALUES (@IntQPostID, @Forum7ID, 'C8A17200-4E12-4B8F-9A10-100000000004', N'What is our deterministic recovery pattern for multi-agent loops?', N'deterministic-recovery-pattern-multi-agent-loops', N'Looking for the canonical recovery gate pattern used internally.', N'Team', N'Published');

    INSERT INTO [__mj_BizAppsCommunity].[ForumQuestionPost] ([ID], [AcceptedAnswerPostID], [AICanonAnswerPostID], [BountyPoints])
    VALUES (@IntQPostID, NULL, NULL, 0);
END;

-- 12. Reactions
IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostReaction] WHERE [PostID] = @Post1ID AND [UserID] = @AdminUserID AND [ReactionKind] = N'Upvote')
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPostReaction] ([ID], [PostID], [UserID], [ReactionKind])
    VALUES ('C8A18600-4E12-4B8F-9A10-100000000001', @Post1ID, @AdminUserID, N'Upvote');
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostReaction] WHERE [PostID] = @AnsPostID AND [UserID] = @AdminUserID AND [ReactionKind] = N'Helpful')
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPostReaction] ([ID], [PostID], [UserID], [ReactionKind])
    VALUES ('C8A18600-4E12-4B8F-9A10-100000000002', @AnsPostID, @AdminUserID, N'Helpful');
END;

-- 13. Member Reputation Profiles (one per Space)
IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunityMemberProfile] WHERE [SpaceID] = @Space1ID AND [UserID] = @AdminUserID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunityMemberProfile] ([ID], [SpaceID], [UserID], [HelpfulAnswerCount], [AcceptedAnswerCount], [ReputationScore])
    VALUES ('C8A18700-4E12-4B8F-9A10-100000000001', @Space1ID, @AdminUserID, 4, 1, 120);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunityMemberProfile] WHERE [SpaceID] = @Space2ID AND [UserID] = @AdminUserID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunityMemberProfile] ([ID], [SpaceID], [UserID], [HelpfulAnswerCount], [AcceptedAnswerCount], [ReputationScore])
    VALUES ('C8A18700-4E12-4B8F-9A10-100000000002', @Space2ID, @AdminUserID, 1, 0, 30);
END;

IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[CommunityMemberProfile] WHERE [SpaceID] = @Space3ID AND [UserID] = @AdminUserID)
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[CommunityMemberProfile] ([ID], [SpaceID], [UserID], [HelpfulAnswerCount], [AcceptedAnswerCount], [ReputationScore])
    VALUES ('C8A18700-4E12-4B8F-9A10-100000000003', @Space3ID, @AdminUserID, 7, 3, 310);
END;

-- 14. Moderation Report
IF NOT EXISTS (SELECT 1 FROM [__mj_BizAppsCommunity].[ForumPostFlag] WHERE [ID] = 'C8A18800-4E12-4B8F-9A10-100000000001')
BEGIN
    INSERT INTO [__mj_BizAppsCommunity].[ForumPostFlag] ([ID], [PostID], [ReportedByUserID], [ReasonCategory], [Status])
    VALUES ('C8A18800-4E12-4B8F-9A10-100000000001', @Comment1ID, @AdminUserID, N'Off Topic', N'Open');
END;
