-- =============================================================================
--  Teardown for BizApps Community (executed by `mj app remove`).
--  Drops all tables, constraints, views, TVFs, and schema in reverse dependency order.
-- =============================================================================

-- 1. Remove application settings and navigation
DELETE FROM [${mjSchema}].[ApplicationSetting]
WHERE [ApplicationID] IN (SELECT [ID] FROM [${mjSchema}].[Application] WHERE [Name] = N'Community');

-- 2. Drop TVF
IF OBJECT_ID(N'[${flyway:defaultSchema}].[fnCommunityForumAccess]', N'IF') IS NOT NULL
    DROP FUNCTION [${flyway:defaultSchema}].[fnCommunityForumAccess];
GO

-- 3. Drop Supporting & Child Tables
IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumPostFlag]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumPostFlag];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumSubscription]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumSubscription];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[CommunityMemberProfile]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[CommunityMemberProfile];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumIdeaAllocation]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumIdeaAllocation];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumPostAttachment]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumPostAttachment];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumPostReaction]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumPostReaction];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumPostTag]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumPostTag];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumInteractiveSession]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumInteractiveSession];
GO

-- 4. Drop ForumPost IsA Subtype Tables
IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumInteractivePost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumInteractivePost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumAMAPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumAMAPost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumCasePost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumCasePost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumArtifactPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumArtifactPost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumFormPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumFormPost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumIdeaPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumIdeaPost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumAnswerPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumAnswerPost];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumQuestionPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumQuestionPost];
GO

-- 5. Drop ForumPost Parent Table
IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumPost]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumPost];
GO

-- 6. Drop Forum Supporting & Subtype Tables
IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumTopicTag]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumTopicTag];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumMember]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumMember];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumIdeaCampaign]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumIdeaCampaign];
GO

-- 7. Drop FK from CommunitySpace to Forum before dropping Forum
IF OBJECT_ID(N'[${flyway:defaultSchema}].[CommunitySpace]', N'U') IS NOT NULL
    AND OBJECT_ID(N'[${flyway:defaultSchema}].[FK_CommunitySpace_DefaultForum]', N'F') IS NOT NULL
    ALTER TABLE [${flyway:defaultSchema}].[CommunitySpace] DROP CONSTRAINT [FK_CommunitySpace_DefaultForum];
GO

-- 8. Drop Forum
IF OBJECT_ID(N'[${flyway:defaultSchema}].[Forum]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[Forum];
GO

-- 9. Drop Catalogs & CommunitySpace
IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumRoleType]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumRoleType];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[PostType]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[PostType];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[ForumType]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[ForumType];
GO

IF OBJECT_ID(N'[${flyway:defaultSchema}].[CommunitySpace]', N'U') IS NOT NULL
    DROP TABLE [${flyway:defaultSchema}].[CommunitySpace];
GO

-- 10. Drop Schema
IF EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'${flyway:defaultSchema}')
    EXEC(N'DROP SCHEMA [${flyway:defaultSchema}]');
GO
