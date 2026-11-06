/**
 * 4-Level Hierarchical Configuration Cascade, PostType Placement Validation,
 * and Per-Forum Participant Role Resolution for BizApps Community.
 *
 * Hierarchy:
 *   Level 1: Global `MJ: Application Settings` (`bizapps.community.defaults`)
 *   Level 2: `ForumType.Configuration` (and `BaseForumType` ancestor chain)
 *   Level 3: `CommunitySpace.Configuration` (Space-level overrides)
 *   Level 4: `Forum.Configuration` (Forum & Sub-Forum `ParentForumID` chain overrides)
 */

import type { AnonymousAccessMode, IdeationVotingMechanism } from './rules.ts';

export type PostPlacement = 'RootOnly' | 'ReplyOnly' | 'Both';
export type ModerationMode = 'None' | 'FirstPostQueue' | 'LowTrustQueue' | 'AllPostsQueue' | 'AITriageFirst';
export type ArtifactCoEditMode = 'AuthorOnly' | 'ForumModerators' | 'HighTrustMembers' | 'AllContributors';

export interface ICommunityFeaturesConfig {
  /** Stack Overflow + AI Epistemic Answer Grading */
  qaGrading: {
    enabled: boolean;
    allowDownvotes: boolean;
    expertVoteMultiplier: boolean;
    aiEpistemicGrading: boolean;
    autoFlagOutdatedAnswers: boolean;
  };
  /** Participatory Budgeting & Quadratic Ideation */
  ideation: {
    enabled: boolean;
    defaultVotingMechanism: IdeationVotingMechanism;
    defaultBudgetPerMember: number;
    refundPointsOnShip: boolean;
  };
  /** MJ Forms Polls, Surveys & Structured Intakes (Hard Dependency) */
  formsAndPolls: {
    enabled: boolean;
    allowMemberCreatedPolls: boolean;
    allowAnonymousFormResponses: boolean;
  };
  /** MJ Core Docs, Slides & Sheets Co-Editing (MJ PR #6215) */
  collaborativeDocs: {
    enabled: boolean;
    allowedArtifactTypes: Array<'Document' | 'Presentation' | 'Spreadsheet'>;
    defaultCoEditMode: ArtifactCoEditMode;
    enablePassageAnchoredThreads: boolean;
    allowAgentSuggestRedlines: boolean;
  };
  /** AI-Generated Interactive Games, Quizzes & Simulations (MJ PR #5257) */
  interactiveMiniApps: {
    enabled: boolean;
    allowAIAssistantGameBuilder: boolean;
    requireModeratorApprovalBeforePublish: boolean;
    enableLeaderboards: boolean;
  };
  /** Moderation, Anonymity & Safety */
  moderation: {
    mode: ModerationMode;
    allowScopedPseudonymousPosts: boolean;
    piiRedactionBeforePublish: boolean;
    autoCollapseLowSignalReplies: boolean;
  };
  /** Anonymous Public Edge Access */
  anonymousAccess: {
    mode: AnonymousAccessMode;
    teaserReplyLimit: number;
    allowSearchEngineIndexing: boolean;
  };
  /** Collaboration Working Space Promotion */
  workingSpacePromotion: {
    enabled: boolean;
    replyCountThreshold: number;
    distinctParticipantThreshold: number;
    defaultTargetSpaceTypeName: string;
  };
}

export interface IForumResolvedConfiguration {
  /** Ordered list of PostType.Name slugs allowed for new root posts in this forum */
  allowedRootPostTypes: string[];
  /** Ordered list of PostType.Name slugs allowed for replies in this forum */
  allowedReplyPostTypes: string[];
  /** Default PostType.Name selected when a user clicks "New Post" */
  defaultRootPostType: string;
  /** Feature switches & parameters */
  features: ICommunityFeaturesConfig;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<U>
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

export type IForumConfigurationOverride = DeepPartial<IForumResolvedConfiguration>;

/**
 * Built-in baseline defaults (Level 0 fallback when `MJ: Application Settings` has no overrides).
 */
export const DEFAULT_FORUM_CONFIGURATION: IForumResolvedConfiguration = {
  allowedRootPostTypes: [
    'discussion',
    'question',
    'idea-proposal',
    'form-poll',
    'collaborative-artifact',
    'interactive-mini-app',
  ],
  allowedReplyPostTypes: [
    'discussion',
    'answer',
    'form-poll',
    'collaborative-artifact',
    'interactive-mini-app',
  ],
  defaultRootPostType: 'discussion',
  features: {
    qaGrading: {
      enabled: true,
      allowDownvotes: true,
      expertVoteMultiplier: true,
      aiEpistemicGrading: true,
      autoFlagOutdatedAnswers: true,
    },
    ideation: {
      enabled: true,
      defaultVotingMechanism: 'PointAllocation',
      defaultBudgetPerMember: 100,
      refundPointsOnShip: true,
    },
    formsAndPolls: {
      enabled: true,
      allowMemberCreatedPolls: true,
      allowAnonymousFormResponses: false,
    },
    collaborativeDocs: {
      enabled: true,
      allowedArtifactTypes: ['Document', 'Presentation', 'Spreadsheet'],
      defaultCoEditMode: 'HighTrustMembers',
      enablePassageAnchoredThreads: true,
      allowAgentSuggestRedlines: true,
    },
    interactiveMiniApps: {
      enabled: true,
      allowAIAssistantGameBuilder: true,
      requireModeratorApprovalBeforePublish: false,
      enableLeaderboards: true,
    },
    moderation: {
      mode: 'AITriageFirst',
      allowScopedPseudonymousPosts: false,
      piiRedactionBeforePublish: true,
      autoCollapseLowSignalReplies: true,
    },
    anonymousAccess: {
      mode: 'None',
      teaserReplyLimit: 3,
      allowSearchEngineIndexing: false,
    },
    workingSpacePromotion: {
      enabled: true,
      replyCountThreshold: 8,
      distinctParticipantThreshold: 4,
      defaultTargetSpaceTypeName: 'working-group',
    },
  },
};

function mergeOverride(
  base: IForumResolvedConfiguration,
  override?: IForumConfigurationOverride | null,
): IForumResolvedConfiguration {
  if (!override) {
    return base;
  }

  return {
    allowedRootPostTypes: override.allowedRootPostTypes
      ? [...override.allowedRootPostTypes]
      : [...base.allowedRootPostTypes],
    allowedReplyPostTypes: override.allowedReplyPostTypes
      ? [...override.allowedReplyPostTypes]
      : [...base.allowedReplyPostTypes],
    defaultRootPostType: override.defaultRootPostType ?? base.defaultRootPostType,
    features: {
      qaGrading: {
        ...base.features.qaGrading,
        ...(override.features?.qaGrading ?? {}),
      },
      ideation: {
        ...base.features.ideation,
        ...(override.features?.ideation ?? {}),
      },
      formsAndPolls: {
        ...base.features.formsAndPolls,
        ...(override.features?.formsAndPolls ?? {}),
      },
      collaborativeDocs: {
        ...base.features.collaborativeDocs,
        ...(override.features?.collaborativeDocs ?? {}),
        allowedArtifactTypes: override.features?.collaborativeDocs?.allowedArtifactTypes
          ? [...override.features.collaborativeDocs.allowedArtifactTypes]
          : [...base.features.collaborativeDocs.allowedArtifactTypes],
      },
      interactiveMiniApps: {
        ...base.features.interactiveMiniApps,
        ...(override.features?.interactiveMiniApps ?? {}),
      },
      moderation: {
        ...base.features.moderation,
        ...(override.features?.moderation ?? {}),
      },
      anonymousAccess: {
        ...base.features.anonymousAccess,
        ...(override.features?.anonymousAccess ?? {}),
      },
      workingSpacePromotion: {
        ...base.features.workingSpacePromotion,
        ...(override.features?.workingSpacePromotion ?? {}),
      },
    },
  };
}

export interface ForumConfigurationCascadeInput {
  /** Level 1: Organization-wide `MJ: Application Settings` (`bizapps.community.defaults`) */
  globalAppSettings?: IForumConfigurationOverride | null;
  /** Level 2: `ForumType` chain ordered from root `BaseForumType` down to concrete `ForumType` */
  forumTypeChain?: readonly (IForumConfigurationOverride | null | undefined)[];
  /** Level 3: `CommunitySpace.Configuration` */
  communitySpaceConfig?: IForumConfigurationOverride | null;
  /** Level 4: `Forum` chain ordered from top-level parent `Forum` down to target sub-forum */
  forumHierarchyChain?: readonly (IForumConfigurationOverride | null | undefined)[];
  /** Security guardrail: if the Forum is in the `Team` band, anonymous access is forced to `None` */
  forumBand?: 'Shared' | 'Team';
}

/**
 * Resolves the effective configuration for a Forum by cascading overrides across all 4 levels:
 *   1. Global `MJ: Application Settings`
 *   2. `ForumType` (including `BaseForumTypeID` inheritance chain)
 *   3. `CommunitySpace`
 *   4. `Forum` (including `ParentForumID` sub-forum inheritance chain)
 */
export function resolveForumConfiguration(
  input: ForumConfigurationCascadeInput,
): IForumResolvedConfiguration {
  let resolved = mergeOverride(DEFAULT_FORUM_CONFIGURATION, input.globalAppSettings);

  for (const typeOverride of input.forumTypeChain ?? []) {
    resolved = mergeOverride(resolved, typeOverride);
  }

  resolved = mergeOverride(resolved, input.communitySpaceConfig);

  for (const forumOverride of input.forumHierarchyChain ?? []) {
    resolved = mergeOverride(resolved, forumOverride);
  }

  // Enforce hard security invariant: Team-band forums never allow anonymous read or search indexing
  if (input.forumBand === 'Team') {
    resolved = {
      ...resolved,
      features: {
        ...resolved.features,
        anonymousAccess: {
          ...resolved.features.anonymousAccess,
          mode: 'None',
          allowSearchEngineIndexing: false,
        },
      },
    };
  }

  return resolved;
}

export interface PostTypeDescriptor {
  name: string;
  allowedPlacement: PostPlacement;
  isActive: boolean;
}

export interface PostPlacementValidationResult {
  allowed: boolean;
  reason?:
    | 'INACTIVE_POST_TYPE'
    | 'ROOT_PLACEMENT_NOT_ALLOWED_BY_TYPE'
    | 'REPLY_PLACEMENT_NOT_ALLOWED_BY_TYPE'
    | 'NOT_ALLOWED_IN_FORUM_ROOT_TYPES'
    | 'NOT_ALLOWED_IN_FORUM_REPLY_TYPES';
}

/**
 * Validates whether a `PostType` can be created as a root post or reply inside a Forum
 * given both the `PostType.AllowedPlacement` contract and the Forum's resolved configuration.
 */
export function validatePostTypePlacement(
  postType: PostTypeDescriptor,
  isReply: boolean,
  forumConfig: IForumResolvedConfiguration,
): PostPlacementValidationResult {
  if (!postType.isActive) {
    return { allowed: false, reason: 'INACTIVE_POST_TYPE' };
  }

  if (!isReply) {
    if (postType.allowedPlacement === 'ReplyOnly') {
      return { allowed: false, reason: 'ROOT_PLACEMENT_NOT_ALLOWED_BY_TYPE' };
    }
    if (!forumConfig.allowedRootPostTypes.includes(postType.name)) {
      return { allowed: false, reason: 'NOT_ALLOWED_IN_FORUM_ROOT_TYPES' };
    }
    return { allowed: true };
  }

  if (postType.allowedPlacement === 'RootOnly') {
    return { allowed: false, reason: 'REPLY_PLACEMENT_NOT_ALLOWED_BY_TYPE' };
  }
  if (!forumConfig.allowedReplyPostTypes.includes(postType.name)) {
    return { allowed: false, reason: 'NOT_ALLOWED_IN_FORUM_REPLY_TYPES' };
  }
  return { allowed: true };
}

export interface ForumRoleAssignment {
  roleName: string;
  canPinOrLock: boolean;
  canModerateQueue: boolean;
  canVerifyCanon: boolean;
  canPromoteToSpace: boolean;
  canConfigureForum: boolean;
  voteWeightMultiplier: number;
  expiresAt?: Date | null;
}

export interface EffectiveForumParticipantPermissions {
  activeRoleNames: string[];
  canPinOrLock: boolean;
  canModerateQueue: boolean;
  canVerifyCanon: boolean;
  canPromoteToSpace: boolean;
  canConfigureForum: boolean;
  effectiveVoteWeightMultiplier: number;
}

/**
 * Aggregates a participant's active `ForumMemberRole` assignments (including roles inherited
 * from parent forums when `InheritsToSubForums = 1`) into effective forum permissions and
 * maximum vote weight multiplier.
 */
export function resolveEffectiveForumPermissions(
  assignments: readonly ForumRoleAssignment[],
  now: Date = new Date(),
): EffectiveForumParticipantPermissions {
  const activeAssignments = assignments.filter(
    (a) => !a.expiresAt || a.expiresAt.getTime() > now.getTime(),
  );

  return {
    activeRoleNames: activeAssignments.map((a) => a.roleName),
    canPinOrLock: activeAssignments.some((a) => a.canPinOrLock),
    canModerateQueue: activeAssignments.some((a) => a.canModerateQueue),
    canVerifyCanon: activeAssignments.some((a) => a.canVerifyCanon),
    canPromoteToSpace: activeAssignments.some((a) => a.canPromoteToSpace),
    canConfigureForum: activeAssignments.some((a) => a.canConfigureForum),
    effectiveVoteWeightMultiplier: activeAssignments.reduce(
      (maxWeight, a) => Math.max(maxWeight, a.voteWeightMultiplier),
      1.0,
    ),
  };
}
