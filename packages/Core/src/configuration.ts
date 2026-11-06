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

  public static Resolve(
    appSettings?: Partial<CommunityConfiguration> | null,
    forumTypeConfig?: Partial<CommunityConfiguration> | null,
    forumConfig?: Partial<CommunityConfiguration> | null,
  ): CommunityConfiguration {
    const basePosts: CommunityPostsConfiguration = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Posts,
      ...(appSettings?.Posts ?? {}),
      ...(forumTypeConfig?.Posts ?? {}),
    };

    const baseSynthesis: CommunitySynthesisConfiguration = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Synthesis,
      ...(appSettings?.Synthesis ?? {}),
      ...(forumTypeConfig?.Synthesis ?? {}),
    };

    const overridable = new Set<string>(
      forumTypeConfig?.ForumOverridable ??
        appSettings?.ForumOverridable ??
        DEFAULT_COMMUNITY_CONFIGURATION.ForumOverridable,
    );

    if (forumConfig?.Posts) {
      if (
        forumConfig.Posts.AllowedPostTypeCodes !== undefined &&
        overridable.has('Posts.AllowedPostTypeCodes')
      ) {
        basePosts.AllowedPostTypeCodes = [...forumConfig.Posts.AllowedPostTypeCodes];
      }
      if (
        forumConfig.Posts.DefaultRootPostTypeCode !== undefined &&
        overridable.has('Posts.DefaultRootPostTypeCode')
      ) {
        basePosts.DefaultRootPostTypeCode = forumConfig.Posts.DefaultRootPostTypeCode;
      }
      if (
        forumConfig.Posts.MaxReplyDepth !== undefined &&
        overridable.has('Posts.MaxReplyDepth')
      ) {
        basePosts.MaxReplyDepth = forumConfig.Posts.MaxReplyDepth;
      }
    }

    if (forumConfig?.Synthesis) {
      if (
        forumConfig.Synthesis.AutoSummarizeThreshold !== undefined &&
        overridable.has('Synthesis.AutoSummarizeThreshold')
      ) {
        baseSynthesis.AutoSummarizeThreshold = forumConfig.Synthesis.AutoSummarizeThreshold;
      }
      if (
        forumConfig.Synthesis.AskFirstDeflection !== undefined &&
        overridable.has('Synthesis.AskFirstDeflection')
      ) {
        baseSynthesis.AskFirstDeflection = forumConfig.Synthesis.AskFirstDeflection;
      }
      if (
        forumConfig.Synthesis.DeflectionMinConfidence !== undefined &&
        overridable.has('Synthesis.DeflectionMinConfidence')
      ) {
        baseSynthesis.DeflectionMinConfidence = forumConfig.Synthesis.DeflectionMinConfidence;
      }
    }

    const mergedExtensions: Record<string, Record<string, unknown>> = {
      ...DEFAULT_COMMUNITY_CONFIGURATION.Extensions,
      ...(appSettings?.Extensions ?? {}),
      ...(forumTypeConfig?.Extensions ?? {}),
    };

    if (forumConfig?.Extensions) {
      for (const [extKey, extVal] of Object.entries(forumConfig.Extensions)) {
        if (overridable.has('Extensions') || overridable.has(`Extensions.${extKey}`)) {
          mergedExtensions[extKey] = {
            ...(mergedExtensions[extKey] ?? {}),
            ...extVal,
          };
        }
      }
    }

    return {
      AskFirstEnabled:
        forumConfig?.AskFirstEnabled ??
        forumTypeConfig?.AskFirstEnabled ??
        appSettings?.AskFirstEnabled ??
        DEFAULT_COMMUNITY_CONFIGURATION.AskFirstEnabled,
      ThreadSynthesisThreshold: baseSynthesis.AutoSummarizeThreshold,
      DeflectionMinConfidence: baseSynthesis.DeflectionMinConfidence,
      DefaultAnonymousReadMode:
        forumConfig?.DefaultAnonymousReadMode ??
        forumTypeConfig?.DefaultAnonymousReadMode ??
        appSettings?.DefaultAnonymousReadMode ??
        DEFAULT_COMMUNITY_CONFIGURATION.DefaultAnonymousReadMode,
      DefaultDigestCadence:
        forumConfig?.DefaultDigestCadence ??
        forumTypeConfig?.DefaultDigestCadence ??
        appSettings?.DefaultDigestCadence ??
        DEFAULT_COMMUNITY_CONFIGURATION.DefaultDigestCadence,
      EnableInteractiveArtifacts:
        forumConfig?.EnableInteractiveArtifacts ??
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
