/********************************************************************************
* ALL ENTITIES - TypeGraphQL Type Class Definition - AUTO GENERATED FILE
* Generated Entities and Resolvers for Server
*
*   >>> DO NOT MODIFY THIS FILE!!!!!!!!!!!!
*   >>> YOUR CHANGES WILL BE OVERWRITTEN
*   >>> THE NEXT TIME THIS FILE IS GENERATED
*
**********************************************************************************/
import { Arg, Ctx, Int, Query, Resolver, Field, Float, ObjectType, InputType, Mutation,
            PubSub, PubSubEngine, ResolverBase, RunViewByIDInput, RunViewByNameInput, RunDynamicViewInput,
            AppContext, KeyValuePairInput, DeleteOptionsInput, GraphQLTimestamp as Timestamp,
            GetReadOnlyProvider, GetReadWriteProvider, RestoreContextInput } from '@memberjunction/server';
import { Metadata, EntityPermissionType, CompositeKey, UserInfo } from '@memberjunction/core'

import { MaxLength } from 'class-validator';
import * as mj_core_schema_server_object_types from '@memberjunction/server'


import { mjBizAppsCommunityCommunityMemberProfileEntity, mjBizAppsCommunityCommunitySpaceEntity, mjBizAppsCommunityForumAMAPostEntity, mjBizAppsCommunityForumAnswerPostEntity, mjBizAppsCommunityForumArtifactPostEntity, mjBizAppsCommunityForumCasePostEntity, mjBizAppsCommunityForumFormPostEntity, mjBizAppsCommunityForumIdeaAllocationEntity, mjBizAppsCommunityForumIdeaCampaignEntity, mjBizAppsCommunityForumIdeaPostEntity, mjBizAppsCommunityForumInteractivePostEntity, mjBizAppsCommunityForumInteractiveSessionEntity, mjBizAppsCommunityForumMemberEntity, mjBizAppsCommunityForumPostAttachmentEntity, mjBizAppsCommunityForumPostFlagEntity, mjBizAppsCommunityForumPostReactionEntity, mjBizAppsCommunityForumPostTagEntity, mjBizAppsCommunityForumPostEntity, mjBizAppsCommunityForumQuestionPostEntity, mjBizAppsCommunityForumRoleTypeEntity, mjBizAppsCommunityForumSubscriptionEntity, mjBizAppsCommunityForumTopicTagEntity, mjBizAppsCommunityForumTypeEntity, mjBizAppsCommunityForumEntity, mjBizAppsCommunityPostTypeEntity } from '@mj-biz-apps/community-entities';
    

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Community Member Profiles
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityCommunityMemberProfile_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PersonID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(1000)
    BioMarkdown?: string;
        
    @Field({nullable: true}) 
    ExpertiseTagsJSON?: string;
        
    @Field(() => Int, {nullable: true}) 
    HelpfulAnswerCount?: number;
        
    @Field(() => Int, {nullable: true}) 
    AcceptedAnswerCount?: number;
        
    @Field(() => Int, {nullable: true}) 
    ReputationScore?: number;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    DigestCadence?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    OpenToPeerMentoring?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field({nullable: true}) 
    @MaxLength(250)
    Person?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Community Member Profiles
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityCommunityMemberProfileInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    PersonID: string | null;

    @Field({ nullable: true })
    BioMarkdown: string | null;

    @Field({ nullable: true })
    ExpertiseTagsJSON: string | null;

    @Field(() => Int, { nullable: true })
    HelpfulAnswerCount?: number;

    @Field(() => Int, { nullable: true })
    AcceptedAnswerCount?: number;

    @Field(() => Int, { nullable: true })
    ReputationScore?: number;

    @Field({ nullable: true })
    DigestCadence?: string;

    @Field(() => Boolean, { nullable: true })
    OpenToPeerMentoring?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Community Member Profiles
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityCommunityMemberProfileInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    PersonID?: string | null;

    @Field({ nullable: true })
    BioMarkdown?: string | null;

    @Field({ nullable: true })
    ExpertiseTagsJSON?: string | null;

    @Field(() => Int, { nullable: true })
    HelpfulAnswerCount?: number;

    @Field(() => Int, { nullable: true })
    AcceptedAnswerCount?: number;

    @Field(() => Int, { nullable: true })
    ReputationScore?: number;

    @Field({ nullable: true })
    DigestCadence?: string;

    @Field(() => Boolean, { nullable: true })
    OpenToPeerMentoring?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Community Member Profiles
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityCommunityMemberProfileViewResult {
    @Field(() => [mjBizAppsCommunityCommunityMemberProfile_])
    Results: mjBizAppsCommunityCommunityMemberProfile_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityCommunityMemberProfile_)
export class mjBizAppsCommunityCommunityMemberProfileResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityCommunityMemberProfileViewResult)
    async RunmjBizAppsCommunityCommunityMemberProfileViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityCommunityMemberProfileViewResult)
    async RunmjBizAppsCommunityCommunityMemberProfileViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityCommunityMemberProfileViewResult)
    async RunmjBizAppsCommunityCommunityMemberProfileDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Community Member Profiles';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityCommunityMemberProfile_, { nullable: true })
    async mjBizAppsCommunityCommunityMemberProfile(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityCommunityMemberProfile_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Community Member Profiles', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwCommunityMemberProfiles')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Community Member Profiles', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Community Member Profiles', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityCommunityMemberProfile_)
    async CreatemjBizAppsCommunityCommunityMemberProfile(
        @Arg('input', () => CreatemjBizAppsCommunityCommunityMemberProfileInput) input: CreatemjBizAppsCommunityCommunityMemberProfileInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Community Member Profiles', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityCommunityMemberProfile_)
    async UpdatemjBizAppsCommunityCommunityMemberProfile(
        @Arg('input', () => UpdatemjBizAppsCommunityCommunityMemberProfileInput) input: UpdatemjBizAppsCommunityCommunityMemberProfileInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Community Member Profiles', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityCommunityMemberProfile_)
    async DeletemjBizAppsCommunityCommunityMemberProfile(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Community Member Profiles', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Community Spaces
//****************************************************************************
@ObjectType({ description: "IsA subtype of Collaboration Space representing an online community hub with forums, Ask-First AI deflection, and digest settings." })
export class mjBizAppsCommunityCommunitySpace_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    Slug?: string;
        
    @Field({nullable: true}) 
    @MaxLength(50)
    CommunityKind?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    CommunityKindDetails?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    AnonymousReadMode?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    AskFirstEnabled?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    DefaultDigestCadence?: string;
        
    @Field({nullable: true}) 
    @MaxLength(500)
    BannerImageURL?: string;
        
    @Field({nullable: true}) 
    WelcomeMarkdown?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    DefaultForumID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    DefaultForum?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Community Spaces
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityCommunitySpaceInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    CommunityKind?: string;

    @Field({ nullable: true })
    CommunityKindDetails: string | null;

    @Field({ nullable: true })
    AnonymousReadMode?: string;

    @Field(() => Boolean, { nullable: true })
    AskFirstEnabled?: boolean;

    @Field({ nullable: true })
    DefaultDigestCadence?: string;

    @Field({ nullable: true })
    BannerImageURL: string | null;

    @Field({ nullable: true })
    WelcomeMarkdown: string | null;

    @Field({ nullable: true })
    DefaultForumID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Community Spaces
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityCommunitySpaceInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    CommunityKind?: string;

    @Field({ nullable: true })
    CommunityKindDetails?: string | null;

    @Field({ nullable: true })
    AnonymousReadMode?: string;

    @Field(() => Boolean, { nullable: true })
    AskFirstEnabled?: boolean;

    @Field({ nullable: true })
    DefaultDigestCadence?: string;

    @Field({ nullable: true })
    BannerImageURL?: string | null;

    @Field({ nullable: true })
    WelcomeMarkdown?: string | null;

    @Field({ nullable: true })
    DefaultForumID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Community Spaces
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityCommunitySpaceViewResult {
    @Field(() => [mjBizAppsCommunityCommunitySpace_])
    Results: mjBizAppsCommunityCommunitySpace_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityCommunitySpace_)
export class mjBizAppsCommunityCommunitySpaceResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityCommunitySpaceViewResult)
    async RunmjBizAppsCommunityCommunitySpaceViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityCommunitySpaceViewResult)
    async RunmjBizAppsCommunityCommunitySpaceViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityCommunitySpaceViewResult)
    async RunmjBizAppsCommunityCommunitySpaceDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Community Spaces';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityCommunitySpace_, { nullable: true })
    async mjBizAppsCommunityCommunitySpace(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityCommunitySpace_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Community Spaces', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwCommunitySpaces')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Community Spaces', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Community Spaces', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityCommunitySpace_)
    async CreatemjBizAppsCommunityCommunitySpace(
        @Arg('input', () => CreatemjBizAppsCommunityCommunitySpaceInput) input: CreatemjBizAppsCommunityCommunitySpaceInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Community Spaces', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityCommunitySpace_)
    async UpdatemjBizAppsCommunityCommunitySpace(
        @Arg('input', () => UpdatemjBizAppsCommunityCommunitySpaceInput) input: UpdatemjBizAppsCommunityCommunitySpaceInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Community Spaces', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityCommunitySpace_)
    async DeletemjBizAppsCommunityCommunitySpace(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Community Spaces', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum AMA Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumAMAPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    HostUserID?: string;
        
    @Field({nullable: true}) 
    ScheduledStartAt?: Date;
        
    @Field({nullable: true}) 
    ScheduledEndAt?: Date;
        
    @Field({nullable: true}) 
    QuestionsOpenAt?: Date;
        
    @Field(() => Boolean, {nullable: true}) 
    IsLiveNow?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(500)
    RecordingURL?: string;
        
    @Field({nullable: true}) 
    RecapMarkdown?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    HostUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum AMA Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumAMAPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    HostUserID?: string;

    @Field({ nullable: true })
    ScheduledStartAt?: Date;

    @Field({ nullable: true })
    ScheduledEndAt?: Date;

    @Field({ nullable: true })
    QuestionsOpenAt?: Date;

    @Field(() => Boolean, { nullable: true })
    IsLiveNow?: boolean;

    @Field({ nullable: true })
    RecordingURL: string | null;

    @Field({ nullable: true })
    RecapMarkdown: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum AMA Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumAMAPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    HostUserID?: string;

    @Field({ nullable: true })
    ScheduledStartAt?: Date;

    @Field({ nullable: true })
    ScheduledEndAt?: Date;

    @Field({ nullable: true })
    QuestionsOpenAt?: Date;

    @Field(() => Boolean, { nullable: true })
    IsLiveNow?: boolean;

    @Field({ nullable: true })
    RecordingURL?: string | null;

    @Field({ nullable: true })
    RecapMarkdown?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum AMA Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumAMAPostViewResult {
    @Field(() => [mjBizAppsCommunityForumAMAPost_])
    Results: mjBizAppsCommunityForumAMAPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumAMAPost_)
export class mjBizAppsCommunityForumAMAPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumAMAPostViewResult)
    async RunmjBizAppsCommunityForumAMAPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumAMAPostViewResult)
    async RunmjBizAppsCommunityForumAMAPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumAMAPostViewResult)
    async RunmjBizAppsCommunityForumAMAPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum AMA Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumAMAPost_, { nullable: true })
    async mjBizAppsCommunityForumAMAPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumAMAPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum AMA Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumAMAPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum AMA Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum AMA Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumAMAPost_)
    async CreatemjBizAppsCommunityForumAMAPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumAMAPostInput) input: CreatemjBizAppsCommunityForumAMAPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum AMA Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumAMAPost_)
    async UpdatemjBizAppsCommunityForumAMAPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumAMAPostInput) input: UpdatemjBizAppsCommunityForumAMAPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum AMA Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumAMAPost_)
    async DeletemjBizAppsCommunityForumAMAPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum AMA Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Answer Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumAnswerPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    QuestionPostID?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    IsAcceptedByAuthor?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    IsVerifiedByModerator?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    VerifiedByUserID?: string;
        
    @Field({nullable: true}) 
    VerifiedAt?: Date;
        
    @Field({nullable: true}) 
    @MaxLength(40)
    AIEpistemicStatus?: string;
        
    @Field(() => Float, {nullable: true}) 
    AIConfidenceScore?: number;
        
    @Field({nullable: true}) 
    AIRationaleMarkdown?: string;
        
    @Field({nullable: true}) 
    FreshnessReviewDueAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    VerifiedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Answer Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumAnswerPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    QuestionPostID?: string;

    @Field(() => Boolean, { nullable: true })
    IsAcceptedByAuthor?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsVerifiedByModerator?: boolean;

    @Field({ nullable: true })
    VerifiedByUserID: string | null;

    @Field({ nullable: true })
    VerifiedAt: Date | null;

    @Field({ nullable: true })
    AIEpistemicStatus: string | null;

    @Field(() => Float, { nullable: true })
    AIConfidenceScore: number | null;

    @Field({ nullable: true })
    AIRationaleMarkdown: string | null;

    @Field({ nullable: true })
    FreshnessReviewDueAt: Date | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Answer Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumAnswerPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    QuestionPostID?: string;

    @Field(() => Boolean, { nullable: true })
    IsAcceptedByAuthor?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsVerifiedByModerator?: boolean;

    @Field({ nullable: true })
    VerifiedByUserID?: string | null;

    @Field({ nullable: true })
    VerifiedAt?: Date | null;

    @Field({ nullable: true })
    AIEpistemicStatus?: string | null;

    @Field(() => Float, { nullable: true })
    AIConfidenceScore?: number | null;

    @Field({ nullable: true })
    AIRationaleMarkdown?: string | null;

    @Field({ nullable: true })
    FreshnessReviewDueAt?: Date | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Answer Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumAnswerPostViewResult {
    @Field(() => [mjBizAppsCommunityForumAnswerPost_])
    Results: mjBizAppsCommunityForumAnswerPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumAnswerPost_)
export class mjBizAppsCommunityForumAnswerPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumAnswerPostViewResult)
    async RunmjBizAppsCommunityForumAnswerPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumAnswerPostViewResult)
    async RunmjBizAppsCommunityForumAnswerPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumAnswerPostViewResult)
    async RunmjBizAppsCommunityForumAnswerPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Answer Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumAnswerPost_, { nullable: true })
    async mjBizAppsCommunityForumAnswerPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumAnswerPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Answer Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumAnswerPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Answer Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Answer Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumAnswerPost_)
    async CreatemjBizAppsCommunityForumAnswerPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumAnswerPostInput) input: CreatemjBizAppsCommunityForumAnswerPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Answer Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumAnswerPost_)
    async UpdatemjBizAppsCommunityForumAnswerPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumAnswerPostInput) input: UpdatemjBizAppsCommunityForumAnswerPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Answer Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumAnswerPost_)
    async DeletemjBizAppsCommunityForumAnswerPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Answer Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Artifact Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumArtifactPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ArtifactID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PinnedArtifactVersionID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceItemID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    ArtifactModality?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    CollaborationMode?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    ShowInlinePreview?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Artifact?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    PinnedArtifactVersion?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Artifact Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumArtifactPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ArtifactID?: string;

    @Field({ nullable: true })
    PinnedArtifactVersionID: string | null;

    @Field({ nullable: true })
    SpaceItemID?: string;

    @Field({ nullable: true })
    ArtifactModality?: string;

    @Field({ nullable: true })
    CollaborationMode?: string;

    @Field(() => Boolean, { nullable: true })
    ShowInlinePreview?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Artifact Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumArtifactPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ArtifactID?: string;

    @Field({ nullable: true })
    PinnedArtifactVersionID?: string | null;

    @Field({ nullable: true })
    SpaceItemID?: string;

    @Field({ nullable: true })
    ArtifactModality?: string;

    @Field({ nullable: true })
    CollaborationMode?: string;

    @Field(() => Boolean, { nullable: true })
    ShowInlinePreview?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Artifact Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumArtifactPostViewResult {
    @Field(() => [mjBizAppsCommunityForumArtifactPost_])
    Results: mjBizAppsCommunityForumArtifactPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumArtifactPost_)
export class mjBizAppsCommunityForumArtifactPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumArtifactPostViewResult)
    async RunmjBizAppsCommunityForumArtifactPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumArtifactPostViewResult)
    async RunmjBizAppsCommunityForumArtifactPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumArtifactPostViewResult)
    async RunmjBizAppsCommunityForumArtifactPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Artifact Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumArtifactPost_, { nullable: true })
    async mjBizAppsCommunityForumArtifactPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumArtifactPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Artifact Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumArtifactPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Artifact Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Artifact Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumArtifactPost_)
    async CreatemjBizAppsCommunityForumArtifactPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumArtifactPostInput) input: CreatemjBizAppsCommunityForumArtifactPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Artifact Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumArtifactPost_)
    async UpdatemjBizAppsCommunityForumArtifactPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumArtifactPostInput) input: UpdatemjBizAppsCommunityForumArtifactPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Artifact Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumArtifactPost_)
    async DeletemjBizAppsCommunityForumArtifactPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Artifact Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Case Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumCasePost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    SituationMarkdown?: string;
        
    @Field({nullable: true}) 
    ActionTakenMarkdown?: string;
        
    @Field({nullable: true}) 
    OutcomeMarkdown?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    IsAnonymized?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    AnonymizedAuthorAlias?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    RedactionConfirmedByUserID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    RedactionConfirmedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Case Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumCasePostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SituationMarkdown?: string;

    @Field({ nullable: true })
    ActionTakenMarkdown?: string;

    @Field({ nullable: true })
    OutcomeMarkdown: string | null;

    @Field(() => Boolean, { nullable: true })
    IsAnonymized?: boolean;

    @Field({ nullable: true })
    AnonymizedAuthorAlias: string | null;

    @Field({ nullable: true })
    RedactionConfirmedByUserID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Case Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumCasePostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SituationMarkdown?: string;

    @Field({ nullable: true })
    ActionTakenMarkdown?: string;

    @Field({ nullable: true })
    OutcomeMarkdown?: string | null;

    @Field(() => Boolean, { nullable: true })
    IsAnonymized?: boolean;

    @Field({ nullable: true })
    AnonymizedAuthorAlias?: string | null;

    @Field({ nullable: true })
    RedactionConfirmedByUserID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Case Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumCasePostViewResult {
    @Field(() => [mjBizAppsCommunityForumCasePost_])
    Results: mjBizAppsCommunityForumCasePost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumCasePost_)
export class mjBizAppsCommunityForumCasePostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumCasePostViewResult)
    async RunmjBizAppsCommunityForumCasePostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumCasePostViewResult)
    async RunmjBizAppsCommunityForumCasePostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumCasePostViewResult)
    async RunmjBizAppsCommunityForumCasePostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Case Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumCasePost_, { nullable: true })
    async mjBizAppsCommunityForumCasePost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumCasePost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Case Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumCasePosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Case Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Case Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumCasePost_)
    async CreatemjBizAppsCommunityForumCasePost(
        @Arg('input', () => CreatemjBizAppsCommunityForumCasePostInput) input: CreatemjBizAppsCommunityForumCasePostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Case Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumCasePost_)
    async UpdatemjBizAppsCommunityForumCasePost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumCasePostInput) input: UpdatemjBizAppsCommunityForumCasePostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Case Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumCasePost_)
    async DeletemjBizAppsCommunityForumCasePost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Case Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Form Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumFormPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    FormID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    FormDistributionID?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    ShowLiveResultsInline?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    RequirePostReplyOnSubmit?: boolean;
        
    @Field({nullable: true}) 
    ClosesAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Form?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    FormDistribution?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Form Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumFormPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    FormID?: string;

    @Field({ nullable: true })
    FormDistributionID: string | null;

    @Field(() => Boolean, { nullable: true })
    ShowLiveResultsInline?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequirePostReplyOnSubmit?: boolean;

    @Field({ nullable: true })
    ClosesAt: Date | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Form Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumFormPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    FormID?: string;

    @Field({ nullable: true })
    FormDistributionID?: string | null;

    @Field(() => Boolean, { nullable: true })
    ShowLiveResultsInline?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequirePostReplyOnSubmit?: boolean;

    @Field({ nullable: true })
    ClosesAt?: Date | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Form Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumFormPostViewResult {
    @Field(() => [mjBizAppsCommunityForumFormPost_])
    Results: mjBizAppsCommunityForumFormPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumFormPost_)
export class mjBizAppsCommunityForumFormPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumFormPostViewResult)
    async RunmjBizAppsCommunityForumFormPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumFormPostViewResult)
    async RunmjBizAppsCommunityForumFormPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumFormPostViewResult)
    async RunmjBizAppsCommunityForumFormPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Form Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumFormPost_, { nullable: true })
    async mjBizAppsCommunityForumFormPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumFormPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Form Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumFormPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Form Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Form Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumFormPost_)
    async CreatemjBizAppsCommunityForumFormPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumFormPostInput) input: CreatemjBizAppsCommunityForumFormPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Form Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumFormPost_)
    async UpdatemjBizAppsCommunityForumFormPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumFormPostInput) input: UpdatemjBizAppsCommunityForumFormPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Form Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumFormPost_)
    async DeletemjBizAppsCommunityForumFormPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Form Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Idea Allocations
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumIdeaAllocation_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    IdeaPostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field(() => Int, {nullable: true}) 
    PointsAllocated?: number;
        
    @Field(() => Float, {nullable: true}) 
    QuadraticVotes?: number;
        
    @Field({nullable: true}) 
    @MaxLength(500)
    RationaleComment?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Allocations
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumIdeaAllocationInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    IdeaPostID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => Int, { nullable: true })
    PointsAllocated?: number;

    @Field(() => Float, { nullable: true })
    QuadraticVotes?: number;

    @Field({ nullable: true })
    RationaleComment: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Allocations
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumIdeaAllocationInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    IdeaPostID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => Int, { nullable: true })
    PointsAllocated?: number;

    @Field(() => Float, { nullable: true })
    QuadraticVotes?: number;

    @Field({ nullable: true })
    RationaleComment?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Idea Allocations
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumIdeaAllocationViewResult {
    @Field(() => [mjBizAppsCommunityForumIdeaAllocation_])
    Results: mjBizAppsCommunityForumIdeaAllocation_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumIdeaAllocation_)
export class mjBizAppsCommunityForumIdeaAllocationResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumIdeaAllocationViewResult)
    async RunmjBizAppsCommunityForumIdeaAllocationViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaAllocationViewResult)
    async RunmjBizAppsCommunityForumIdeaAllocationViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaAllocationViewResult)
    async RunmjBizAppsCommunityForumIdeaAllocationDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Idea Allocations';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumIdeaAllocation_, { nullable: true })
    async mjBizAppsCommunityForumIdeaAllocation(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumIdeaAllocation_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Idea Allocations', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumIdeaAllocations')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Idea Allocations', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Idea Allocations', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaAllocation_)
    async CreatemjBizAppsCommunityForumIdeaAllocation(
        @Arg('input', () => CreatemjBizAppsCommunityForumIdeaAllocationInput) input: CreatemjBizAppsCommunityForumIdeaAllocationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Idea Allocations', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumIdeaAllocation_)
    async UpdatemjBizAppsCommunityForumIdeaAllocation(
        @Arg('input', () => UpdatemjBizAppsCommunityForumIdeaAllocationInput) input: UpdatemjBizAppsCommunityForumIdeaAllocationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Idea Allocations', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaAllocation_)
    async DeletemjBizAppsCommunityForumIdeaAllocation(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Idea Allocations', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Idea Campaigns
//****************************************************************************
@ObjectType({ description: "IsA subtype of Forum configuring 100-Point Wallet or Quadratic Voting parameters for an ideation campaign." })
export class mjBizAppsCommunityForumIdeaCampaign_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field(() => Int, {nullable: true}) 
    DefaultBudgetPoints?: number;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    AllocationMode?: string;
        
    @Field(() => Int, {nullable: true}) 
    MaxPointsPerIdea?: number;
        
    @Field({nullable: true}) 
    SubmissionsCloseAt?: Date;
        
    @Field({nullable: true}) 
    VotingClosesAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Campaigns
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumIdeaCampaignInput {
    @Field({ nullable: true })
    ID?: string;

    @Field(() => Int, { nullable: true })
    DefaultBudgetPoints?: number;

    @Field({ nullable: true })
    AllocationMode?: string;

    @Field(() => Int, { nullable: true })
    MaxPointsPerIdea: number | null;

    @Field({ nullable: true })
    SubmissionsCloseAt: Date | null;

    @Field({ nullable: true })
    VotingClosesAt: Date | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Campaigns
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumIdeaCampaignInput {
    @Field()
    ID: string;

    @Field(() => Int, { nullable: true })
    DefaultBudgetPoints?: number;

    @Field({ nullable: true })
    AllocationMode?: string;

    @Field(() => Int, { nullable: true })
    MaxPointsPerIdea?: number | null;

    @Field({ nullable: true })
    SubmissionsCloseAt?: Date | null;

    @Field({ nullable: true })
    VotingClosesAt?: Date | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Idea Campaigns
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumIdeaCampaignViewResult {
    @Field(() => [mjBizAppsCommunityForumIdeaCampaign_])
    Results: mjBizAppsCommunityForumIdeaCampaign_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumIdeaCampaign_)
export class mjBizAppsCommunityForumIdeaCampaignResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumIdeaCampaignViewResult)
    async RunmjBizAppsCommunityForumIdeaCampaignViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaCampaignViewResult)
    async RunmjBizAppsCommunityForumIdeaCampaignViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaCampaignViewResult)
    async RunmjBizAppsCommunityForumIdeaCampaignDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Idea Campaigns';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumIdeaCampaign_, { nullable: true })
    async mjBizAppsCommunityForumIdeaCampaign(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumIdeaCampaign_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Idea Campaigns', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumIdeaCampaigns')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Idea Campaigns', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Idea Campaigns', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaCampaign_)
    async CreatemjBizAppsCommunityForumIdeaCampaign(
        @Arg('input', () => CreatemjBizAppsCommunityForumIdeaCampaignInput) input: CreatemjBizAppsCommunityForumIdeaCampaignInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Idea Campaigns', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumIdeaCampaign_)
    async UpdatemjBizAppsCommunityForumIdeaCampaign(
        @Arg('input', () => UpdatemjBizAppsCommunityForumIdeaCampaignInput) input: UpdatemjBizAppsCommunityForumIdeaCampaignInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Idea Campaigns', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaCampaign_)
    async DeletemjBizAppsCommunityForumIdeaCampaign(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Idea Campaigns', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Idea Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumIdeaPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    IdeaStatus?: string;
        
    @Field(() => Int, {nullable: true}) 
    TotalPointsAllocated?: number;
        
    @Field(() => Float, {nullable: true}) 
    EffectiveQuadraticVotes?: number;
        
    @Field(() => Int, {nullable: true}) 
    UniqueBackerCount?: number;
        
    @Field({nullable: true}) 
    @MaxLength(50)
    TargetReleaseOrQuarter?: string;
        
    @Field({nullable: true}) 
    StatusRationaleMarkdown?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    MergedIntoIdeaPostID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumIdeaPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    IdeaStatus?: string;

    @Field(() => Int, { nullable: true })
    TotalPointsAllocated?: number;

    @Field(() => Float, { nullable: true })
    EffectiveQuadraticVotes?: number;

    @Field(() => Int, { nullable: true })
    UniqueBackerCount?: number;

    @Field({ nullable: true })
    TargetReleaseOrQuarter: string | null;

    @Field({ nullable: true })
    StatusRationaleMarkdown: string | null;

    @Field({ nullable: true })
    MergedIntoIdeaPostID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Idea Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumIdeaPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    IdeaStatus?: string;

    @Field(() => Int, { nullable: true })
    TotalPointsAllocated?: number;

    @Field(() => Float, { nullable: true })
    EffectiveQuadraticVotes?: number;

    @Field(() => Int, { nullable: true })
    UniqueBackerCount?: number;

    @Field({ nullable: true })
    TargetReleaseOrQuarter?: string | null;

    @Field({ nullable: true })
    StatusRationaleMarkdown?: string | null;

    @Field({ nullable: true })
    MergedIntoIdeaPostID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Idea Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumIdeaPostViewResult {
    @Field(() => [mjBizAppsCommunityForumIdeaPost_])
    Results: mjBizAppsCommunityForumIdeaPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumIdeaPost_)
export class mjBizAppsCommunityForumIdeaPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumIdeaPostViewResult)
    async RunmjBizAppsCommunityForumIdeaPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaPostViewResult)
    async RunmjBizAppsCommunityForumIdeaPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumIdeaPostViewResult)
    async RunmjBizAppsCommunityForumIdeaPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Idea Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumIdeaPost_, { nullable: true })
    async mjBizAppsCommunityForumIdeaPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumIdeaPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Idea Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumIdeaPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Idea Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Idea Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaPost_)
    async CreatemjBizAppsCommunityForumIdeaPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumIdeaPostInput) input: CreatemjBizAppsCommunityForumIdeaPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Idea Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumIdeaPost_)
    async UpdatemjBizAppsCommunityForumIdeaPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumIdeaPostInput) input: UpdatemjBizAppsCommunityForumIdeaPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Idea Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumIdeaPost_)
    async DeletemjBizAppsCommunityForumIdeaPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Idea Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Interactive Posts
//****************************************************************************
@ObjectType({ description: "IsA subtype of ForumPost for sandboxed interactive mini-apps, calculators, quizzes, and simulations backed by MJ Component Artifacts." })
export class mjBizAppsCommunityForumInteractivePost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ComponentArtifactID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PinnedArtifactVersionID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceItemID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(40)
    ExperienceKind?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    ExperienceKindDetails?: string;
        
    @Field({nullable: true}) 
    PromptUsed?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    ScoringMode?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    ShowLeaderboard?: boolean;
        
    @Field(() => Int, {nullable: true}) 
    MaxAttemptsPerMember?: number;
        
    @Field(() => Int, {nullable: true}) 
    PlayCount?: number;
        
    @Field({nullable: true}) 
    ExpiresAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    ComponentArtifact?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    PinnedArtifactVersion?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Interactive Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumInteractivePostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ComponentArtifactID?: string;

    @Field({ nullable: true })
    PinnedArtifactVersionID: string | null;

    @Field({ nullable: true })
    SpaceItemID: string | null;

    @Field({ nullable: true })
    ExperienceKind?: string;

    @Field({ nullable: true })
    ExperienceKindDetails: string | null;

    @Field({ nullable: true })
    PromptUsed: string | null;

    @Field({ nullable: true })
    ScoringMode?: string;

    @Field(() => Boolean, { nullable: true })
    ShowLeaderboard?: boolean;

    @Field(() => Int, { nullable: true })
    MaxAttemptsPerMember: number | null;

    @Field(() => Int, { nullable: true })
    PlayCount?: number;

    @Field({ nullable: true })
    ExpiresAt: Date | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Interactive Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumInteractivePostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ComponentArtifactID?: string;

    @Field({ nullable: true })
    PinnedArtifactVersionID?: string | null;

    @Field({ nullable: true })
    SpaceItemID?: string | null;

    @Field({ nullable: true })
    ExperienceKind?: string;

    @Field({ nullable: true })
    ExperienceKindDetails?: string | null;

    @Field({ nullable: true })
    PromptUsed?: string | null;

    @Field({ nullable: true })
    ScoringMode?: string;

    @Field(() => Boolean, { nullable: true })
    ShowLeaderboard?: boolean;

    @Field(() => Int, { nullable: true })
    MaxAttemptsPerMember?: number | null;

    @Field(() => Int, { nullable: true })
    PlayCount?: number;

    @Field({ nullable: true })
    ExpiresAt?: Date | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Interactive Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumInteractivePostViewResult {
    @Field(() => [mjBizAppsCommunityForumInteractivePost_])
    Results: mjBizAppsCommunityForumInteractivePost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumInteractivePost_)
export class mjBizAppsCommunityForumInteractivePostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumInteractivePostViewResult)
    async RunmjBizAppsCommunityForumInteractivePostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumInteractivePostViewResult)
    async RunmjBizAppsCommunityForumInteractivePostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumInteractivePostViewResult)
    async RunmjBizAppsCommunityForumInteractivePostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Interactive Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumInteractivePost_, { nullable: true })
    async mjBizAppsCommunityForumInteractivePost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumInteractivePost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Interactive Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumInteractivePosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Interactive Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Interactive Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumInteractivePost_)
    async CreatemjBizAppsCommunityForumInteractivePost(
        @Arg('input', () => CreatemjBizAppsCommunityForumInteractivePostInput) input: CreatemjBizAppsCommunityForumInteractivePostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Interactive Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumInteractivePost_)
    async UpdatemjBizAppsCommunityForumInteractivePost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumInteractivePostInput) input: UpdatemjBizAppsCommunityForumInteractivePostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Interactive Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumInteractivePost_)
    async DeletemjBizAppsCommunityForumInteractivePost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Interactive Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Interactive Sessions
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumInteractiveSession_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    InteractivePostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ArtifactVersionID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field(() => Int, {nullable: true}) 
    AttemptNumber?: number;
        
    @Field(() => Float, {nullable: true}) 
    Score?: number;
        
    @Field(() => Int, {nullable: true}) 
    DurationSeconds?: number;
        
    @Field(() => Boolean, {nullable: true}) 
    Completed?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(300)
    OutcomeSummary?: string;
        
    @Field({nullable: true}) 
    SessionStateJSON?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    ArtifactVersion?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Interactive Sessions
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumInteractiveSessionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    InteractivePostID?: string;

    @Field({ nullable: true })
    ArtifactVersionID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => Int, { nullable: true })
    AttemptNumber?: number;

    @Field(() => Float, { nullable: true })
    Score: number | null;

    @Field(() => Int, { nullable: true })
    DurationSeconds: number | null;

    @Field(() => Boolean, { nullable: true })
    Completed?: boolean;

    @Field({ nullable: true })
    OutcomeSummary: string | null;

    @Field({ nullable: true })
    SessionStateJSON: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Interactive Sessions
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumInteractiveSessionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    InteractivePostID?: string;

    @Field({ nullable: true })
    ArtifactVersionID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => Int, { nullable: true })
    AttemptNumber?: number;

    @Field(() => Float, { nullable: true })
    Score?: number | null;

    @Field(() => Int, { nullable: true })
    DurationSeconds?: number | null;

    @Field(() => Boolean, { nullable: true })
    Completed?: boolean;

    @Field({ nullable: true })
    OutcomeSummary?: string | null;

    @Field({ nullable: true })
    SessionStateJSON?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Interactive Sessions
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumInteractiveSessionViewResult {
    @Field(() => [mjBizAppsCommunityForumInteractiveSession_])
    Results: mjBizAppsCommunityForumInteractiveSession_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumInteractiveSession_)
export class mjBizAppsCommunityForumInteractiveSessionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumInteractiveSessionViewResult)
    async RunmjBizAppsCommunityForumInteractiveSessionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumInteractiveSessionViewResult)
    async RunmjBizAppsCommunityForumInteractiveSessionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumInteractiveSessionViewResult)
    async RunmjBizAppsCommunityForumInteractiveSessionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Interactive Sessions';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumInteractiveSession_, { nullable: true })
    async mjBizAppsCommunityForumInteractiveSession(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumInteractiveSession_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Interactive Sessions', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumInteractiveSessions')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Interactive Sessions', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Interactive Sessions', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumInteractiveSession_)
    async CreatemjBizAppsCommunityForumInteractiveSession(
        @Arg('input', () => CreatemjBizAppsCommunityForumInteractiveSessionInput) input: CreatemjBizAppsCommunityForumInteractiveSessionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Interactive Sessions', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumInteractiveSession_)
    async UpdatemjBizAppsCommunityForumInteractiveSession(
        @Arg('input', () => UpdatemjBizAppsCommunityForumInteractiveSessionInput) input: UpdatemjBizAppsCommunityForumInteractiveSessionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Interactive Sessions', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumInteractiveSession_)
    async DeletemjBizAppsCommunityForumInteractiveSession(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Interactive Sessions', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Members
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumMember_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ForumID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ForumRoleTypeID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    Status?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    Forum?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    ForumRoleType?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Members
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumMemberInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ForumID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ForumRoleTypeID?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Members
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumMemberInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ForumID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ForumRoleTypeID?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Members
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumMemberViewResult {
    @Field(() => [mjBizAppsCommunityForumMember_])
    Results: mjBizAppsCommunityForumMember_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumMember_)
export class mjBizAppsCommunityForumMemberResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumMemberViewResult)
    async RunmjBizAppsCommunityForumMemberViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumMemberViewResult)
    async RunmjBizAppsCommunityForumMemberViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumMemberViewResult)
    async RunmjBizAppsCommunityForumMemberDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Members';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumMember_, { nullable: true })
    async mjBizAppsCommunityForumMember(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumMember_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Members', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumMembers')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Members', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Members', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumMember_)
    async CreatemjBizAppsCommunityForumMember(
        @Arg('input', () => CreatemjBizAppsCommunityForumMemberInput) input: CreatemjBizAppsCommunityForumMemberInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Members', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumMember_)
    async UpdatemjBizAppsCommunityForumMember(
        @Arg('input', () => UpdatemjBizAppsCommunityForumMemberInput) input: UpdatemjBizAppsCommunityForumMemberInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Members', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumMember_)
    async DeletemjBizAppsCommunityForumMember(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Members', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Post Attachments
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumPostAttachment_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceItemID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(300)
    Caption?: string;
        
    @Field(() => Int, {nullable: true}) 
    Sequence?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Attachments
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumPostAttachmentInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    SpaceItemID?: string;

    @Field({ nullable: true })
    Caption: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Attachments
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumPostAttachmentInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    SpaceItemID?: string;

    @Field({ nullable: true })
    Caption?: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Post Attachments
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumPostAttachmentViewResult {
    @Field(() => [mjBizAppsCommunityForumPostAttachment_])
    Results: mjBizAppsCommunityForumPostAttachment_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumPostAttachment_)
export class mjBizAppsCommunityForumPostAttachmentResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumPostAttachmentViewResult)
    async RunmjBizAppsCommunityForumPostAttachmentViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostAttachmentViewResult)
    async RunmjBizAppsCommunityForumPostAttachmentViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostAttachmentViewResult)
    async RunmjBizAppsCommunityForumPostAttachmentDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Post Attachments';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumPostAttachment_, { nullable: true })
    async mjBizAppsCommunityForumPostAttachment(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumPostAttachment_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Post Attachments', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumPostAttachments')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Post Attachments', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Post Attachments', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostAttachment_)
    async CreatemjBizAppsCommunityForumPostAttachment(
        @Arg('input', () => CreatemjBizAppsCommunityForumPostAttachmentInput) input: CreatemjBizAppsCommunityForumPostAttachmentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Post Attachments', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumPostAttachment_)
    async UpdatemjBizAppsCommunityForumPostAttachment(
        @Arg('input', () => UpdatemjBizAppsCommunityForumPostAttachmentInput) input: UpdatemjBizAppsCommunityForumPostAttachmentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Post Attachments', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostAttachment_)
    async DeletemjBizAppsCommunityForumPostAttachment(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Post Attachments', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Post Flags
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumPostFlag_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ReportedByUserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ReportedByAgentID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(40)
    ReasonCategory?: string;
        
    @Field({nullable: true}) 
    @MaxLength(1000)
    ReasonDetails?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    Status?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ResolvedByUserID?: string;
        
    @Field({nullable: true}) 
    ResolvedAt?: Date;
        
    @Field({nullable: true}) 
    @MaxLength(40)
    ResolutionOutcome?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    ReportedByUser?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    ReportedByAgent?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    ResolvedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Flags
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumPostFlagInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    ReportedByUserID: string | null;

    @Field({ nullable: true })
    ReportedByAgentID: string | null;

    @Field({ nullable: true })
    ReasonCategory?: string;

    @Field({ nullable: true })
    ReasonDetails: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    ResolvedByUserID: string | null;

    @Field({ nullable: true })
    ResolvedAt: Date | null;

    @Field({ nullable: true })
    ResolutionOutcome: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Flags
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumPostFlagInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    ReportedByUserID?: string | null;

    @Field({ nullable: true })
    ReportedByAgentID?: string | null;

    @Field({ nullable: true })
    ReasonCategory?: string;

    @Field({ nullable: true })
    ReasonDetails?: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    ResolvedByUserID?: string | null;

    @Field({ nullable: true })
    ResolvedAt?: Date | null;

    @Field({ nullable: true })
    ResolutionOutcome?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Post Flags
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumPostFlagViewResult {
    @Field(() => [mjBizAppsCommunityForumPostFlag_])
    Results: mjBizAppsCommunityForumPostFlag_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumPostFlag_)
export class mjBizAppsCommunityForumPostFlagResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumPostFlagViewResult)
    async RunmjBizAppsCommunityForumPostFlagViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostFlagViewResult)
    async RunmjBizAppsCommunityForumPostFlagViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostFlagViewResult)
    async RunmjBizAppsCommunityForumPostFlagDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Post Flags';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumPostFlag_, { nullable: true })
    async mjBizAppsCommunityForumPostFlag(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumPostFlag_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Post Flags', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumPostFlags')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Post Flags', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Post Flags', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostFlag_)
    async CreatemjBizAppsCommunityForumPostFlag(
        @Arg('input', () => CreatemjBizAppsCommunityForumPostFlagInput) input: CreatemjBizAppsCommunityForumPostFlagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Post Flags', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumPostFlag_)
    async UpdatemjBizAppsCommunityForumPostFlag(
        @Arg('input', () => UpdatemjBizAppsCommunityForumPostFlagInput) input: UpdatemjBizAppsCommunityForumPostFlagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Post Flags', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostFlag_)
    async DeletemjBizAppsCommunityForumPostFlag(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Post Flags', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Post Reactions
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumPostReaction_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    ReactionKind?: string;
        
    @Field(() => Float, {nullable: true}) 
    Weight?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Reactions
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumPostReactionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ReactionKind?: string;

    @Field(() => Float, { nullable: true })
    Weight?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Reactions
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumPostReactionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ReactionKind?: string;

    @Field(() => Float, { nullable: true })
    Weight?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Post Reactions
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumPostReactionViewResult {
    @Field(() => [mjBizAppsCommunityForumPostReaction_])
    Results: mjBizAppsCommunityForumPostReaction_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumPostReaction_)
export class mjBizAppsCommunityForumPostReactionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumPostReactionViewResult)
    async RunmjBizAppsCommunityForumPostReactionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostReactionViewResult)
    async RunmjBizAppsCommunityForumPostReactionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostReactionViewResult)
    async RunmjBizAppsCommunityForumPostReactionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Post Reactions';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumPostReaction_, { nullable: true })
    async mjBizAppsCommunityForumPostReaction(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumPostReaction_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Post Reactions', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumPostReactions')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Post Reactions', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Post Reactions', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostReaction_)
    async CreatemjBizAppsCommunityForumPostReaction(
        @Arg('input', () => CreatemjBizAppsCommunityForumPostReactionInput) input: CreatemjBizAppsCommunityForumPostReactionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Post Reactions', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumPostReaction_)
    async UpdatemjBizAppsCommunityForumPostReaction(
        @Arg('input', () => UpdatemjBizAppsCommunityForumPostReactionInput) input: UpdatemjBizAppsCommunityForumPostReactionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Post Reactions', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostReaction_)
    async DeletemjBizAppsCommunityForumPostReaction(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Post Reactions', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Post Tags
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumPostTag_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    TopicTagID?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    AssignedByAI?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    TopicTag?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Tags
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumPostTagInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    TopicTagID?: string;

    @Field(() => Boolean, { nullable: true })
    AssignedByAI?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Post Tags
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumPostTagInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    PostID?: string;

    @Field({ nullable: true })
    TopicTagID?: string;

    @Field(() => Boolean, { nullable: true })
    AssignedByAI?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Post Tags
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumPostTagViewResult {
    @Field(() => [mjBizAppsCommunityForumPostTag_])
    Results: mjBizAppsCommunityForumPostTag_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumPostTag_)
export class mjBizAppsCommunityForumPostTagResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumPostTagViewResult)
    async RunmjBizAppsCommunityForumPostTagViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostTagViewResult)
    async RunmjBizAppsCommunityForumPostTagViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostTagViewResult)
    async RunmjBizAppsCommunityForumPostTagDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Post Tags';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumPostTag_, { nullable: true })
    async mjBizAppsCommunityForumPostTag(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumPostTag_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Post Tags', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumPostTags')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Post Tags', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Post Tags', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostTag_)
    async CreatemjBizAppsCommunityForumPostTag(
        @Arg('input', () => CreatemjBizAppsCommunityForumPostTagInput) input: CreatemjBizAppsCommunityForumPostTagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Post Tags', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumPostTag_)
    async UpdatemjBizAppsCommunityForumPostTag(
        @Arg('input', () => UpdatemjBizAppsCommunityForumPostTagInput) input: UpdatemjBizAppsCommunityForumPostTagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Post Tags', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumPostTag_)
    async DeletemjBizAppsCommunityForumPostTag(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Post Tags', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Posts
//****************************************************************************
@ObjectType({ description: "Unified parent entity for all root threads and nested replies across every forum type." })
export class mjBizAppsCommunityForumPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ForumID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PostTypeID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    RootPostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ParentPostID?: string;
        
    @Field(() => Int, {nullable: true}) 
    ReplyDepth?: number;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    AuthorUserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    AuthorPersonID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    AuthorAgentID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(300)
    Title?: string;
        
    @Field({nullable: true}) 
    @MaxLength(320)
    Slug?: string;
        
    @Field({nullable: true}) 
    BodyMarkdown?: string;
        
    @Field({nullable: true}) 
    SummaryMarkdown?: string;
        
    @Field({nullable: true}) 
    SummaryGeneratedAt?: Date;
        
    @Field(() => Int, {nullable: true}) 
    SummaryReplyWatermark?: number;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    VisibilityBand?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    Status?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    IsPinned?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    IsLocked?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    IsFeatured?: boolean;
        
    @Field(() => Int, {nullable: true}) 
    ReplyCount?: number;
        
    @Field(() => Int, {nullable: true}) 
    ParticipantCount?: number;
        
    @Field(() => Int, {nullable: true}) 
    ReactionScore?: number;
        
    @Field(() => Int, {nullable: true}) 
    ViewCount?: number;
        
    @Field({nullable: true}) 
    LastActivityAt?: Date;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    PromotedToSpaceID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    LinkedTaskID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    LinkedEntityID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(450)
    LinkedRecordID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ConversationID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    Forum?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    PostType?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    AuthorUser?: string;
        
    @Field({nullable: true}) 
    @MaxLength(250)
    AuthorPerson?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    AuthorAgent?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    PromotedToSpace?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    LinkedTask?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    LinkedEntity?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Conversation?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ForumID?: string;

    @Field({ nullable: true })
    PostTypeID?: string;

    @Field({ nullable: true })
    RootPostID: string | null;

    @Field({ nullable: true })
    ParentPostID: string | null;

    @Field(() => Int, { nullable: true })
    ReplyDepth?: number;

    @Field({ nullable: true })
    AuthorUserID: string | null;

    @Field({ nullable: true })
    AuthorPersonID: string | null;

    @Field({ nullable: true })
    AuthorAgentID: string | null;

    @Field({ nullable: true })
    Title: string | null;

    @Field({ nullable: true })
    Slug: string | null;

    @Field({ nullable: true })
    BodyMarkdown?: string;

    @Field({ nullable: true })
    SummaryMarkdown: string | null;

    @Field({ nullable: true })
    SummaryGeneratedAt: Date | null;

    @Field(() => Int, { nullable: true })
    SummaryReplyWatermark?: number;

    @Field({ nullable: true })
    VisibilityBand?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsPinned?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsLocked?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsFeatured?: boolean;

    @Field(() => Int, { nullable: true })
    ReplyCount?: number;

    @Field(() => Int, { nullable: true })
    ParticipantCount?: number;

    @Field(() => Int, { nullable: true })
    ReactionScore?: number;

    @Field(() => Int, { nullable: true })
    ViewCount?: number;

    @Field({ nullable: true })
    LastActivityAt?: Date;

    @Field({ nullable: true })
    PromotedToSpaceID: string | null;

    @Field({ nullable: true })
    LinkedTaskID: string | null;

    @Field({ nullable: true })
    LinkedEntityID: string | null;

    @Field({ nullable: true })
    LinkedRecordID: string | null;

    @Field({ nullable: true })
    ConversationID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ForumID?: string;

    @Field({ nullable: true })
    PostTypeID?: string;

    @Field({ nullable: true })
    RootPostID?: string | null;

    @Field({ nullable: true })
    ParentPostID?: string | null;

    @Field(() => Int, { nullable: true })
    ReplyDepth?: number;

    @Field({ nullable: true })
    AuthorUserID?: string | null;

    @Field({ nullable: true })
    AuthorPersonID?: string | null;

    @Field({ nullable: true })
    AuthorAgentID?: string | null;

    @Field({ nullable: true })
    Title?: string | null;

    @Field({ nullable: true })
    Slug?: string | null;

    @Field({ nullable: true })
    BodyMarkdown?: string;

    @Field({ nullable: true })
    SummaryMarkdown?: string | null;

    @Field({ nullable: true })
    SummaryGeneratedAt?: Date | null;

    @Field(() => Int, { nullable: true })
    SummaryReplyWatermark?: number;

    @Field({ nullable: true })
    VisibilityBand?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsPinned?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsLocked?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsFeatured?: boolean;

    @Field(() => Int, { nullable: true })
    ReplyCount?: number;

    @Field(() => Int, { nullable: true })
    ParticipantCount?: number;

    @Field(() => Int, { nullable: true })
    ReactionScore?: number;

    @Field(() => Int, { nullable: true })
    ViewCount?: number;

    @Field({ nullable: true })
    LastActivityAt?: Date;

    @Field({ nullable: true })
    PromotedToSpaceID?: string | null;

    @Field({ nullable: true })
    LinkedTaskID?: string | null;

    @Field({ nullable: true })
    LinkedEntityID?: string | null;

    @Field({ nullable: true })
    LinkedRecordID?: string | null;

    @Field({ nullable: true })
    ConversationID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumPostViewResult {
    @Field(() => [mjBizAppsCommunityForumPost_])
    Results: mjBizAppsCommunityForumPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumPost_)
export class mjBizAppsCommunityForumPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumPostViewResult)
    async RunmjBizAppsCommunityForumPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostViewResult)
    async RunmjBizAppsCommunityForumPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumPostViewResult)
    async RunmjBizAppsCommunityForumPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumPost_, { nullable: true })
    async mjBizAppsCommunityForumPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumPost_)
    async CreatemjBizAppsCommunityForumPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumPostInput) input: CreatemjBizAppsCommunityForumPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumPost_)
    async UpdatemjBizAppsCommunityForumPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumPostInput) input: UpdatemjBizAppsCommunityForumPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumPost_)
    async DeletemjBizAppsCommunityForumPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Question Posts
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumQuestionPost_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    AcceptedAnswerPostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    AICanonAnswerPostID?: string;
        
    @Field(() => Int, {nullable: true}) 
    BountyPoints?: number;
        
    @Field({nullable: true}) 
    ResolvedAt?: Date;
        
    @Field(() => Int, {nullable: true}) 
    DeflectionCount?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Question Posts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumQuestionPostInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    AcceptedAnswerPostID: string | null;

    @Field({ nullable: true })
    AICanonAnswerPostID: string | null;

    @Field(() => Int, { nullable: true })
    BountyPoints?: number;

    @Field({ nullable: true })
    ResolvedAt: Date | null;

    @Field(() => Int, { nullable: true })
    DeflectionCount?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Question Posts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumQuestionPostInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    AcceptedAnswerPostID?: string | null;

    @Field({ nullable: true })
    AICanonAnswerPostID?: string | null;

    @Field(() => Int, { nullable: true })
    BountyPoints?: number;

    @Field({ nullable: true })
    ResolvedAt?: Date | null;

    @Field(() => Int, { nullable: true })
    DeflectionCount?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Question Posts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumQuestionPostViewResult {
    @Field(() => [mjBizAppsCommunityForumQuestionPost_])
    Results: mjBizAppsCommunityForumQuestionPost_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumQuestionPost_)
export class mjBizAppsCommunityForumQuestionPostResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumQuestionPostViewResult)
    async RunmjBizAppsCommunityForumQuestionPostViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumQuestionPostViewResult)
    async RunmjBizAppsCommunityForumQuestionPostViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumQuestionPostViewResult)
    async RunmjBizAppsCommunityForumQuestionPostDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Question Posts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumQuestionPost_, { nullable: true })
    async mjBizAppsCommunityForumQuestionPost(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumQuestionPost_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Question Posts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumQuestionPosts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Question Posts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Question Posts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumQuestionPost_)
    async CreatemjBizAppsCommunityForumQuestionPost(
        @Arg('input', () => CreatemjBizAppsCommunityForumQuestionPostInput) input: CreatemjBizAppsCommunityForumQuestionPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Question Posts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumQuestionPost_)
    async UpdatemjBizAppsCommunityForumQuestionPost(
        @Arg('input', () => UpdatemjBizAppsCommunityForumQuestionPostInput) input: UpdatemjBizAppsCommunityForumQuestionPostInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Question Posts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumQuestionPost_)
    async DeletemjBizAppsCommunityForumQuestionPost(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Question Posts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Role Types
//****************************************************************************
@ObjectType({ description: "Metadata registry of forum role types and capability flags for posting, moderation, canon verification, co-editing, and space graduation." })
export class mjBizAppsCommunityForumRoleType_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Code?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Name?: string;
        
    @Field({nullable: true}) 
    Description?: string;
        
    @Field(() => Int, {nullable: true}) 
    Level?: number;
        
    @Field(() => Boolean, {nullable: true}) 
    CanConfigureForum?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanModerateQueue?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanPinOrLock?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanAcceptAnswers?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanVerifyCanon?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanPromoteToSpace?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanCreateRootPost?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanReply?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    CanCoEditDocs?: boolean;
        
    @Field(() => Float, {nullable: true}) 
    VoteWeightMultiplier?: number;
        
    @Field(() => Int, {nullable: true}) 
    Sequence?: number;
        
    @Field(() => Boolean, {nullable: true}) 
    IsActive?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Role Types
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumRoleTypeInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field(() => Int, { nullable: true })
    Level?: number;

    @Field(() => Boolean, { nullable: true })
    CanConfigureForum?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanModerateQueue?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanPinOrLock?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanAcceptAnswers?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanVerifyCanon?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanPromoteToSpace?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanCreateRootPost?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanReply?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanCoEditDocs?: boolean;

    @Field(() => Float, { nullable: true })
    VoteWeightMultiplier?: number;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Role Types
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumRoleTypeInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field(() => Int, { nullable: true })
    Level?: number;

    @Field(() => Boolean, { nullable: true })
    CanConfigureForum?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanModerateQueue?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanPinOrLock?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanAcceptAnswers?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanVerifyCanon?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanPromoteToSpace?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanCreateRootPost?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanReply?: boolean;

    @Field(() => Boolean, { nullable: true })
    CanCoEditDocs?: boolean;

    @Field(() => Float, { nullable: true })
    VoteWeightMultiplier?: number;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Role Types
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumRoleTypeViewResult {
    @Field(() => [mjBizAppsCommunityForumRoleType_])
    Results: mjBizAppsCommunityForumRoleType_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumRoleType_)
export class mjBizAppsCommunityForumRoleTypeResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumRoleTypeViewResult)
    async RunmjBizAppsCommunityForumRoleTypeViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumRoleTypeViewResult)
    async RunmjBizAppsCommunityForumRoleTypeViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumRoleTypeViewResult)
    async RunmjBizAppsCommunityForumRoleTypeDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Role Types';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumRoleType_, { nullable: true })
    async mjBizAppsCommunityForumRoleType(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumRoleType_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Role Types', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumRoleTypes')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Role Types', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Role Types', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumRoleType_)
    async CreatemjBizAppsCommunityForumRoleType(
        @Arg('input', () => CreatemjBizAppsCommunityForumRoleTypeInput) input: CreatemjBizAppsCommunityForumRoleTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Role Types', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumRoleType_)
    async UpdatemjBizAppsCommunityForumRoleType(
        @Arg('input', () => UpdatemjBizAppsCommunityForumRoleTypeInput) input: UpdatemjBizAppsCommunityForumRoleTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Role Types', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumRoleType_)
    async DeletemjBizAppsCommunityForumRoleType(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Role Types', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Subscriptions
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumSubscription_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ForumID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    RootPostID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    TopicTagID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    DeliveryLevel?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    Forum?: string;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    TopicTag?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Subscriptions
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumSubscriptionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ForumID: string | null;

    @Field({ nullable: true })
    RootPostID: string | null;

    @Field({ nullable: true })
    TopicTagID: string | null;

    @Field({ nullable: true })
    DeliveryLevel?: string;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Subscriptions
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumSubscriptionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ForumID?: string | null;

    @Field({ nullable: true })
    RootPostID?: string | null;

    @Field({ nullable: true })
    TopicTagID?: string | null;

    @Field({ nullable: true })
    DeliveryLevel?: string;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Subscriptions
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumSubscriptionViewResult {
    @Field(() => [mjBizAppsCommunityForumSubscription_])
    Results: mjBizAppsCommunityForumSubscription_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumSubscription_)
export class mjBizAppsCommunityForumSubscriptionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumSubscriptionViewResult)
    async RunmjBizAppsCommunityForumSubscriptionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumSubscriptionViewResult)
    async RunmjBizAppsCommunityForumSubscriptionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumSubscriptionViewResult)
    async RunmjBizAppsCommunityForumSubscriptionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Subscriptions';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumSubscription_, { nullable: true })
    async mjBizAppsCommunityForumSubscription(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumSubscription_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Subscriptions', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumSubscriptions')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Subscriptions', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Subscriptions', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumSubscription_)
    async CreatemjBizAppsCommunityForumSubscription(
        @Arg('input', () => CreatemjBizAppsCommunityForumSubscriptionInput) input: CreatemjBizAppsCommunityForumSubscriptionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Subscriptions', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumSubscription_)
    async UpdatemjBizAppsCommunityForumSubscription(
        @Arg('input', () => UpdatemjBizAppsCommunityForumSubscriptionInput) input: UpdatemjBizAppsCommunityForumSubscriptionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Subscriptions', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumSubscription_)
    async DeletemjBizAppsCommunityForumSubscription(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Subscriptions', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Topic Tags
//****************************************************************************
@ObjectType()
export class mjBizAppsCommunityForumTopicTag_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ParentTagID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    TagID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Slug?: string;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    Name?: string;
        
    @Field({nullable: true}) 
    @MaxLength(500)
    Description?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    ColorHex?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    IsOfficial?: boolean;
        
    @Field(() => Int, {nullable: true}) 
    PostCount?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    ParentTag?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Tag?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Topic Tags
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumTopicTagInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    ParentTagID: string | null;

    @Field({ nullable: true })
    TagID: string | null;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    ColorHex: string | null;

    @Field(() => Boolean, { nullable: true })
    IsOfficial?: boolean;

    @Field(() => Int, { nullable: true })
    PostCount?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Topic Tags
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumTopicTagInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    ParentTagID?: string | null;

    @Field({ nullable: true })
    TagID?: string | null;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    ColorHex?: string | null;

    @Field(() => Boolean, { nullable: true })
    IsOfficial?: boolean;

    @Field(() => Int, { nullable: true })
    PostCount?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Topic Tags
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumTopicTagViewResult {
    @Field(() => [mjBizAppsCommunityForumTopicTag_])
    Results: mjBizAppsCommunityForumTopicTag_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumTopicTag_)
export class mjBizAppsCommunityForumTopicTagResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumTopicTagViewResult)
    async RunmjBizAppsCommunityForumTopicTagViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumTopicTagViewResult)
    async RunmjBizAppsCommunityForumTopicTagViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumTopicTagViewResult)
    async RunmjBizAppsCommunityForumTopicTagDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Topic Tags';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumTopicTag_, { nullable: true })
    async mjBizAppsCommunityForumTopicTag(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumTopicTag_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Topic Tags', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumTopicTags')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Topic Tags', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Topic Tags', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumTopicTag_)
    async CreatemjBizAppsCommunityForumTopicTag(
        @Arg('input', () => CreatemjBizAppsCommunityForumTopicTagInput) input: CreatemjBizAppsCommunityForumTopicTagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Topic Tags', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumTopicTag_)
    async UpdatemjBizAppsCommunityForumTopicTag(
        @Arg('input', () => UpdatemjBizAppsCommunityForumTopicTagInput) input: UpdatemjBizAppsCommunityForumTopicTagInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Topic Tags', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumTopicTag_)
    async DeletemjBizAppsCommunityForumTopicTag(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Topic Tags', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forum Types
//****************************************************************************
@ObjectType({ description: "Metadata registry of forum types, binding each forum archetype to optional server/UI drivers and IsA extension entities." })
export class mjBizAppsCommunityForumType_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Code?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Name?: string;
        
    @Field({nullable: true}) 
    Description?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Icon?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    ServerDriverClass?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    UIDriverClass?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    ExtensionEntity?: string;
        
    @Field({nullable: true}) 
    Configuration?: string;
        
    @Field(() => Int, {nullable: true}) 
    Sequence?: number;
        
    @Field(() => Boolean, {nullable: true}) 
    IsActive?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Types
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumTypeInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    Icon: string | null;

    @Field({ nullable: true })
    ServerDriverClass: string | null;

    @Field({ nullable: true })
    UIDriverClass: string | null;

    @Field({ nullable: true })
    ExtensionEntity: string | null;

    @Field({ nullable: true })
    Configuration: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forum Types
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumTypeInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    Icon?: string | null;

    @Field({ nullable: true })
    ServerDriverClass?: string | null;

    @Field({ nullable: true })
    UIDriverClass?: string | null;

    @Field({ nullable: true })
    ExtensionEntity?: string | null;

    @Field({ nullable: true })
    Configuration?: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forum Types
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumTypeViewResult {
    @Field(() => [mjBizAppsCommunityForumType_])
    Results: mjBizAppsCommunityForumType_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForumType_)
export class mjBizAppsCommunityForumTypeResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumTypeViewResult)
    async RunmjBizAppsCommunityForumTypeViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumTypeViewResult)
    async RunmjBizAppsCommunityForumTypeViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumTypeViewResult)
    async RunmjBizAppsCommunityForumTypeDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forum Types';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForumType_, { nullable: true })
    async mjBizAppsCommunityForumType(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForumType_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forum Types', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForumTypes')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forum Types', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forum Types', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForumType_)
    async CreatemjBizAppsCommunityForumType(
        @Arg('input', () => CreatemjBizAppsCommunityForumTypeInput) input: CreatemjBizAppsCommunityForumTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forum Types', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForumType_)
    async UpdatemjBizAppsCommunityForumType(
        @Arg('input', () => UpdatemjBizAppsCommunityForumTypeInput) input: UpdatemjBizAppsCommunityForumTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forum Types', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForumType_)
    async DeletemjBizAppsCommunityForumType(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forum Types', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Forums
//****************************************************************************
@ObjectType({ description: "Discussion, Q&A, ideation, document co-authoring, case review, or live event channels inside a Community Space." })
export class mjBizAppsCommunityForum_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    SpaceID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ParentForumID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(36)
    ForumTypeID?: string;
        
    @Field({nullable: true}) 
    @MaxLength(120)
    Slug?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    Name?: string;
        
    @Field({nullable: true}) 
    Description?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Icon?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    ColorHex?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    VisibilityBand?: string;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    AnonymousReadMode?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    InheritsSpaceMembers?: boolean;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    PostingPolicy?: string;
        
    @Field({nullable: true}) 
    @MaxLength(150)
    InboundEmailAlias?: string;
        
    @Field(() => Int, {nullable: true}) 
    Sequence?: number;
        
    @Field({nullable: true}) 
    @MaxLength(30)
    Status?: string;
        
    @Field({nullable: true}) 
    Configuration?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    ParentForum?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    ForumType?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forums
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityForumInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    ParentForumID: string | null;

    @Field({ nullable: true })
    ForumTypeID?: string;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    Icon: string | null;

    @Field({ nullable: true })
    ColorHex: string | null;

    @Field({ nullable: true })
    VisibilityBand?: string;

    @Field({ nullable: true })
    AnonymousReadMode: string | null;

    @Field(() => Boolean, { nullable: true })
    InheritsSpaceMembers?: boolean;

    @Field({ nullable: true })
    PostingPolicy?: string;

    @Field({ nullable: true })
    InboundEmailAlias: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    Configuration: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Forums
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityForumInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SpaceID?: string;

    @Field({ nullable: true })
    ParentForumID?: string | null;

    @Field({ nullable: true })
    ForumTypeID?: string;

    @Field({ nullable: true })
    Slug?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    Icon?: string | null;

    @Field({ nullable: true })
    ColorHex?: string | null;

    @Field({ nullable: true })
    VisibilityBand?: string;

    @Field({ nullable: true })
    AnonymousReadMode?: string | null;

    @Field(() => Boolean, { nullable: true })
    InheritsSpaceMembers?: boolean;

    @Field({ nullable: true })
    PostingPolicy?: string;

    @Field({ nullable: true })
    InboundEmailAlias?: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    Configuration?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Forums
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityForumViewResult {
    @Field(() => [mjBizAppsCommunityForum_])
    Results: mjBizAppsCommunityForum_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityForum_)
export class mjBizAppsCommunityForumResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityForumViewResult)
    async RunmjBizAppsCommunityForumViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumViewResult)
    async RunmjBizAppsCommunityForumViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityForumViewResult)
    async RunmjBizAppsCommunityForumDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Forums';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityForum_, { nullable: true })
    async mjBizAppsCommunityForum(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityForum_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Forums', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwForums')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Forums', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Forums', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityForum_)
    async CreatemjBizAppsCommunityForum(
        @Arg('input', () => CreatemjBizAppsCommunityForumInput) input: CreatemjBizAppsCommunityForumInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Forums', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityForum_)
    async UpdatemjBizAppsCommunityForum(
        @Arg('input', () => UpdatemjBizAppsCommunityForumInput) input: UpdatemjBizAppsCommunityForumInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Forums', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityForum_)
    async DeletemjBizAppsCommunityForum(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Forums', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Community: Post Types
//****************************************************************************
@ObjectType({ description: "Metadata registry of post types, binding each post archetype to optional server/UI drivers, placement rules, and IsA extension entities." })
export class mjBizAppsCommunityPostType_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Code?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Name?: string;
        
    @Field({nullable: true}) 
    Description?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    Icon?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    ServerDriverClass?: string;
        
    @Field({nullable: true}) 
    @MaxLength(200)
    UIDriverClass?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    ExtensionEntity?: string;
        
    @Field({nullable: true}) 
    @MaxLength(20)
    PlacementRule?: string;
        
    @Field(() => Boolean, {nullable: true}) 
    AllowsNestedReplies?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    TriggersThreadSynthesis?: boolean;
        
    @Field(() => Boolean, {nullable: true}) 
    IndexedInCorpus?: boolean;
        
    @Field({nullable: true}) 
    Configuration?: string;
        
    @Field(() => Int, {nullable: true}) 
    Sequence?: number;
        
    @Field(() => Boolean, {nullable: true}) 
    IsActive?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Post Types
//****************************************************************************
@InputType()
export class CreatemjBizAppsCommunityPostTypeInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    Icon: string | null;

    @Field({ nullable: true })
    ServerDriverClass: string | null;

    @Field({ nullable: true })
    UIDriverClass: string | null;

    @Field({ nullable: true })
    ExtensionEntity: string | null;

    @Field({ nullable: true })
    PlacementRule?: string;

    @Field(() => Boolean, { nullable: true })
    AllowsNestedReplies?: boolean;

    @Field(() => Boolean, { nullable: true })
    TriggersThreadSynthesis?: boolean;

    @Field(() => Boolean, { nullable: true })
    IndexedInCorpus?: boolean;

    @Field({ nullable: true })
    Configuration: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Community: Post Types
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCommunityPostTypeInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    Icon?: string | null;

    @Field({ nullable: true })
    ServerDriverClass?: string | null;

    @Field({ nullable: true })
    UIDriverClass?: string | null;

    @Field({ nullable: true })
    ExtensionEntity?: string | null;

    @Field({ nullable: true })
    PlacementRule?: string;

    @Field(() => Boolean, { nullable: true })
    AllowsNestedReplies?: boolean;

    @Field(() => Boolean, { nullable: true })
    TriggersThreadSynthesis?: boolean;

    @Field(() => Boolean, { nullable: true })
    IndexedInCorpus?: boolean;

    @Field({ nullable: true })
    Configuration?: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => Boolean, { nullable: true })
    IsActive?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Community: Post Types
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCommunityPostTypeViewResult {
    @Field(() => [mjBizAppsCommunityPostType_])
    Results: mjBizAppsCommunityPostType_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCommunityPostType_)
export class mjBizAppsCommunityPostTypeResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCommunityPostTypeViewResult)
    async RunmjBizAppsCommunityPostTypeViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityPostTypeViewResult)
    async RunmjBizAppsCommunityPostTypeViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCommunityPostTypeViewResult)
    async RunmjBizAppsCommunityPostTypeDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Community: Post Types';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCommunityPostType_, { nullable: true })
    async mjBizAppsCommunityPostType(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCommunityPostType_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Community: Post Types', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCommunity', 'vwPostTypes')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Community: Post Types', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Community: Post Types', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCommunityPostType_)
    async CreatemjBizAppsCommunityPostType(
        @Arg('input', () => CreatemjBizAppsCommunityPostTypeInput) input: CreatemjBizAppsCommunityPostTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Community: Post Types', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCommunityPostType_)
    async UpdatemjBizAppsCommunityPostType(
        @Arg('input', () => UpdatemjBizAppsCommunityPostTypeInput) input: UpdatemjBizAppsCommunityPostTypeInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Community: Post Types', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCommunityPostType_)
    async DeletemjBizAppsCommunityPostType(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Community: Post Types', key, options, provider, userPayload, pubSub);
    }
    
}