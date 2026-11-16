-- =============================================================================
--  CR-08 — Live verification of [__mj_BizAppsCommunity].[fnCommunityForumAccess]
--  against the seeded World Data Model (scripts/seed-world.sql must already be applied).
--  Read-only: SELECTs only, no data mutation. Run via the zero-secret broker's
--  `rehearse-db --migrations` (plain sqlcmd -i execution, output captured as evidence).
-- =============================================================================
SET NOCOUNT ON;

DECLARE @AdminUserID UNIQUEIDENTIFIER;
SELECT TOP 1 @AdminUserID = [ID] FROM [__mj].[User] ORDER BY [__mj_CreatedAt] ASC;

DECLARE @Forum1ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000001'; -- Shared, general-discussion
DECLARE @Forum5ID UNIQUEIDENTIFIER = 'C8A18100-4E12-4B8F-9A10-100000000005'; -- Team, peer-case-rounds, Moderated
DECLARE @NonMemberUserID UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000000'; -- guaranteed non-member

PRINT '--- Scenario 1: seeded admin user against the Shared general-discussion forum ---';
SELECT [ForumID], [SpaceID], [CanSeeTeam], [CanPost], [CanModerate]
FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@AdminUserID)
WHERE [ForumID] = @Forum1ID;

PRINT '--- Scenario 2: seeded admin user against the Team-band peer-case-rounds forum ---';
SELECT [ForumID], [SpaceID], [CanSeeTeam], [CanPost], [CanModerate]
FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@AdminUserID)
WHERE [ForumID] = @Forum5ID;

PRINT '--- Scenario 3: a guaranteed non-member/non-existent UserID — must return CanPost = 0 (or no row) for every forum ---';
SELECT [ForumID], [SpaceID], [CanSeeTeam], [CanPost], [CanModerate]
FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@NonMemberUserID)
WHERE [ForumID] IN (@Forum1ID, @Forum5ID);

PRINT '--- Scenario 4: row count sanity — fnCommunityForumAccess returns at least one row for the admin user across all seeded forums ---';
SELECT COUNT(*) AS [TotalAccessRowsForAdmin]
FROM [__mj_BizAppsCommunity].[fnCommunityForumAccess](@AdminUserID);
