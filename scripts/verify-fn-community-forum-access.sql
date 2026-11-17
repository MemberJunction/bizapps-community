-- =============================================================================
--  AC-EPIC-1 / CR-08 — Live, ASSERTING verification of
--  [__mj_BizAppsCommunity].[fnCommunityForumAccess] against the seeded World Data Model
--  (scripts/seed-world.sql must already be applied) and the baseline migration's table
--  inventory. Every check below either passes silently or THROWs 50001 with a specific
--  message — a wrong access row (or a missing table) fails this script with a non-zero
--  sqlcmd exit code, not just a SELECT someone has to eyeball.
-- =============================================================================
SET NOCOUNT ON;

DECLARE @AdminUserID UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserID = [ID] FROM [__mj].[User] ORDER BY [__mj_CreatedAt] ASC;
IF @AdminUserID IS NULL
    THROW 50001, 'verify-fn-community-forum-access: no User rows exist in [__mj].[User] — cannot verify access.', 1;

DECLARE @Forum1ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000001'; -- Shared, general-discussion
DECLARE @Forum5ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000005'; -- Team, peer-case-rounds, Moderated
DECLARE @NonMemberUserID UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000099'; -- guaranteed non-member

-- --- Assertion 1: the seeded admin user can post in the Shared general-discussion forum ---
DECLARE @AdminForum1CanPost BIT;
SELECT @AdminForum1CanPost = [CanPost]
FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@AdminUserID)
WHERE [ForumID] = @Forum1ID;

IF @AdminForum1CanPost IS NULL
    THROW 50001, 'fnCommunityForumAccess returned NO row for the seeded admin user against Forum1 (Shared general-discussion) — expected a row with CanPost = 1.', 1;
IF @AdminForum1CanPost <> 1
    THROW 50001, 'fnCommunityForumAccess: seeded admin user has CanPost = 0 on Forum1 (Shared general-discussion) — expected CanPost = 1.', 1;

-- --- Assertion 2: a guaranteed non-member has strict read isolation on Team-band Forum5 and no write/mod/team privileges on Shared Forum1 ---
IF EXISTS (
    SELECT 1
    FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@NonMemberUserID)
    WHERE [ForumID] = @Forum5ID
)
    THROW 50001, 'fnCommunityForumAccess: a guaranteed non-member UserID received a visibility row for Team-band Forum5 — read isolation is broken.', 1;

IF EXISTS (
    SELECT 1
    FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@NonMemberUserID)
    WHERE [ForumID] = @Forum1ID AND ([CanPost] = 1 OR [CanModerate] = 1 OR [CanSeeTeam] = 1)
)
    THROW 50001, 'fnCommunityForumAccess: a guaranteed non-member UserID got CanPost/CanModerate/CanSeeTeam on Shared Forum1 — access isolation is broken.', 1;

-- --- Assertion 3: the seeded admin user's row count across all seeded forums is non-zero ---
DECLARE @AdminTotalRows INT;
SELECT @AdminTotalRows = COUNT(*) FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@AdminUserID);
IF @AdminTotalRows = 0
    THROW 50001, 'fnCommunityForumAccess returned ZERO rows for the seeded admin user across all forums — expected at least one.', 1;

-- --- Assertion 4: all 25 MJ_BizApps_Community base tables exist under __mj_BizAppsCommunity ---
DECLARE @ExpectedTables TABLE ([TableName] NVARCHAR(128));
INSERT INTO @ExpectedTables ([TableName]) VALUES
    (N'CommunityMemberProfile'), (N'CommunitySpace'), (N'Forum'), (N'ForumAMAPost'),
    (N'ForumAnswerPost'), (N'ForumArtifactPost'), (N'ForumCasePost'), (N'ForumFormPost'),
    (N'ForumIdeaAllocation'), (N'ForumIdeaCampaign'), (N'ForumIdeaPost'), (N'ForumInteractivePost'),
    (N'ForumInteractiveSession'), (N'ForumMember'), (N'ForumPost'), (N'ForumPostAttachment'),
    (N'ForumPostFlag'), (N'ForumPostReaction'), (N'ForumPostTag'), (N'ForumQuestionPost'),
    (N'ForumRoleType'), (N'ForumSubscription'), (N'ForumTopicTag'), (N'ForumType'), (N'PostType');

DECLARE @MissingTableCount INT;
SELECT @MissingTableCount = COUNT(*)
FROM @ExpectedTables AS Expected
WHERE NOT EXISTS (
    SELECT 1
    FROM [sys].[tables] AS t
    INNER JOIN [sys].[schemas] AS s ON s.[schema_id] = t.[schema_id]
    WHERE s.[name] = N'__mj_BizAppsCommunity' AND t.[name] = Expected.[TableName]
);
IF @MissingTableCount > 0
    THROW 50001, 'One or more of the 25 expected MJ_BizApps_Community tables is missing from sys.tables under __mj_BizAppsCommunity.', 1;

-- Excludes Flyway's own schema-history bookkeeping table (not a domain table from the baseline
-- migration) — this scratch database keeps that table inside __mj_BizAppsCommunity too.
DECLARE @ActualTableCount INT;
SELECT @ActualTableCount = COUNT(*)
FROM [sys].[tables] AS t
INNER JOIN [sys].[schemas] AS s ON s.[schema_id] = t.[schema_id]
WHERE s.[name] = N'__mj_BizAppsCommunity' AND t.[name] <> N'flyway_schema_history';
IF @ActualTableCount <> 25
    THROW 50001, 'Expected EXACTLY 25 domain tables under __mj_BizAppsCommunity (table count drifted from the baseline migration''s inventory).', 1;

PRINT 'verify-fn-community-forum-access: all assertions passed (CanPost row checks, access isolation, 25/25 table inventory).';
