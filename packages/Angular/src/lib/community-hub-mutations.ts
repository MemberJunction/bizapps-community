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

// ... existing interfaces ...
export interface CommunityGraphQLResponse {
  GraduateCommunityThread?: GraduateCommunityThreadMutationPayload | null;
  PromoteCommunityAnswerToCanon?: PromoteCommunityAnswerToCanonMutationPayload | null;
  ToggleCommunityPostReaction?: CommunityReactionToggleMutationPayload | null;
}

// ... existing functions ...
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
