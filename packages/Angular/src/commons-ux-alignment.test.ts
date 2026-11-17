import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AddStreamItemReply,
  BuildCommonsStreamItems,
  BuildEditorialPorchHighlights,
  COMMUNITY_SPACES_DIRECTORY,
  COMMUNITY_TOPIC_TAGS,
  CreateAskShareStreamItem,
  FilterCommonsStream,
  FindMatchedCanonQuestion,
  GraduateStreamItem,
  SEEDED_COMMUNITY_SESSIONS,
  STREAM_TYPE_FILTER_OPTIONS,
  ToggleStreamItemUpvote,
  ValidateAskShareDraft,
} from './lib/community-hub-commons.ts';
import {
  COMMUNITY_HUB_PREFERENCE_KEYS,
  CommunityHubPreferences,
  type IUserPreferenceStore,
} from './lib/community-hub-preferences.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, 'lib');

function createFakeStore(): { store: IUserPreferenceStore; data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    store: {
      GetSetting: (key: string) => data.get(key),
      SetSetting: async (key: string, value: string) => {
        data.set(key, value);
        return true;
      },
    },
  };
}

describe('Slice 1 UX Alignment — Sticky Top Shell, Branding & Export Wiring', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');
  const hubCss = readFileSync(join(LIB_DIR, 'community-hub-resource.component.css'), 'utf8');
  const commonsTs = readFileSync(join(LIB_DIR, 'community-hub-commons.ts'), 'utf8');
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');

  it('uses sticky top header bar (position: sticky; top: 0; z-index: 20) and MemberJunction Community Hub branding', () => {
    assert.match(hubCss, /\.mjc-hub-header\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;[\s\S]*z-index:\s*20;/);
    assert.ok(hubHtml.includes('MemberJunction Community Hub'));
    assert.ok(hubHtml.includes('openAskShareModal()'));
    assert.ok(hubHtml.includes('exportDigestPdf()'));
    assert.ok(hubHtml.includes('aria-label="Search community threads, Q&A canon, and playbooks"'));
    assert.ok(hubHtml.includes('clearHeaderSearch()'));
  });

  it('contains zero MoreCheese, Quincewick, Betty, or creamery demo brand copy across Angular lib sources', () => {
    const combined = `${hubTs}\n${hubHtml}\n${commonsTs}\n${streamHtml}`;
    for (const forbidden of [/more\s*cheese/i, /quincewick/i, /ask\s*betty/i, /creamery/i]) {
      assert.doesNotMatch(combined, forbidden, `Found forbidden demo brand reference ${forbidden}`);
    }
  });

  it('wires exportDigestPdf() to GraphQLActionClient and COMMUNITY_ACTION_IDS.ExportDigestPDF without window.print()', () => {
    assert.match(hubTs, /public async exportDigestPdf\(\): Promise<void>/);
    assert.match(hubTs, /RunAction\(COMMUNITY_ACTION_IDS\.ExportDigestPDF/);
    assert.doesNotMatch(hubTs, /window\.print\s*\(/);
  });
});

describe('Slice 1 UX Alignment — Collapsible Editorial Porch & 3 Featured Highlight Cards', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  it('supports porchCollapsed toggle with aria-expanded and UserInfoEngine preference persistence', async () => {
    assert.match(hubTs, /public porchCollapsed = false;/);
    assert.match(hubTs, /public togglePorch\(\): void/);
    assert.match(hubHtml, /\[attr\.aria-expanded\]="!porchCollapsed"/);
    assert.match(hubHtml, /\(click\)="togglePorch\(\)"/);

    const { store, data } = createFakeStore();
    const prefs = new CommunityHubPreferences(store);
    assert.equal(prefs.GetPorchCollapsed(), false);
    await prefs.SetPorchCollapsed(true);
    assert.equal(data.get(COMMUNITY_HUB_PREFERENCE_KEYS.porchCollapsed), 'true');
    assert.equal(prefs.GetPorchCollapsed(), true);
  });

  it('builds 3 distinct Featured Highlight Cards (Open Canon/Motion, Living Playbook, Active Graduation/Working Group)', () => {
    const items = BuildCommonsStreamItems({
      feedPosts: [{ id: 'f1', title: 'Multi-Region Read Replicas', bodyMarkdown: 'Architecture guide', status: 'Published' }],
      qaCanonItems: [
        {
          id: 'qa1',
          questionPostId: 'q1',
          title: 'How do I rotate my API key without downtime?',
          bodyMarkdown: 'Deploy secondary key before revoking legacy key.',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
        },
      ],
      ideationItems: [],
      livingDocItems: [
        {
          id: 'doc1',
          title: 'OAuth2 Partner Onboarding Playbook',
          bodyMarkdown: 'PKCE + token rotation alerts',
          postTypeCode: 'collaborative-doc',
        },
      ],
    });

    const highlights = BuildEditorialPorchHighlights({
      commonsItems: items,
      qaCanonItems: [
        {
          id: 'qa1',
          questionPostId: 'q1',
          title: 'How do I rotate my API key without downtime?',
          bodyMarkdown: 'Deploy secondary key before revoking legacy key.',
          epistemicStatus: 'Canon Verified',
          confidenceScore: 0.94,
          isAccepted: true,
        },
      ],
      livingDocItems: [
        {
          id: 'doc1',
          title: 'OAuth2 Partner Onboarding Playbook',
          bodyMarkdown: 'PKCE + token rotation alerts',
          postTypeCode: 'collaborative-doc',
        },
      ],
    });

    assert.equal(highlights.length, 3);
    assert.deepEqual(
      highlights.map((h) => h.kind),
      ['canon-motion', 'living-playbook', 'active-graduation'],
    );
    assert.ok(highlights.every((h) => h.ctaLabel.length > 0 && h.title.length > 0));
  });
});

describe('Slice 1 UX Alignment — Matched Question Spotlight Banner', () => {
  const qaItems = [
    {
      id: 'ans-1',
      questionPostId: 'q-1',
      title: 'How do I rotate my API key without downtime?',
      bodyMarkdown: 'Mint a secondary client secret, deploy workers, then revoke the legacy key.',
      epistemicStatus: 'Canon Verified',
      confidenceScore: 0.95,
      isAccepted: true,
    },
    {
      id: 'ans-2',
      questionPostId: 'q-2',
      title: 'How do webhook delivery retries handle 429 rate limits?',
      bodyMarkdown: 'Exponential jitter backoff respects Retry-After headers up to 15 minutes.',
      epistemicStatus: 'Verified',
      confidenceScore: 0.88,
      isAccepted: false,
    },
  ];
  const commons = BuildCommonsStreamItems({
    feedPosts: [],
    qaCanonItems: qaItems,
    ideationItems: [],
    livingDocItems: [],
  });

  it('returns null for empty or single-char queries and unmatched terms', () => {
    assert.equal(FindMatchedCanonQuestion('', qaItems, commons), null);
    assert.equal(FindMatchedCanonQuestion('a', qaItems, commons), null);
    assert.equal(FindMatchedCanonQuestion('nonexistent-xyzzy-term', qaItems, commons), null);
  });

  it('matches canonical Q&A records by query and links to source item and Q&A Canon', () => {
    const match = FindMatchedCanonQuestion('rotate API key', qaItems, commons);
    assert.ok(match);
    assert.equal(match.id, 'ans-1');
    assert.equal(match.epistemicStatus, 'Canon Verified');
    assert.equal(match.confidenceScore, 0.95);
    assert.equal(match.sourceItemId, 'qa-ans-1');

    const rateMatch = FindMatchedCanonQuestion('429 rate limits', qaItems, commons);
    assert.ok(rateMatch);
    assert.equal(rateMatch.id, 'ans-2');
  });
});

describe('Slice 1 UX Alignment — 3-Column Commons Workspace Filtering & Layout', () => {
  const streamHtml = readFileSync(join(LIB_DIR, 'knowledge-stream.component.html'), 'utf8');
  const streamCss = readFileSync(join(LIB_DIR, 'knowledge-stream.component.css'), 'utf8');

  const items = BuildCommonsStreamItems({
    feedPosts: [
      { id: 'f1', title: 'Multi-Region GraphQL Read Replica Architecture', bodyMarkdown: 'Latency benchmarks', status: 'Published' },
    ],
    qaCanonItems: [
      {
        id: 'qa1',
        questionPostId: 'q1',
        title: 'How do I rotate my API key without downtime?',
        bodyMarkdown: 'Dual-key rotation steps',
        epistemicStatus: 'Canon Verified',
        confidenceScore: 0.94,
        isAccepted: true,
      },
    ],
    ideationItems: [
      {
        id: 'idea1',
        campaignId: 'camp1',
        title: 'Add webhook signing secrets rotation API',
        summary: 'Zero-downtime dual HMAC secrets.',
        totalPointsAllocated: 36,
        effectiveQuadraticVotes: 6,
      },
    ],
    livingDocItems: [
      {
        id: 'doc1',
        title: 'OAuth2 Partner Onboarding Playbook',
        bodyMarkdown: 'PKCE checklist',
        postTypeCode: 'collaborative-doc',
      },
    ],
  });

  it('exposes the 5 canonical spaces, topics, stream types, and 3-column responsive grid', () => {
    assert.deepEqual(
      COMMUNITY_SPACES_DIRECTORY.map((s) => s.name),
      ['All Spaces', 'Architecture & Standards', 'Product Ideation', 'Operations & Playbooks', 'Governance & RFCs'],
    );
    assert.ok(COMMUNITY_TOPIC_TAGS.length >= 5);
    assert.deepEqual(
      STREAM_TYPE_FILTER_OPTIONS.map((o) => o.label),
      ['All Activity', 'Posts', 'Verified Q&A', 'Ideation', 'Living Guides'],
    );
    assert.ok(SEEDED_COMMUNITY_SESSIONS.length >= 3);
    assert.match(streamCss, /grid-template-columns:\s*260px\s+minmax\(0,\s*1fr\)\s+300px/);
    assert.match(streamHtml, /mjc-commons__left-rail/);
    assert.match(streamHtml, /mjc-commons__stream/);
    assert.match(streamHtml, /mjc-commons__right-rail/);
    assert.match(streamHtml, /<mjc-ask-first-deflection-widget/);
  });

  it('filters Commons stream items cleanly by space, topic, stream type, and search query', () => {
    const governanceOnly = FilterCommonsStream(items, {
      spaceFilter: 'governance-rfcs',
      topicFilter: null,
      streamTypeFilter: 'all',
      searchQuery: '',
    });
    assert.ok(governanceOnly.length >= 1);
    assert.ok(governanceOnly.every((i) => i.spaceId === 'governance-rfcs'));

    const ideationOnly = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: null,
      streamTypeFilter: 'ideation',
      searchQuery: '',
    });
    assert.equal(ideationOnly.length, 1);
    assert.equal(ideationOnly[0].streamType, 'ideation');

    const topicFiltered = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: 'API Security',
      streamTypeFilter: 'all',
      searchQuery: '',
    });
    assert.ok(topicFiltered.length >= 1);
    assert.ok(topicFiltered.every((i) => i.tags.includes('API Security')));

    const queryFiltered = FilterCommonsStream(items, {
      spaceFilter: 'all',
      topicFilter: null,
      streamTypeFilter: 'all',
      searchQuery: 'webhook',
    });
    assert.ok(queryFiltered.length >= 1);
    assert.ok(queryFiltered.every((i) => `${i.title} ${i.excerpt} ${i.bodyMarkdown}`.toLowerCase().includes('webhook')));
  });
});

describe('Slice 1 UX Alignment — Slide-Over Detail Sheet Drawer & + Ask or Share Modal', () => {
  const hubTs = readFileSync(join(LIB_DIR, 'community-hub-resource.component.ts'), 'utf8');
  const hubHtml = readFileSync(join(LIB_DIR, 'community-hub-resource.component.html'), 'utf8');

  it('declares accessible role="dialog" + aria-modal="true" + Escape dismissal for Detail Sheet & Ask/Share Modal', () => {
    assert.match(hubHtml, /id="mjc-detail-sheet-backdrop"[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="mjc-detail-sheet-title"/);
    assert.match(hubHtml, /id="mjc-ask-share-modal-backdrop"[\s\S]*role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="mjc-ask-share-title"/);
    assert.match(hubTs, /@HostListener\('document:keydown\.escape'\)/);
  });

  it('supports upvoting, replying, and graduating threads inside the Detail Sheet', () => {
    const initial = BuildCommonsStreamItems({
      feedPosts: [{ id: 'p1', title: 'Test Thread', bodyMarkdown: 'Initial body', status: 'Published' }],
      qaCanonItems: [],
      ideationItems: [],
      livingDocItems: [],
    });
    const target = initial[0];
    const startUpvotes = target.upvoteCount;

    const upvoted = ToggleStreamItemUpvote(initial, target.id);
    assert.equal(upvoted.find((i) => i.id === target.id)?.upvoteCount, startUpvotes + 1);
    assert.equal(upvoted.find((i) => i.id === target.id)?.upvotedByMe, true);

    const unvoted = ToggleStreamItemUpvote(upvoted, target.id);
    assert.equal(unvoted.find((i) => i.id === target.id)?.upvoteCount, startUpvotes);

    const replied = AddStreamItemReply(unvoted, target.id, 'Verified fix in staging.', 'Ada Lovelace', 'Staff Architect');
    const updatedAfterReply = replied.find((i) => i.id === target.id)!;
    assert.equal(updatedAfterReply.replies.length, target.replies.length + 1);
    assert.equal(updatedAfterReply.replyCount, updatedAfterReply.replies.length);

    const graduated = GraduateStreamItem(replied, target.id);
    const updatedAfterGrad = graduated.find((i) => i.id === target.id)!;
    assert.equal(updatedAfterGrad.graduatedToDeliverable, true);
    assert.equal(updatedAfterGrad.statusBadge, 'Graduated · Working Group');
  });

  it('validates Ask or Share drafts and creates Question, Discussion Post, and Playbook Note items', () => {
    const invalid = ValidateAskShareDraft({
      entryType: 'Question',
      title: '   ',
      spaceId: 'architecture-standards',
      body: '',
      tagsInput: '',
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.title);
    assert.ok(invalid.errors.body);

    const valid = ValidateAskShareDraft({
      entryType: 'Playbook Note',
      title: 'Zero-Downtime Blue/Green Migration Guide',
      spaceId: 'operations-playbooks',
      body: 'Step 1: Verify schema parity before traffic shift.',
      tagsInput: 'Schema Parity, Multi-Region',
    });
    assert.equal(valid.valid, true);

    const createdPlaybook = CreateAskShareStreamItem({
      entryType: 'Playbook Note',
      title: 'Zero-Downtime Blue/Green Migration Guide',
      spaceId: 'operations-playbooks',
      body: 'Step 1: Verify schema parity before traffic shift.',
      tagsInput: 'Schema Parity, Multi-Region',
    });
    assert.equal(createdPlaybook.streamType, 'living-guide');
    assert.equal(createdPlaybook.spaceId, 'operations-playbooks');
    assert.deepEqual(createdPlaybook.tags, ['Schema Parity', 'Multi-Region']);

    const createdQuestion = CreateAskShareStreamItem({
      entryType: 'Question',
      title: 'How should tenant read replicas handle failover?',
      spaceId: 'architecture-standards',
      body: 'Looking for recommended connection pool drain timeouts.',
      tagsInput: 'Multi-Region',
    });
    assert.equal(createdQuestion.streamType, 'verified-qa');
    assert.equal(createdQuestion.entryTypeLabel, 'Question');
  });
});
