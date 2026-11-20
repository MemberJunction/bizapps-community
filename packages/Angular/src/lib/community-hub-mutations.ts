import { Metadata, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { AssertValidUUID } from '@mj-biz-apps/community-core';

export const GRADUATE_COMMUNITY_THREAD_MUTATION = `
  mutation GraduateCommunityThread($input: GraduateCommunityThreadInput!) {
    GraduateCommunityThread(input: $input) {
      Success
      PromotedToSpaceID
      TargetSpaceTypeCode
      SeededTaskID
      InvitedParticipantCount
      ErrorMessage
    }
  }
`;

export const PROMOTE_COMMUNITY_ANSWER_TO_CANON_MUTATION = `
  mutation PromoteCommunityAnswerToCanon($input: PromoteCommunityAnswerToCanonInput!) {
    PromoteCommunityAnswerToCanon(input: $input) {
      Success
      QuestionPostID
      CanonAnswerPostID
      AlreadyPromoted
      ErrorMessage
    }
  }
`;

export const TOGGLE_COMMUNITY_POST_REACTION_MUTATION = `
  mutation ToggleCommunityPostReaction($input: CommunityReactionToggleInputGQL!) {
    ToggleCommunityPostReaction(input: $input) {
      Success
      ErrorMessage
      PostID
      ReactionType
      Reacted
      ReactionScore
      ReactionID
    }
  }
`;

export const CREATE_FORUM_QUESTION_POST_MUTATION = `
  mutation CreatemjBizAppsCommunityForumQuestionPost($input: CreatemjBizAppsCommunityForumQuestionPostInput!) {
    CreatemjBizAppsCommunityForumQuestionPost(input: $input) {
      ID
    }
  }
`;

export const DELETE_FORUM_QUESTION_POST_MUTATION = `
  mutation DeletemjBizAppsCommunityForumQuestionPost($ID: String!, $options___: DeleteOptionsInput!) {
    DeletemjBizAppsCommunityForumQuestionPost(ID: $ID, options___: $options___) {
      ID
    }
  }
`;

export interface CreateForumQuestionPostMutationInput {
  ID: string;
}

export interface CreateForumQuestionPostMutationPayload {
  ID: string;
}

export interface DeleteForumQuestionPostGraphQLVariables {
  ID: string;
  options___: {
    SkipEntityAIActions: boolean;
    SkipEntityActions: boolean;
    ReplayOnly: boolean;
    IsParentEntityDelete: boolean;
  };
}

export interface CommunityReactionToggleMutationInput {
  PostID: string;
  ReactionType: string;
}

export interface CommunityReactionToggleMutationPayload {
  Success: boolean;
  ErrorMessage?: string | null;
  PostID?: string | null;
  ReactionType?: string | null;
  Reacted?: boolean | null;
  ReactionScore?: number | null;
  ReactionID?: string | null;
}

export interface GraduateCommunityThreadMutationInput {
  RootPostID: string;
  TargetSpaceTypeCode: string;
  TargetSpaceName: string;
  SeedInitialTaskTitle?: string;
  IncludeParticipantUserIDs?: string[];
  AllowedChildSpaceTypeCodes?: string[];
}

export interface GraduateCommunityThreadMutationPayload {
  Success: boolean;
  PromotedToSpaceID?: string | null;
  TargetSpaceTypeCode?: string | null;
  SeededTaskID?: string | null;
  InvitedParticipantCount?: number | null;
  ErrorMessage?: string | null;
}

export interface PromoteCommunityAnswerToCanonMutationInput {
  QuestionPostID: string;
  CanonAnswerPostID: string;
}

export interface PromoteCommunityAnswerToCanonMutationPayload {
  Success: boolean;
  QuestionPostID?: string | null;
  CanonAnswerPostID?: string | null;
  AlreadyPromoted?: boolean | null;
  ErrorMessage?: string | null;
}

export type CommunityGraphQLVariables =
  | {
      input:
        | GraduateCommunityThreadMutationInput
        | PromoteCommunityAnswerToCanonMutationInput
        | CommunityReactionToggleMutationInput
        | CreateForumQuestionPostMutationInput;
    }
  | DeleteForumQuestionPostGraphQLVariables;

export interface CommunityGraphQLResponse {
  GraduateCommunityThread?: GraduateCommunityThreadMutationPayload | null;
  PromoteCommunityAnswerToCanon?: PromoteCommunityAnswerToCanonMutationPayload | null;
  ToggleCommunityPostReaction?: CommunityReactionToggleMutationPayload | null;
  CreatemjBizAppsCommunityForumQuestionPost?: CreateForumQuestionPostMutationPayload | null;
  DeletemjBizAppsCommunityForumQuestionPost?: CreateForumQuestionPostMutationPayload | null;
}

export interface CommunityGraphQLExecutor {
  ExecuteGQL(
    query: string,
    variables: CommunityGraphQLVariables,
  ): Promise<CommunityGraphQLResponse | null | undefined>;
}

export type ProviderWithOptionalGraphQL = Pick<IMetadataProvider, 'CurrentUser'> & Partial<CommunityGraphQLExecutor>;

/**
 * Resolves a typed GraphQL executor from an active MJ provider (live `GraphQLDataProvider` or a
 * compatible test provider implementing `ExecuteGQL`). Returns `null` when unavailable.
 */
export function ResolveCommunityGraphQLExecutor(
  provider: ProviderWithOptionalGraphQL | CommunityGraphQLExecutor | null | undefined,
): CommunityGraphQLExecutor | null {
  if (!provider) {
    return null;
  }
  if (provider instanceof GraphQLDataProvider) {
    return {
      ExecuteGQL: (query, variables) => provider.ExecuteGQL(query, variables),
    };
  }
  if ('ExecuteGQL' in provider && typeof provider.ExecuteGQL === 'function') {
    const fn = provider.ExecuteGQL.bind(provider);
    return {
      ExecuteGQL: (query, variables) => fn(query, variables),
    };
  }
  return null;
}

/**
 * Invokes the authoritative server `ToggleCommunityPostReaction` GraphQL mutation via `ExecuteGQL`.
 */
export async function InvokeToggleCommunityPostReactionMutation(
  executor: CommunityGraphQLExecutor,
  input: CommunityReactionToggleMutationInput,
): Promise<CommunityReactionToggleMutationPayload> {
  AssertValidUUID(input.PostID, 'PostID');
  const response = await executor.ExecuteGQL(TOGGLE_COMMUNITY_POST_REACTION_MUTATION, { input });
  const payload = response?.ToggleCommunityPostReaction;
  if (!payload) {
    return {
      Success: false,
      ErrorMessage: 'Server returned an empty response for ToggleCommunityPostReaction.',
    };
  }
  return payload;
}

/**
 * Invokes the authoritative server `GraduateCommunityThread` GraphQL mutation via `ExecuteGQL`.
 */
export async function InvokeGraduateCommunityThreadMutation(
  executor: CommunityGraphQLExecutor,
  input: GraduateCommunityThreadMutationInput,
): Promise<GraduateCommunityThreadMutationPayload> {
  AssertValidUUID(input.RootPostID, 'RootPostID');
  const response = await executor.ExecuteGQL(GRADUATE_COMMUNITY_THREAD_MUTATION, { input });
  const payload = response?.GraduateCommunityThread;
  if (!payload) {
    return {
      Success: false,
      ErrorMessage: 'Server returned an empty response for GraduateCommunityThread.',
    };
  }
  return payload;
}

/**
 * Invokes the authoritative server `PromoteCommunityAnswerToCanon` GraphQL mutation via `ExecuteGQL`.
 */
export async function InvokePromoteCommunityAnswerToCanonMutation(
  executor: CommunityGraphQLExecutor,
  input: PromoteCommunityAnswerToCanonMutationInput,
): Promise<PromoteCommunityAnswerToCanonMutationPayload> {
  AssertValidUUID(input.QuestionPostID, 'QuestionPostID');
  AssertValidUUID(input.CanonAnswerPostID, 'CanonAnswerPostID');
  const response = await executor.ExecuteGQL(PROMOTE_COMMUNITY_ANSWER_TO_CANON_MUTATION, { input });
  const payload = response?.PromoteCommunityAnswerToCanon;
  if (!payload) {
    return {
      Success: false,
      ErrorMessage: 'Server returned an empty response for PromoteCommunityAnswerToCanon.',
    };
  }
  return payload;
}

export interface CanonPromotionClientResult {
  success: boolean;
  offlineFallback: boolean;
  alreadyPromoted?: boolean;
  errorMessage?: string;
}

/**
 * Executes Canon promotion cleanly against the authoritative server GraphQL mutation when
 * `Metadata.Provider` is configured, failing closed on missing user/GraphQL executor or server
 * rejection. Falls back to offline demo mode ONLY when `!Metadata.Provider`.
 */
export async function PromoteAnswerToCanonViaProvider(params: {
  questionPostId: string | null | undefined;
  canonAnswerPostId: string;
  provider?: ProviderWithOptionalGraphQL | null;
}): Promise<CanonPromotionClientResult> {
  const provider = params.provider === undefined ? Metadata.Provider : params.provider;
  if (!provider) {
    return { success: true, offlineFallback: true };
  }

  const user: UserInfo | undefined = provider.CurrentUser;
  if (!user) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Canon promotion requires an authenticated user session.',
    };
  }

  const executor = ResolveCommunityGraphQLExecutor(provider);
  if (!executor) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: 'Canon promotion requires an active GraphQL connection.',
    };
  }

  try {
    const answerId = AssertValidUUID(params.canonAnswerPostId, 'canonAnswerPostId');
    const questionId = AssertValidUUID(params.questionPostId ?? '', 'questionPostId');
    const payload = await InvokePromoteCommunityAnswerToCanonMutation(executor, {
      QuestionPostID: questionId,
      CanonAnswerPostID: answerId,
    });

    if (!payload.Success) {
      return {
        success: false,
        offlineFallback: false,
        errorMessage: payload.ErrorMessage ?? 'Failed to promote answer to Knowledge Canon.',
      };
    }

    return {
      success: true,
      offlineFallback: false,
      alreadyPromoted: Boolean(payload.AlreadyPromoted),
    };
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      errorMessage: err instanceof Error ? err.message : 'Failed to promote answer to Knowledge Canon.',
    };
  }
}

export interface ThreadGraduationClientResult {
  success: boolean;
  offlineFallback: boolean;
  promotedToSpaceId: string | null;
  targetSpaceTypeCode: string | null;
  seededTaskId: string | null;
  invitedParticipantCount: number | null;
  errorMessage?: string;
}

/**
 * Graduates a community thread into a Working Group / Collaboration Space via the authoritative
 * server `GraduateCommunityThread` GraphQL mutation when `Metadata.Provider` is configured,
 * failing closed on missing user/GraphQL executor or server rejection. Falls back to offline demo
 * mode ONLY when `!Metadata.Provider`.
 */
export async function GraduateThreadViaProvider(params: {
  rootPostId: string | null | undefined;
  targetSpaceName: string;
  targetSpaceTypeCode?: string;
  seedInitialTaskTitle?: string;
  provider?: ProviderWithOptionalGraphQL | null;
}): Promise<ThreadGraduationClientResult> {
  const provider = params.provider === undefined ? Metadata.Provider : params.provider;
  if (!provider) {
    return {
      success: true,
      offlineFallback: true,
      promotedToSpaceId: null,
      targetSpaceTypeCode: null,
      seededTaskId: null,
      invitedParticipantCount: null,
    };
  }

  const user: UserInfo | undefined = provider.CurrentUser;
  if (!user) {
    return {
      success: false,
      offlineFallback: false,
      promotedToSpaceId: null,
      targetSpaceTypeCode: null,
      seededTaskId: null,
      invitedParticipantCount: null,
      errorMessage: 'Graduating a community thread requires an authenticated user session.',
    };
  }

  const executor = ResolveCommunityGraphQLExecutor(provider);
  if (!executor) {
    return {
      success: false,
      offlineFallback: false,
      promotedToSpaceId: null,
      targetSpaceTypeCode: null,
      seededTaskId: null,
      invitedParticipantCount: null,
      errorMessage: 'Graduating a community thread requires an active GraphQL connection.',
    };
  }

  const targetSpaceName = params.targetSpaceName.trim();
  if (!targetSpaceName) {
    return {
      success: false,
      offlineFallback: false,
      promotedToSpaceId: null,
      targetSpaceTypeCode: null,
      seededTaskId: null,
      invitedParticipantCount: null,
      errorMessage: 'Target working group name is required to graduate this thread.',
    };
  }

  try {
    const validRootPostId = AssertValidUUID(params.rootPostId ?? '', 'rootPostId');
    const targetSpaceTypeCode = params.targetSpaceTypeCode?.trim() || 'working-group';
    const seedTitle = params.seedInitialTaskTitle?.trim();
    const payload = await InvokeGraduateCommunityThreadMutation(executor, {
      RootPostID: validRootPostId,
      TargetSpaceTypeCode: targetSpaceTypeCode,
      TargetSpaceName: targetSpaceName,
      ...(seedTitle ? { SeedInitialTaskTitle: seedTitle } : {}),
    });

    if (!payload.Success) {
      return {
        success: false,
        offlineFallback: false,
        promotedToSpaceId: null,
        targetSpaceTypeCode: payload.TargetSpaceTypeCode ?? null,
        seededTaskId: payload.SeededTaskID ?? null,
        invitedParticipantCount: payload.InvitedParticipantCount ?? null,
        errorMessage: payload.ErrorMessage ?? 'Failed to graduate thread to working group space.',
      };
    }

    return {
      success: true,
      offlineFallback: false,
      promotedToSpaceId: payload.PromotedToSpaceID ?? null,
      targetSpaceTypeCode: payload.TargetSpaceTypeCode ?? targetSpaceTypeCode,
      seededTaskId: payload.SeededTaskID ?? null,
      invitedParticipantCount: payload.InvitedParticipantCount ?? null,
    };
  } catch (err) {
    return {
      success: false,
      offlineFallback: false,
      promotedToSpaceId: null,
      targetSpaceTypeCode: null,
      seededTaskId: null,
      invitedParticipantCount: null,
      errorMessage: err instanceof Error ? err.message : 'Failed to graduate thread to working group space.',
    };
  }
}

export interface SharedPKQuestionPostBridge {
  ID: string;
  LatestResult?: { CompleteMessage?: string | null; Message?: string | null } | null;
  Save(): Promise<boolean>;
  Delete(): Promise<boolean>;
}

/**
 * Creates a `ForumQuestionPost` shared-PK extension adapter over GraphQL.
 *
 * `ForumQuestionPost.ID` is a shared primary key referencing `ForumPost.ID` with
 * `AllowUpdateAPI = false` and `ParentID = null`, so `GraphQLDataProvider.Save()` omits `ID`
 * on Create unless passed explicitly to `CreatemjBizAppsCommunityForumQuestionPost(input: { ID })`.
 */
export function CreateForumQuestionPostGraphQLAdapter(
  executor: CommunityGraphQLExecutor,
): SharedPKQuestionPostBridge {
  const adapter: SharedPKQuestionPostBridge = {
    ID: '',
    LatestResult: null,
    Save: async (): Promise<boolean> => {
      try {
        const validId = AssertValidUUID(adapter.ID, 'questionPostId');
        const response = await executor.ExecuteGQL(CREATE_FORUM_QUESTION_POST_MUTATION, {
          input: { ID: validId },
        });
        const createdId = response?.CreatemjBizAppsCommunityForumQuestionPost?.ID;
        if (!createdId) {
          adapter.LatestResult = {
            CompleteMessage: 'CreatemjBizAppsCommunityForumQuestionPost returned an empty payload.',
          };
          return false;
        }
        adapter.ID = createdId;
        adapter.LatestResult = null;
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed saving ForumQuestionPost via GraphQL.';
        adapter.LatestResult = { CompleteMessage: message };
        return false;
      }
    },
    Delete: async (): Promise<boolean> => {
      try {
        const validId = AssertValidUUID(adapter.ID, 'questionPostId');
        const response = await executor.ExecuteGQL(DELETE_FORUM_QUESTION_POST_MUTATION, {
          ID: validId,
          options___: {
            SkipEntityAIActions: false,
            SkipEntityActions: false,
            ReplayOnly: false,
            IsParentEntityDelete: false,
          },
        });
        return Boolean(response?.DeletemjBizAppsCommunityForumQuestionPost?.ID);
      } catch {
        return false;
      }
    },
  };
  return adapter;
}
