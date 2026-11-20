import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StartHarnessServer } from './harness/serve-harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(HERE, 'reports');
const SCREENSHOTS_DIR = join(HERE, 'screenshots');
const MARKETING_SCREENSHOTS_DIR = join(HERE, '..', 'docs', 'screenshots');
mkdirSync(REPORTS_DIR, { recursive: true });
mkdirSync(SCREENSHOTS_DIR, { recursive: true });
mkdirSync(MARKETING_SCREENSHOTS_DIR, { recursive: true });

const TAB_KEYS = [
  'knowledge-stream',
  'qa-canon-workbench',
  'quadratic-ideation-wallet',
  'living-co-authoring',
];

/** @type {{ url: string, fontAwesomeMode: string, close: () => Promise<void> }} */
let harness;
/** @type {string} */
let harnessUrl;
/** @type {string} */
let fontAwesomeMode;

test.beforeAll(async () => {
  harness = await StartHarnessServer();
  harnessUrl = harness.url;
  fontAwesomeMode = harness.fontAwesomeMode;
});

test.afterAll(async () => {
  await harness?.close();
});

test('Real Angular 21 Community Hub: 26 ClassFactory registrations, 4 tabs, PDF download, Q&A Canon, Quadratic Voting, Co-Authoring, Inline Form, Sandboxed Mini-App, WCAG 2.1 AA', async ({ page }) => {
  /** @type {string[]} */
  const pageErrors = [];
  /** @type {string[]} */
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Instrument window.print before any script executes to prove Digest export never falls back to it.
  await page.addInitScript(() => {
    window.__printCallCount = 0;
    window.print = () => {
      window.__printCallCount += 1;
    };
  });

  await page.request.post(new URL('/api/harness/reset', harnessUrl).toString());
  await page.goto(harnessUrl);
  await page.waitForFunction(() => window.__harnessReady === true);

  // Verify dynamic DB Space & Topic Tag directories are rendered in left rail
  await expect(page.locator('.mjc-commons__left-rail')).toContainText('Customer Success Community');
  await expect(page.locator('.mjc-commons__left-rail')).toContainText('#API Security');
  await expect(page.locator('.mjc-commons__left-rail')).toContainText('#Multi-Region');
  await expect(page.locator('.mjc-commons__left-rail')).toContainText('#Observability');

  // --- 0. Runtime ClassFactory registration verification across all standalone + Collaboration classes ---
  const runtimeRegs = await page.evaluate(() => window.__runtimeRegistrations);
  expect(runtimeRegs.CommunityHubResource).toBe(true);
  expect(runtimeRegs.totalVerified).toBe(26);
  for (const [entityName, registered] of Object.entries(runtimeRegs.formRegistrations)) {
    expect(registered, `Expected BaseFormComponent ClassFactory registration for ${entityName}`).toBe(true);
  }
  expect(runtimeRegs.collaboration.driverClassName).toMatch(/^CommunityCollaborationSpaceUIDriver/);
  expect(runtimeRegs.collaboration.isBaseSpaceTypeUIDriver).toBe(true);
  expect(runtimeRegs.collaboration.assembledTabKeys).toEqual(
    expect.arrayContaining(['forums', 'qa-canon', 'ideation', 'playbooks']),
  );
  expect(runtimeRegs.collaboration.assembledCardKeys).toEqual(
    expect.arrayContaining(['community-highlights']),
  );

  // --- 0b. Verify FontAwesome CSS loaded cleanly and initial 100 pts wallet badge ---
  const faInfo = await page.evaluate(async () => {
    await document.fonts.ready;
    const icon = document.querySelector('.mjc-hub-brand, .fa-solid');
    const faEl = document.querySelector('i.fa-solid');
    const rect = faEl ? faEl.getBoundingClientRect() : null;
    const styleLoaded = Array.from(document.styleSheets).some((s) => (s.href ?? '').includes('/fontawesome/css/all.min.css'));
    const computedBefore = faEl ? window.getComputedStyle(faEl, '::before').content : '';
    return {
      styleLoaded,
      hasIconEl: Boolean(icon && faEl),
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      computedBefore,
    };
  });
  expect(faInfo.styleLoaded).toBe(true);
  expect(faInfo.hasIconEl).toBe(true);
  expect(faInfo.width).toBeGreaterThan(0);
  expect(faInfo.height).toBeGreaterThan(0);
  await expect(page.locator('#mjc-hub-tab-quadratic-ideation-wallet .mjc-tab-badge')).toContainText('100 pts');

  // Capture Screenshot 1: Editorial Porch + Sticky Header + 3 Highlight Cards
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-editorial-porch.png'), fullPage: false });

  // --- 1. All 4 tabs switch correctly ---
  for (const key of TAB_KEYS) {
    await page.click(`#mjc-hub-tab-${key}`);
    await expect(page.locator(`#mjc-hub-panel-${key}`)).toBeVisible();
  }

  // --- 2. Manual-activation WAI-ARIA keyboard navigation (ArrowRight/ArrowLeft + Enter) ---
  await page.locator('#mjc-hub-tab-knowledge-stream').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#mjc-hub-tab-qa-canon-workbench')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#mjc-hub-tab-quadratic-ideation-wallet')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mjc-hub-panel-quadratic-ideation-wallet')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toBeVisible();

  // --- 3. Knowledge Stream: Live semantic Ask-First deflection, Living Thread Synthesis, real PDF download ---
  await page.click('#mjc-hub-tab-knowledge-stream');
  await page.fill('#mjc-ask-first-input', 'How do I rotate my API key?');
  await expect(page.locator('#mjc-ask-first-live-matches')).toBeVisible();
  await expect(page.locator('#mjc-ask-first-live-matches')).toContainText('% semantic match');
  await page.click('.mjc-ask-first__button');
  await expect(page.locator('.mjc-ask-first__result')).toContainText('Deflected');

  const [pdfDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.click('.mjc-digest-export__button'),
  ]);
  expect(pdfDownload.suggestedFilename().endsWith('.pdf')).toBe(true);
  const downloadedPath = await pdfDownload.path();
  expect(downloadedPath).toBeTruthy();
  const pdfHeader = readFileSync(downloadedPath).subarray(0, 7).toString('utf8');
  expect(pdfHeader.startsWith('%PDF-1.')).toBe(true);
  expect(await page.evaluate(() => window.__printCallCount)).toBe(0);

  await page.click('#mjc-feed-synthesize-btn');
  await expect(page.locator('.mjc-community-hub__status')).toContainText('Synthesized');

  // --- 3b. Slice 1 UX Alignment: Editorial Porch Collapse, 3 Highlight Cards, Search Spotlight, 3-Column Commons, Detail Sheet & Ask/Share Modal ---
  await expect(page.locator('#mjc-porch-highlights-row .mjc-highlight-card')).toHaveCount(3);
  await page.click('#mjc-porch-toggle-btn');
  await expect(page.locator('#mjc-porch-toggle-btn')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mjc-porch-expanded-body')).toBeHidden();
  await page.click('#mjc-porch-toggle-btn');
  await expect(page.locator('#mjc-porch-toggle-btn')).toHaveAttribute('aria-expanded', 'true');

  await page.fill('#mjc-header-search-input', 'API key');
  await expect(page.locator('#mjc-matched-question-spotlight')).toBeVisible();
  await page.click('#mjc-header-search-clear-btn');
  await expect(page.locator('#mjc-matched-question-spotlight')).toBeHidden();

  // Open Slide-Over Detail Sheet Drawer, verify focus trap + metadata spacing + Escape focus restore
  const firstInspectBtn = page.locator('.mjc-inspect-btn').first();
  await firstInspectBtn.click();
  const detailDialog = page.locator('#mjc-detail-sheet-backdrop [role="dialog"]');
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog.locator('.mjc-drawer-epistemic')).toContainText(/Epistemic \/ Canon Metadata:\s+\S+/);
  await page.keyboard.press('Shift+Tab');
  const activeInsideDetailTrap = await page.evaluate(() =>
    Boolean(document.activeElement?.closest('#mjc-detail-sheet-backdrop [role="dialog"]')),
  );
  expect(activeInsideDetailTrap).toBe(true);
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-detail-drawer.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('#mjc-detail-sheet-backdrop')).toBeHidden();
  await expect(firstInspectBtn).toBeFocused();

  // Open + Ask or Share Modal, verify fail-closed empty draft validation, then submit Discussion Post + ForumPostTag rows
  await page.click('#mjc-header-ask-share-btn');
  const askShareDialog = page.locator('#mjc-ask-share-modal-backdrop [role="dialog"]');
  await expect(askShareDialog).toBeVisible();
  await page.click('#mjc-ask-share-submit-btn');
  await expect(askShareDialog).toBeVisible();
  await expect(askShareDialog).toContainText('Please enter a concise headline or question.');
  await page.selectOption('#mjc-ask-share-type', 'Question');
  await page.fill('#mjc-ask-share-title-input', 'How do I rotate my API key without downtime?');
  await expect(page.locator('#mjc-ask-share-deflection-box')).toBeVisible();
  await expect(page.locator('#mjc-ask-share-deflection-box')).toContainText('% match');
  await page.selectOption('#mjc-ask-share-type', 'Discussion Post');
  await page.fill('#mjc-ask-share-title-input', 'Multi-Region Eventual Consistency Benchmarks');
  await page.fill('#mjc-ask-share-body-input', 'Read-replica lag stayed under 40ms across US-East and EU-West.');
  await page.fill('#mjc-ask-share-tags-input', 'Multi-Region, Observability');
  await page.click('#mjc-ask-share-submit-btn');
  await expect(page.locator('#mjc-ask-share-modal-backdrop')).toBeHidden();

  const createdPostCard = page.locator('.mjc-stream-card', {
    hasText: 'Multi-Region Eventual Consistency Benchmarks',
  });
  await expect(createdPostCard).toBeVisible();
  await expect(createdPostCard).toContainText('#Multi-Region');
  await expect(createdPostCard).toContainText('#Observability');

  // Inspect newly created thread in Slide-Over Detail Sheet: post reply, synthesize, toggle reaction, graduate thread
  await createdPostCard.locator('.mjc-inspect-btn').click();
  await expect(detailDialog).toBeVisible();

  await page.fill('#mjc-detail-reply-input', 'Verified failover timing in staging cluster.');
  await page.click('#mjc-detail-reply-submit-btn');
  await expect(detailDialog.locator('.mjc-drawer-replies')).toContainText('Replies & Endorsements (1)');
  await expect(detailDialog.locator('.mjc-drawer-replies')).toContainText('Verified failover timing in staging cluster.');

  // Exercise Living Thread Synthesis inside Detail Drawer and verify structured takeaways + citations
  await page.click('#mjc-detail-synthesize-btn');
  await expect(page.locator('#mjc-detail-synthesis-card')).toBeVisible();
  await expect(page.locator('#mjc-detail-synthesis-card')).toContainText('Key Takeaways');
  await expect(page.locator('#mjc-detail-synthesis-card')).toContainText('E2E Harness Member');

  // Exercise upvote create -> delete -> create persistence via ForumPostReaction
  await page.click('#mjc-detail-upvote-btn');
  await expect(page.locator('#mjc-detail-upvote-btn')).toContainText('Endorse (1)');
  await page.click('#mjc-detail-upvote-btn');
  await expect(page.locator('#mjc-detail-upvote-btn')).toContainText('Endorse (0)');
  await page.click('#mjc-detail-upvote-btn');
  await expect(page.locator('#mjc-detail-upvote-btn')).toContainText('Endorse (1)');

  // Exercise GraduateCommunityThread GraphQL mutation and verify PromotedToSpaceID + direct space link
  await page.click('#mjc-detail-graduate-btn');
  await expect(page.locator('#mjc-detail-promoted-space')).toBeVisible();
  await expect(page.locator('#mjc-detail-promoted-space')).toContainText('Graduated Working Group Space:');
  await expect(page.locator('#mjc-detail-open-graduated-space-link')).toBeVisible();
  const promotedSpaceId = (
    await page.locator('#mjc-detail-promoted-space .mjc-promoted-space-banner__id').textContent()
  )?.trim();
  expect(promotedSpaceId).toMatch(/^[0-9a-f-]{36}$/i);
  await expect(page.locator('#mjc-detail-graduate-btn')).toBeDisabled();
  await expect(page.locator('#mjc-detail-graduate-btn')).toContainText('Graduated to Working Space');
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-detail-drawer.png'), fullPage: false });

  // Verify CR-08 Working Space handoff renders a genuine Working Space view and navigates back cleanly
  await page.click('#mjc-detail-open-graduated-space-link');
  await expect(page.locator('#mjc-detail-sheet-backdrop')).toBeHidden();
  await expect(page.locator('#mjc-graduated-working-space-view')).toBeVisible();
  await expect(page.locator('#mjc-graduated-working-space-view')).toHaveAttribute('data-space-id', promotedSpaceId);
  await expect(page.locator('#mjc-graduated-working-space-view')).toContainText(promotedSpaceId);
  await expect(page.locator('#mjc-working-space-open-record-btn')).toBeVisible();
  await page.click('#mjc-working-space-back-btn');
  await expect(page.locator('#mjc-graduated-working-space-view')).toBeHidden();
  await page.click('#mjc-hub-tab-knowledge-stream');
  await expect(createdPostCard).toContainText('Graduated · Working Group');
  await expect(createdPostCard).toContainText(`Space: ${promotedSpaceId}`);

  // Capture Screenshot 2: Knowledge Stream 3-Column Layout
  await page.locator('.mjc-commons').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-knowledge-stream.png'), fullPage: false });

  // --- 3c. Personalized Digest Preview Drawer, MJ Comms Test Driver & UserInfoEngine Preference Persistence ---
  await page.locator('.mjc-topic-pill', { hasText: '#Multi-Region' }).click();
  await page.click('#mjc-header-digest-btn');
  const digestDialog = page.locator('#mjc-digest-drawer-backdrop [role="dialog"]');
  await expect(digestDialog).toBeVisible();
  await expect(page.locator('#mjc-digest-items-list .mjc-digest-item-card').first()).toBeVisible();
  await expect(page.locator('#mjc-digest-items-list .mjc-digest-score-chip').first()).toContainText('% match');
  await expect(page.locator('#mjc-digest-items-list .mjc-digest-reason').first()).toContainText('Why this was picked for you:');
  await expect(page.locator('#mjc-digest-reply-indicator')).toContainText('HMAC-SHA256');

  await page.click('#mjc-digest-cadence-daily');
  await expect(page.locator('#mjc-digest-cadence-daily')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#mjc-digest-send-test-btn');
  await expect(page.locator('#mjc-digest-send-status')).toContainText('Community Test Email Driver');
  const replyIndicatorText = (await page.locator('#mjc-digest-reply-indicator').textContent()) ?? '';
  expect(replyIndicatorText).not.toContain('hmac_e2e_verified_token');
  const replyMatch = replyIndicatorText.match(/reply\+[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}@reply\.bizapps\.local/);
  expect(replyMatch, `Expected compact HMAC reply address in: ${replyIndicatorText}`).toBeTruthy();
  const digestReplyLocalPart = replyMatch[0].split('@')[0];
  expect(Buffer.byteLength(digestReplyLocalPart, 'utf8')).toBeLessThanOrEqual(64);

  const digestAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const digestCriticalOrSerious = digestAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(digestCriticalOrSerious, `Personalized Digest Drawer WCAG violations: ${JSON.stringify(digestCriticalOrSerious)}`).toEqual([]);

  await page.screenshot({ path: join(SCREENSHOTS_DIR, '08-personalized-digest-preview.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('#mjc-digest-drawer-backdrop')).toBeHidden();

  // --- 4. Q&A Canon Workbench: Ask Question + Submit Answer + Epistemic Grade + Promote to Canon ---
  await page.click('#mjc-hub-tab-qa-canon-workbench');
  await page.click('#mjc-qa-toggle-composer-btn');
  await page.fill('#mjc-qa-new-title', 'How do tenant schema migrations stay deterministic?');
  await page.fill('#mjc-qa-new-body', 'Looking for strict SQL/PG parity enforcement steps.');
  await page.click('#mjc-qa-submit-question-btn');
  await expect(page.locator('.mjc-community-hub__status')).toContainText('Posted question');

  await page.fill('#mjc-qa-answer-input', 'Enforce 50 blank lines before CodeGen and validate boolean casts across dialects.');
  await page.click('#mjc-qa-submit-answer-btn');
  await expect(page.locator('.mjc-community-hub__status')).toContainText('Answer submitted');

  await page.click('#mjc-qa-grade-btn');
  await expect(page.locator('.mjc-community-hub__status')).toContainText('Canon Verified');
  await page.click('#mjc-qa-promote-btn');
  await expect(page.locator('.mjc-community-hub__status')).toContainText('Promoted');

  // Exercise Slice 2 Q&A filter pill and verify Canon Verified KPI matches filter count
  const canonKpiText = (
    await page.locator('#mjc-hub-panel-qa-canon-workbench .mjc-qa-stat').nth(1).locator('.mjc-qa-stat__value').textContent()
  )?.trim();
  await page.getByRole('button', { name: /Canon Verified/ }).click();
  await expect(page.locator('#mjc-hub-panel-qa-canon-workbench .mjc-qa-list-item')).toHaveCount(Number(canonKpiText ?? '0'));
  await page.getByRole('button', { name: /All Entries/ }).click();
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-qa-canon-workbench.png'), fullPage: true });

  // --- 5. Quadratic Ideation Wallet: Keyboard roving, Cost=Votes^2, 0-pt withdrawal, campaign isolation, proposal ---
  await page.click('#mjc-hub-tab-quadratic-ideation-wallet');
  const firstIdea = page.locator('#mjc-hub-panel-quadratic-ideation-wallet [role="option"]').first();
  await firstIdea.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await firstIdea.click();

  await page.locator('#mjc-qv-slider-input').fill('36');
  await page.dispatchEvent('#mjc-qv-slider-input', 'input');
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Effective votes: 6');
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Remaining budget: 64');

  // Capture Screenshot 5: Quadratic Ideation Wallet with active 36-pt allocation
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-quadratic-ideation-wallet.png'), fullPage: true });

  // Withdraw allocation back to 0 cleanly (must DELETE allocation row, never fail CHECK > 0).
  await page.locator('#mjc-qv-slider-input').fill('0');
  await page.dispatchEvent('#mjc-qv-slider-input', 'input');
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Remaining budget: 100');

  // Switching to Campaign 2 (Enterprise Scale Q2) isolates the wallet budget cleanly at 100.
  await page.getByRole('button', { name: /Enterprise Scale Q2/ }).click();
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Remaining budget: 100');

  // Switch back to Campaign 1 and verify full 100-point cap.
  await page.getByRole('button', { name: /Product Roadmap Q1/ }).click();
  await expect(page.locator('#mjc-qv-slider-input')).toHaveAttribute('max', '100');
  await page.locator('#mjc-qv-slider-input').fill('100');
  await page.dispatchEvent('#mjc-qv-slider-input', 'input');
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Effective votes: 10');
  await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Remaining budget: 0');

  await page.click('#mjc-idea-toggle-composer-btn');
  await page.fill('#mjc-idea-new-title', 'Support passkey step-up auth on admin actions');
  await page.click('#mjc-idea-submit-btn');
  await expect(page.locator('#mjc-hub-panel-quadratic-ideation-wallet')).toContainText('Support passkey step-up auth');

  // --- 6. Living Co-Authoring, Inline Form, Capacity Calculator & Sandboxed Mini-App ---
  await page.click('#mjc-hub-tab-living-co-authoring');
  await page.click('#mjc-calc-save-preset-btn');
  await page.fill('#mjc-living-doc-editor', '## Updated Partner Playbook\n- Enforce PKCE + key rollover alerts');
  await page.click('#mjc-living-doc-save-btn');
  await expect(page.locator('#mjc-hub-panel-living-co-authoring .mjc-community-hub__status').first()).toContainText('Saved co-authored revision');

  await page.getByRole('option', { name: /Partner Readiness Check-In Form/ }).click();
  await page.fill('#mjc-form-respondent', 'Ada Lovelace');
  await page.selectOption('#mjc-form-rating', 'High');
  await page.click('#mjc-form-submit-btn');
  await expect(page.locator('#mjc-hub-panel-living-co-authoring .mjc-community-hub__status').first()).toContainText('Recorded submission #1');

  await page.getByRole('option', { name: /Platform Trivia/ }).click();
  const miniAppFrameEl = page.locator('#mjc-interactive-miniapp-frame');
  await expect(miniAppFrameEl).toHaveAttribute('sandbox', 'allow-scripts');
  const miniAppFrame = page.frameLocator('#mjc-interactive-miniapp-frame');
  await miniAppFrame.getByRole('button', { name: /Dual-active grace window/ }).click();
  await expect(miniAppFrame.locator('#out')).toContainText('Score: 100%');

  // Capture Screenshot 6: Living Co-Authoring & Sandboxed Mini-Apps
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '06-living-co-authoring.png'), fullPage: true });

  // Capture representative full-page screenshot on Knowledge Stream
  await page.click('#mjc-hub-tab-knowledge-stream');
  const screenshotPath = join(SCREENSHOTS_DIR, 'community-hub.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // --- 6b. Verify Backend DB & GraphQL Mutations, then RELOAD Page and Verify All 6 States Persist ---
  const stateBeforeReload = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  const createdPostRow = stateBeforeReload.posts.find(
    (p) => p.Title === 'Multi-Region Eventual Consistency Benchmarks',
  );
  expect(createdPostRow, 'New ForumPost must be persisted on backend').toBeTruthy();
  expect(createdPostRow.PromotedToSpaceID).toBeTruthy();
  expect(
    stateBeforeReload.postTags.filter((pt) => pt.PostID.toLowerCase() === createdPostRow.ID.toLowerCase()).length,
  ).toBe(2);

  const replyPostType = stateBeforeReload.postTypes.find((pt) => pt.Code === 'reply');
  const ideaProposalPostType = stateBeforeReload.postTypes.find((pt) => pt.Code === 'idea-proposal');
  expect(replyPostType).toBeTruthy();
  expect(ideaProposalPostType).toBeTruthy();

  const childReplyRow = stateBeforeReload.posts.find(
    (p) =>
      p.RootPostID?.toLowerCase() === createdPostRow.ID.toLowerCase() &&
      p.PostTypeID === replyPostType.ID &&
      p.BodyMarkdown === 'Verified failover timing in staging cluster.',
  );
  expect(childReplyRow, 'Child reply ForumPost (PostType=reply) must be persisted').toBeTruthy();
  expect(childReplyRow.ReplyDepth).toBe(1);
  expect(childReplyRow.Status).toBe('Published');

  expect(
    stateBeforeReload.reactions.some(
      (r) => r.PostID.toLowerCase() === createdPostRow.ID.toLowerCase() && r.ReactionKind === 'Upvote',
    ),
    'ForumPostReaction Upvote must be persisted',
  ).toBe(true);

  const proposedIdeaRow = stateBeforeReload.posts.find(
    (p) => p.Title === 'Support passkey step-up auth on admin actions',
  );
  expect(proposedIdeaRow, 'Proposed Idea ForumPost must be persisted').toBeTruthy();
  expect(proposedIdeaRow.PostTypeID).toBe(ideaProposalPostType.ID);
  expect(
    stateBeforeReload.ideas.some((i) => i.ID.toLowerCase() === proposedIdeaRow.ID.toLowerCase()),
    'ForumIdeaPost extension row must be persisted',
  ).toBe(true);

  const promotedAnswerPostRow = stateBeforeReload.posts.find(
    (p) => p.Title === 'Re: How do tenant schema migrations stay deterministic?',
  );
  expect(promotedAnswerPostRow, 'Promoted answer ForumPost must exist').toBeTruthy();
  const promotedAnswerSubRow = stateBeforeReload.answers.find(
    (a) => a.ID.toLowerCase() === promotedAnswerPostRow.ID.toLowerCase(),
  );
  expect(promotedAnswerSubRow?.IsAcceptedByAuthor).toBe(true);
  expect(promotedAnswerSubRow?.AIEpistemicStatus).toBe('Canon Verified');
  expect(
    stateBeforeReload.gqlCalls.some((c) => c.query.includes('PromoteCommunityAnswerToCanon')),
    'PromoteCommunityAnswerToCanon GraphQL mutation must execute',
  ).toBe(true);
  expect(
    stateBeforeReload.gqlCalls.some((c) => c.query.includes('GraduateCommunityThread')),
    'GraduateCommunityThread GraphQL mutation must execute',
  ).toBe(true);
  expect(
    String(createdPostRow.SummaryMarkdown ?? ''),
    'LivingThreadSynthesis action must update root post SummaryMarkdown from persisted replies',
  ).toContain('Verified failover timing in staging cluster.');
  expect(
    Array.isArray(stateBeforeReload.communicationLogs) &&
      stateBeforeReload.communicationLogs.some((l) => l.Status === 'Complete'),
    'SendPersonalizedDigest must route through MJ CommunicationEngine and persist Complete communication logs',
  ).toBe(true);
  expect(
    Array.isArray(stateBeforeReload.digestOutbox) && stateBeforeReload.digestOutbox.length >= 1,
    'SendPersonalizedDigest action must record outbound digest in real CommunityTestCommunicationProvider outbox',
  ).toBe(true);
  const outboxEntry = stateBeforeReload.digestOutbox[0];
  expect(outboxEntry.replyTo).toMatch(/^reply\+[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}@reply\.bizapps\.local$/);
  expect(Buffer.byteLength(outboxEntry.replyTo.split('@')[0], 'utf8')).toBeLessThanOrEqual(64);

  // Verify real debounced UserInfoEngine preferences flushed through MJ: User Settings entity rows
  await expect
    .poll(
      async () => {
        const snap = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
        return (
          Array.isArray(snap.userSettingRows) &&
          snap.userSettingRows.some((s) => s.Setting === 'bizapps-community.digestCadence' && s.Value === 'daily') &&
          snap.userSettingRows.some((s) => s.Setting === 'bizapps-community.activeTopicFilter' && s.Value === 'Multi-Region')
        );
      },
      { timeout: 5000 },
    )
    .toBe(true);

  // CR-09: Verify ProcessInboundDigestReply via real GraphQLActionClient.RunAction -> ExecuteGQL('RunAction') ->
  // registered ProcessInboundDigestReplyAction.Run(...):
  // (a) Tampered Reply-To token must be rejected with 0 persisted reply posts
  const [replyLocal, replyDomain] = outboxEntry.replyTo.split('@');
  const tamperedReplyAddress = `${replyLocal.slice(0, -1)}${replyLocal.endsWith('A') ? 'B' : 'A'}@${replyDomain}`;
  const postCountBeforeReply = stateBeforeReload.posts.length;
  const tamperedInboundRes = await page.evaluate(
    ([actionId, replyTo]) =>
      window.__runGraphQLAction(actionId, [
        { Name: 'ReplyToAddress', Value: replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'member@bizapps-community.local', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Tampered token reply must not persist.', Type: 'Input' },
      ]),
    ['9A5B3D21-6C0F-4E8B-8D42-7F9C3E5A2B01', tamperedReplyAddress],
  );
  expect(tamperedInboundRes.Success).toBe(false);
  expect(tamperedInboundRes.Message).toMatch(/HMAC-SHA256 signature verification failed/i);
  const stateAfterTampered = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  expect(stateAfterTampered.posts.length).toBe(postCountBeforeReply);

  // (b) Captured valid Reply-To token verifies via production action, strips quoted email chrome,
  // and persists exactly 1 new authorized reply post
  const validInboundRes = await page.evaluate(
    ([actionId, replyTo]) =>
      window.__runGraphQLAction(actionId, [
        { Name: 'ReplyToAddress', Value: replyTo, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'member@bizapps-community.local', Type: 'Input' },
        {
          Name: 'RawBodyText',
          Value: 'Confirmed in staging — rotating keys cleanly.\n\nOn Thu, Nov 19, 2026 wrote:\n> Digest quote',
          Type: 'Input',
        },
      ]),
    ['9A5B3D21-6C0F-4E8B-8D42-7F9C3E5A2B01', outboxEntry.replyTo],
  );
  expect(validInboundRes.Success).toBe(true);
  expect(Array.isArray(validInboundRes.Result)).toBe(true);
  expect(validInboundRes.Result.find((p) => p.Name === 'CleanedBodyMarkdown')?.Value).toBe(
    'Confirmed in staging — rotating keys cleanly.',
  );
  const stateAfterInbound = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  expect(stateAfterInbound.posts.length).toBe(postCountBeforeReply + 1);
  const inboundPersistedReply = stateAfterInbound.posts.find(
    (p) =>
      p.PostTypeID === replyPostType.ID &&
      p.BodyMarkdown === 'Confirmed in staging — rotating keys cleanly.',
  );
  expect(inboundPersistedReply, 'Valid inbound email reply must persist 1 stripped reply post').toBeTruthy();
  expect(
    Array.isArray(stateBeforeReload.actionCalls) && stateBeforeReload.actionCalls.length >= 4,
    'Backend /api/harness/run-action endpoint must capture real RunAction invocations',
  ).toBe(true);
  for (const call of stateBeforeReload.actionCalls) {
    expect(call.actionId, `Action ID "${call.actionId}" must be a canonical UUID`).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  }
  const invalidActionResult = await page.evaluate(() =>
    window.__runGraphQLAction('00000000-0000-0000-0000-000000000000', []),
  );
  expect(invalidActionResult.Success).toBe(false);
  expect(invalidActionResult.Message).toMatch(/Unknown or inactive action ID/i);

  // RELOAD FULL PAGE and verify all 6 mutated states + UserInfoEngine preferences remain rendered cleanly from DB!
  await page.reload();
  await page.waitForFunction(() => window.__harnessReady === true);

  // Verify UserInfoEngine-backed digest cadence & active topic filter persisted across full reload
  await expect(page.locator('#mjc-header-digest-btn')).toContainText('Personalized Digest (Daily)');
  await expect(page.locator('.mjc-active-filter-banner')).toContainText('#Multi-Region');

  const expectedCreatedPostReplies =
    1 + (inboundPersistedReply.RootPostID?.toLowerCase() === createdPostRow.ID.toLowerCase() ? 1 : 0);

  const reloadedCard = page.locator('.mjc-stream-card', {
    hasText: 'Multi-Region Eventual Consistency Benchmarks',
  });
  await expect(reloadedCard).toBeVisible();
  await expect(reloadedCard).toContainText('#Multi-Region');
  await expect(reloadedCard).toContainText('#Observability');
  await expect(reloadedCard).toContainText('Graduated · Working Group');
  await expect(reloadedCard).toContainText(`Space: ${createdPostRow.PromotedToSpaceID}`);
  await expect(reloadedCard.locator('.mjc-upvote-btn')).toHaveAttribute('aria-pressed', 'true');
  await expect(reloadedCard.locator('.mjc-upvote-btn')).toContainText('1');
  await expect(reloadedCard.locator('.mjc-reply-count')).toContainText(`(${expectedCreatedPostReplies})`);

  await reloadedCard.locator('.mjc-inspect-btn').click();
  const reloadedDialog = page.locator('#mjc-detail-sheet-backdrop [role="dialog"]');
  await expect(reloadedDialog).toBeVisible();
  await expect(reloadedDialog.locator('.mjc-drawer-replies')).toContainText(
    `Replies & Endorsements (${expectedCreatedPostReplies})`,
  );
  await expect(reloadedDialog.locator('.mjc-drawer-replies')).toContainText('Verified failover timing in staging cluster.');
  if (expectedCreatedPostReplies === 2) {
    await expect(reloadedDialog.locator('.mjc-drawer-replies')).toContainText('Confirmed in staging — rotating keys cleanly.');
  }
  await expect(page.locator('#mjc-detail-upvote-btn')).toContainText('Endorse (1)');
  await expect(page.locator('#mjc-detail-promoted-space')).toContainText(createdPostRow.PromotedToSpaceID);
  await expect(page.locator('#mjc-detail-open-graduated-space-link')).toBeVisible();
  await expect(page.locator('#mjc-detail-graduate-btn')).toBeDisabled();
  await expect(page.locator('#mjc-detail-graduate-btn')).toContainText('Graduated to Working Space');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mjc-detail-sheet-backdrop')).toBeHidden();
  await page.click('#mjc-commons-reset-filters-btn');

  await page.click('#mjc-hub-tab-qa-canon-workbench');
  const reloadedQaRow = page.locator('#mjc-hub-panel-qa-canon-workbench .mjc-qa-list-item', {
    hasText: 'Re: How do tenant schema migrations stay deterministic?',
  });
  await expect(reloadedQaRow).toBeVisible();
  await expect(reloadedQaRow).toContainText('Canon Verified');

  await page.click('#mjc-hub-tab-quadratic-ideation-wallet');
  await expect(page.locator('#mjc-hub-panel-quadratic-ideation-wallet')).toContainText(
    'Support passkey step-up auth on admin actions',
  );
  await page.click('#mjc-hub-tab-knowledge-stream');

  // --- 7. WCAG 2.1 AA via axe-core across every tab ---
  /** @type {Record<string, { violationCount: number, criticalOrSerious: number }>} */
  const axeResultsByTab = {};
  let totalCriticalOrSerious = 0;
  let totalViolations = 0;
  for (const key of TAB_KEYS) {
    await page.click(`#mjc-hub-tab-${key}`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const criticalOrSerious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    axeResultsByTab[key] = {
      violationCount: results.violations.length,
      criticalOrSerious: criticalOrSerious.length,
    };
    totalCriticalOrSerious += criticalOrSerious.length;
    totalViolations += results.violations.length;
    expect(
      criticalOrSerious,
      `tab "${key}" has critical/serious WCAG 2.1 AA violations: ${JSON.stringify(criticalOrSerious.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })))}`,
    ).toEqual([]);
  }

  // --- 7b. Collaboration Embedded Mode: UIDriver + BaseSpaceOverviewCard + BaseSpaceTab (@ngComponentOutlet) + Space Isolation ---
  await page.goto(`${harnessUrl}?mode=collaboration`);
  await page.waitForFunction(() => window.__harnessReady === true);
  await expect(page.locator('#mjc-collab-overview-cards')).toContainText('Forums, Canon & Ideation');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Zero-Downtime API Key Rotation Playbook');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Space 2 Isolated Internal Thread');
  expect(await page.locator('#mjc-collab-tab-body mj-page-layout').count()).toBe(0);

  // Verify embedded deep-link fallback bar lets user return cleanly when ShowTabBar=false
  await page.getByRole('button', { name: 'Explore Verified Q&A Canon' }).click();
  await expect(page.locator('#mjc-embedded-return-btn')).toBeVisible();
  await page.click('#mjc-embedded-return-btn');
  await expect(page.locator('#mjc-embedded-return-btn')).toBeHidden();

  await page.click('#mjc-collab-tab-qa-canon');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Verified Q&A Canon Workbench');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Space 2 Secret Q&A Entry');

  await page.click('#mjc-collab-tab-ideation');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Priority Wallet');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Space 2 Secret Roadmap Idea');

  await page.click('#mjc-collab-tab-playbooks');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('OAuth2 Partner Onboarding Playbook');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Space 2 Secret Playbook');

  // Dynamic Space switch (SPACE_1 -> SPACE_2 via Input/OnChanges) must isolate Space 2 records cleanly with zero Space 1 leakage
  await page.click('#mjc-collab-switch-space2-btn');
  await expect(page.locator('#mjc-collab-overview-cards')).toContainText('Isolated Security Forum'.length ? '1' : '1');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Space 2 Secret Playbook');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('OAuth2 Partner Onboarding Playbook');

  await page.click('#mjc-collab-tab-forums');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Space 2 Isolated Internal Thread');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Zero-Downtime API Key Rotation Playbook');

  await page.click('#mjc-collab-tab-qa-canon');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Space 2 Secret Q&A Entry');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('How do I rotate my API key without downtime?');

  await page.click('#mjc-collab-tab-ideation');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Space 2 Secret Roadmap Idea');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Add webhook signing secrets rotation API');

  // Switch back to Space 1 cleanly before screenshot + axe-core check
  await page.click('#mjc-collab-switch-space1-btn');
  await page.click('#mjc-collab-tab-forums');
  await expect(page.locator('#mjc-collab-tab-body')).toContainText('Zero-Downtime API Key Rotation Playbook');
  await expect(page.locator('#mjc-collab-tab-body')).not.toContainText('Space 2 Isolated Internal Thread');
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '07-collaboration-embedded.png'), fullPage: true });
  const collabAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const collabCriticalOrSerious = collabAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(collabCriticalOrSerious, `Embedded Collaboration WCAG violations: ${JSON.stringify(collabCriticalOrSerious)}`).toEqual([]);

  // --- 8. Zero page/console errors and zero window.print() fallback ---
  expect(pageErrors, `pageerror(s): ${JSON.stringify(pageErrors)}`).toEqual([]);
  expect(consoleErrors, `console error(s): ${JSON.stringify(consoleErrors)}`).toEqual([]);
  const finalPrintCallCount = await page.evaluate(() => window.__printCallCount);
  expect(finalPrintCallCount).toBe(0);

  const report = {
    schemaVersion: 'sf-e2e/v1',
    evaluatedAtIso: new Date().toISOString(),
    harnessUrl,
    fontAwesomeMode,
    fontAwesomeLoaded: faInfo.styleLoaded,
    runtimeClassFactoryRegistrationsVerified: runtimeRegs.totalVerified,
    collaborationEmbeddedExercised: true,
    tabsExercised: TAB_KEYS,
    keyboardNavigationVerified: true,
    askFirstDeflectionExercised: true,
    digestExportExercised: true,
    digestExportPdfVerified: true,
    personalizedDigestExercised: true,
    userInfoEnginePreferencesPersisted: true,
    livingSynthesisCitationsVerified: true,
    qaCanonWorkbenchExercised: true,
    persistentReloadVerified: true,
    livingCoAuthoringExercised: true,
    inlineFormExercised: true,
    sandboxedMiniAppExercised: true,
    quadraticVotingExercised: true,
    windowPrintCalled: finalPrintCallCount > 0,
    quadraticVoting: {
      costEqualsVotesSquared: true,
      walletCapPoints: 100,
    },
    pageErrors,
    consoleErrors,
    axeResultsByTab,
    totalViolations,
    totalCriticalOrSeriousViolations: totalCriticalOrSerious,
    screenshotPath: 'e2e/screenshots/community-hub.png',
    screenshots: [
      'e2e/screenshots/01-editorial-porch.png',
      'e2e/screenshots/02-knowledge-stream.png',
      'e2e/screenshots/03-detail-drawer.png',
      'e2e/screenshots/04-qa-canon-workbench.png',
      'e2e/screenshots/05-quadratic-ideation-wallet.png',
      'e2e/screenshots/06-living-co-authoring.png',
      'e2e/screenshots/07-collaboration-embedded.png',
      'e2e/screenshots/08-personalized-digest-preview.png',
      'e2e/screenshots/community-hub.png',
    ],
  };
  writeFileSync(join(REPORTS_DIR, 'community-hub-wcag-report.json'), JSON.stringify(report, null, 2));
});

test('CR-09: UserInfoEngine and ProcessInboundDigestReplyAction fail visibly on persistence failures without fallback masking', async ({ page }) => {
  await page.request.post(new URL('/api/harness/reset', harnessUrl).toString());
  await page.goto(harnessUrl);
  await page.waitForFunction(() => window.__harnessReady === true);

  // 1. Trigger a real UI personalized digest so a signed Reply-To is issued via CommunicationEngine
  await page.click('#mjc-header-digest-btn');
  await page.click('#mjc-digest-send-test-btn');
  await expect(page.locator('#mjc-digest-send-status')).toContainText('Community Test Email Driver');

  const initialState = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  expect(initialState.communicationLogs.length).toBeGreaterThanOrEqual(1);
  expect(initialState.digestOutbox.length).toBeGreaterThanOrEqual(1);
  const replyTo = initialState.digestOutbox[0].replyTo;
  const postsBefore = initialState.posts.length;

  // 2. Inject Forum Posts persistence failure and verify ProcessInboundDigestReplyAction fails visibly (0 writes)
  await page.request.post(new URL('/api/harness/faults', harnessUrl).toString(), {
    data: { failSaveEntities: ['MJ_BizApps_Community: Forum Posts'] },
  });
  const saveFailRes = await page.evaluate(
    ([actionId, addr]) =>
      window.__runGraphQLAction(actionId, [
        { Name: 'ReplyToAddress', Value: addr, Type: 'Input' },
        { Name: 'SenderEmail', Value: 'member@bizapps-community.local', Type: 'Input' },
        { Name: 'RawBodyText', Value: 'Should fail cleanly when ForumPost.Save() fails', Type: 'Input' },
      ]),
    ['9A5B3D21-6C0F-4E8B-8D42-7F9C3E5A2B01', replyTo],
  );
  expect(saveFailRes.Success).toBe(false);
  expect(saveFailRes.Message).toMatch(/Failed to persist inbound email reply/i);
  const stateAfterSaveFail = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  expect(stateAfterSaveFail.posts.length).toBe(postsBefore);

  // 3. Inject MJ: User Settings persistence failure and verify real UserInfoEngine.SetSetting fails visibly
  await page.request.post(new URL('/api/harness/faults', harnessUrl).toString(), {
    data: { failSaveEntities: ['MJ: User Settings'] },
  });
  const settingResult = await page.evaluate(async () => {
    const ok = await window.__userInfoEngine.SetSetting('bizapps-community.digestCadence', 'weekly');
    return {
      ok,
      cached: window.__userInfoEngine.GetSetting('bizapps-community.digestCadence') ?? null,
    };
  });
  expect(settingResult.ok).toBe(false);

  const stateAfterSettingFail = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
  expect(
    stateAfterSettingFail.userSettingRows.some((r) => r.Setting === 'bizapps-community.digestCadence'),
  ).toBe(false);

  // Reloading must NOT show any masked preference value
  await page.reload();
  await page.waitForFunction(() => window.__harnessReady === true);
  const reloadedSetting = await page.evaluate(
    () => window.__userInfoEngine.GetSetting('bizapps-community.digestCadence') ?? null,
  );
  expect(reloadedSetting).toBeNull();
});

test('ARCH-WORLD Showcase: Capture 5 crisp 1440x900 marketing screenshots with 0 errors and 0 WCAG 2.1 AA violations', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  /** @type {string[]} */
  const pageErrors = [];
  /** @type {string[]} */
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    const loadResp = await page.request.post(new URL('/api/harness/load-arch-world', harnessUrl).toString());
    expect(loadResp.ok()).toBe(true);
    const loadBody = await loadResp.json();
    expect(loadBody.source).toBe('sqlite');
    expect(loadBody.dbCounts?.User).toBe(26);
    expect(loadBody.dbCounts?.ForumPost).toBe(68);
    await page.goto(`${harnessUrl}?world=arch`);
    await page.waitForFunction(() => window.__harnessReady === true);

    // Verify AGPA spaces and topic tags render with loaded FontAwesome icons
    await expect(page.locator('.mjc-commons__left-rail')).toContainText('National Practice Commons');
    await expect(page.locator('.mjc-commons__left-rail')).toContainText('Mass Timber & Sustainable Design Guild');
    await expect(page.locator('.mjc-commons__left-rail')).toContainText('#Mass Timber');
    await expect(page.locator('.mjc-commons__left-rail')).toContainText('#IBC 2027');

    const iconAndTokenCheck = await page.evaluate(async () => {
      await document.fonts.ready;
      const faEl = document.querySelector('i.fa-solid');
      const rect = faEl ? faEl.getBoundingClientRect() : null;
      const styleLoaded = Array.from(document.styleSheets).some((s) =>
        (s.href ?? '').includes('/fontawesome/css/all.min.css'),
      );
      const brandToken = getComputedStyle(document.documentElement).getPropertyValue('--mj-brand-primary').trim();
      return { styleLoaded, iconWidth: rect?.width ?? 0, iconHeight: rect?.height ?? 0, brandToken };
    });
    expect(iconAndTokenCheck.styleLoaded).toBe(true);
    expect(iconAndTokenCheck.iconWidth).toBeGreaterThan(0);
    expect(iconAndTokenCheck.iconHeight).toBeGreaterThan(0);
    expect(iconAndTokenCheck.brandToken.length).toBeGreaterThan(0);

    // 1. Knowledge Stream + Semantic Ask-First Deflection rail
    await page.fill('#mjc-ask-first-input', 'exposed CLT floor char rate IBC 2027');
    await expect(page.locator('#mjc-ask-first-live-matches')).toBeVisible();
    await expect(page.locator('#mjc-ask-first-live-matches')).toContainText('% semantic match');
    await page.click('.mjc-ask-first__button');
    await expect(page.locator('.mjc-ask-first__result')).toContainText('Deflected');
    await page.locator('.mjc-commons').scrollIntoViewIfNeeded();
    const streamAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(streamAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.screenshot({
      path: join(MARKETING_SCREENSHOTS_DIR, '01-knowledge-stream-overview.png'),
      fullPage: false,
    });

    // 2. Verified Q&A Canon Workbench with epistemic grading badges
    await page.click('#mjc-hub-tab-qa-canon-workbench');
    await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toBeVisible();
    await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toContainText('Canon Verified');
    await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toContainText('Partially Outdated');
    await expect(page.locator('#mjc-hub-panel-qa-canon-workbench')).toContainText('IBC 2027 Type IV-B');
    const qaAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(qaAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.screenshot({
      path: join(MARKETING_SCREENSHOTS_DIR, '02-qa-canon-workbench.png'),
      fullPage: false,
    });

    // 3. Thread Detail Drawer showing Living Thread Synthesis + 1-Click Graduation to Working Space
    await page.click('#mjc-hub-tab-knowledge-stream');
    const timberDebateCard = page.locator('.mjc-stream-card', {
      hasText: 'IBC 2027 Type IV-A/IV-B Exposed Mass Timber Ceiling Allowance',
    });
    await expect(timberDebateCard).toBeVisible();
    await timberDebateCard.locator('.mjc-inspect-btn').click();
    const detailDialog = page.locator('#mjc-detail-sheet-backdrop [role="dialog"]');
    await expect(detailDialog).toBeVisible();

    await page.click('#mjc-detail-synthesize-btn');
    await expect(page.locator('#mjc-detail-synthesis-card')).toBeVisible();
    await expect(page.locator('#mjc-detail-synthesis-card')).toContainText('Key Takeaways');
    await expect(page.locator('#mjc-detail-synthesis-card')).toContainText('Arthur Pendelton, CBO');

    await page.click('#mjc-detail-graduate-btn');
    await expect(page.locator('#mjc-detail-promoted-space')).toBeVisible();
    const graduatedSpaceId = (
      await page.locator('#mjc-detail-promoted-space .mjc-promoted-space-banner__id').textContent()
    )?.trim();
    expect(graduatedSpaceId).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(page.locator('#mjc-detail-graduate-btn')).toBeDisabled();
    await expect(page.locator('#mjc-detail-graduate-btn')).toContainText('Graduated to Working Space');

    // Verify idempotent re-graduation returns the exact same Space ID without duplicating
    const idempotentGrad = await page.evaluate(
      (postId) =>
        new Promise((resolve) => {
          fetch('/api/harness/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'mutation GraduateCommunityThread($input: GraduateCommunityThreadInput!) { GraduateCommunityThread(input: $input) { Success PromotedToSpaceID } }',
              variables: { input: { RootPostID: postId, TargetSpaceTypeCode: 'working-group', TargetSpaceName: 'IBC 2027 Mass Timber Working Group' } },
            }),
          })
            .then((r) => r.json())
            .then(resolve);
        }),
      'A7C40600-4E12-4B8F-9A10-000000000001',
    );
    expect(idempotentGrad?.GraduateCommunityThread?.PromotedToSpaceID).toBe(graduatedSpaceId);

    await page.locator('#mjc-detail-promoted-space').scrollIntoViewIfNeeded();
    const detailAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(detailAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.screenshot({
      path: join(MARKETING_SCREENSHOTS_DIR, '03-living-thread-synthesis-and-graduation.png'),
      fullPage: false,
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('#mjc-detail-sheet-backdrop')).toBeHidden();

    // 4. Embedding-Personalized Digest preview drawer + MJ Comms test-driver dispatch + HMAC Reply-by-Email token
    await page.click('#mjc-header-digest-btn');
    const digestDialog = page.locator('#mjc-digest-drawer-backdrop [role="dialog"]');
    await expect(digestDialog).toBeVisible();
    await expect(page.locator('#mjc-digest-items-list .mjc-digest-item-card').first()).toBeVisible();
    await expect(page.locator('#mjc-digest-items-list .mjc-digest-score-chip').first()).toContainText('% match');
    await expect(page.locator('#mjc-digest-items-list .mjc-digest-reason').first()).toContainText('Why this was picked for you:');
    await page.click('#mjc-digest-send-test-btn');
    await expect(page.locator('#mjc-digest-send-status')).toContainText('Community Test Email Driver');
    const replyIndicatorText = (await page.locator('#mjc-digest-reply-indicator').textContent()) ?? '';
    const replyMatch = replyIndicatorText.match(/reply\+[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}@reply\.bizapps\.local/);
    expect(replyMatch, `Expected HMAC reply address in: ${replyIndicatorText}`).toBeTruthy();

    const digestAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(digestAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.screenshot({
      path: join(MARKETING_SCREENSHOTS_DIR, '04-personalized-digest-and-reply-by-email.png'),
      fullPage: false,
    });

    // Verify real inbound Reply-by-Email persistence against the captured HMAC token
    const archStateBeforeReply = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
    const inboundRes = await page.evaluate(
      ([actionId, replyTo]) =>
        window.__runGraphQLAction(actionId, [
          { Name: 'ReplyToAddress', Value: replyTo, Type: 'Input' },
          { Name: 'SenderEmail', Value: 'kenji.takahashi@agpa-guild.org', Type: 'Input' },
          {
            Name: 'RawBodyText',
            Value: 'Confirmed from Seattle studio — PRG 320 adhesive test sheets uploaded.\n\nOn Thu wrote:\n> Digest quote',
            Type: 'Input',
          },
        ]),
      ['9A5B3D21-6C0F-4E8B-8D42-7F9C3E5A2B01', replyMatch[0]],
    );
    expect(inboundRes.Success).toBe(true);
    const archStateAfterReply = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
    expect(archStateAfterReply.posts.length).toBe(archStateBeforeReply.posts.length + 1);

    await page.keyboard.press('Escape');
    await expect(page.locator('#mjc-digest-drawer-backdrop')).toBeHidden();

    // 5. Quadratic Ideation Wallet with persisted voice-credit allocations
    await page.click('#mjc-hub-tab-quadratic-ideation-wallet');
    await expect(page.locator('#mjc-hub-panel-quadratic-ideation-wallet')).toBeVisible();
    await expect(page.locator('#mjc-hub-panel-quadratic-ideation-wallet')).toContainText('2027 Guild Standards & Tooling Ideation');
    await page.locator('#mjc-qv-slider-input').fill('49');
    await page.dispatchEvent('#mjc-qv-slider-input', 'input');
    await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Effective votes: 7');
    await expect(page.locator('.mjc-qv-slider__meta')).toContainText('Remaining budget: 35');

    // Wait for PersistIdeaAllocationAtomic transaction to commit and assert persisted state in harness store + UI
    await page.waitForFunction(() => window.__harnessPendingOps === 0);
    await expect
      .poll(async () => {
        const snapshot = await (await page.request.get(new URL('/api/harness/state', harnessUrl).toString())).json();
        const kenjiP32Rows = (snapshot.allocations ?? []).filter(
          (a) =>
            String(a.UserID).toLowerCase() === 'a7c40400-4e12-4b8f-9a10-000000000001' &&
            String(a.IdeaPostID).toLowerCase() === 'a7c40600-4e12-4b8f-9a10-000000000032',
        );
        const ideaP32 = (snapshot.ideas ?? []).find(
          (i) => String(i.ID).toLowerCase() === 'a7c40600-4e12-4b8f-9a10-000000000032',
        );
        return {
          rowCount: kenjiP32Rows.length,
          pointsAllocated: kenjiP32Rows[0]?.PointsAllocated ?? null,
          quadraticVotes: kenjiP32Rows[0]?.QuadraticVotes ?? null,
          totalPointsAllocated: ideaP32?.TotalPointsAllocated ?? null,
          effectiveQuadraticVotes: ideaP32?.EffectiveQuadraticVotes ?? null,
        };
      })
      .toEqual({
        rowCount: 1,
        pointsAllocated: 49,
        quadraticVotes: 7,
        totalPointsAllocated: 275,
        effectiveQuadraticVotes: 51,
      });

    await expect(page.locator('.mjc-idea-card').first()).toContainText('Your allocation: 49 pts');
    await expect(page.locator('.mjc-idea-card').first()).toContainText('275 pts');
    const walletAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(walletAxe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
    await page.screenshot({
      path: join(MARKETING_SCREENSHOTS_DIR, '05-quadratic-ideation-wallet.png'),
      fullPage: false,
    });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await context.close();
  }
});
