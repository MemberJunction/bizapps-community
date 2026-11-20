import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GraphQLActionClient, type GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import { GetGlobalObjectStore, IsValidUUID } from '@memberjunction/global';
import {
  COMMUNITY_ACTION_DRIVER_CLASSES,
  COMMUNITY_ACTION_IDS,
} from '@mj-biz-apps/community-core';
import { BuildCommonsStreamItems } from '../lib/community-hub-commons.ts';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from '../lib/community-hub-preferences.ts';
import {
  BuildClientLivingSynthesis,
  BuildPersonalizedDigestPreview,
  ClearResolvedActionIdCache,
  ComputeLiveAskFirstMatches,
  ExtractActionOutputParams,
  GetActionOutputValue,
  ParseLivingSynthesisPayload,
  ParseSendDigestActionResult,
  ResolveCommunityActionIDWithRunView,
  ResolveCommunityActionRuntimeID,
} from '../lib/community-hub-wedge.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, '..', 'lib');

function createDebouncedFakeStore(): {
  store: IUserPreferenceStore;
  data: Map<string, string>;
  debouncedCalls: number;
} {
  const data = new Map<string, string>();
  let debouncedCalls = 0;
  return {
    data,
    get debouncedCalls() {
      return debouncedCalls;
    },
    store: {
      GetSetting: (key: string) => data.get(key),
      SetSetting: async (key: string, value: string) => {
        data.set(key, value);
        return true;
      },
      SetSettingDebounced: (key: string, value: string) => {
        debouncedCalls += 1;
        data.set(key, value);
      },
    },
  };
}

describe('Zero-CAC Wedge UX — Personalized Digest Preview & Preferences', () => {
  it('ranks community threads for the member with match scores, reasons, and Reply-by-Email hints', async () => {
    const items = BuildCommonsStreamItems({
      feedPosts: [
        {
          id: '11111111-1111-4111-8111-000000000001',
          title: 'Multi-Region GraphQL Read Replica Failover',
          bodyMarkdown: 'Read-replica routing and GraphQL latency budgets across regions.',
          status: 'Published',
          upvoteCount: 4,
          upvotedByMe: true,
          tags: ['Multi-Region', 'GraphQL'],
        },
        {
          id: '11111111-1111-4111-8111-000000000002',
          title: 'Zero-Downtime API Key Rotation & OAuth2',
          bodyMarkdown: 'Mint secondary secrets and revoke expired OAuth credentials cleanly.',
          status: 'Published',
          upvoteCount: 2,
          upvotedByMe: false,
          tags: ['API Security'],
        },
      ],
      qaCanonItems: [
        {
          id: '11111111-1111-4111-8111-000000000003',
          questionPostId: '11111111-1111-4111-8111-000000000004',
          title: 'How do GraphQL resolvers batch multi-region read replicas?',
          bodyMarkdown: 'Use DataLoader batching with regional read-replica routing.',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
          tags: ['Multi-Region', 'GraphQL'],
        },
      ],
      ideationItems: [],
      livingDocItems: [],
    });

    const preview = await BuildPersonalizedDigestPreview({
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userName: 'Ada Lovelace',
      commonsItems: items,
      explicitTopicTags: ['Multi-Region', 'GraphQL'],
      maxItems: 3,
    });

    assert.equal(preview.items.length, 3);
    assert.equal(preview.profile.isColdStart, false);
    assert.ok(preview.profile.topTopicTags.includes('Multi-Region'));
    assert.ok(preview.items[0].matchScorePct >= 35 && preview.items[0].matchScorePct <= 99);
    assert.ok(preview.items[0].reason.length > 0);
    assert.match(preview.items[0].replyByEmailHint, /^reply\+hmac_.*@reply\.bizapps\.local$/);
  });

  it('persists digestCadence and activeTopicFilter via UserInfoEngine SetSettingDebounced', async () => {
    const fake = createDebouncedFakeStore();
    const prefs = new CommunityHubPreferences(fake.store);

    assert.equal(prefs.GetDigestCadence(), undefined);
    assert.equal(prefs.GetActiveTopicFilter(), undefined);

    await prefs.SetDigestCadence('daily');
    await prefs.SetActiveTopicFilter('API Security');

    assert.equal(prefs.GetDigestCadence(), 'daily');
    assert.equal(prefs.GetActiveTopicFilter(), 'API Security');
    assert.equal(fake.data.get(COMMUNITY_HUB_PREFERENCE_KEYS.digestCadence), 'daily');
    assert.equal(fake.data.get(COMMUNITY_HUB_PREFERENCE_KEYS.activeTopicFilter), 'API Security');
    assert.equal(fake.debouncedCalls, 2);

    await prefs.SetActiveTopicFilter(null);
    assert.equal(prefs.GetActiveTopicFilter(), undefined);
  });
});

describe('Zero-CAC Wedge UX — Live Ask-First, Living Thread Synthesis & GraphQLActionClient Contracts (CR-03, CR-07)', () => {
  it('ComputeLiveAskFirstMatches surfaces semantic Canon matches as the member types', async () => {
    const matches = await ComputeLiveAskFirstMatches({
      queryText: 'rotate api credentials zero downtime',
      candidates: [
        {
          id: 'qa-1',
          sourcePostId: '11111111-1111-4111-8111-000000000010',
          title: 'How do I rotate my API key without downtime?',
          bodyMarkdown: 'Create a second active key, deploy workers, wait one lease interval, then revoke.',
          epistemicStatus: 'Canon Verified',
          tags: ['API Security'],
        },
        {
          id: 'post-2',
          sourcePostId: '11111111-1111-4111-8111-000000000011',
          title: 'Quarterly Board Governance Schedule',
          bodyMarkdown: 'Minutes and agenda calendar for Q2 committee reviews.',
          epistemicStatus: 'Novel Insight',
          tags: ['Governance'],
        },
      ],
      maxMatches: 2,
      minScore: 0.2,
    });

    assert.ok(matches.length >= 1);
    assert.equal(matches[0].id, 'qa-1');
    assert.ok(matches[0].matchPct >= 20);
  });

  it('resolves SendPersonalizedDigest and ProcessInboundDigestReply UUID ActionIDs from ActionEngineBase/RunView/fallback and invokes GraphQLActionClient with UUID ActionID (CR-03)', async () => {
    ClearResolvedActionIdCache();
    const store = GetGlobalObjectStore();
    const prevEngine = store['___SINGLETON__ActionEngineBase'];

    try {
      const liveDigestUuid = '12345678-1234-4123-8123-1234567890ab';
      store['___SINGLETON__ActionEngineBase'] = {
        Loaded: true,
        Actions: [
          {
            ID: liveDigestUuid,
            DriverClass: COMMUNITY_ACTION_DRIVER_CLASSES.SendPersonalizedDigest,
            Name: 'Send Personalized Community Digest',
            Status: 'Active',
          },
        ],
      };

      const resolvedFromEngine = ResolveCommunityActionRuntimeID('SendPersonalizedDigest');
      assert.equal(resolvedFromEngine, liveDigestUuid);
      assert.equal(IsValidUUID(resolvedFromEngine), true);

      // Clear engine singleton -> verify RunView resolution + deterministic fallback UUID
      delete store['___SINGLETON__ActionEngineBase'];
      ClearResolvedActionIdCache();
      const rvDigestUuid = '23456789-2345-4234-8234-2345678901bc';
      const resolvedFromRunView = await ResolveCommunityActionIDWithRunView('SendPersonalizedDigest', {
        user: undefined,
        runView: {
          RunView: async () => ({
            Success: true,
            Results: [
              {
                ID: rvDigestUuid,
                DriverClass: COMMUNITY_ACTION_DRIVER_CLASSES.SendPersonalizedDigest,
                Status: 'Active',
              },
            ],
          }),
        },
      });
      // When user is undefined, falls back cleanly to COMMUNITY_ACTION_IDS canonical UUID
      assert.equal(resolvedFromRunView, COMMUNITY_ACTION_IDS.SendPersonalizedDigest);
      assert.equal(IsValidUUID(resolvedFromRunView), true);

      // Exercise real GraphQLActionClient.RunAction with resolved UUID ActionID and ResultData JSON
      let capturedActionId = '';
      const fakeProvider = {
        ExecuteGQL: async (_query: string, variables: { input: { ActionID: string } }) => {
          capturedActionId = variables.input.ActionID;
          return {
            RunAction: {
              Success: true,
              Message: 'Dispatched 2 personalized digest(s) via SendGrid.',
              ResultCode: 'SUCCESS',
              ResultData: JSON.stringify([
                { Name: 'SentCount', Value: 2, Type: 'Output' },
                { Name: 'FailedCount', Value: 0, Type: 'Output' },
                { Name: 'ProviderName', Value: 'SendGrid', Type: 'Output' },
                { Name: 'DryRun', Value: false, Type: 'Output' },
                {
                  Name: 'DeliveriesJSON',
                  Value: JSON.stringify([
                    {
                      userId: 'u-1',
                      email: 'ada@example.org',
                      itemCount: 4,
                      replyToAddress: 'reply+compact12345678.sig12345678@reply.bizapps.local',
                      success: true,
                    },
                  ]),
                  Type: 'Output',
                },
              ]),
            },
          };
        },
      };

      const client = new GraphQLActionClient(fakeProvider as GraphQLDataProvider);
      const actionResult = await client.RunAction(COMMUNITY_ACTION_IDS.SendPersonalizedDigest, [
        { Name: 'CommunityName', Value: 'MemberJunction Community', Type: 'Input' },
      ]);

      assert.equal(IsValidUUID(capturedActionId), true);
      assert.equal(capturedActionId, COMMUNITY_ACTION_IDS.SendPersonalizedDigest);
      assert.equal(actionResult.Success, true);

      // GraphQLActionClient puts parsed ResultData on `res.Result` and keeps input params on `res.Params`
      const parsedDigest = ParseSendDigestActionResult({
        success: actionResult.Success,
        message: actionResult.Message,
        actionResult,
      });
      assert.equal(parsedDigest.sentCount, 2);
      assert.equal(parsedDigest.providerName, 'SendGrid');
      assert.equal(parsedDigest.topReplyToAddress, 'reply+compact12345678.sig12345678@reply.bizapps.local');
    } finally {
      ClearResolvedActionIdCache();
      if (prevEngine === undefined) {
        delete store['___SINGLETON__ActionEngineBase'];
      } else {
        store['___SINGLETON__ActionEngineBase'] = prevEngine;
      }
    }
  });

  it('decodes GraphQLActionClient Result/ResultData and fails closed without fabricating fallback data on Success: false (CR-07)', async () => {
    const fakeProvider = {
      ExecuteGQL: async () => ({
        RunAction: {
          Success: true,
          Message: 'Synthesized 2 replies',
          ResultCode: 'SUCCESS',
          ResultData: JSON.stringify([
            { Name: 'AIExecutiveSummary', Value: 'Server synthesis summary from ResultData.', Type: 'Output' },
            { Name: 'ConsideredReplyCount', Value: 2, Type: 'Output' },
            { Name: 'KeyTakeaways', Value: JSON.stringify(['Use dual-key grace window [1]']), Type: 'Output' },
            { Name: 'OpenQuestions', Value: JSON.stringify(['Default TTL?']), Type: 'Output' },
            {
              Name: 'ContributorCitations',
              Value: JSON.stringify([
                { citationIndex: 1, authorDisplayName: 'Ada Lovelace', postId: 'r-1', roleLabel: 'Accepted Answer' },
              ]),
              Type: 'Output',
            },
          ]),
        },
      }),
    };

    const client = new GraphQLActionClient(fakeProvider as GraphQLDataProvider);
    const gqlRes = await client.RunAction(COMMUNITY_ACTION_IDS.LivingThreadSynthesis, [
      { Name: 'RootPostID', Value: '11111111-1111-4111-8111-111111111111', Type: 'Input' },
    ]);

    const parsed = ParseLivingSynthesisPayload({
      rootPostId: 'root-1',
      title: 'Zero-Downtime Key Rotation',
      bodyMarkdown: 'Root context',
      replies: [],
      actionResult: gqlRes,
      allowClientFallback: false,
    });

    assert.ok(parsed);
    assert.equal(parsed.executiveSummary, 'Server synthesis summary from ResultData.');
    assert.equal(parsed.consideredReplyCount, 2);
    assert.deepEqual(parsed.keyTakeaways, ['Use dual-key grace window [1]']);
    assert.deepEqual(parsed.openQuestions, ['Default TTL?']);
    assert.equal(parsed.contributorCitations[0].authorDisplayName, 'Ada Lovelace');

    // Success: false must return null synthesis (no fabricated client fallback card) and sentCount: 0
    const failedSynthesis = ParseLivingSynthesisPayload({
      rootPostId: 'root-1',
      title: 'Failed Synthesis',
      bodyMarkdown: 'Body',
      replies: [
        {
          id: 'rep-1',
          authorName: 'Grace Hopper',
          authorRole: 'Architect',
          authorInitials: 'GH',
          timestampLabel: 'Published',
          bodyMarkdown: 'Should never be fabricated when server fails.',
          isAccepted: true,
          upvotes: 1,
        },
      ],
      actionResult: { Success: false, Message: 'Permission denied' },
      allowClientFallback: false,
    });
    assert.equal(failedSynthesis, null);

    const failedDigest = ParseSendDigestActionResult({
      success: false,
      message: 'SMTP provider error',
      actionResult: { Success: false, Message: 'SMTP provider error' },
    });
    assert.equal(failedDigest.sentCount, 0);
    assert.equal(failedDigest.providerName, '');
    assert.equal(failedDigest.topReplyToAddress, null);
    assert.equal(failedDigest.message, 'SMTP provider error');

    // ExtractActionOutputParams also handles object-map ResultData and excludes Input params
    const extracted = ExtractActionOutputParams({
      Result: { SentCount: 4, ProviderName: 'SES' },
      Params: [
        { Name: 'SentCount', Value: 999, Type: 'Input' },
        { Name: 'DryRun', Value: true, Type: 'Output' },
      ],
    });
    assert.equal(GetActionOutputValue({ Result: { SentCount: 4 } }, 'SentCount'), 4);
    assert.equal(extracted.find((p) => p.Name === 'SentCount')?.Value, 4);
    assert.equal(extracted.find((p) => p.Name === 'DryRun')?.Value, true);

    const fallback = BuildClientLivingSynthesis({
      rootPostId: 'root-2',
      title: 'Fallback Thread',
      bodyMarkdown: 'Initial body',
      replies: [
        {
          id: 'rep-1',
          authorName: 'Grace Hopper',
          authorRole: 'Architect',
          authorInitials: 'GH',
          timestampLabel: 'Published',
          bodyMarkdown: 'Use dual-active HMAC tokens. Should we rotate weekly?',
          isAccepted: true,
          upvotes: 3,
        },
      ],
    });
    assert.equal(fallback.consideredReplyCount, 1);
    assert.equal(fallback.contributorCitations[0].roleLabel, 'Accepted Answer');
    assert.equal(fallback.openQuestions.length, 1);
  });

  it('CommunityHubResource invokes UUID ActionIDs, checks res.Success, and activates Working Space view on Open Working Space (CR-03, CR-07, CR-08)', () => {
    const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
    const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

    // CR-03: Never passes raw driver class string to GraphQLActionClient.RunAction
    assert.doesNotMatch(hubTs, /RunAction\(\s*COMMUNITY_ACTION_DRIVER_CLASSES\./);
    assert.match(hubTs, /ResolveCommunityActionIDWithRunView\('SendPersonalizedDigest'\)/);

    // CR-07: Checks Success === true before rendering synthesis or test-digest success states
    assert.match(hubTs, /if \(res\?\.Success !== true\)/);
    assert.match(hubTs, /if \(result\?\.Success !== true\)/);
    assert.match(hubTs, /allowClientFallback:\s*false/);

    // CR-08: Activates Collaboration Working Space view + notifies host NavigationService
    assert.match(hubTs, /this\.activeSection\s*=\s*'spaces'/);
    assert.match(hubTs, /this\.embeddedCollaborationMode\s*=\s*true/);
    assert.match(hubTs, /this\.activeGraduatedSpaceId\s*=\s*spaceId/);
    assert.match(hubTs, /notifyHostNavigationForWorkingSpace\(spaceId\)/);
    assert.match(hubHtml, /id="mjc-graduated-working-space-view"/);
    assert.match(hubHtml, /\[attr\.data-space-id\]="activeGraduatedSpaceId"/);

    // Wedge DOM hooks
    assert.match(hubHtml, /id="mjc-header-digest-btn"/);
    assert.match(hubHtml, /id="mjc-digest-drawer-backdrop"/);
    assert.match(hubHtml, /id="mjc-digest-send-test-btn"/);
    assert.match(hubHtml, /id="mjc-digest-reply-indicator"/);
    assert.match(hubHtml, /id="mjc-detail-synthesis-card"/);
    assert.match(hubHtml, /id="mjc-detail-open-graduated-space-link"/);
    assert.match(hubHtml, /Why this was picked for you:/);
  });
});
