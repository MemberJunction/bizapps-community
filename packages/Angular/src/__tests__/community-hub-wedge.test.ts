import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMUNITY_ACTION_DRIVER_CLASSES } from '@mj-biz-apps/community-core';
import { BuildCommonsStreamItems } from '../lib/community-hub-commons.ts';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from '../lib/community-hub-preferences.ts';
import {
  BuildClientLivingSynthesis,
  BuildPersonalizedDigestPreview,
  ComputeLiveAskFirstMatches,
  ParseLivingSynthesisPayload,
  ParseSendDigestActionResult,
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

describe('Zero-CAC Wedge UX — Live Ask-First, Living Thread Synthesis & Send Digest Parsing', () => {
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

  it('ParseLivingSynthesisPayload extracts structured takeaways, open questions, and contributor citations', () => {
    const parsed = ParseLivingSynthesisPayload({
      rootPostId: 'root-1',
      title: 'Zero-Downtime Key Rotation',
      bodyMarkdown: 'Root context',
      replies: [],
      actionMessage: 'Synthesized 2 replies',
      actionParams: [
        { Name: 'AIExecutiveSummary', Value: 'Dual-key grace window prevents downtime.' },
        { Name: 'ConsideredReplyCount', Value: 2 },
        { Name: 'KeyTakeaways', Value: JSON.stringify(['Deploy secondary key first [1]', 'Verify lease telemetry [2]']) },
        { Name: 'OpenQuestions', Value: JSON.stringify(['Should rotation window default to 24h?']) },
        {
          Name: 'ContributorCitations',
          Value: JSON.stringify([
            { citationIndex: 1, authorDisplayName: 'Ada Lovelace', postId: 'r-1', roleLabel: 'Accepted Answer' },
          ]),
        },
      ],
    });

    assert.equal(parsed.executiveSummary, 'Dual-key grace window prevents downtime.');
    assert.equal(parsed.consideredReplyCount, 2);
    assert.deepEqual(parsed.keyTakeaways, ['Deploy secondary key first [1]', 'Verify lease telemetry [2]']);
    assert.deepEqual(parsed.openQuestions, ['Should rotation window default to 24h?']);
    assert.equal(parsed.contributorCitations[0].authorDisplayName, 'Ada Lovelace');

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

  it('ParseSendDigestActionResult parses Community.SendPersonalizedDigest outputs cleanly', () => {
    const summary = ParseSendDigestActionResult({
      success: true,
      message: 'Dispatched 1 personalized digest(s) via Community Test Email Driver (0 failed).',
      actionParams: [
        { Name: 'SentCount', Value: 1 },
        { Name: 'FailedCount', Value: 0 },
        { Name: 'ProviderName', Value: 'Community Test Email Driver' },
        { Name: 'DryRun', Value: false },
        {
          Name: 'DeliveriesJSON',
          Value: JSON.stringify([
            {
              userId: 'u1',
              email: 'member@bizapps-community.local',
              itemCount: 3,
              replyToAddress: 'reply+signedtoken123@reply.bizapps.local',
              success: true,
            },
          ]),
        },
      ],
    });

    assert.equal(summary.sentCount, 1);
    assert.equal(summary.providerName, 'Community Test Email Driver');
    assert.equal(summary.topReplyToAddress, 'reply+signedtoken123@reply.bizapps.local');
  });

  it('CommunityHubResource template & TS expose Personalized Digest drawer, live Ask-First, Synthesis card, and 1-Click Graduation link', () => {
    const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
    const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

    assert.equal(COMMUNITY_ACTION_DRIVER_CLASSES.SendPersonalizedDigest, 'Community.SendPersonalizedDigest');
    assert.match(hubTs, /COMMUNITY_ACTION_DRIVER_CLASSES\.SendPersonalizedDigest/);
    assert.match(hubHtml, /id="mjc-header-digest-btn"/);
    assert.match(hubHtml, /id="mjc-digest-drawer-backdrop"/);
    assert.match(hubHtml, /id="mjc-digest-send-test-btn"/);
    assert.match(hubHtml, /id="mjc-digest-reply-indicator"/);
    assert.match(hubHtml, /id="mjc-detail-synthesis-card"/);
    assert.match(hubHtml, /id="mjc-detail-open-graduated-space-link"/);
    assert.match(hubHtml, /Why this was picked for you:/);
  });
});
