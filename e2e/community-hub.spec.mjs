import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StartHarnessServer } from './harness/serve-harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(HERE, 'reports');
const SCREENSHOTS_DIR = join(HERE, 'screenshots');
mkdirSync(REPORTS_DIR, { recursive: true });
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

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

  await page.goto(harnessUrl);
  await page.waitForFunction(() => window.__harnessReady === true);

  // --- 0. Runtime ClassFactory registration verification across all 26 classes ---
  const runtimeRegs = await page.evaluate(() => window.__runtimeRegistrations);
  expect(runtimeRegs.CommunityHubResource).toBe(true);
  expect(runtimeRegs.totalVerified).toBe(26);
  for (const [entityName, registered] of Object.entries(runtimeRegs.formRegistrations)) {
    expect(registered, `Expected BaseFormComponent ClassFactory registration for ${entityName}`).toBe(true);
  }

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

  // --- 3. Knowledge Stream: Ask-First deflection, Living Thread Synthesis, real PDF download ---
  await page.click('#mjc-hub-tab-knowledge-stream');
  await page.fill('#mjc-ask-first-input', 'How do I rotate my API key?');
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

  // Open Slide-Over Detail Sheet Drawer, capture screenshot, and dismiss with Escape
  await page.locator('.mjc-inspect-btn').first().click();
  await expect(page.locator('#mjc-detail-sheet-backdrop [role="dialog"]')).toBeVisible();
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-detail-drawer.png'), fullPage: false });
  await page.keyboard.press('Escape');
  await expect(page.locator('#mjc-detail-sheet-backdrop')).toBeHidden();

  // Open + Ask or Share Modal, submit a new Discussion Post, and verify it prepends to stream
  await page.click('#mjc-header-ask-share-btn');
  await expect(page.locator('#mjc-ask-share-modal-backdrop [role="dialog"]')).toBeVisible();
  await page.selectOption('#mjc-ask-share-type', 'Discussion Post');
  await page.fill('#mjc-ask-share-title-input', 'Multi-Region Eventual Consistency Benchmarks');
  await page.fill('#mjc-ask-share-body-input', 'Read-replica lag stayed under 40ms across US-East and EU-West.');
  await page.fill('#mjc-ask-share-tags-input', 'Multi-Region, Observability');
  await page.click('#mjc-ask-share-submit-btn');
  await expect(page.locator('#mjc-ask-share-modal-backdrop')).toBeHidden();
  await expect(page.locator('.mjc-commons__stream')).toContainText('Multi-Region Eventual Consistency Benchmarks');

  // Capture Screenshot 2: Knowledge Stream 3-Column Layout
  await page.locator('.mjc-commons').scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-knowledge-stream.png'), fullPage: false });

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

  // Exercise Slice 2 Q&A filter pill and capture Screenshot 4: Q&A Canon Workbench
  await page.getByRole('button', { name: /Canon Verified/ }).click();
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
    tabsExercised: TAB_KEYS,
    keyboardNavigationVerified: true,
    askFirstDeflectionExercised: true,
    digestExportExercised: true,
    digestExportPdfVerified: true,
    qaCanonWorkbenchExercised: true,
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
      'e2e/screenshots/community-hub.png',
    ],
  };
  writeFileSync(join(REPORTS_DIR, 'community-hub-wcag-report.json'), JSON.stringify(report, null, 2));
});
