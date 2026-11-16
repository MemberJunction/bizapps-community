import { BaseEntity, EntitySaveOptions, EntityDeleteOptions, CompositeKey, ValidationResult, ValidationErrorInfo, ValidationErrorType, Metadata, ProviderType, DatabaseProviderBase, RunView } from "@memberjunction/core";
import { RegisterClass } from "@memberjunction/global";
export * from '../schemas/__mj_BizAppsCommunity.js';
import type {
  mjBizAppsCommunityCommunityMemberProfileEntityType,
  mjBizAppsCommunityCommunitySpaceEntityType,
  mjBizAppsCommunityForumAMAPostEntityType,
  mjBizAppsCommunityForumAnswerPostEntityType,
  mjBizAppsCommunityForumArtifactPostEntityType,
  mjBizAppsCommunityForumCasePostEntityType,
  mjBizAppsCommunityForumFormPostEntityType,
  mjBizAppsCommunityForumIdeaAllocationEntityType,
  mjBizAppsCommunityForumIdeaCampaignEntityType,
  mjBizAppsCommunityForumIdeaPostEntityType,
  mjBizAppsCommunityForumInteractivePostEntityType,
  mjBizAppsCommunityForumInteractiveSessionEntityType,
  mjBizAppsCommunityForumMemberEntityType,
  mjBizAppsCommunityForumPostAttachmentEntityType,
  mjBizAppsCommunityForumPostFlagEntityType,
  mjBizAppsCommunityForumPostReactionEntityType,
  mjBizAppsCommunityForumPostTagEntityType,
  mjBizAppsCommunityForumPostEntityType,
  mjBizAppsCommunityForumQuestionPostEntityType,
  mjBizAppsCommunityForumRoleTypeEntityType,
  mjBizAppsCommunityForumSubscriptionEntityType,
  mjBizAppsCommunityForumTopicTagEntityType,
  mjBizAppsCommunityForumTypeEntityType,
  mjBizAppsCommunityForumEntityType,
  mjBizAppsCommunityPostTypeEntityType
} from '../schemas/__mj_BizAppsCommunity.js';

/**
 * MJ_BizApps_Community: Community Member Profiles - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: CommunityMemberProfile
 * * Base View: vwCommunityMemberProfiles
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Community Member Profiles')
export class mjBizAppsCommunityCommunityMemberProfileEntity extends BaseEntity<mjBizAppsCommunityCommunityMemberProfileEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Community Member Profiles record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Community Member Profiles record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityCommunityMemberProfileEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SpaceID
    * * Display Name: Space ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)
    */
    get SpaceID(): string {
        return this.Get('SpaceID');
    }
    set SpaceID(value: string) {
        this.Set('SpaceID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: PersonID
    * * Display Name: Person ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Common: People (vwPeople.ID)
    */
    get PersonID(): string | null {
        return this.Get('PersonID');
    }
    set PersonID(value: string | null) {
        this.Set('PersonID', value);
    }

    /**
    * * Field Name: BioMarkdown
    * * Display Name: Bio Markdown
    * * SQL Data Type: nvarchar(1000)
    */
    get BioMarkdown(): string | null {
        return this.Get('BioMarkdown');
    }
    set BioMarkdown(value: string | null) {
        this.Set('BioMarkdown', value);
    }

    /**
    * * Field Name: ExpertiseTagsJSON
    * * Display Name: Expertise Tags JSON
    * * SQL Data Type: nvarchar(MAX)
    */
    get ExpertiseTagsJSON(): string | null {
        return this.Get('ExpertiseTagsJSON');
    }
    set ExpertiseTagsJSON(value: string | null) {
        this.Set('ExpertiseTagsJSON', value);
    }

    /**
    * * Field Name: HelpfulAnswerCount
    * * Display Name: Helpful Answer Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get HelpfulAnswerCount(): number {
        return this.Get('HelpfulAnswerCount');
    }
    set HelpfulAnswerCount(value: number) {
        this.Set('HelpfulAnswerCount', value);
    }

    /**
    * * Field Name: AcceptedAnswerCount
    * * Display Name: Accepted Answer Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get AcceptedAnswerCount(): number {
        return this.Get('AcceptedAnswerCount');
    }
    set AcceptedAnswerCount(value: number) {
        this.Set('AcceptedAnswerCount', value);
    }

    /**
    * * Field Name: ReputationScore
    * * Display Name: Reputation Score
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get ReputationScore(): number {
        return this.Get('ReputationScore');
    }
    set ReputationScore(value: number) {
        this.Set('ReputationScore', value);
    }

    /**
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
    *   * Weekly Digest
    */
    get DigestCadence(): 'Daily Digest' | 'Every Post' | 'Highlights Only' | 'Muted' | 'Weekly Digest' {
        return this.Get('DigestCadence');
    }
    set DigestCadence(value: 'Daily Digest' | 'Every Post' | 'Highlights Only' | 'Muted' | 'Weekly Digest') {
        this.Set('DigestCadence', value);
    }

    /**
    * * Field Name: OpenToPeerMentoring
    * * Display Name: Open To Peer Mentoring
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get OpenToPeerMentoring(): boolean {
        return this.Get('OpenToPeerMentoring');
    }
    set OpenToPeerMentoring(value: boolean) {
        this.Set('OpenToPeerMentoring', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }

    /**
    * * Field Name: Person
    * * Display Name: Person
    * * SQL Data Type: nvarchar(250)
    */
    get Person(): string | null {
        return this.Get('Person');
    }
}


/**
 * MJ_BizApps_Community: Community Spaces - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: CommunitySpace
 * * Base View: vwCommunitySpaces
 * * @description IsA subtype of Collaboration Space representing an online community hub with forums, Ask-First AI deflection, and digest settings.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Community Spaces')
export class mjBizAppsCommunityCommunitySpaceEntity extends BaseEntity<mjBizAppsCommunityCommunitySpaceEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Community Spaces record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Community Spaces record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityCommunitySpaceEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Spaces (vwSpaces.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: Slug
    * * Display Name: Slug
    * * SQL Data Type: nvarchar(120)
    */
    get Slug(): string {
        return this.Get('Slug');
    }
    set Slug(value: string) {
        this.Set('Slug', value);
    }

    /**
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
    *   * Working Group
    */
    get CommunityKind(): 'Association Wide' | 'Other' | 'Product Community' | 'Special Interest Group' | 'Working Group' {
        return this.Get('CommunityKind');
    }
    set CommunityKind(value: 'Association Wide' | 'Other' | 'Product Community' | 'Special Interest Group' | 'Working Group') {
        this.Set('CommunityKind', value);
    }

    /**
    * * Field Name: CommunityKindDetails
    * * Display Name: Community Kind Details
    * * SQL Data Type: nvarchar(200)
    */
    get CommunityKindDetails(): string | null {
        return this.Get('CommunityKindDetails');
    }
    set CommunityKindDetails(value: string | null) {
        this.Set('CommunityKindDetails', value);
    }

    /**
    * * Field Name: AnonymousReadMode
    * * Display Name: Anonymous Read Mode
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Teaser Only
    * * Value List Type: List
    * * Possible Values 
    *   * Full Read
    *   * None
    *   * Teaser Only
    */
    get AnonymousReadMode(): 'Full Read' | 'None' | 'Teaser Only' {
        return this.Get('AnonymousReadMode');
    }
    set AnonymousReadMode(value: 'Full Read' | 'None' | 'Teaser Only') {
        this.Set('AnonymousReadMode', value);
    }

    /**
    * * Field Name: AskFirstEnabled
    * * Display Name: Ask First Enabled
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get AskFirstEnabled(): boolean {
        return this.Get('AskFirstEnabled');
    }
    set AskFirstEnabled(value: boolean) {
        this.Set('AskFirstEnabled', value);
    }

    /**
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
    *   * Weekly Digest
    */
    get DefaultDigestCadence(): 'Daily Digest' | 'Every Post' | 'Highlights Only' | 'Muted' | 'Weekly Digest' {
        return this.Get('DefaultDigestCadence');
    }
    set DefaultDigestCadence(value: 'Daily Digest' | 'Every Post' | 'Highlights Only' | 'Muted' | 'Weekly Digest') {
        this.Set('DefaultDigestCadence', value);
    }

    /**
    * * Field Name: BannerImageURL
    * * Display Name: Banner Image URL
    * * SQL Data Type: nvarchar(500)
    */
    get BannerImageURL(): string | null {
        return this.Get('BannerImageURL');
    }
    set BannerImageURL(value: string | null) {
        this.Set('BannerImageURL', value);
    }

    /**
    * * Field Name: WelcomeMarkdown
    * * Display Name: Welcome Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get WelcomeMarkdown(): string | null {
        return this.Get('WelcomeMarkdown');
    }
    set WelcomeMarkdown(value: string | null) {
        this.Set('WelcomeMarkdown', value);
    }

    /**
    * * Field Name: DefaultForumID
    * * Display Name: Default Forum ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get DefaultForumID(): string | null {
        return this.Get('DefaultForumID');
    }
    set DefaultForumID(value: string | null) {
        this.Set('DefaultForumID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: DefaultForum
    * * Display Name: Default Forum
    * * SQL Data Type: nvarchar(200)
    */
    get DefaultForum(): string | null {
        return this.Get('DefaultForum');
    }
}


/**
 * MJ_BizApps_Community: Forum AMA Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumAMAPost
 * * Base View: vwForumAMAPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum AMA Posts')
export class mjBizAppsCommunityForumAMAPostEntity extends BaseEntity<mjBizAppsCommunityForumAMAPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum AMA Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum AMA Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumAMAPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: HostUserID
    * * Display Name: Host User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get HostUserID(): string {
        return this.Get('HostUserID');
    }
    set HostUserID(value: string) {
        this.Set('HostUserID', value);
    }

    /**
    * * Field Name: ScheduledStartAt
    * * Display Name: Scheduled Start At
    * * SQL Data Type: datetimeoffset
    */
    get ScheduledStartAt(): Date {
        return this.Get('ScheduledStartAt');
    }
    set ScheduledStartAt(value: Date) {
        this.Set('ScheduledStartAt', value);
    }

    /**
    * * Field Name: ScheduledEndAt
    * * Display Name: Scheduled End At
    * * SQL Data Type: datetimeoffset
    */
    get ScheduledEndAt(): Date {
        return this.Get('ScheduledEndAt');
    }
    set ScheduledEndAt(value: Date) {
        this.Set('ScheduledEndAt', value);
    }

    /**
    * * Field Name: QuestionsOpenAt
    * * Display Name: Questions Open At
    * * SQL Data Type: datetimeoffset
    */
    get QuestionsOpenAt(): Date {
        return this.Get('QuestionsOpenAt');
    }
    set QuestionsOpenAt(value: Date) {
        this.Set('QuestionsOpenAt', value);
    }

    /**
    * * Field Name: IsLiveNow
    * * Display Name: Is Live Now
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsLiveNow(): boolean {
        return this.Get('IsLiveNow');
    }
    set IsLiveNow(value: boolean) {
        this.Set('IsLiveNow', value);
    }

    /**
    * * Field Name: RecordingURL
    * * Display Name: Recording URL
    * * SQL Data Type: nvarchar(500)
    */
    get RecordingURL(): string | null {
        return this.Get('RecordingURL');
    }
    set RecordingURL(value: string | null) {
        this.Set('RecordingURL', value);
    }

    /**
    * * Field Name: RecapMarkdown
    * * Display Name: Recap Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get RecapMarkdown(): string | null {
        return this.Get('RecapMarkdown');
    }
    set RecapMarkdown(value: string | null) {
        this.Set('RecapMarkdown', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: HostUser
    * * Display Name: Host User
    * * SQL Data Type: nvarchar(100)
    */
    get HostUser(): string | null {
        return this.Get('HostUser');
    }
}


/**
 * MJ_BizApps_Community: Forum Answer Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumAnswerPost
 * * Base View: vwForumAnswerPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Answer Posts')
export class mjBizAppsCommunityForumAnswerPostEntity extends BaseEntity<mjBizAppsCommunityForumAnswerPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Answer Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Answer Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumAnswerPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: QuestionPostID
    * * Display Name: Question Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Question Posts (vwForumQuestionPosts.ID)
    */
    get QuestionPostID(): string {
        return this.Get('QuestionPostID');
    }
    set QuestionPostID(value: string) {
        this.Set('QuestionPostID', value);
    }

    /**
    * * Field Name: IsAcceptedByAuthor
    * * Display Name: Is Accepted By Author
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsAcceptedByAuthor(): boolean {
        return this.Get('IsAcceptedByAuthor');
    }
    set IsAcceptedByAuthor(value: boolean) {
        this.Set('IsAcceptedByAuthor', value);
    }

    /**
    * * Field Name: IsVerifiedByModerator
    * * Display Name: Is Verified By Moderator
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsVerifiedByModerator(): boolean {
        return this.Get('IsVerifiedByModerator');
    }
    set IsVerifiedByModerator(value: boolean) {
        this.Set('IsVerifiedByModerator', value);
    }

    /**
    * * Field Name: VerifiedByUserID
    * * Display Name: Verified By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get VerifiedByUserID(): string | null {
        return this.Get('VerifiedByUserID');
    }
    set VerifiedByUserID(value: string | null) {
        this.Set('VerifiedByUserID', value);
    }

    /**
    * * Field Name: VerifiedAt
    * * Display Name: Verified At
    * * SQL Data Type: datetimeoffset
    */
    get VerifiedAt(): Date | null {
        return this.Get('VerifiedAt');
    }
    set VerifiedAt(value: Date | null) {
        this.Set('VerifiedAt', value);
    }

    /**
    * * Field Name: AIEpistemicStatus
    * * Display Name: AI Epistemic Status
    * * SQL Data Type: nvarchar(40)
    * * Value List Type: List
    * * Possible Values 
    *   * Canon Verified
    *   * Conflicts With Canon
    *   * Novel Insight
    *   * Partially Outdated
    */
    get AIEpistemicStatus(): 'Canon Verified' | 'Conflicts With Canon' | 'Novel Insight' | 'Partially Outdated' | null {
        return this.Get('AIEpistemicStatus');
    }
    set AIEpistemicStatus(value: 'Canon Verified' | 'Conflicts With Canon' | 'Novel Insight' | 'Partially Outdated' | null) {
        this.Set('AIEpistemicStatus', value);
    }

    /**
    * * Field Name: AIConfidenceScore
    * * Display Name: AI Confidence Score
    * * SQL Data Type: decimal(4, 3)
    */
    get AIConfidenceScore(): number | null {
        return this.Get('AIConfidenceScore');
    }
    set AIConfidenceScore(value: number | null) {
        this.Set('AIConfidenceScore', value);
    }

    /**
    * * Field Name: AIRationaleMarkdown
    * * Display Name: AI Rationale Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get AIRationaleMarkdown(): string | null {
        return this.Get('AIRationaleMarkdown');
    }
    set AIRationaleMarkdown(value: string | null) {
        this.Set('AIRationaleMarkdown', value);
    }

    /**
    * * Field Name: FreshnessReviewDueAt
    * * Display Name: Freshness Review Due At
    * * SQL Data Type: datetimeoffset
    */
    get FreshnessReviewDueAt(): Date | null {
        return this.Get('FreshnessReviewDueAt');
    }
    set FreshnessReviewDueAt(value: Date | null) {
        this.Set('FreshnessReviewDueAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: VerifiedByUser
    * * Display Name: Verified By User
    * * SQL Data Type: nvarchar(100)
    */
    get VerifiedByUser(): string | null {
        return this.Get('VerifiedByUser');
    }
}


/**
 * MJ_BizApps_Community: Forum Artifact Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumArtifactPost
 * * Base View: vwForumArtifactPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Artifact Posts')
export class mjBizAppsCommunityForumArtifactPostEntity extends BaseEntity<mjBizAppsCommunityForumArtifactPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Artifact Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Artifact Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumArtifactPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ArtifactID
    * * Display Name: Artifact ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Artifacts (vwArtifacts.ID)
    */
    get ArtifactID(): string {
        return this.Get('ArtifactID');
    }
    set ArtifactID(value: string) {
        this.Set('ArtifactID', value);
    }

    /**
    * * Field Name: PinnedArtifactVersionID
    * * Display Name: Pinned Artifact Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)
    */
    get PinnedArtifactVersionID(): string | null {
        return this.Get('PinnedArtifactVersionID');
    }
    set PinnedArtifactVersionID(value: string | null) {
        this.Set('PinnedArtifactVersionID', value);
    }

    /**
    * * Field Name: SpaceItemID
    * * Display Name: Space Item ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)
    */
    get SpaceItemID(): string {
        return this.Get('SpaceItemID');
    }
    set SpaceItemID(value: string) {
        this.Set('SpaceItemID', value);
    }

    /**
    * * Field Name: ArtifactModality
    * * Display Name: Artifact Modality
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Document
    * * Value List Type: List
    * * Possible Values 
    *   * Document
    *   * Presentation
    *   * Spreadsheet
    */
    get ArtifactModality(): 'Document' | 'Presentation' | 'Spreadsheet' {
        return this.Get('ArtifactModality');
    }
    set ArtifactModality(value: 'Document' | 'Presentation' | 'Spreadsheet') {
        this.Set('ArtifactModality', value);
    }

    /**
    * * Field Name: CollaborationMode
    * * Display Name: Collaboration Mode
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Suggest
    * * Value List Type: List
    * * Possible Values 
    *   * Comment Only
    *   * Edit
    *   * Suggest
    */
    get CollaborationMode(): 'Comment Only' | 'Edit' | 'Suggest' {
        return this.Get('CollaborationMode');
    }
    set CollaborationMode(value: 'Comment Only' | 'Edit' | 'Suggest') {
        this.Set('CollaborationMode', value);
    }

    /**
    * * Field Name: ShowInlinePreview
    * * Display Name: Show Inline Preview
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get ShowInlinePreview(): boolean {
        return this.Get('ShowInlinePreview');
    }
    set ShowInlinePreview(value: boolean) {
        this.Set('ShowInlinePreview', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Artifact
    * * Display Name: Artifact
    * * SQL Data Type: nvarchar(255)
    */
    get Artifact(): string | null {
        return this.Get('Artifact');
    }

    /**
    * * Field Name: PinnedArtifactVersion
    * * Display Name: Pinned Artifact Version
    * * SQL Data Type: nvarchar(255)
    */
    get PinnedArtifactVersion(): string | null {
        return this.Get('PinnedArtifactVersion');
    }
}


/**
 * MJ_BizApps_Community: Forum Case Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumCasePost
 * * Base View: vwForumCasePosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Case Posts')
export class mjBizAppsCommunityForumCasePostEntity extends BaseEntity<mjBizAppsCommunityForumCasePostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Case Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Case Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumCasePostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SituationMarkdown
    * * Display Name: Situation Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get SituationMarkdown(): string {
        return this.Get('SituationMarkdown');
    }
    set SituationMarkdown(value: string) {
        this.Set('SituationMarkdown', value);
    }

    /**
    * * Field Name: ActionTakenMarkdown
    * * Display Name: Action Taken Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get ActionTakenMarkdown(): string {
        return this.Get('ActionTakenMarkdown');
    }
    set ActionTakenMarkdown(value: string) {
        this.Set('ActionTakenMarkdown', value);
    }

    /**
    * * Field Name: OutcomeMarkdown
    * * Display Name: Outcome Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get OutcomeMarkdown(): string | null {
        return this.Get('OutcomeMarkdown');
    }
    set OutcomeMarkdown(value: string | null) {
        this.Set('OutcomeMarkdown', value);
    }

    /**
    * * Field Name: IsAnonymized
    * * Display Name: Is Anonymized
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsAnonymized(): boolean {
        return this.Get('IsAnonymized');
    }
    set IsAnonymized(value: boolean) {
        this.Set('IsAnonymized', value);
    }

    /**
    * * Field Name: AnonymizedAuthorAlias
    * * Display Name: Anonymized Author Alias
    * * SQL Data Type: nvarchar(100)
    */
    get AnonymizedAuthorAlias(): string | null {
        return this.Get('AnonymizedAuthorAlias');
    }
    set AnonymizedAuthorAlias(value: string | null) {
        this.Set('AnonymizedAuthorAlias', value);
    }

    /**
    * * Field Name: RedactionConfirmedByUserID
    * * Display Name: Redaction Confirmed By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get RedactionConfirmedByUserID(): string | null {
        return this.Get('RedactionConfirmedByUserID');
    }
    set RedactionConfirmedByUserID(value: string | null) {
        this.Set('RedactionConfirmedByUserID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: RedactionConfirmedByUser
    * * Display Name: Redaction Confirmed By User
    * * SQL Data Type: nvarchar(100)
    */
    get RedactionConfirmedByUser(): string | null {
        return this.Get('RedactionConfirmedByUser');
    }
}


/**
 * MJ_BizApps_Community: Forum Form Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumFormPost
 * * Base View: vwForumFormPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Form Posts')
export class mjBizAppsCommunityForumFormPostEntity extends BaseEntity<mjBizAppsCommunityForumFormPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Form Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Form Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumFormPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: FormID
    * * Display Name: Form ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Forms: Forms (vwForms.ID)
    */
    get FormID(): string {
        return this.Get('FormID');
    }
    set FormID(value: string) {
        this.Set('FormID', value);
    }

    /**
    * * Field Name: FormDistributionID
    * * Display Name: Form Distribution ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Forms: Form Distributions (vwFormDistributions.ID)
    */
    get FormDistributionID(): string | null {
        return this.Get('FormDistributionID');
    }
    set FormDistributionID(value: string | null) {
        this.Set('FormDistributionID', value);
    }

    /**
    * * Field Name: ShowLiveResultsInline
    * * Display Name: Show Live Results Inline
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get ShowLiveResultsInline(): boolean {
        return this.Get('ShowLiveResultsInline');
    }
    set ShowLiveResultsInline(value: boolean) {
        this.Set('ShowLiveResultsInline', value);
    }

    /**
    * * Field Name: RequirePostReplyOnSubmit
    * * Display Name: Require Post Reply On Submit
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get RequirePostReplyOnSubmit(): boolean {
        return this.Get('RequirePostReplyOnSubmit');
    }
    set RequirePostReplyOnSubmit(value: boolean) {
        this.Set('RequirePostReplyOnSubmit', value);
    }

    /**
    * * Field Name: ClosesAt
    * * Display Name: Closes At
    * * SQL Data Type: datetimeoffset
    */
    get ClosesAt(): Date | null {
        return this.Get('ClosesAt');
    }
    set ClosesAt(value: Date | null) {
        this.Set('ClosesAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Form
    * * Display Name: Form
    * * SQL Data Type: nvarchar(255)
    */
    get Form(): string | null {
        return this.Get('Form');
    }

    /**
    * * Field Name: FormDistribution
    * * Display Name: Form Distribution
    * * SQL Data Type: nvarchar(255)
    */
    get FormDistribution(): string | null {
        return this.Get('FormDistribution');
    }
}


/**
 * MJ_BizApps_Community: Forum Idea Allocations - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumIdeaAllocation
 * * Base View: vwForumIdeaAllocations
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Idea Allocations')
export class mjBizAppsCommunityForumIdeaAllocationEntity extends BaseEntity<mjBizAppsCommunityForumIdeaAllocationEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Idea Allocations record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Idea Allocations record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumIdeaAllocationEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: IdeaPostID
    * * Display Name: Idea Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Idea Posts (vwForumIdeaPosts.ID)
    */
    get IdeaPostID(): string {
        return this.Get('IdeaPostID');
    }
    set IdeaPostID(value: string) {
        this.Set('IdeaPostID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: PointsAllocated
    * * Display Name: Points Allocated
    * * SQL Data Type: int
    */
    get PointsAllocated(): number {
        return this.Get('PointsAllocated');
    }
    set PointsAllocated(value: number) {
        this.Set('PointsAllocated', value);
    }

    /**
    * * Field Name: QuadraticVotes
    * * Display Name: Quadratic Votes
    * * SQL Data Type: decimal(10, 2)
    */
    get QuadraticVotes(): number {
        return this.Get('QuadraticVotes');
    }
    set QuadraticVotes(value: number) {
        this.Set('QuadraticVotes', value);
    }

    /**
    * * Field Name: RationaleComment
    * * Display Name: Rationale Comment
    * * SQL Data Type: nvarchar(500)
    */
    get RationaleComment(): string | null {
        return this.Get('RationaleComment');
    }
    set RationaleComment(value: string | null) {
        this.Set('RationaleComment', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }
}


/**
 * MJ_BizApps_Community: Forum Idea Campaigns - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumIdeaCampaign
 * * Base View: vwForumIdeaCampaigns
 * * @description IsA subtype of Forum configuring 100-Point Wallet or Quadratic Voting parameters for an ideation campaign.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Idea Campaigns')
export class mjBizAppsCommunityForumIdeaCampaignEntity extends BaseEntity<mjBizAppsCommunityForumIdeaCampaignEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Idea Campaigns record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Idea Campaigns record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumIdeaCampaignEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: DefaultBudgetPoints
    * * Display Name: Default Budget Points
    * * SQL Data Type: int
    * * Default Value: 100
    */
    get DefaultBudgetPoints(): number {
        return this.Get('DefaultBudgetPoints');
    }
    set DefaultBudgetPoints(value: number) {
        this.Set('DefaultBudgetPoints', value);
    }

    /**
    * * Field Name: AllocationMode
    * * Display Name: Allocation Mode
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Point Allocation
    * * Value List Type: List
    * * Possible Values 
    *   * Point Allocation
    *   * Quadratic
    */
    get AllocationMode(): 'Point Allocation' | 'Quadratic' {
        return this.Get('AllocationMode');
    }
    set AllocationMode(value: 'Point Allocation' | 'Quadratic') {
        this.Set('AllocationMode', value);
    }

    /**
    * * Field Name: MaxPointsPerIdea
    * * Display Name: Max Points Per Idea
    * * SQL Data Type: int
    */
    get MaxPointsPerIdea(): number | null {
        return this.Get('MaxPointsPerIdea');
    }
    set MaxPointsPerIdea(value: number | null) {
        this.Set('MaxPointsPerIdea', value);
    }

    /**
    * * Field Name: SubmissionsCloseAt
    * * Display Name: Submissions Close At
    * * SQL Data Type: datetimeoffset
    */
    get SubmissionsCloseAt(): Date | null {
        return this.Get('SubmissionsCloseAt');
    }
    set SubmissionsCloseAt(value: Date | null) {
        this.Set('SubmissionsCloseAt', value);
    }

    /**
    * * Field Name: VotingClosesAt
    * * Display Name: Voting Closes At
    * * SQL Data Type: datetimeoffset
    */
    get VotingClosesAt(): Date | null {
        return this.Get('VotingClosesAt');
    }
    set VotingClosesAt(value: Date | null) {
        this.Set('VotingClosesAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forum Idea Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumIdeaPost
 * * Base View: vwForumIdeaPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Idea Posts')
export class mjBizAppsCommunityForumIdeaPostEntity extends BaseEntity<mjBizAppsCommunityForumIdeaPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Idea Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Idea Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumIdeaPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
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
    *   * Under Consideration
    */
    get IdeaStatus(): 'Declined' | 'In Progress' | 'Planned' | 'Shipped' | 'Under Consideration' {
        return this.Get('IdeaStatus');
    }
    set IdeaStatus(value: 'Declined' | 'In Progress' | 'Planned' | 'Shipped' | 'Under Consideration') {
        this.Set('IdeaStatus', value);
    }

    /**
    * * Field Name: TotalPointsAllocated
    * * Display Name: Total Points Allocated
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get TotalPointsAllocated(): number {
        return this.Get('TotalPointsAllocated');
    }
    set TotalPointsAllocated(value: number) {
        this.Set('TotalPointsAllocated', value);
    }

    /**
    * * Field Name: EffectiveQuadraticVotes
    * * Display Name: Effective Quadratic Votes
    * * SQL Data Type: decimal(10, 2)
    * * Default Value: 0
    */
    get EffectiveQuadraticVotes(): number {
        return this.Get('EffectiveQuadraticVotes');
    }
    set EffectiveQuadraticVotes(value: number) {
        this.Set('EffectiveQuadraticVotes', value);
    }

    /**
    * * Field Name: UniqueBackerCount
    * * Display Name: Unique Backer Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get UniqueBackerCount(): number {
        return this.Get('UniqueBackerCount');
    }
    set UniqueBackerCount(value: number) {
        this.Set('UniqueBackerCount', value);
    }

    /**
    * * Field Name: TargetReleaseOrQuarter
    * * Display Name: Target Release Or Quarter
    * * SQL Data Type: nvarchar(50)
    */
    get TargetReleaseOrQuarter(): string | null {
        return this.Get('TargetReleaseOrQuarter');
    }
    set TargetReleaseOrQuarter(value: string | null) {
        this.Set('TargetReleaseOrQuarter', value);
    }

    /**
    * * Field Name: StatusRationaleMarkdown
    * * Display Name: Status Rationale Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get StatusRationaleMarkdown(): string | null {
        return this.Get('StatusRationaleMarkdown');
    }
    set StatusRationaleMarkdown(value: string | null) {
        this.Set('StatusRationaleMarkdown', value);
    }

    /**
    * * Field Name: MergedIntoIdeaPostID
    * * Display Name: Merged Into Idea Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Idea Posts (vwForumIdeaPosts.ID)
    */
    get MergedIntoIdeaPostID(): string | null {
        return this.Get('MergedIntoIdeaPostID');
    }
    set MergedIntoIdeaPostID(value: string | null) {
        this.Set('MergedIntoIdeaPostID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forum Interactive Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumInteractivePost
 * * Base View: vwForumInteractivePosts
 * * @description IsA subtype of ForumPost for sandboxed interactive mini-apps, calculators, quizzes, and simulations backed by MJ Component Artifacts.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Interactive Posts')
export class mjBizAppsCommunityForumInteractivePostEntity extends BaseEntity<mjBizAppsCommunityForumInteractivePostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Interactive Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Interactive Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumInteractivePostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ComponentArtifactID
    * * Display Name: Component Artifact ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Artifacts (vwArtifacts.ID)
    */
    get ComponentArtifactID(): string {
        return this.Get('ComponentArtifactID');
    }
    set ComponentArtifactID(value: string) {
        this.Set('ComponentArtifactID', value);
    }

    /**
    * * Field Name: PinnedArtifactVersionID
    * * Display Name: Pinned Artifact Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)
    */
    get PinnedArtifactVersionID(): string | null {
        return this.Get('PinnedArtifactVersionID');
    }
    set PinnedArtifactVersionID(value: string | null) {
        this.Set('PinnedArtifactVersionID', value);
    }

    /**
    * * Field Name: SpaceItemID
    * * Display Name: Space Item ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)
    */
    get SpaceItemID(): string | null {
        return this.Get('SpaceItemID');
    }
    set SpaceItemID(value: string | null) {
        this.Set('SpaceItemID', value);
    }

    /**
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
    *   * Trivia
    */
    get ExperienceKind(): 'Calculator' | 'Flashcards' | 'Other' | 'Poll Game' | 'Quiz' | 'Simulation' | 'Trivia' {
        return this.Get('ExperienceKind');
    }
    set ExperienceKind(value: 'Calculator' | 'Flashcards' | 'Other' | 'Poll Game' | 'Quiz' | 'Simulation' | 'Trivia') {
        this.Set('ExperienceKind', value);
    }

    /**
    * * Field Name: ExperienceKindDetails
    * * Display Name: Experience Kind Details
    * * SQL Data Type: nvarchar(200)
    */
    get ExperienceKindDetails(): string | null {
        return this.Get('ExperienceKindDetails');
    }
    set ExperienceKindDetails(value: string | null) {
        this.Set('ExperienceKindDetails', value);
    }

    /**
    * * Field Name: PromptUsed
    * * Display Name: Prompt Used
    * * SQL Data Type: nvarchar(MAX)
    */
    get PromptUsed(): string | null {
        return this.Get('PromptUsed');
    }
    set PromptUsed(value: string | null) {
        this.Set('PromptUsed', value);
    }

    /**
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
    *   * Streak
    */
    get ScoringMode(): 'Best Score' | 'Completion' | 'Fastest Time' | 'None' | 'Streak' {
        return this.Get('ScoringMode');
    }
    set ScoringMode(value: 'Best Score' | 'Completion' | 'Fastest Time' | 'None' | 'Streak') {
        this.Set('ScoringMode', value);
    }

    /**
    * * Field Name: ShowLeaderboard
    * * Display Name: Show Leaderboard
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get ShowLeaderboard(): boolean {
        return this.Get('ShowLeaderboard');
    }
    set ShowLeaderboard(value: boolean) {
        this.Set('ShowLeaderboard', value);
    }

    /**
    * * Field Name: MaxAttemptsPerMember
    * * Display Name: Max Attempts Per Member
    * * SQL Data Type: int
    */
    get MaxAttemptsPerMember(): number | null {
        return this.Get('MaxAttemptsPerMember');
    }
    set MaxAttemptsPerMember(value: number | null) {
        this.Set('MaxAttemptsPerMember', value);
    }

    /**
    * * Field Name: PlayCount
    * * Display Name: Play Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get PlayCount(): number {
        return this.Get('PlayCount');
    }
    set PlayCount(value: number) {
        this.Set('PlayCount', value);
    }

    /**
    * * Field Name: ExpiresAt
    * * Display Name: Expires At
    * * SQL Data Type: datetimeoffset
    */
    get ExpiresAt(): Date | null {
        return this.Get('ExpiresAt');
    }
    set ExpiresAt(value: Date | null) {
        this.Set('ExpiresAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: ComponentArtifact
    * * Display Name: Component Artifact
    * * SQL Data Type: nvarchar(255)
    */
    get ComponentArtifact(): string | null {
        return this.Get('ComponentArtifact');
    }

    /**
    * * Field Name: PinnedArtifactVersion
    * * Display Name: Pinned Artifact Version
    * * SQL Data Type: nvarchar(255)
    */
    get PinnedArtifactVersion(): string | null {
        return this.Get('PinnedArtifactVersion');
    }
}


/**
 * MJ_BizApps_Community: Forum Interactive Sessions - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumInteractiveSession
 * * Base View: vwForumInteractiveSessions
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Interactive Sessions')
export class mjBizAppsCommunityForumInteractiveSessionEntity extends BaseEntity<mjBizAppsCommunityForumInteractiveSessionEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Interactive Sessions record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Interactive Sessions record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumInteractiveSessionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: InteractivePostID
    * * Display Name: Interactive Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Interactive Posts (vwForumInteractivePosts.ID)
    */
    get InteractivePostID(): string {
        return this.Get('InteractivePostID');
    }
    set InteractivePostID(value: string) {
        this.Set('InteractivePostID', value);
    }

    /**
    * * Field Name: ArtifactVersionID
    * * Display Name: Artifact Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Artifact Versions (vwArtifactVersions.ID)
    */
    get ArtifactVersionID(): string {
        return this.Get('ArtifactVersionID');
    }
    set ArtifactVersionID(value: string) {
        this.Set('ArtifactVersionID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: AttemptNumber
    * * Display Name: Attempt Number
    * * SQL Data Type: int
    * * Default Value: 1
    */
    get AttemptNumber(): number {
        return this.Get('AttemptNumber');
    }
    set AttemptNumber(value: number) {
        this.Set('AttemptNumber', value);
    }

    /**
    * * Field Name: Score
    * * Display Name: Score
    * * SQL Data Type: decimal(12, 2)
    */
    get Score(): number | null {
        return this.Get('Score');
    }
    set Score(value: number | null) {
        this.Set('Score', value);
    }

    /**
    * * Field Name: DurationSeconds
    * * Display Name: Duration Seconds
    * * SQL Data Type: int
    */
    get DurationSeconds(): number | null {
        return this.Get('DurationSeconds');
    }
    set DurationSeconds(value: number | null) {
        this.Set('DurationSeconds', value);
    }

    /**
    * * Field Name: Completed
    * * Display Name: Completed
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get Completed(): boolean {
        return this.Get('Completed');
    }
    set Completed(value: boolean) {
        this.Set('Completed', value);
    }

    /**
    * * Field Name: OutcomeSummary
    * * Display Name: Outcome Summary
    * * SQL Data Type: nvarchar(300)
    */
    get OutcomeSummary(): string | null {
        return this.Get('OutcomeSummary');
    }
    set OutcomeSummary(value: string | null) {
        this.Set('OutcomeSummary', value);
    }

    /**
    * * Field Name: SessionStateJSON
    * * Display Name: Session State JSON
    * * SQL Data Type: nvarchar(MAX)
    */
    get SessionStateJSON(): string | null {
        return this.Get('SessionStateJSON');
    }
    set SessionStateJSON(value: string | null) {
        this.Set('SessionStateJSON', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: ArtifactVersion
    * * Display Name: Artifact Version
    * * SQL Data Type: nvarchar(255)
    */
    get ArtifactVersion(): string | null {
        return this.Get('ArtifactVersion');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }
}


/**
 * MJ_BizApps_Community: Forum Members - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumMember
 * * Base View: vwForumMembers
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Members')
export class mjBizAppsCommunityForumMemberEntity extends BaseEntity<mjBizAppsCommunityForumMemberEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Members record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Members record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumMemberEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ForumID
    * * Display Name: Forum ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get ForumID(): string {
        return this.Get('ForumID');
    }
    set ForumID(value: string) {
        this.Set('ForumID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: ForumRoleTypeID
    * * Display Name: Forum Role Type ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Role Types (vwForumRoleTypes.ID)
    */
    get ForumRoleTypeID(): string {
        return this.Get('ForumRoleTypeID');
    }
    set ForumRoleTypeID(value: string) {
        this.Set('ForumRoleTypeID', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Invited
    *   * Muted
    *   * Removed
    */
    get Status(): 'Active' | 'Invited' | 'Muted' | 'Removed' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Invited' | 'Muted' | 'Removed') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Forum
    * * Display Name: Forum
    * * SQL Data Type: nvarchar(200)
    */
    get Forum(): string | null {
        return this.Get('Forum');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }

    /**
    * * Field Name: ForumRoleType
    * * Display Name: Forum Role Type
    * * SQL Data Type: nvarchar(100)
    */
    get ForumRoleType(): string | null {
        return this.Get('ForumRoleType');
    }
}


/**
 * MJ_BizApps_Community: Forum Post Attachments - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumPostAttachment
 * * Base View: vwForumPostAttachments
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Post Attachments')
export class mjBizAppsCommunityForumPostAttachmentEntity extends BaseEntity<mjBizAppsCommunityForumPostAttachmentEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Post Attachments record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Post Attachments record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumPostAttachmentEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: PostID
    * * Display Name: Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get PostID(): string {
        return this.Get('PostID');
    }
    set PostID(value: string) {
        this.Set('PostID', value);
    }

    /**
    * * Field Name: SpaceItemID
    * * Display Name: Space Item ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Space Items (vwSpaceItems.ID)
    */
    get SpaceItemID(): string {
        return this.Get('SpaceItemID');
    }
    set SpaceItemID(value: string) {
        this.Set('SpaceItemID', value);
    }

    /**
    * * Field Name: Caption
    * * Display Name: Caption
    * * SQL Data Type: nvarchar(300)
    */
    get Caption(): string | null {
        return this.Get('Caption');
    }
    set Caption(value: string | null) {
        this.Set('Caption', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forum Post Flags - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumPostFlag
 * * Base View: vwForumPostFlags
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Post Flags')
export class mjBizAppsCommunityForumPostFlagEntity extends BaseEntity<mjBizAppsCommunityForumPostFlagEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Post Flags record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Post Flags record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumPostFlagEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: PostID
    * * Display Name: Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get PostID(): string {
        return this.Get('PostID');
    }
    set PostID(value: string) {
        this.Set('PostID', value);
    }

    /**
    * * Field Name: ReportedByUserID
    * * Display Name: Reported By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get ReportedByUserID(): string | null {
        return this.Get('ReportedByUserID');
    }
    set ReportedByUserID(value: string | null) {
        this.Set('ReportedByUserID', value);
    }

    /**
    * * Field Name: ReportedByAgentID
    * * Display Name: Reported By Agent ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: AI Agents (vwAIAgents.ID)
    */
    get ReportedByAgentID(): string | null {
        return this.Get('ReportedByAgentID');
    }
    set ReportedByAgentID(value: string | null) {
        this.Set('ReportedByAgentID', value);
    }

    /**
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
    *   * Spam
    */
    get ReasonCategory(): 'Harassment' | 'Needs Redaction' | 'Off Topic' | 'Other' | 'Outdated Advice' | 'Spam' {
        return this.Get('ReasonCategory');
    }
    set ReasonCategory(value: 'Harassment' | 'Needs Redaction' | 'Off Topic' | 'Other' | 'Outdated Advice' | 'Spam') {
        this.Set('ReasonCategory', value);
    }

    /**
    * * Field Name: ReasonDetails
    * * Display Name: Reason Details
    * * SQL Data Type: nvarchar(1000)
    */
    get ReasonDetails(): string | null {
        return this.Get('ReasonDetails');
    }
    set ReasonDetails(value: string | null) {
        this.Set('ReasonDetails', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Open
    * * Value List Type: List
    * * Possible Values 
    *   * ActionTaken
    *   * Dismissed
    *   * Open
    */
    get Status(): 'ActionTaken' | 'Dismissed' | 'Open' {
        return this.Get('Status');
    }
    set Status(value: 'ActionTaken' | 'Dismissed' | 'Open') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: ResolvedByUserID
    * * Display Name: Resolved By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get ResolvedByUserID(): string | null {
        return this.Get('ResolvedByUserID');
    }
    set ResolvedByUserID(value: string | null) {
        this.Set('ResolvedByUserID', value);
    }

    /**
    * * Field Name: ResolvedAt
    * * Display Name: Resolved At
    * * SQL Data Type: datetimeoffset
    */
    get ResolvedAt(): Date | null {
        return this.Get('ResolvedAt');
    }
    set ResolvedAt(value: Date | null) {
        this.Set('ResolvedAt', value);
    }

    /**
    * * Field Name: ResolutionOutcome
    * * Display Name: Resolution Outcome
    * * SQL Data Type: nvarchar(40)
    * * Value List Type: List
    * * Possible Values 
    *   * Author Muted
    *   * Dismissed
    *   * Edited
    *   * Hidden
    *   * Redacted
    */
    get ResolutionOutcome(): 'Author Muted' | 'Dismissed' | 'Edited' | 'Hidden' | 'Redacted' | null {
        return this.Get('ResolutionOutcome');
    }
    set ResolutionOutcome(value: 'Author Muted' | 'Dismissed' | 'Edited' | 'Hidden' | 'Redacted' | null) {
        this.Set('ResolutionOutcome', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: ReportedByUser
    * * Display Name: Reported By User
    * * SQL Data Type: nvarchar(100)
    */
    get ReportedByUser(): string | null {
        return this.Get('ReportedByUser');
    }

    /**
    * * Field Name: ReportedByAgent
    * * Display Name: Reported By Agent
    * * SQL Data Type: nvarchar(255)
    */
    get ReportedByAgent(): string | null {
        return this.Get('ReportedByAgent');
    }

    /**
    * * Field Name: ResolvedByUser
    * * Display Name: Resolved By User
    * * SQL Data Type: nvarchar(100)
    */
    get ResolvedByUser(): string | null {
        return this.Get('ResolvedByUser');
    }
}


/**
 * MJ_BizApps_Community: Forum Post Reactions - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumPostReaction
 * * Base View: vwForumPostReactions
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Post Reactions')
export class mjBizAppsCommunityForumPostReactionEntity extends BaseEntity<mjBizAppsCommunityForumPostReactionEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Post Reactions record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Post Reactions record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumPostReactionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: PostID
    * * Display Name: Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get PostID(): string {
        return this.Get('PostID');
    }
    set PostID(value: string) {
        this.Set('PostID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
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
    *   * Upvote
    */
    get ReactionKind(): 'Agree' | 'Celebrate' | 'Curious' | 'Helpful' | 'Insightful' | 'Upvote' {
        return this.Get('ReactionKind');
    }
    set ReactionKind(value: 'Agree' | 'Celebrate' | 'Curious' | 'Helpful' | 'Insightful' | 'Upvote') {
        this.Set('ReactionKind', value);
    }

    /**
    * * Field Name: Weight
    * * Display Name: Weight
    * * SQL Data Type: decimal(5, 2)
    * * Default Value: 1.00
    */
    get Weight(): number {
        return this.Get('Weight');
    }
    set Weight(value: number) {
        this.Set('Weight', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }
}


/**
 * MJ_BizApps_Community: Forum Post Tags - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumPostTag
 * * Base View: vwForumPostTags
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Post Tags')
export class mjBizAppsCommunityForumPostTagEntity extends BaseEntity<mjBizAppsCommunityForumPostTagEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Post Tags record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Post Tags record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumPostTagEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: PostID
    * * Display Name: Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get PostID(): string {
        return this.Get('PostID');
    }
    set PostID(value: string) {
        this.Set('PostID', value);
    }

    /**
    * * Field Name: TopicTagID
    * * Display Name: Topic Tag ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)
    */
    get TopicTagID(): string {
        return this.Get('TopicTagID');
    }
    set TopicTagID(value: string) {
        this.Set('TopicTagID', value);
    }

    /**
    * * Field Name: AssignedByAI
    * * Display Name: Assigned By AI
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get AssignedByAI(): boolean {
        return this.Get('AssignedByAI');
    }
    set AssignedByAI(value: boolean) {
        this.Set('AssignedByAI', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: TopicTag
    * * Display Name: Topic Tag
    * * SQL Data Type: nvarchar(120)
    */
    get TopicTag(): string | null {
        return this.Get('TopicTag');
    }
}


/**
 * MJ_BizApps_Community: Forum Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumPost
 * * Base View: vwForumPosts
 * * @description Unified parent entity for all root threads and nested replies across every forum type.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Posts')
export class mjBizAppsCommunityForumPostEntity extends BaseEntity<mjBizAppsCommunityForumPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ForumID
    * * Display Name: Forum ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get ForumID(): string {
        return this.Get('ForumID');
    }
    set ForumID(value: string) {
        this.Set('ForumID', value);
    }

    /**
    * * Field Name: PostTypeID
    * * Display Name: Post Type ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Post Types (vwPostTypes.ID)
    */
    get PostTypeID(): string {
        return this.Get('PostTypeID');
    }
    set PostTypeID(value: string) {
        this.Set('PostTypeID', value);
    }

    /**
    * * Field Name: RootPostID
    * * Display Name: Root Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get RootPostID(): string | null {
        return this.Get('RootPostID');
    }
    set RootPostID(value: string | null) {
        this.Set('RootPostID', value);
    }

    /**
    * * Field Name: ParentPostID
    * * Display Name: Parent Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ParentPostID(): string | null {
        return this.Get('ParentPostID');
    }
    set ParentPostID(value: string | null) {
        this.Set('ParentPostID', value);
    }

    /**
    * * Field Name: ReplyDepth
    * * Display Name: Reply Depth
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get ReplyDepth(): number {
        return this.Get('ReplyDepth');
    }
    set ReplyDepth(value: number) {
        this.Set('ReplyDepth', value);
    }

    /**
    * * Field Name: AuthorUserID
    * * Display Name: Author User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get AuthorUserID(): string | null {
        return this.Get('AuthorUserID');
    }
    set AuthorUserID(value: string | null) {
        this.Set('AuthorUserID', value);
    }

    /**
    * * Field Name: AuthorPersonID
    * * Display Name: Author Person ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Common: People (vwPeople.ID)
    */
    get AuthorPersonID(): string | null {
        return this.Get('AuthorPersonID');
    }
    set AuthorPersonID(value: string | null) {
        this.Set('AuthorPersonID', value);
    }

    /**
    * * Field Name: AuthorAgentID
    * * Display Name: Author Agent ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: AI Agents (vwAIAgents.ID)
    */
    get AuthorAgentID(): string | null {
        return this.Get('AuthorAgentID');
    }
    set AuthorAgentID(value: string | null) {
        this.Set('AuthorAgentID', value);
    }

    /**
    * * Field Name: Title
    * * Display Name: Title
    * * SQL Data Type: nvarchar(300)
    */
    get Title(): string | null {
        return this.Get('Title');
    }
    set Title(value: string | null) {
        this.Set('Title', value);
    }

    /**
    * * Field Name: Slug
    * * Display Name: Slug
    * * SQL Data Type: nvarchar(320)
    */
    get Slug(): string | null {
        return this.Get('Slug');
    }
    set Slug(value: string | null) {
        this.Set('Slug', value);
    }

    /**
    * * Field Name: BodyMarkdown
    * * Display Name: Body Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get BodyMarkdown(): string {
        return this.Get('BodyMarkdown');
    }
    set BodyMarkdown(value: string) {
        this.Set('BodyMarkdown', value);
    }

    /**
    * * Field Name: SummaryMarkdown
    * * Display Name: Summary Markdown
    * * SQL Data Type: nvarchar(MAX)
    */
    get SummaryMarkdown(): string | null {
        return this.Get('SummaryMarkdown');
    }
    set SummaryMarkdown(value: string | null) {
        this.Set('SummaryMarkdown', value);
    }

    /**
    * * Field Name: SummaryGeneratedAt
    * * Display Name: Summary Generated At
    * * SQL Data Type: datetimeoffset
    */
    get SummaryGeneratedAt(): Date | null {
        return this.Get('SummaryGeneratedAt');
    }
    set SummaryGeneratedAt(value: Date | null) {
        this.Set('SummaryGeneratedAt', value);
    }

    /**
    * * Field Name: SummaryReplyWatermark
    * * Display Name: Summary Reply Watermark
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get SummaryReplyWatermark(): number {
        return this.Get('SummaryReplyWatermark');
    }
    set SummaryReplyWatermark(value: number) {
        this.Set('SummaryReplyWatermark', value);
    }

    /**
    * * Field Name: VisibilityBand
    * * Display Name: Visibility Band
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Shared
    * * Value List Type: List
    * * Possible Values 
    *   * Shared
    *   * Team
    */
    get VisibilityBand(): 'Shared' | 'Team' {
        return this.Get('VisibilityBand');
    }
    set VisibilityBand(value: 'Shared' | 'Team') {
        this.Set('VisibilityBand', value);
    }

    /**
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
    *   * Resolved
    */
    get Status(): 'Answered' | 'Archived' | 'Draft' | 'PendingModeration' | 'Published' | 'Redacted' | 'Resolved' {
        return this.Get('Status');
    }
    set Status(value: 'Answered' | 'Archived' | 'Draft' | 'PendingModeration' | 'Published' | 'Redacted' | 'Resolved') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: IsPinned
    * * Display Name: Is Pinned
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsPinned(): boolean {
        return this.Get('IsPinned');
    }
    set IsPinned(value: boolean) {
        this.Set('IsPinned', value);
    }

    /**
    * * Field Name: IsLocked
    * * Display Name: Is Locked
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsLocked(): boolean {
        return this.Get('IsLocked');
    }
    set IsLocked(value: boolean) {
        this.Set('IsLocked', value);
    }

    /**
    * * Field Name: IsFeatured
    * * Display Name: Is Featured
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsFeatured(): boolean {
        return this.Get('IsFeatured');
    }
    set IsFeatured(value: boolean) {
        this.Set('IsFeatured', value);
    }

    /**
    * * Field Name: ReplyCount
    * * Display Name: Reply Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get ReplyCount(): number {
        return this.Get('ReplyCount');
    }
    set ReplyCount(value: number) {
        this.Set('ReplyCount', value);
    }

    /**
    * * Field Name: ParticipantCount
    * * Display Name: Participant Count
    * * SQL Data Type: int
    * * Default Value: 1
    */
    get ParticipantCount(): number {
        return this.Get('ParticipantCount');
    }
    set ParticipantCount(value: number) {
        this.Set('ParticipantCount', value);
    }

    /**
    * * Field Name: ReactionScore
    * * Display Name: Reaction Score
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get ReactionScore(): number {
        return this.Get('ReactionScore');
    }
    set ReactionScore(value: number) {
        this.Set('ReactionScore', value);
    }

    /**
    * * Field Name: ViewCount
    * * Display Name: View Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get ViewCount(): number {
        return this.Get('ViewCount');
    }
    set ViewCount(value: number) {
        this.Set('ViewCount', value);
    }

    /**
    * * Field Name: LastActivityAt
    * * Display Name: Last Activity At
    * * SQL Data Type: datetimeoffset
    * * Default Value: sysdatetimeoffset()
    */
    get LastActivityAt(): Date {
        return this.Get('LastActivityAt');
    }
    set LastActivityAt(value: Date) {
        this.Set('LastActivityAt', value);
    }

    /**
    * * Field Name: PromotedToSpaceID
    * * Display Name: Promoted To Space ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Collaboration: Spaces (vwSpaces.ID)
    */
    get PromotedToSpaceID(): string | null {
        return this.Get('PromotedToSpaceID');
    }
    set PromotedToSpaceID(value: string | null) {
        this.Set('PromotedToSpaceID', value);
    }

    /**
    * * Field Name: LinkedTaskID
    * * Display Name: Linked Task ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Tasks: Tasks (vwTasks.ID)
    */
    get LinkedTaskID(): string | null {
        return this.Get('LinkedTaskID');
    }
    set LinkedTaskID(value: string | null) {
        this.Set('LinkedTaskID', value);
    }

    /**
    * * Field Name: LinkedEntityID
    * * Display Name: Linked Entity ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)
    */
    get LinkedEntityID(): string | null {
        return this.Get('LinkedEntityID');
    }
    set LinkedEntityID(value: string | null) {
        this.Set('LinkedEntityID', value);
    }

    /**
    * * Field Name: LinkedRecordID
    * * Display Name: Linked Record ID
    * * SQL Data Type: nvarchar(450)
    */
    get LinkedRecordID(): string | null {
        return this.Get('LinkedRecordID');
    }
    set LinkedRecordID(value: string | null) {
        this.Set('LinkedRecordID', value);
    }

    /**
    * * Field Name: ConversationID
    * * Display Name: Conversation ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Conversations (vwConversations.ID)
    */
    get ConversationID(): string | null {
        return this.Get('ConversationID');
    }
    set ConversationID(value: string | null) {
        this.Set('ConversationID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Forum
    * * Display Name: Forum
    * * SQL Data Type: nvarchar(200)
    */
    get Forum(): string | null {
        return this.Get('Forum');
    }

    /**
    * * Field Name: PostType
    * * Display Name: Post Type
    * * SQL Data Type: nvarchar(100)
    */
    get PostType(): string | null {
        return this.Get('PostType');
    }

    /**
    * * Field Name: AuthorUser
    * * Display Name: Author User
    * * SQL Data Type: nvarchar(100)
    */
    get AuthorUser(): string | null {
        return this.Get('AuthorUser');
    }

    /**
    * * Field Name: AuthorPerson
    * * Display Name: Author Person
    * * SQL Data Type: nvarchar(250)
    */
    get AuthorPerson(): string | null {
        return this.Get('AuthorPerson');
    }

    /**
    * * Field Name: AuthorAgent
    * * Display Name: Author Agent
    * * SQL Data Type: nvarchar(255)
    */
    get AuthorAgent(): string | null {
        return this.Get('AuthorAgent');
    }

    /**
    * * Field Name: PromotedToSpace
    * * Display Name: Promoted To Space
    * * SQL Data Type: nvarchar(200)
    */
    get PromotedToSpace(): string | null {
        return this.Get('PromotedToSpace');
    }

    /**
    * * Field Name: LinkedTask
    * * Display Name: Linked Task
    * * SQL Data Type: nvarchar(255)
    */
    get LinkedTask(): string | null {
        return this.Get('LinkedTask');
    }

    /**
    * * Field Name: LinkedEntity
    * * Display Name: Linked Entity
    * * SQL Data Type: nvarchar(255)
    */
    get LinkedEntity(): string | null {
        return this.Get('LinkedEntity');
    }

    /**
    * * Field Name: Conversation
    * * Display Name: Conversation
    * * SQL Data Type: nvarchar(255)
    */
    get Conversation(): string | null {
        return this.Get('Conversation');
    }
}


/**
 * MJ_BizApps_Community: Forum Question Posts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumQuestionPost
 * * Base View: vwForumQuestionPosts
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Question Posts')
export class mjBizAppsCommunityForumQuestionPostEntity extends BaseEntity<mjBizAppsCommunityForumQuestionPostEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Question Posts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Question Posts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumQuestionPostEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: AcceptedAnswerPostID
    * * Display Name: Accepted Answer Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get AcceptedAnswerPostID(): string | null {
        return this.Get('AcceptedAnswerPostID');
    }
    set AcceptedAnswerPostID(value: string | null) {
        this.Set('AcceptedAnswerPostID', value);
    }

    /**
    * * Field Name: AICanonAnswerPostID
    * * Display Name: AI Canon Answer Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get AICanonAnswerPostID(): string | null {
        return this.Get('AICanonAnswerPostID');
    }
    set AICanonAnswerPostID(value: string | null) {
        this.Set('AICanonAnswerPostID', value);
    }

    /**
    * * Field Name: BountyPoints
    * * Display Name: Bounty Points
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get BountyPoints(): number {
        return this.Get('BountyPoints');
    }
    set BountyPoints(value: number) {
        this.Set('BountyPoints', value);
    }

    /**
    * * Field Name: ResolvedAt
    * * Display Name: Resolved At
    * * SQL Data Type: datetimeoffset
    */
    get ResolvedAt(): Date | null {
        return this.Get('ResolvedAt');
    }
    set ResolvedAt(value: Date | null) {
        this.Set('ResolvedAt', value);
    }

    /**
    * * Field Name: DeflectionCount
    * * Display Name: Deflection Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get DeflectionCount(): number {
        return this.Get('DeflectionCount');
    }
    set DeflectionCount(value: number) {
        this.Set('DeflectionCount', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forum Role Types - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumRoleType
 * * Base View: vwForumRoleTypes
 * * @description Metadata registry of forum role types and capability flags for posting, moderation, canon verification, co-editing, and space graduation.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Role Types')
export class mjBizAppsCommunityForumRoleTypeEntity extends BaseEntity<mjBizAppsCommunityForumRoleTypeEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Role Types record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Role Types record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumRoleTypeEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: Code
    * * Display Name: Code
    * * SQL Data Type: nvarchar(100)
    */
    get Code(): string {
        return this.Get('Code');
    }
    set Code(value: string) {
        this.Set('Code', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(100)
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Level
    * * Display Name: Level
    * * SQL Data Type: int
    * * Default Value: 100
    */
    get Level(): number {
        return this.Get('Level');
    }
    set Level(value: number) {
        this.Set('Level', value);
    }

    /**
    * * Field Name: CanConfigureForum
    * * Display Name: Can Configure Forum
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanConfigureForum(): boolean {
        return this.Get('CanConfigureForum');
    }
    set CanConfigureForum(value: boolean) {
        this.Set('CanConfigureForum', value);
    }

    /**
    * * Field Name: CanModerateQueue
    * * Display Name: Can Moderate Queue
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanModerateQueue(): boolean {
        return this.Get('CanModerateQueue');
    }
    set CanModerateQueue(value: boolean) {
        this.Set('CanModerateQueue', value);
    }

    /**
    * * Field Name: CanPinOrLock
    * * Display Name: Can Pin Or Lock
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanPinOrLock(): boolean {
        return this.Get('CanPinOrLock');
    }
    set CanPinOrLock(value: boolean) {
        this.Set('CanPinOrLock', value);
    }

    /**
    * * Field Name: CanAcceptAnswers
    * * Display Name: Can Accept Answers
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanAcceptAnswers(): boolean {
        return this.Get('CanAcceptAnswers');
    }
    set CanAcceptAnswers(value: boolean) {
        this.Set('CanAcceptAnswers', value);
    }

    /**
    * * Field Name: CanVerifyCanon
    * * Display Name: Can Verify Canon
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanVerifyCanon(): boolean {
        return this.Get('CanVerifyCanon');
    }
    set CanVerifyCanon(value: boolean) {
        this.Set('CanVerifyCanon', value);
    }

    /**
    * * Field Name: CanPromoteToSpace
    * * Display Name: Can Promote To Space
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanPromoteToSpace(): boolean {
        return this.Get('CanPromoteToSpace');
    }
    set CanPromoteToSpace(value: boolean) {
        this.Set('CanPromoteToSpace', value);
    }

    /**
    * * Field Name: CanCreateRootPost
    * * Display Name: Can Create Root Post
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get CanCreateRootPost(): boolean {
        return this.Get('CanCreateRootPost');
    }
    set CanCreateRootPost(value: boolean) {
        this.Set('CanCreateRootPost', value);
    }

    /**
    * * Field Name: CanReply
    * * Display Name: Can Reply
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get CanReply(): boolean {
        return this.Get('CanReply');
    }
    set CanReply(value: boolean) {
        this.Set('CanReply', value);
    }

    /**
    * * Field Name: CanCoEditDocs
    * * Display Name: Can Co Edit Docs
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get CanCoEditDocs(): boolean {
        return this.Get('CanCoEditDocs');
    }
    set CanCoEditDocs(value: boolean) {
        this.Set('CanCoEditDocs', value);
    }

    /**
    * * Field Name: VoteWeightMultiplier
    * * Display Name: Vote Weight Multiplier
    * * SQL Data Type: decimal(5, 2)
    * * Default Value: 1.00
    */
    get VoteWeightMultiplier(): number {
        return this.Get('VoteWeightMultiplier');
    }
    set VoteWeightMultiplier(value: number) {
        this.Set('VoteWeightMultiplier', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: IsActive
    * * Display Name: Is Active
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get IsActive(): boolean {
        return this.Get('IsActive');
    }
    set IsActive(value: boolean) {
        this.Set('IsActive', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forum Subscriptions - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumSubscription
 * * Base View: vwForumSubscriptions
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Subscriptions')
export class mjBizAppsCommunityForumSubscriptionEntity extends BaseEntity<mjBizAppsCommunityForumSubscriptionEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Subscriptions record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Subscriptions record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumSubscriptionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: ForumID
    * * Display Name: Forum ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get ForumID(): string | null {
        return this.Get('ForumID');
    }
    set ForumID(value: string | null) {
        this.Set('ForumID', value);
    }

    /**
    * * Field Name: RootPostID
    * * Display Name: Root Post ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Posts (vwForumPosts.ID)
    */
    get RootPostID(): string | null {
        return this.Get('RootPostID');
    }
    set RootPostID(value: string | null) {
        this.Set('RootPostID', value);
    }

    /**
    * * Field Name: TopicTagID
    * * Display Name: Topic Tag ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)
    */
    get TopicTagID(): string | null {
        return this.Get('TopicTagID');
    }
    set TopicTagID(value: string | null) {
        this.Set('TopicTagID', value);
    }

    /**
    * * Field Name: DeliveryLevel
    * * Display Name: Delivery Level
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Every Post
    * * Value List Type: List
    * * Possible Values 
    *   * Digest Only
    *   * Every Post
    *   * First Post Only
    *   * Muted
    */
    get DeliveryLevel(): 'Digest Only' | 'Every Post' | 'First Post Only' | 'Muted' {
        return this.Get('DeliveryLevel');
    }
    set DeliveryLevel(value: 'Digest Only' | 'Every Post' | 'First Post Only' | 'Muted') {
        this.Set('DeliveryLevel', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string | null {
        return this.Get('User');
    }

    /**
    * * Field Name: Forum
    * * Display Name: Forum
    * * SQL Data Type: nvarchar(200)
    */
    get Forum(): string | null {
        return this.Get('Forum');
    }

    /**
    * * Field Name: TopicTag
    * * Display Name: Topic Tag
    * * SQL Data Type: nvarchar(120)
    */
    get TopicTag(): string | null {
        return this.Get('TopicTag');
    }
}


/**
 * MJ_BizApps_Community: Forum Topic Tags - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumTopicTag
 * * Base View: vwForumTopicTags
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Topic Tags')
export class mjBizAppsCommunityForumTopicTagEntity extends BaseEntity<mjBizAppsCommunityForumTopicTagEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Topic Tags record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Topic Tags record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumTopicTagEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SpaceID
    * * Display Name: Space ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)
    */
    get SpaceID(): string {
        return this.Get('SpaceID');
    }
    set SpaceID(value: string) {
        this.Set('SpaceID', value);
    }

    /**
    * * Field Name: ParentTagID
    * * Display Name: Parent Tag ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Topic Tags (vwForumTopicTags.ID)
    */
    get ParentTagID(): string | null {
        return this.Get('ParentTagID');
    }
    set ParentTagID(value: string | null) {
        this.Set('ParentTagID', value);
    }

    /**
    * * Field Name: TagID
    * * Display Name: Tag ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Tags (vwTags.ID)
    */
    get TagID(): string | null {
        return this.Get('TagID');
    }
    set TagID(value: string | null) {
        this.Set('TagID', value);
    }

    /**
    * * Field Name: Slug
    * * Display Name: Slug
    * * SQL Data Type: nvarchar(100)
    */
    get Slug(): string {
        return this.Get('Slug');
    }
    set Slug(value: string) {
        this.Set('Slug', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(120)
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(500)
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: ColorHex
    * * Display Name: Color Hex
    * * SQL Data Type: nvarchar(20)
    */
    get ColorHex(): string | null {
        return this.Get('ColorHex');
    }
    set ColorHex(value: string | null) {
        this.Set('ColorHex', value);
    }

    /**
    * * Field Name: IsOfficial
    * * Display Name: Is Official
    * * SQL Data Type: bit
    * * Default Value: 0
    */
    get IsOfficial(): boolean {
        return this.Get('IsOfficial');
    }
    set IsOfficial(value: boolean) {
        this.Set('IsOfficial', value);
    }

    /**
    * * Field Name: PostCount
    * * Display Name: Post Count
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get PostCount(): number {
        return this.Get('PostCount');
    }
    set PostCount(value: number) {
        this.Set('PostCount', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: ParentTag
    * * Display Name: Parent Tag
    * * SQL Data Type: nvarchar(120)
    */
    get ParentTag(): string | null {
        return this.Get('ParentTag');
    }

    /**
    * * Field Name: Tag
    * * Display Name: Tag
    * * SQL Data Type: nvarchar(255)
    */
    get Tag(): string | null {
        return this.Get('Tag');
    }
}


/**
 * MJ_BizApps_Community: Forum Types - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: ForumType
 * * Base View: vwForumTypes
 * * @description Metadata registry of forum types, binding each forum archetype to optional server/UI drivers and IsA extension entities.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forum Types')
export class mjBizAppsCommunityForumTypeEntity extends BaseEntity<mjBizAppsCommunityForumTypeEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forum Types record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forum Types record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumTypeEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: Code
    * * Display Name: Code
    * * SQL Data Type: nvarchar(100)
    */
    get Code(): string {
        return this.Get('Code');
    }
    set Code(value: string) {
        this.Set('Code', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(100)
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Icon
    * * Display Name: Icon
    * * SQL Data Type: nvarchar(100)
    */
    get Icon(): string | null {
        return this.Get('Icon');
    }
    set Icon(value: string | null) {
        this.Set('Icon', value);
    }

    /**
    * * Field Name: ServerDriverClass
    * * Display Name: Server Driver Class
    * * SQL Data Type: nvarchar(200)
    */
    get ServerDriverClass(): string | null {
        return this.Get('ServerDriverClass');
    }
    set ServerDriverClass(value: string | null) {
        this.Set('ServerDriverClass', value);
    }

    /**
    * * Field Name: UIDriverClass
    * * Display Name: UI Driver Class
    * * SQL Data Type: nvarchar(200)
    */
    get UIDriverClass(): string | null {
        return this.Get('UIDriverClass');
    }
    set UIDriverClass(value: string | null) {
        this.Set('UIDriverClass', value);
    }

    /**
    * * Field Name: ExtensionEntity
    * * Display Name: Extension Entity
    * * SQL Data Type: nvarchar(255)
    */
    get ExtensionEntity(): string | null {
        return this.Get('ExtensionEntity');
    }
    set ExtensionEntity(value: string | null) {
        this.Set('ExtensionEntity', value);
    }

    /**
    * * Field Name: Configuration
    * * Display Name: Configuration
    * * SQL Data Type: nvarchar(MAX)
    */
    get Configuration(): string | null {
        return this.Get('Configuration');
    }
    set Configuration(value: string | null) {
        this.Set('Configuration', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: IsActive
    * * Display Name: Is Active
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get IsActive(): boolean {
        return this.Get('IsActive');
    }
    set IsActive(value: boolean) {
        this.Set('IsActive', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Community: Forums - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: Forum
 * * Base View: vwForums
 * * @description Discussion, Q&A, ideation, document co-authoring, case review, or live event channels inside a Community Space.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Forums')
export class mjBizAppsCommunityForumEntity extends BaseEntity<mjBizAppsCommunityForumEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Forums record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Forums record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityForumEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SpaceID
    * * Display Name: Space ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Community Spaces (vwCommunitySpaces.ID)
    */
    get SpaceID(): string {
        return this.Get('SpaceID');
    }
    set SpaceID(value: string) {
        this.Set('SpaceID', value);
    }

    /**
    * * Field Name: ParentForumID
    * * Display Name: Parent Forum ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forums (vwForums.ID)
    */
    get ParentForumID(): string | null {
        return this.Get('ParentForumID');
    }
    set ParentForumID(value: string | null) {
        this.Set('ParentForumID', value);
    }

    /**
    * * Field Name: ForumTypeID
    * * Display Name: Forum Type ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Community: Forum Types (vwForumTypes.ID)
    */
    get ForumTypeID(): string {
        return this.Get('ForumTypeID');
    }
    set ForumTypeID(value: string) {
        this.Set('ForumTypeID', value);
    }

    /**
    * * Field Name: Slug
    * * Display Name: Slug
    * * SQL Data Type: nvarchar(120)
    */
    get Slug(): string {
        return this.Get('Slug');
    }
    set Slug(value: string) {
        this.Set('Slug', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(200)
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Icon
    * * Display Name: Icon
    * * SQL Data Type: nvarchar(100)
    */
    get Icon(): string | null {
        return this.Get('Icon');
    }
    set Icon(value: string | null) {
        this.Set('Icon', value);
    }

    /**
    * * Field Name: ColorHex
    * * Display Name: Color Hex
    * * SQL Data Type: nvarchar(20)
    */
    get ColorHex(): string | null {
        return this.Get('ColorHex');
    }
    set ColorHex(value: string | null) {
        this.Set('ColorHex', value);
    }

    /**
    * * Field Name: VisibilityBand
    * * Display Name: Visibility Band
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Shared
    * * Value List Type: List
    * * Possible Values 
    *   * PrivateForum
    *   * Shared
    *   * Team
    */
    get VisibilityBand(): 'PrivateForum' | 'Shared' | 'Team' {
        return this.Get('VisibilityBand');
    }
    set VisibilityBand(value: 'PrivateForum' | 'Shared' | 'Team') {
        this.Set('VisibilityBand', value);
    }

    /**
    * * Field Name: AnonymousReadMode
    * * Display Name: Anonymous Read Mode
    * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Full Read
    *   * None
    *   * Teaser Only
    */
    get AnonymousReadMode(): 'Full Read' | 'None' | 'Teaser Only' | null {
        return this.Get('AnonymousReadMode');
    }
    set AnonymousReadMode(value: 'Full Read' | 'None' | 'Teaser Only' | null) {
        this.Set('AnonymousReadMode', value);
    }

    /**
    * * Field Name: InheritsSpaceMembers
    * * Display Name: Inherits Space Members
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get InheritsSpaceMembers(): boolean {
        return this.Get('InheritsSpaceMembers');
    }
    set InheritsSpaceMembers(value: boolean) {
        this.Set('InheritsSpaceMembers', value);
    }

    /**
    * * Field Name: PostingPolicy
    * * Display Name: Posting Policy
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Open
    * * Value List Type: List
    * * Possible Values 
    *   * Moderated
    *   * Open
    *   * ReadOnly
    */
    get PostingPolicy(): 'Moderated' | 'Open' | 'ReadOnly' {
        return this.Get('PostingPolicy');
    }
    set PostingPolicy(value: 'Moderated' | 'Open' | 'ReadOnly') {
        this.Set('PostingPolicy', value);
    }

    /**
    * * Field Name: InboundEmailAlias
    * * Display Name: Inbound Email Alias
    * * SQL Data Type: nvarchar(150)
    */
    get InboundEmailAlias(): string | null {
        return this.Get('InboundEmailAlias');
    }
    set InboundEmailAlias(value: string | null) {
        this.Set('InboundEmailAlias', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Archived
    *   * Locked
    */
    get Status(): 'Active' | 'Archived' | 'Locked' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Archived' | 'Locked') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: Configuration
    * * Display Name: Configuration
    * * SQL Data Type: nvarchar(MAX)
    */
    get Configuration(): string | null {
        return this.Get('Configuration');
    }
    set Configuration(value: string | null) {
        this.Set('Configuration', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: ParentForum
    * * Display Name: Parent Forum
    * * SQL Data Type: nvarchar(200)
    */
    get ParentForum(): string | null {
        return this.Get('ParentForum');
    }

    /**
    * * Field Name: ForumType
    * * Display Name: Forum Type
    * * SQL Data Type: nvarchar(100)
    */
    get ForumType(): string | null {
        return this.Get('ForumType');
    }
}


/**
 * MJ_BizApps_Community: Post Types - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCommunity
 * * Base Table: PostType
 * * Base View: vwPostTypes
 * * @description Metadata registry of post types, binding each post archetype to optional server/UI drivers, placement rules, and IsA extension entities.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Community: Post Types')
export class mjBizAppsCommunityPostTypeEntity extends BaseEntity<mjBizAppsCommunityPostTypeEntityType> {
    /**
    * Loads the MJ_BizApps_Community: Post Types record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Community: Post Types record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCommunityPostTypeEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: Code
    * * Display Name: Code
    * * SQL Data Type: nvarchar(100)
    */
    get Code(): string {
        return this.Get('Code');
    }
    set Code(value: string) {
        this.Set('Code', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(100)
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Icon
    * * Display Name: Icon
    * * SQL Data Type: nvarchar(100)
    */
    get Icon(): string | null {
        return this.Get('Icon');
    }
    set Icon(value: string | null) {
        this.Set('Icon', value);
    }

    /**
    * * Field Name: ServerDriverClass
    * * Display Name: Server Driver Class
    * * SQL Data Type: nvarchar(200)
    */
    get ServerDriverClass(): string | null {
        return this.Get('ServerDriverClass');
    }
    set ServerDriverClass(value: string | null) {
        this.Set('ServerDriverClass', value);
    }

    /**
    * * Field Name: UIDriverClass
    * * Display Name: UI Driver Class
    * * SQL Data Type: nvarchar(200)
    */
    get UIDriverClass(): string | null {
        return this.Get('UIDriverClass');
    }
    set UIDriverClass(value: string | null) {
        this.Set('UIDriverClass', value);
    }

    /**
    * * Field Name: ExtensionEntity
    * * Display Name: Extension Entity
    * * SQL Data Type: nvarchar(255)
    */
    get ExtensionEntity(): string | null {
        return this.Get('ExtensionEntity');
    }
    set ExtensionEntity(value: string | null) {
        this.Set('ExtensionEntity', value);
    }

    /**
    * * Field Name: PlacementRule
    * * Display Name: Placement Rule
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Both
    * * Value List Type: List
    * * Possible Values 
    *   * Both
    *   * Reply Only
    *   * Root Only
    */
    get PlacementRule(): 'Both' | 'Reply Only' | 'Root Only' {
        return this.Get('PlacementRule');
    }
    set PlacementRule(value: 'Both' | 'Reply Only' | 'Root Only') {
        this.Set('PlacementRule', value);
    }

    /**
    * * Field Name: AllowsNestedReplies
    * * Display Name: Allows Nested Replies
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get AllowsNestedReplies(): boolean {
        return this.Get('AllowsNestedReplies');
    }
    set AllowsNestedReplies(value: boolean) {
        this.Set('AllowsNestedReplies', value);
    }

    /**
    * * Field Name: TriggersThreadSynthesis
    * * Display Name: Triggers Thread Synthesis
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get TriggersThreadSynthesis(): boolean {
        return this.Get('TriggersThreadSynthesis');
    }
    set TriggersThreadSynthesis(value: boolean) {
        this.Set('TriggersThreadSynthesis', value);
    }

    /**
    * * Field Name: IndexedInCorpus
    * * Display Name: Indexed In Corpus
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get IndexedInCorpus(): boolean {
        return this.Get('IndexedInCorpus');
    }
    set IndexedInCorpus(value: boolean) {
        this.Set('IndexedInCorpus', value);
    }

    /**
    * * Field Name: Configuration
    * * Display Name: Configuration
    * * SQL Data Type: nvarchar(MAX)
    */
    get Configuration(): string | null {
        return this.Get('Configuration');
    }
    set Configuration(value: string | null) {
        this.Set('Configuration', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: IsActive
    * * Display Name: Is Active
    * * SQL Data Type: bit
    * * Default Value: 1
    */
    get IsActive(): boolean {
        return this.Get('IsActive');
    }
    set IsActive(value: boolean) {
        this.Set('IsActive', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}
