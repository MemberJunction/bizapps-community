import { z } from "zod";


/**
 * zod schema definition for the entity MJ_BizApps_Community: Community Member Profiles
 */
export const mjBizAppsCommunityCommunityMemberProfileSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SpaceID: z.string().describe(`
        * * Field Name: SpaceID
        * * Display Name: Space ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    PersonID: z.string().nullable().describe(`
        * * Field Name: PersonID
        * * Display Name: Person ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Common: People (vwPeople.ID)`),
    BioMarkdown: z.string().nullable().describe(`
        * * Field Name: BioMarkdown
        * * Display Name: Bio Markdown
        * * SQL Data Type: nvarchar(1000)`),
    ExpertiseTagsJSON: z.string().nullable().describe(`
        * * Field Name: ExpertiseTagsJSON
        * * Display Name: Expertise Tags JSON
        * * SQL Data Type: nvarchar(MAX)`),
    HelpfulAnswerCount: z.number().describe(`
        * * Field Name: HelpfulAnswerCount
        * * Display Name: Helpful Answer Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    AcceptedAnswerCount: z.number().describe(`
        * * Field Name: AcceptedAnswerCount
        * * Display Name: Accepted Answer Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    ReputationScore: z.number().describe(`
        * * Field Name: ReputationScore
        * * Display Name: Reputation Score
        * * SQL Data Type: int
        * * Default Value: 0`),
    DigestCadence: z.union([z.literal('Daily Digest'), z.literal('Every Post'), z.literal('Highlights Only'), z.literal('Muted'), z.literal('Weekly Digest')]).describe(`
        * * Field Name: DigestCadence
        * * Display Name: Digest Cadence
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Daily Digest
    * * Value List Type: List
    * * Possible Values 
    *   * Daily Digest
    *   * Every Post
    *   * Highlights Only
    *   * Muted
    *   * Weekly Digest`),
    OpenToPeerMentoring: z.boolean().describe(`
        * * Field Name: OpenToPeerMentoring
        * * Display Name: Open To Peer Mentoring
        * * SQL Data Type: bit
        * * Default Value: 0`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
    Person: z.string().nullable().describe(`
        * * Field Name: Person
        * * Display Name: Person
        * * SQL Data Type: nvarchar(250)`),
});

export type mjBizAppsCommunityCommunityMemberProfileEntityType = z.infer<typeof mjBizAppsCommunityCommunityMemberProfileSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Community Spaces
 */
export const mjBizAppsCommunityCommunitySpaceSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Spaces (vwSpaces.ID)`),
    Slug: z.string().describe(`
        * * Field Name: Slug
        * * Display Name: Slug
        * * SQL Data Type: nvarchar(120)`),
    CommunityKind: z.union([z.literal('Association Wide'), z.literal('Other'), z.literal('Product Community'), z.literal('Special Interest Group'), z.literal('Working Group')]).describe(`
        * * Field Name: CommunityKind
        * * Display Name: Community Kind
        * * SQL Data Type: nvarchar(50)
        * * Default Value: Association Wide
    * * Value List Type: List
    * * Possible Values 
    *   * Association Wide
    *   * Other
    *   * Product Community
    *   * Special Interest Group
    *   * Working Group`),
    CommunityKindDetails: z.string().nullable().describe(`
        * * Field Name: CommunityKindDetails
        * * Display Name: Community Kind Details
        * * SQL Data Type: nvarchar(200)`),
    AnonymousReadMode: z.union([z.literal('Full Read'), z.literal('None'), z.literal('Teaser Only')]).describe(`
        * * Field Name: AnonymousReadMode
        * * Display Name: Anonymous Read Mode
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Teaser Only
    * * Value List Type: List
    * * Possible Values 
    *   * Full Read
    *   * None
    *   * Teaser Only`),
    AskFirstEnabled: z.boolean().describe(`
        * * Field Name: AskFirstEnabled
        * * Display Name: Ask First Enabled
        * * SQL Data Type: bit
        * * Default Value: 1`),
    DefaultDigestCadence: z.union([z.literal('Daily Digest'), z.literal('Every Post'), z.literal('Highlights Only'), z.literal('Muted'), z.literal('Weekly Digest')]).describe(`
        * * Field Name: DefaultDigestCadence
        * * Display Name: Default Digest Cadence
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Daily Digest
    * * Value List Type: List
    * * Possible Values 
    *   * Daily Digest
    *   * Every Post
    *   * Highlights Only
    *   * Muted
    *   * Weekly Digest`),
    BannerImageURL: z.string().nullable().describe(`
        * * Field Name: BannerImageURL
        * * Display Name: Banner Image URL
        * * SQL Data Type: nvarchar(500)`),
    WelcomeMarkdown: z.string().nullable().describe(`
        * * Field Name: WelcomeMarkdown
        * * Display Name: Welcome Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    DefaultForumID: z.string().nullable().describe(`
        * * Field Name: DefaultForumID
        * * Display Name: Default Forum ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    DefaultForum: z.string().nullable().describe(`
        * * Field Name: DefaultForum
        * * Display Name: Default Forum
        * * SQL Data Type: nvarchar(200)`),
});

export type mjBizAppsCommunityCommunitySpaceEntityType = z.infer<typeof mjBizAppsCommunityCommunitySpaceSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum AMA Posts
 */
export const mjBizAppsCommunityForumAMAPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    HostUserID: z.string().describe(`
        * * Field Name: HostUserID
        * * Display Name: Host User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ScheduledStartAt: z.date().describe(`
        * * Field Name: ScheduledStartAt
        * * Display Name: Scheduled Start At
        * * SQL Data Type: datetimeoffset`),
    ScheduledEndAt: z.date().describe(`
        * * Field Name: ScheduledEndAt
        * * Display Name: Scheduled End At
        * * SQL Data Type: datetimeoffset`),
    QuestionsOpenAt: z.date().describe(`
        * * Field Name: QuestionsOpenAt
        * * Display Name: Questions Open At
        * * SQL Data Type: datetimeoffset`),
    IsLiveNow: z.boolean().describe(`
        * * Field Name: IsLiveNow
        * * Display Name: Is Live Now
        * * SQL Data Type: bit
        * * Default Value: 0`),
    RecordingURL: z.string().nullable().describe(`
        * * Field Name: RecordingURL
        * * Display Name: Recording URL
        * * SQL Data Type: nvarchar(500)`),
    RecapMarkdown: z.string().nullable().describe(`
        * * Field Name: RecapMarkdown
        * * Display Name: Recap Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    HostUser: z.string().nullable().describe(`
        * * Field Name: HostUser
        * * Display Name: Host User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumAMAPostEntityType = z.infer<typeof mjBizAppsCommunityForumAMAPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Answer Posts
 */
export const mjBizAppsCommunityForumAnswerPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    QuestionPostID: z.string().describe(`
        * * Field Name: QuestionPostID
        * * Display Name: Question Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Question Posts (vwForumQuestionPosts.ID)`),
    IsAcceptedByAuthor: z.boolean().describe(`
        * * Field Name: IsAcceptedByAuthor
        * * Display Name: Is Accepted By Author
        * * SQL Data Type: bit
        * * Default Value: 0`),
    IsVerifiedByModerator: z.boolean().describe(`
        * * Field Name: IsVerifiedByModerator
        * * Display Name: Is Verified By Moderator
        * * SQL Data Type: bit
        * * Default Value: 0`),
    VerifiedByUserID: z.string().nullable().describe(`
        * * Field Name: VerifiedByUserID
        * * Display Name: Verified By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    VerifiedAt: z.date().nullable().describe(`
        * * Field Name: VerifiedAt
        * * Display Name: Verified At
        * * SQL Data Type: datetimeoffset`),
    AIEpistemicStatus: z.union([z.literal('Canon Verified'), z.literal('Conflicts With Canon'), z.literal('Novel Insight'), z.literal('Partially Outdated')]).nullable().describe(`
        * * Field Name: AIEpistemicStatus
        * * Display Name: AI Epistemic Status
        * * SQL Data Type: nvarchar(40)
    * * Value List Type: List
    * * Possible Values 
    *   * Canon Verified
    *   * Conflicts With Canon
    *   * Novel Insight
    *   * Partially Outdated`),
    AIConfidenceScore: z.number().nullable().describe(`
        * * Field Name: AIConfidenceScore
        * * Display Name: AI Confidence Score
        * * SQL Data Type: decimal(4, 3)`),
    AIRationaleMarkdown: z.string().nullable().describe(`
        * * Field Name: AIRationaleMarkdown
        * * Display Name: AI Rationale Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    FreshnessReviewDueAt: z.date().nullable().describe(`
        * * Field Name: FreshnessReviewDueAt
        * * Display Name: Freshness Review Due At
        * * SQL Data Type: datetimeoffset`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    VerifiedByUser: z.string().nullable().describe(`
        * * Field Name: VerifiedByUser
        * * Display Name: Verified By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumAnswerPostEntityType = z.infer<typeof mjBizAppsCommunityForumAnswerPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Artifact Posts
 */
export const mjBizAppsCommunityForumArtifactPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    ArtifactID: z.string().describe(`
        * * Field Name: ArtifactID
        * * Display Name: Artifact ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Artifacts (vwArtifacts.ID)`),
    PinnedArtifactVersionID: z.string().nullable().describe(`
        * * Field Name: PinnedArtifactVersionID
        * * Display Name: Pinned Artifact Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)`),
    SpaceItemID: z.string().describe(`
        * * Field Name: SpaceItemID
        * * Display Name: Space Item ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)`),
    ArtifactModality: z.union([z.literal('Document'), z.literal('Presentation'), z.literal('Spreadsheet')]).describe(`
        * * Field Name: ArtifactModality
        * * Display Name: Artifact Modality
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Document
    * * Value List Type: List
    * * Possible Values 
    *   * Document
    *   * Presentation
    *   * Spreadsheet`),
    CollaborationMode: z.union([z.literal('Comment Only'), z.literal('Edit'), z.literal('Suggest')]).describe(`
        * * Field Name: CollaborationMode
        * * Display Name: Collaboration Mode
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Suggest
    * * Value List Type: List
    * * Possible Values 
    *   * Comment Only
    *   * Edit
    *   * Suggest`),
    ShowInlinePreview: z.boolean().describe(`
        * * Field Name: ShowInlinePreview
        * * Display Name: Show Inline Preview
        * * SQL Data Type: bit
        * * Default Value: 1`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Artifact: z.string().nullable().describe(`
        * * Field Name: Artifact
        * * Display Name: Artifact
        * * SQL Data Type: nvarchar(255)`),
    PinnedArtifactVersion: z.string().nullable().describe(`
        * * Field Name: PinnedArtifactVersion
        * * Display Name: Pinned Artifact Version
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCommunityForumArtifactPostEntityType = z.infer<typeof mjBizAppsCommunityForumArtifactPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Case Posts
 */
export const mjBizAppsCommunityForumCasePostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    SituationMarkdown: z.string().describe(`
        * * Field Name: SituationMarkdown
        * * Display Name: Situation Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    ActionTakenMarkdown: z.string().describe(`
        * * Field Name: ActionTakenMarkdown
        * * Display Name: Action Taken Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    OutcomeMarkdown: z.string().nullable().describe(`
        * * Field Name: OutcomeMarkdown
        * * Display Name: Outcome Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    IsAnonymized: z.boolean().describe(`
        * * Field Name: IsAnonymized
        * * Display Name: Is Anonymized
        * * SQL Data Type: bit
        * * Default Value: 0`),
    AnonymizedAuthorAlias: z.string().nullable().describe(`
        * * Field Name: AnonymizedAuthorAlias
        * * Display Name: Anonymized Author Alias
        * * SQL Data Type: nvarchar(100)`),
    RedactionConfirmedByUserID: z.string().nullable().describe(`
        * * Field Name: RedactionConfirmedByUserID
        * * Display Name: Redaction Confirmed By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    RedactionConfirmedByUser: z.string().nullable().describe(`
        * * Field Name: RedactionConfirmedByUser
        * * Display Name: Redaction Confirmed By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumCasePostEntityType = z.infer<typeof mjBizAppsCommunityForumCasePostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Form Posts
 */
export const mjBizAppsCommunityForumFormPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    FormID: z.string().describe(`
        * * Field Name: FormID
        * * Display Name: Form ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Forms: Forms (vwForms.ID)`),
    FormDistributionID: z.string().nullable().describe(`
        * * Field Name: FormDistributionID
        * * Display Name: Form Distribution ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Forms: Form Distributions (vwFormDistributions.ID)`),
    ShowLiveResultsInline: z.boolean().describe(`
        * * Field Name: ShowLiveResultsInline
        * * Display Name: Show Live Results Inline
        * * SQL Data Type: bit
        * * Default Value: 1`),
    RequirePostReplyOnSubmit: z.boolean().describe(`
        * * Field Name: RequirePostReplyOnSubmit
        * * Display Name: Require Post Reply On Submit
        * * SQL Data Type: bit
        * * Default Value: 0`),
    ClosesAt: z.date().nullable().describe(`
        * * Field Name: ClosesAt
        * * Display Name: Closes At
        * * SQL Data Type: datetimeoffset`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Form: z.string().nullable().describe(`
        * * Field Name: Form
        * * Display Name: Form
        * * SQL Data Type: nvarchar(255)`),
    FormDistribution: z.string().nullable().describe(`
        * * Field Name: FormDistribution
        * * Display Name: Form Distribution
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCommunityForumFormPostEntityType = z.infer<typeof mjBizAppsCommunityForumFormPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Idea Allocations
 */
export const mjBizAppsCommunityForumIdeaAllocationSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    IdeaPostID: z.string().describe(`
        * * Field Name: IdeaPostID
        * * Display Name: Idea Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Idea Posts (vwForumIdeaPosts.ID)`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    PointsAllocated: z.number().describe(`
        * * Field Name: PointsAllocated
        * * Display Name: Points Allocated
        * * SQL Data Type: int`),
    QuadraticVotes: z.number().describe(`
        * * Field Name: QuadraticVotes
        * * Display Name: Quadratic Votes
        * * SQL Data Type: decimal(10, 2)`),
    RationaleComment: z.string().nullable().describe(`
        * * Field Name: RationaleComment
        * * Display Name: Rationale Comment
        * * SQL Data Type: nvarchar(500)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumIdeaAllocationEntityType = z.infer<typeof mjBizAppsCommunityForumIdeaAllocationSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Idea Campaigns
 */
export const mjBizAppsCommunityForumIdeaCampaignSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    DefaultBudgetPoints: z.number().describe(`
        * * Field Name: DefaultBudgetPoints
        * * Display Name: Default Budget Points
        * * SQL Data Type: int
        * * Default Value: 100`),
    AllocationMode: z.union([z.literal('Point Allocation'), z.literal('Quadratic')]).describe(`
        * * Field Name: AllocationMode
        * * Display Name: Allocation Mode
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Point Allocation
    * * Value List Type: List
    * * Possible Values 
    *   * Point Allocation
    *   * Quadratic`),
    MaxPointsPerIdea: z.number().nullable().describe(`
        * * Field Name: MaxPointsPerIdea
        * * Display Name: Max Points Per Idea
        * * SQL Data Type: int`),
    SubmissionsCloseAt: z.date().nullable().describe(`
        * * Field Name: SubmissionsCloseAt
        * * Display Name: Submissions Close At
        * * SQL Data Type: datetimeoffset`),
    VotingClosesAt: z.date().nullable().describe(`
        * * Field Name: VotingClosesAt
        * * Display Name: Voting Closes At
        * * SQL Data Type: datetimeoffset`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumIdeaCampaignEntityType = z.infer<typeof mjBizAppsCommunityForumIdeaCampaignSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Idea Posts
 */
export const mjBizAppsCommunityForumIdeaPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    IdeaStatus: z.union([z.literal('Declined'), z.literal('In Progress'), z.literal('Planned'), z.literal('Shipped'), z.literal('Under Consideration')]).describe(`
        * * Field Name: IdeaStatus
        * * Display Name: Idea Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Under Consideration
    * * Value List Type: List
    * * Possible Values 
    *   * Declined
    *   * In Progress
    *   * Planned
    *   * Shipped
    *   * Under Consideration`),
    TotalPointsAllocated: z.number().describe(`
        * * Field Name: TotalPointsAllocated
        * * Display Name: Total Points Allocated
        * * SQL Data Type: int
        * * Default Value: 0`),
    EffectiveQuadraticVotes: z.number().describe(`
        * * Field Name: EffectiveQuadraticVotes
        * * Display Name: Effective Quadratic Votes
        * * SQL Data Type: decimal(10, 2)
        * * Default Value: 0`),
    UniqueBackerCount: z.number().describe(`
        * * Field Name: UniqueBackerCount
        * * Display Name: Unique Backer Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    TargetReleaseOrQuarter: z.string().nullable().describe(`
        * * Field Name: TargetReleaseOrQuarter
        * * Display Name: Target Release Or Quarter
        * * SQL Data Type: nvarchar(50)`),
    StatusRationaleMarkdown: z.string().nullable().describe(`
        * * Field Name: StatusRationaleMarkdown
        * * Display Name: Status Rationale Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    MergedIntoIdeaPostID: z.string().nullable().describe(`
        * * Field Name: MergedIntoIdeaPostID
        * * Display Name: Merged Into Idea Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Idea Posts (vwForumIdeaPosts.ID)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumIdeaPostEntityType = z.infer<typeof mjBizAppsCommunityForumIdeaPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Interactive Posts
 */
export const mjBizAppsCommunityForumInteractivePostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    ComponentArtifactID: z.string().describe(`
        * * Field Name: ComponentArtifactID
        * * Display Name: Component Artifact ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Artifacts (vwArtifacts.ID)`),
    PinnedArtifactVersionID: z.string().nullable().describe(`
        * * Field Name: PinnedArtifactVersionID
        * * Display Name: Pinned Artifact Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)`),
    SpaceItemID: z.string().nullable().describe(`
        * * Field Name: SpaceItemID
        * * Display Name: Space Item ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)`),
    ExperienceKind: z.union([z.literal('Calculator'), z.literal('Flashcards'), z.literal('Other'), z.literal('Poll Game'), z.literal('Quiz'), z.literal('Simulation'), z.literal('Trivia')]).describe(`
        * * Field Name: ExperienceKind
        * * Display Name: Experience Kind
        * * SQL Data Type: nvarchar(40)
        * * Default Value: Quiz
    * * Value List Type: List
    * * Possible Values 
    *   * Calculator
    *   * Flashcards
    *   * Other
    *   * Poll Game
    *   * Quiz
    *   * Simulation
    *   * Trivia`),
    ExperienceKindDetails: z.string().nullable().describe(`
        * * Field Name: ExperienceKindDetails
        * * Display Name: Experience Kind Details
        * * SQL Data Type: nvarchar(200)`),
    PromptUsed: z.string().nullable().describe(`
        * * Field Name: PromptUsed
        * * Display Name: Prompt Used
        * * SQL Data Type: nvarchar(MAX)`),
    ScoringMode: z.union([z.literal('Best Score'), z.literal('Completion'), z.literal('Fastest Time'), z.literal('None'), z.literal('Streak')]).describe(`
        * * Field Name: ScoringMode
        * * Display Name: Scoring Mode
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Best Score
    * * Value List Type: List
    * * Possible Values 
    *   * Best Score
    *   * Completion
    *   * Fastest Time
    *   * None
    *   * Streak`),
    ShowLeaderboard: z.boolean().describe(`
        * * Field Name: ShowLeaderboard
        * * Display Name: Show Leaderboard
        * * SQL Data Type: bit
        * * Default Value: 1`),
    MaxAttemptsPerMember: z.number().nullable().describe(`
        * * Field Name: MaxAttemptsPerMember
        * * Display Name: Max Attempts Per Member
        * * SQL Data Type: int`),
    PlayCount: z.number().describe(`
        * * Field Name: PlayCount
        * * Display Name: Play Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    ExpiresAt: z.date().nullable().describe(`
        * * Field Name: ExpiresAt
        * * Display Name: Expires At
        * * SQL Data Type: datetimeoffset`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    ComponentArtifact: z.string().nullable().describe(`
        * * Field Name: ComponentArtifact
        * * Display Name: Component Artifact
        * * SQL Data Type: nvarchar(255)`),
    PinnedArtifactVersion: z.string().nullable().describe(`
        * * Field Name: PinnedArtifactVersion
        * * Display Name: Pinned Artifact Version
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCommunityForumInteractivePostEntityType = z.infer<typeof mjBizAppsCommunityForumInteractivePostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Interactive Sessions
 */
export const mjBizAppsCommunityForumInteractiveSessionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    InteractivePostID: z.string().describe(`
        * * Field Name: InteractivePostID
        * * Display Name: Interactive Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Interactive Posts (vwForumInteractivePosts.ID)`),
    ArtifactVersionID: z.string().describe(`
        * * Field Name: ArtifactVersionID
        * * Display Name: Artifact Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    AttemptNumber: z.number().describe(`
        * * Field Name: AttemptNumber
        * * Display Name: Attempt Number
        * * SQL Data Type: int
        * * Default Value: 1`),
    Score: z.number().nullable().describe(`
        * * Field Name: Score
        * * Display Name: Score
        * * SQL Data Type: decimal(12, 2)`),
    DurationSeconds: z.number().nullable().describe(`
        * * Field Name: DurationSeconds
        * * Display Name: Duration Seconds
        * * SQL Data Type: int`),
    Completed: z.boolean().describe(`
        * * Field Name: Completed
        * * Display Name: Completed
        * * SQL Data Type: bit
        * * Default Value: 0`),
    OutcomeSummary: z.string().nullable().describe(`
        * * Field Name: OutcomeSummary
        * * Display Name: Outcome Summary
        * * SQL Data Type: nvarchar(300)`),
    SessionStateJSON: z.string().nullable().describe(`
        * * Field Name: SessionStateJSON
        * * Display Name: Session State JSON
        * * SQL Data Type: nvarchar(MAX)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    ArtifactVersion: z.string().nullable().describe(`
        * * Field Name: ArtifactVersion
        * * Display Name: Artifact Version
        * * SQL Data Type: nvarchar(255)`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumInteractiveSessionEntityType = z.infer<typeof mjBizAppsCommunityForumInteractiveSessionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Members
 */
export const mjBizAppsCommunityForumMemberSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ForumID: z.string().describe(`
        * * Field Name: ForumID
        * * Display Name: Forum ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ForumRoleTypeID: z.string().describe(`
        * * Field Name: ForumRoleTypeID
        * * Display Name: Forum Role Type ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Role Types (vwForumRoleTypes.ID)`),
    Status: z.union([z.literal('Active'), z.literal('Invited'), z.literal('Muted'), z.literal('Removed')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Invited
    *   * Muted
    *   * Removed`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Forum: z.string().nullable().describe(`
        * * Field Name: Forum
        * * Display Name: Forum
        * * SQL Data Type: nvarchar(200)`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
    ForumRoleType: z.string().nullable().describe(`
        * * Field Name: ForumRoleType
        * * Display Name: Forum Role Type
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumMemberEntityType = z.infer<typeof mjBizAppsCommunityForumMemberSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Post Attachments
 */
export const mjBizAppsCommunityForumPostAttachmentSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    PostID: z.string().describe(`
        * * Field Name: PostID
        * * Display Name: Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    SpaceItemID: z.string().describe(`
        * * Field Name: SpaceItemID
        * * Display Name: Space Item ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)`),
    Caption: z.string().nullable().describe(`
        * * Field Name: Caption
        * * Display Name: Caption
        * * SQL Data Type: nvarchar(300)`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumPostAttachmentEntityType = z.infer<typeof mjBizAppsCommunityForumPostAttachmentSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Post Flags
 */
export const mjBizAppsCommunityForumPostFlagSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    PostID: z.string().describe(`
        * * Field Name: PostID
        * * Display Name: Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    ReportedByUserID: z.string().nullable().describe(`
        * * Field Name: ReportedByUserID
        * * Display Name: Reported By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ReportedByAgentID: z.string().nullable().describe(`
        * * Field Name: ReportedByAgentID
        * * Display Name: Reported By Agent ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: AI Agents (vwAIAgents.ID)`),
    ReasonCategory: z.union([z.literal('Harassment'), z.literal('Needs Redaction'), z.literal('Off Topic'), z.literal('Other'), z.literal('Outdated Advice'), z.literal('Spam')]).describe(`
        * * Field Name: ReasonCategory
        * * Display Name: Reason Category
        * * SQL Data Type: nvarchar(40)
    * * Value List Type: List
    * * Possible Values 
    *   * Harassment
    *   * Needs Redaction
    *   * Off Topic
    *   * Other
    *   * Outdated Advice
    *   * Spam`),
    ReasonDetails: z.string().nullable().describe(`
        * * Field Name: ReasonDetails
        * * Display Name: Reason Details
        * * SQL Data Type: nvarchar(1000)`),
    Status: z.union([z.literal('ActionTaken'), z.literal('Dismissed'), z.literal('Open')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Open
    * * Value List Type: List
    * * Possible Values 
    *   * ActionTaken
    *   * Dismissed
    *   * Open`),
    ResolvedByUserID: z.string().nullable().describe(`
        * * Field Name: ResolvedByUserID
        * * Display Name: Resolved By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ResolvedAt: z.date().nullable().describe(`
        * * Field Name: ResolvedAt
        * * Display Name: Resolved At
        * * SQL Data Type: datetimeoffset`),
    ResolutionOutcome: z.union([z.literal('Author Muted'), z.literal('Dismissed'), z.literal('Edited'), z.literal('Hidden'), z.literal('Redacted')]).nullable().describe(`
        * * Field Name: ResolutionOutcome
        * * Display Name: Resolution Outcome
        * * SQL Data Type: nvarchar(40)
    * * Value List Type: List
    * * Possible Values 
    *   * Author Muted
    *   * Dismissed
    *   * Edited
    *   * Hidden
    *   * Redacted`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    ReportedByUser: z.string().nullable().describe(`
        * * Field Name: ReportedByUser
        * * Display Name: Reported By User
        * * SQL Data Type: nvarchar(100)`),
    ReportedByAgent: z.string().nullable().describe(`
        * * Field Name: ReportedByAgent
        * * Display Name: Reported By Agent
        * * SQL Data Type: nvarchar(255)`),
    ResolvedByUser: z.string().nullable().describe(`
        * * Field Name: ResolvedByUser
        * * Display Name: Resolved By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumPostFlagEntityType = z.infer<typeof mjBizAppsCommunityForumPostFlagSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Post Reactions
 */
export const mjBizAppsCommunityForumPostReactionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    PostID: z.string().describe(`
        * * Field Name: PostID
        * * Display Name: Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ReactionKind: z.union([z.literal('Agree'), z.literal('Celebrate'), z.literal('Curious'), z.literal('Helpful'), z.literal('Insightful'), z.literal('Upvote')]).describe(`
        * * Field Name: ReactionKind
        * * Display Name: Reaction Kind
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Upvote
    * * Value List Type: List
    * * Possible Values 
    *   * Agree
    *   * Celebrate
    *   * Curious
    *   * Helpful
    *   * Insightful
    *   * Upvote`),
    Weight: z.number().describe(`
        * * Field Name: Weight
        * * Display Name: Weight
        * * SQL Data Type: decimal(5, 2)
        * * Default Value: 1.00`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumPostReactionEntityType = z.infer<typeof mjBizAppsCommunityForumPostReactionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Post Tags
 */
export const mjBizAppsCommunityForumPostTagSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    PostID: z.string().describe(`
        * * Field Name: PostID
        * * Display Name: Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    TopicTagID: z.string().describe(`
        * * Field Name: TopicTagID
        * * Display Name: Topic Tag ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)`),
    AssignedByAI: z.boolean().describe(`
        * * Field Name: AssignedByAI
        * * Display Name: Assigned By AI
        * * SQL Data Type: bit
        * * Default Value: 0`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    TopicTag: z.string().nullable().describe(`
        * * Field Name: TopicTag
        * * Display Name: Topic Tag
        * * SQL Data Type: nvarchar(120)`),
});

export type mjBizAppsCommunityForumPostTagEntityType = z.infer<typeof mjBizAppsCommunityForumPostTagSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Posts
 */
export const mjBizAppsCommunityForumPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ForumID: z.string().describe(`
        * * Field Name: ForumID
        * * Display Name: Forum ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    PostTypeID: z.string().describe(`
        * * Field Name: PostTypeID
        * * Display Name: Post Type ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Post Types (vwPostTypes.ID)`),
    RootPostID: z.string().nullable().describe(`
        * * Field Name: RootPostID
        * * Display Name: Root Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    ParentPostID: z.string().nullable().describe(`
        * * Field Name: ParentPostID
        * * Display Name: Parent Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    ReplyDepth: z.number().describe(`
        * * Field Name: ReplyDepth
        * * Display Name: Reply Depth
        * * SQL Data Type: int
        * * Default Value: 0`),
    AuthorUserID: z.string().nullable().describe(`
        * * Field Name: AuthorUserID
        * * Display Name: Author User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    AuthorPersonID: z.string().nullable().describe(`
        * * Field Name: AuthorPersonID
        * * Display Name: Author Person ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Common: People (vwPeople.ID)`),
    AuthorAgentID: z.string().nullable().describe(`
        * * Field Name: AuthorAgentID
        * * Display Name: Author Agent ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: AI Agents (vwAIAgents.ID)`),
    Title: z.string().nullable().describe(`
        * * Field Name: Title
        * * Display Name: Title
        * * SQL Data Type: nvarchar(300)`),
    Slug: z.string().nullable().describe(`
        * * Field Name: Slug
        * * Display Name: Slug
        * * SQL Data Type: nvarchar(320)`),
    BodyMarkdown: z.string().describe(`
        * * Field Name: BodyMarkdown
        * * Display Name: Body Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    SummaryMarkdown: z.string().nullable().describe(`
        * * Field Name: SummaryMarkdown
        * * Display Name: Summary Markdown
        * * SQL Data Type: nvarchar(MAX)`),
    SummaryGeneratedAt: z.date().nullable().describe(`
        * * Field Name: SummaryGeneratedAt
        * * Display Name: Summary Generated At
        * * SQL Data Type: datetimeoffset`),
    SummaryReplyWatermark: z.number().describe(`
        * * Field Name: SummaryReplyWatermark
        * * Display Name: Summary Reply Watermark
        * * SQL Data Type: int
        * * Default Value: 0`),
    VisibilityBand: z.union([z.literal('Shared'), z.literal('Team')]).describe(`
        * * Field Name: VisibilityBand
        * * Display Name: Visibility Band
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Shared
    * * Value List Type: List
    * * Possible Values 
    *   * Shared
    *   * Team`),
    Status: z.union([z.literal('Answered'), z.literal('Archived'), z.literal('Draft'), z.literal('PendingModeration'), z.literal('Published'), z.literal('Redacted'), z.literal('Resolved')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Published
    * * Value List Type: List
    * * Possible Values 
    *   * Answered
    *   * Archived
    *   * Draft
    *   * PendingModeration
    *   * Published
    *   * Redacted
    *   * Resolved`),
    IsPinned: z.boolean().describe(`
        * * Field Name: IsPinned
        * * Display Name: Is Pinned
        * * SQL Data Type: bit
        * * Default Value: 0`),
    IsLocked: z.boolean().describe(`
        * * Field Name: IsLocked
        * * Display Name: Is Locked
        * * SQL Data Type: bit
        * * Default Value: 0`),
    IsFeatured: z.boolean().describe(`
        * * Field Name: IsFeatured
        * * Display Name: Is Featured
        * * SQL Data Type: bit
        * * Default Value: 0`),
    ReplyCount: z.number().describe(`
        * * Field Name: ReplyCount
        * * Display Name: Reply Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    ParticipantCount: z.number().describe(`
        * * Field Name: ParticipantCount
        * * Display Name: Participant Count
        * * SQL Data Type: int
        * * Default Value: 1`),
    ReactionScore: z.number().describe(`
        * * Field Name: ReactionScore
        * * Display Name: Reaction Score
        * * SQL Data Type: int
        * * Default Value: 0`),
    ViewCount: z.number().describe(`
        * * Field Name: ViewCount
        * * Display Name: View Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    LastActivityAt: z.date().describe(`
        * * Field Name: LastActivityAt
        * * Display Name: Last Activity At
        * * SQL Data Type: datetimeoffset
        * * Default Value: sysdatetimeoffset()`),
    PromotedToSpaceID: z.string().nullable().describe(`
        * * Field Name: PromotedToSpaceID
        * * Display Name: Promoted To Space ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Spaces (vwSpaces.ID)`),
    LinkedTaskID: z.string().nullable().describe(`
        * * Field Name: LinkedTaskID
        * * Display Name: Linked Task ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Tasks: Tasks (vwTasks.ID)`),
    LinkedEntityID: z.string().nullable().describe(`
        * * Field Name: LinkedEntityID
        * * Display Name: Linked Entity ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)`),
    LinkedRecordID: z.string().nullable().describe(`
        * * Field Name: LinkedRecordID
        * * Display Name: Linked Record ID
        * * SQL Data Type: nvarchar(450)`),
    ConversationID: z.string().nullable().describe(`
        * * Field Name: ConversationID
        * * Display Name: Conversation ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Conversations (vwConversations.ID)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Forum: z.string().nullable().describe(`
        * * Field Name: Forum
        * * Display Name: Forum
        * * SQL Data Type: nvarchar(200)`),
    PostType: z.string().nullable().describe(`
        * * Field Name: PostType
        * * Display Name: Post Type
        * * SQL Data Type: nvarchar(100)`),
    AuthorUser: z.string().nullable().describe(`
        * * Field Name: AuthorUser
        * * Display Name: Author User
        * * SQL Data Type: nvarchar(100)`),
    AuthorPerson: z.string().nullable().describe(`
        * * Field Name: AuthorPerson
        * * Display Name: Author Person
        * * SQL Data Type: nvarchar(250)`),
    AuthorAgent: z.string().nullable().describe(`
        * * Field Name: AuthorAgent
        * * Display Name: Author Agent
        * * SQL Data Type: nvarchar(255)`),
    PromotedToSpace: z.string().nullable().describe(`
        * * Field Name: PromotedToSpace
        * * Display Name: Promoted To Space
        * * SQL Data Type: nvarchar(200)`),
    LinkedTask: z.string().nullable().describe(`
        * * Field Name: LinkedTask
        * * Display Name: Linked Task
        * * SQL Data Type: nvarchar(255)`),
    LinkedEntity: z.string().nullable().describe(`
        * * Field Name: LinkedEntity
        * * Display Name: Linked Entity
        * * SQL Data Type: nvarchar(255)`),
    Conversation: z.string().nullable().describe(`
        * * Field Name: Conversation
        * * Display Name: Conversation
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCommunityForumPostEntityType = z.infer<typeof mjBizAppsCommunityForumPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Question Posts
 */
export const mjBizAppsCommunityForumQuestionPostSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    AcceptedAnswerPostID: z.string().nullable().describe(`
        * * Field Name: AcceptedAnswerPostID
        * * Display Name: Accepted Answer Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    AICanonAnswerPostID: z.string().nullable().describe(`
        * * Field Name: AICanonAnswerPostID
        * * Display Name: AI Canon Answer Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    BountyPoints: z.number().describe(`
        * * Field Name: BountyPoints
        * * Display Name: Bounty Points
        * * SQL Data Type: int
        * * Default Value: 0`),
    ResolvedAt: z.date().nullable().describe(`
        * * Field Name: ResolvedAt
        * * Display Name: Resolved At
        * * SQL Data Type: datetimeoffset`),
    DeflectionCount: z.number().describe(`
        * * Field Name: DeflectionCount
        * * Display Name: Deflection Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumQuestionPostEntityType = z.infer<typeof mjBizAppsCommunityForumQuestionPostSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Role Types
 */
export const mjBizAppsCommunityForumRoleTypeSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    Code: z.string().describe(`
        * * Field Name: Code
        * * Display Name: Code
        * * SQL Data Type: nvarchar(100)`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(100)`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)`),
    Level: z.number().describe(`
        * * Field Name: Level
        * * Display Name: Level
        * * SQL Data Type: int
        * * Default Value: 100`),
    CanConfigureForum: z.boolean().describe(`
        * * Field Name: CanConfigureForum
        * * Display Name: Can Configure Forum
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanModerateQueue: z.boolean().describe(`
        * * Field Name: CanModerateQueue
        * * Display Name: Can Moderate Queue
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanPinOrLock: z.boolean().describe(`
        * * Field Name: CanPinOrLock
        * * Display Name: Can Pin Or Lock
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanAcceptAnswers: z.boolean().describe(`
        * * Field Name: CanAcceptAnswers
        * * Display Name: Can Accept Answers
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanVerifyCanon: z.boolean().describe(`
        * * Field Name: CanVerifyCanon
        * * Display Name: Can Verify Canon
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanPromoteToSpace: z.boolean().describe(`
        * * Field Name: CanPromoteToSpace
        * * Display Name: Can Promote To Space
        * * SQL Data Type: bit
        * * Default Value: 0`),
    CanCreateRootPost: z.boolean().describe(`
        * * Field Name: CanCreateRootPost
        * * Display Name: Can Create Root Post
        * * SQL Data Type: bit
        * * Default Value: 1`),
    CanReply: z.boolean().describe(`
        * * Field Name: CanReply
        * * Display Name: Can Reply
        * * SQL Data Type: bit
        * * Default Value: 1`),
    CanCoEditDocs: z.boolean().describe(`
        * * Field Name: CanCoEditDocs
        * * Display Name: Can Co Edit Docs
        * * SQL Data Type: bit
        * * Default Value: 0`),
    VoteWeightMultiplier: z.number().describe(`
        * * Field Name: VoteWeightMultiplier
        * * Display Name: Vote Weight Multiplier
        * * SQL Data Type: decimal(5, 2)
        * * Default Value: 1.00`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0`),
    IsActive: z.boolean().describe(`
        * * Field Name: IsActive
        * * Display Name: Is Active
        * * SQL Data Type: bit
        * * Default Value: 1`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumRoleTypeEntityType = z.infer<typeof mjBizAppsCommunityForumRoleTypeSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Subscriptions
 */
export const mjBizAppsCommunityForumSubscriptionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)`),
    ForumID: z.string().nullable().describe(`
        * * Field Name: ForumID
        * * Display Name: Forum ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    RootPostID: z.string().nullable().describe(`
        * * Field Name: RootPostID
        * * Display Name: Root Post ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)`),
    TopicTagID: z.string().nullable().describe(`
        * * Field Name: TopicTagID
        * * Display Name: Topic Tag ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)`),
    DeliveryLevel: z.union([z.literal('Digest Only'), z.literal('Every Post'), z.literal('First Post Only'), z.literal('Muted')]).describe(`
        * * Field Name: DeliveryLevel
        * * Display Name: Delivery Level
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Every Post
    * * Value List Type: List
    * * Possible Values 
    *   * Digest Only
    *   * Every Post
    *   * First Post Only
    *   * Muted`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    User: z.string().nullable().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
    Forum: z.string().nullable().describe(`
        * * Field Name: Forum
        * * Display Name: Forum
        * * SQL Data Type: nvarchar(200)`),
    TopicTag: z.string().nullable().describe(`
        * * Field Name: TopicTag
        * * Display Name: Topic Tag
        * * SQL Data Type: nvarchar(120)`),
});

export type mjBizAppsCommunityForumSubscriptionEntityType = z.infer<typeof mjBizAppsCommunityForumSubscriptionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Topic Tags
 */
export const mjBizAppsCommunityForumTopicTagSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SpaceID: z.string().describe(`
        * * Field Name: SpaceID
        * * Display Name: Space ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)`),
    ParentTagID: z.string().nullable().describe(`
        * * Field Name: ParentTagID
        * * Display Name: Parent Tag ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)`),
    TagID: z.string().nullable().describe(`
        * * Field Name: TagID
        * * Display Name: Tag ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Tags (vwTags.ID)`),
    Slug: z.string().describe(`
        * * Field Name: Slug
        * * Display Name: Slug
        * * SQL Data Type: nvarchar(100)`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(120)`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(500)`),
    ColorHex: z.string().nullable().describe(`
        * * Field Name: ColorHex
        * * Display Name: Color Hex
        * * SQL Data Type: nvarchar(20)`),
    IsOfficial: z.boolean().describe(`
        * * Field Name: IsOfficial
        * * Display Name: Is Official
        * * SQL Data Type: bit
        * * Default Value: 0`),
    PostCount: z.number().describe(`
        * * Field Name: PostCount
        * * Display Name: Post Count
        * * SQL Data Type: int
        * * Default Value: 0`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    ParentTag: z.string().nullable().describe(`
        * * Field Name: ParentTag
        * * Display Name: Parent Tag
        * * SQL Data Type: nvarchar(120)`),
    Tag: z.string().nullable().describe(`
        * * Field Name: Tag
        * * Display Name: Tag
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCommunityForumTopicTagEntityType = z.infer<typeof mjBizAppsCommunityForumTopicTagSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forum Types
 */
export const mjBizAppsCommunityForumTypeSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    Code: z.string().describe(`
        * * Field Name: Code
        * * Display Name: Code
        * * SQL Data Type: nvarchar(100)`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(100)`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)`),
    Icon: z.string().nullable().describe(`
        * * Field Name: Icon
        * * Display Name: Icon
        * * SQL Data Type: nvarchar(100)`),
    ServerDriverClass: z.string().nullable().describe(`
        * * Field Name: ServerDriverClass
        * * Display Name: Server Driver Class
        * * SQL Data Type: nvarchar(200)`),
    UIDriverClass: z.string().nullable().describe(`
        * * Field Name: UIDriverClass
        * * Display Name: UI Driver Class
        * * SQL Data Type: nvarchar(200)`),
    ExtensionEntity: z.string().nullable().describe(`
        * * Field Name: ExtensionEntity
        * * Display Name: Extension Entity
        * * SQL Data Type: nvarchar(255)`),
    Configuration: z.string().nullable().describe(`
        * * Field Name: Configuration
        * * Display Name: Configuration
        * * SQL Data Type: nvarchar(MAX)`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0`),
    IsActive: z.boolean().describe(`
        * * Field Name: IsActive
        * * Display Name: Is Active
        * * SQL Data Type: bit
        * * Default Value: 1`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityForumTypeEntityType = z.infer<typeof mjBizAppsCommunityForumTypeSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Forums
 */
export const mjBizAppsCommunityForumSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SpaceID: z.string().describe(`
        * * Field Name: SpaceID
        * * Display Name: Space ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)`),
    ParentForumID: z.string().nullable().describe(`
        * * Field Name: ParentForumID
        * * Display Name: Parent Forum ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)`),
    ForumTypeID: z.string().describe(`
        * * Field Name: ForumTypeID
        * * Display Name: Forum Type ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Types (vwForumTypes.ID)`),
    Slug: z.string().describe(`
        * * Field Name: Slug
        * * Display Name: Slug
        * * SQL Data Type: nvarchar(120)`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(200)`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)`),
    Icon: z.string().nullable().describe(`
        * * Field Name: Icon
        * * Display Name: Icon
        * * SQL Data Type: nvarchar(100)`),
    ColorHex: z.string().nullable().describe(`
        * * Field Name: ColorHex
        * * Display Name: Color Hex
        * * SQL Data Type: nvarchar(20)`),
    VisibilityBand: z.union([z.literal('PrivateForum'), z.literal('Shared'), z.literal('Team')]).describe(`
        * * Field Name: VisibilityBand
        * * Display Name: Visibility Band
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Shared
    * * Value List Type: List
    * * Possible Values 
    *   * PrivateForum
    *   * Shared
    *   * Team`),
    AnonymousReadMode: z.union([z.literal('Full Read'), z.literal('None'), z.literal('Teaser Only')]).nullable().describe(`
        * * Field Name: AnonymousReadMode
        * * Display Name: Anonymous Read Mode
        * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Full Read
    *   * None
    *   * Teaser Only`),
    InheritsSpaceMembers: z.boolean().describe(`
        * * Field Name: InheritsSpaceMembers
        * * Display Name: Inherits Space Members
        * * SQL Data Type: bit
        * * Default Value: 1`),
    PostingPolicy: z.union([z.literal('Moderated'), z.literal('Open'), z.literal('ReadOnly')]).describe(`
        * * Field Name: PostingPolicy
        * * Display Name: Posting Policy
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Open
    * * Value List Type: List
    * * Possible Values 
    *   * Moderated
    *   * Open
    *   * ReadOnly`),
    InboundEmailAlias: z.string().nullable().describe(`
        * * Field Name: InboundEmailAlias
        * * Display Name: Inbound Email Alias
        * * SQL Data Type: nvarchar(150)`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0`),
    Status: z.union([z.literal('Active'), z.literal('Archived'), z.literal('Locked')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Archived
    *   * Locked`),
    Configuration: z.string().nullable().describe(`
        * * Field Name: Configuration
        * * Display Name: Configuration
        * * SQL Data Type: nvarchar(MAX)`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    ParentForum: z.string().nullable().describe(`
        * * Field Name: ParentForum
        * * Display Name: Parent Forum
        * * SQL Data Type: nvarchar(200)`),
    ForumType: z.string().nullable().describe(`
        * * Field Name: ForumType
        * * Display Name: Forum Type
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCommunityForumEntityType = z.infer<typeof mjBizAppsCommunityForumSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Community: Post Types
 */
export const mjBizAppsCommunityPostTypeSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    Code: z.string().describe(`
        * * Field Name: Code
        * * Display Name: Code
        * * SQL Data Type: nvarchar(100)`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(100)`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)`),
    Icon: z.string().nullable().describe(`
        * * Field Name: Icon
        * * Display Name: Icon
        * * SQL Data Type: nvarchar(100)`),
    ServerDriverClass: z.string().nullable().describe(`
        * * Field Name: ServerDriverClass
        * * Display Name: Server Driver Class
        * * SQL Data Type: nvarchar(200)`),
    UIDriverClass: z.string().nullable().describe(`
        * * Field Name: UIDriverClass
        * * Display Name: UI Driver Class
        * * SQL Data Type: nvarchar(200)`),
    ExtensionEntity: z.string().nullable().describe(`
        * * Field Name: ExtensionEntity
        * * Display Name: Extension Entity
        * * SQL Data Type: nvarchar(255)`),
    PlacementRule: z.union([z.literal('Both'), z.literal('Reply Only'), z.literal('Root Only')]).describe(`
        * * Field Name: PlacementRule
        * * Display Name: Placement Rule
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Both
    * * Value List Type: List
    * * Possible Values 
    *   * Both
    *   * Reply Only
    *   * Root Only`),
    AllowsNestedReplies: z.boolean().describe(`
        * * Field Name: AllowsNestedReplies
        * * Display Name: Allows Nested Replies
        * * SQL Data Type: bit
        * * Default Value: 1`),
    TriggersThreadSynthesis: z.boolean().describe(`
        * * Field Name: TriggersThreadSynthesis
        * * Display Name: Triggers Thread Synthesis
        * * SQL Data Type: bit
        * * Default Value: 1`),
    IndexedInCorpus: z.boolean().describe(`
        * * Field Name: IndexedInCorpus
        * * Display Name: Indexed In Corpus
        * * SQL Data Type: bit
        * * Default Value: 1`),
    Configuration: z.string().nullable().describe(`
        * * Field Name: Configuration
        * * Display Name: Configuration
        * * SQL Data Type: nvarchar(MAX)`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0`),
    IsActive: z.boolean().describe(`
        * * Field Name: IsActive
        * * Display Name: Is Active
        * * SQL Data Type: bit
        * * Default Value: 1`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCommunityPostTypeEntityType = z.infer<typeof mjBizAppsCommunityPostTypeSchema>;
