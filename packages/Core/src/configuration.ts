import type { AnonymousReadMode } from './rules.ts';

export type DigestCadence =
  | 'Every Post'
  | 'Daily Digest'
  | 'Weekly Digest'
  | 'Highlights Only'
  | 'Muted';

export interface CommunityPostsConfiguration {
  AllowedPostTypeCodes: string[];
  DefaultRootPostTypeCode: string;
  MaxReplyDepth: number;
}

export interface CommunitySynthesisConfiguration {
  AutoSummarizeThreshold: number;
  AskFirstDeflection: boolean;
  DeflectionMinConfidence: number;
}

export interface CommunityConfiguration {
  AskFirstEnabled: boolean;
  ThreadSynthesisThreshold: number;
  DeflectionMinConfidence: number;
  DefaultAnonymousReadMode: AnonymousReadMode;
  DefaultDigestCadence: DigestCadence;
  EnableInteractiveArtifacts: boolean;
  Posts: CommunityPostsConfiguration;
  Synthesis: CommunitySynthesisConfiguration;
  Extensions: Record<string, Record<string, unknown>>;
  ForumOverridable: string[];
}

export const DEFAULT_COMMUNITY_CONFIGURATION: CommunityConfiguration = {
  AskFirstEnabled: true,
  ThreadSynthesisThreshold: 4,
  DeflectionMinConfidence: 0.75,
  DefaultAnonymousReadMode: 'Teaser Only',
  DefaultDigestCadence: 'Daily Digest',
  EnableInteractiveArtifacts: true,
  Posts: {
    AllowedPostTypeCodes: [
      'discussion',
      'reply',
      'comment',
      'question',
      'answer',
      'poll-or-form',
      'collaborative-doc',
      'collaborative-sheet',
      'collaborative-deck',
      'interactive-experience',
    ],
    DefaultRootPostTypeCode: 'discussion',
    MaxReplyDepth: 5,
  },
  Synthesis: {
    AutoSummarizeThreshold: 4,
    AskFirstDeflection: true,
    DeflectionMinConfidence: 0.75,
  },
  Extensions: {},
  ForumOverridable: [
    'Posts.AllowedPostTypeCodes',
    'Posts.DefaultRootPostTypeCode',
    'Posts.MaxReplyDepth',
    'Synthesis.AutoSummarizeThreshold',
    'Synthesis.AskFirstDeflection',
    'Extensions',
  ],
};

/**
 * Resolves the 4-tier Community configuration cascade:
 *   1. Built-in code defaults (`DEFAULT_COMMUNITY_CONFIGURATION`)
 *   2. Application Settings (`CommunitySettings`)
 *   3. `ForumType.Configuration`
 *   4. `Forum.Configuration` (filtered strictly through `ForumType.Configuration.ForumOverridable`)
 */
export class CommunityConfigurationResolver {
  public static ParseConfigurationJSON(rawJson?: string | null): Partial<CommunityConfiguration> {
    if (!rawJson || !rawJson.trim()) {
      return {};
    }
    const parsed = JSON.parse(rawJson) as Partial<CommunityConfiguration>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Community configuration JSON must be an object.');
    }
    return parsed;
  }

  /**
   * Resolves the 4-tier Community configuration cascade, lowest to highest precedence:
   *   1. Built-in code defaults (`DEFAULT_COMMUNITY_CONFIGURATION`) and Application Settings (`CommunitySettings`)
   *   2. `ForumType.Configuration` (a forum's type-level defaults)
   *   3. `CommunitySpace.Configuration` (a space's own overrides, via `fields.Configuration` — the Collaboration
   *      `Space.Configuration` column the community space IsA-extends)
   *   4. `Forum.Configuration` and `PostType.Configuration` (the most specific tiers; both filtered strictly
   *      through the running `ForumOverridable` whitelist, `Forum` applied before `PostType` so a post type's
   *      own defaults win ties)
   */
  public static Resolve(
    appSettings?: Partial<CommunityConfiguration> | null,
    forumTypeConfig?: Partial<CommunityConfiguration> | null,
    forumConfig?: Partial<CommunityConfiguration> | null,
    spaceConfig?: Partial<CommunityConfiguration> | null,
    postTypeConfig?: Partial<CommunityConfiguration> | null,
  ): CommunityConfiguration {
    const basePosts: CommunityPostsConfiguration = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Posts,
      ...(appSettings?.Posts ?? {}),
      ...(forumTypeConfig?.Posts ?? {}),
      ...(spaceConfig?.Posts ?? {}),
    };

    const baseSynthesis: CommunitySynthesisConfiguration = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Synthesis,
      ...(appSettings?.Synthesis ?? {}),
      ...(forumTypeConfig?.Synthesis ?? {}),
      ...(spaceConfig?.Synthesis ?? {}),
    };

    const overridable = new Set<string>(
      forumTypeConfig?.ForumOverridable ??
        appSettings?.ForumOverridable ??
        DEFAULT_COMMUNITY_CONFIGURATION.ForumOverridable,
    );

    const mergedExtensions: Record<string, Record<string, unknown>> = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Extensions,
      ...(appSettings?.Extensions ?? {}),
      ...(forumTypeConfig?.Extensions ?? {}),
      ...(spaceConfig?.Extensions ?? {}),
    };

    // The two most specific tiers, Forum then PostType (PostType wins ties), applied in that
    // order so later calls override earlier ones for the same whitelisted field.
    for (const tierConfig of [forumConfig, postTypeConfig]) {
      if (tierConfig?.Posts) {
        if (
          tierConfig.Posts.AllowedPostTypeCodes !== undefined &&
          overridable.has('Posts.AllowedPostTypeCodes')
        ) {
          basePosts.AllowedPostTypeCodes = [...tierConfig.Posts.AllowedPostTypeCodes];
        }
        if (
          tierConfig.Posts.DefaultRootPostTypeCode !== undefined &&
          overridable.has('Posts.DefaultRootPostTypeCode')
        ) {
          basePosts.DefaultRootPostTypeCode = tierConfig.Posts.DefaultRootPostTypeCode;
        }
        if (
          tierConfig.Posts.MaxReplyDepth !== undefined &&
          overridable.has('Posts.MaxReplyDepth')
        ) {
          basePosts.MaxReplyDepth = tierConfig.Posts.MaxReplyDepth;
        }
      }

      if (tierConfig?.Synthesis) {
        if (
          tierConfig.Synthesis.AutoSummarizeThreshold !== undefined &&
          overridable.has('Synthesis.AutoSummarizeThreshold')
        ) {
          baseSynthesis.AutoSummarizeThreshold = tierConfig.Synthesis.AutoSummarizeThreshold;
        }
        if (
          tierConfig.Synthesis.AskFirstDeflection !== undefined &&
          overridable.has('Synthesis.AskFirstDeflection')
        ) {
          baseSynthesis.AskFirstDeflection = tierConfig.Synthesis.AskFirstDeflection;
        }
        if (
          tierConfig.Synthesis.DeflectionMinConfidence !== undefined &&
          overridable.has('Synthesis.DeflectionMinConfidence')
        ) {
          baseSynthesis.DeflectionMinConfidence = tierConfig.Synthesis.DeflectionMinConfidence;
        }
      }

      if (tierConfig?.Extensions) {
        for (const [extKey, extVal] of Object.entries(tierConfig.Extensions)) {
          if (overridable.has('Extensions') || overridable.has(`Extensions.${extKey}`)) {
            mergedExtensions[extKey] = {
              ...(mergedExtensions[extKey] ?? {}),
              ...extVal,
            };
          }
        }
      }
    }

    return {
      AskFirstEnabled:
        postTypeConfig?.AskFirstEnabled ??
        forumConfig?.AskFirstEnabled ??
        spaceConfig?.AskFirstEnabled ??
        forumTypeConfig?.AskFirstEnabled ??
        appSettings?.AskFirstEnabled ??
        DEFAULT_COMMUNITY_CONFIGURATION.AskFirstEnabled,
      ThreadSynthesisThreshold: baseSynthesis.AutoSummarizeThreshold,
      DeflectionMinConfidence: baseSynthesis.DeflectionMinConfidence,
      DefaultAnonymousReadMode:
        postTypeConfig?.DefaultAnonymousReadMode ??
        forumConfig?.DefaultAnonymousReadMode ??
        spaceConfig?.DefaultAnonymousReadMode ??
        forumTypeConfig?.DefaultAnonymousReadMode ??
        appSettings?.DefaultAnonymousReadMode ??
        DEFAULT_COMMUNITY_CONFIGURATION.DefaultAnonymousReadMode,
      DefaultDigestCadence:
        postTypeConfig?.DefaultDigestCadence ??
        forumConfig?.DefaultDigestCadence ??
        spaceConfig?.DefaultDigestCadence ??
        forumTypeConfig?.DefaultDigestCadence ??
        appSettings?.DefaultDigestCadence ??
        DEFAULT_COMMUNITY_CONFIGURATION.DefaultDigestCadence,
      EnableInteractiveArtifacts:
        postTypeConfig?.EnableInteractiveArtifacts ??
        forumConfig?.EnableInteractiveArtifacts ??
        spaceConfig?.EnableInteractiveArtifacts ??
        forumTypeConfig?.EnableInteractiveArtifacts ??
        appSettings?.EnableInteractiveArtifacts ??
        DEFAULT_COMMUNITY_CONFIGURATION.EnableInteractiveArtifacts,
      Posts: basePosts,
      Synthesis: baseSynthesis,
      Extensions: mergedExtensions,
      ForumOverridable: Array.from(overridable),
    };
  }
}

export const resolveCommunityConfiguration = CommunityConfigurationResolver.Resolve;
