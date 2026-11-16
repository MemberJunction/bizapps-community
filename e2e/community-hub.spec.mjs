import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
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

/** @type {{ close: () => Promise<void> }} */
let harness;
/** @type {string} */
let harnessUrl;

test.beforeAll(async () => {
  harness = await StartHarnessServer();
  harnessUrl = harness.url;
});

test.afterAll(async () => {
  await harness.close();
});

test('Community Hub: 4 tabs, Ask-First, Quadratic Voting, Digest export, keyboard nav — 0 page/console errors, 0 critical/serious WCAG 2.1 AA violations', async ({ page }) => {
  /** @type {string[]} */
  const pageErrors = [];
  /** @type {string[]} */
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Instrument window.print before any page script runs, so we can prove the Digest export
  // button never falls back to it (the task's explicit "never window.print()" requirement).
  await page.addInitScript(() => {
    window.__printCallCount = 0;
    window.print = () => {
      window.__printCallCount += 1;
    };
  });

  await page.goto(harnessUrl);
  await page.waitForFunction(() => window.__harnessReady === true);

  // --- 1. All 4 tabs switch correctly ---
  for (const key of TAB_KEYS) {
    await page.click(`[data-tab-key="${key}"]`);
    await expect(page.locator(`#panel-${key}`)).toBeVisible();
    const selectedTab = await page.evaluate(() => window.__lastSelectedTab);
    expect(selectedTab).toBe(key);
  }

  // --- 2. Keyboard navigation across tabs (ArrowRight/ArrowLeft, Enter) ---
  await page.locator('[data-tab-key="knowledge-stream"]').focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.__lastSelectedTab)).toBe('qa-canon-workbench');
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.__lastSelectedTab)).toBe('quadratic-ideation-wallet');
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.__lastSelectedTab)).toBe('qa-canon-workbench');

  // --- 3. Ask-First Deflection widget (Knowledge Stream tab) ---
  await page.click('[data-tab-key="knowledge-stream"]');
  await page.fill('#mjc-ask-first-input', 'How do I rotate my API key?');
  await page.click('#mjc-ask-first-search-btn');
  await expect(page.locator('#mjc-ask-first-result')).toBeVisible();
  expect(await page.evaluate(() => window.__lastAskFirstQuery)).toBe('How do I rotate my API key?');

  // --- 4. Digest PDF export button triggers the action (never window.print()) ---
  await page.click('#mjc-digest-export-btn');
  expect(await page.evaluate(() => window.__digestExportClicked)).toBe(true);
  const printCallCountAfterExport = await page.evaluate(() => window.__printCallCount);
  expect(printCallCountAfterExport).toBe(0);

  // --- 5. Quadratic Voting slider: Cost = Votes^2, 100-point wallet cap, real production math ---
  await page.click('[data-tab-key="quadratic-ideation-wallet"]');
  await page.locator('#mjc-qv-slider-input').fill('36');
  await page.dispatchEvent('#mjc-qv-slider-input', 'input');
  await expect(page.locator('#mjc-qv-slider-votes')).toHaveText('Effective votes: 6.00');
  const costEqualsVotesSquared = await page.evaluate(() => window.__costEqualsVotesSquared);
  expect(costEqualsVotesSquared).toBe(true);
  await expect(page.locator('#mjc-qv-slider-remaining')).toHaveText('Remaining budget: 64');

  await page.locator('#mjc-qv-slider-input').fill('100');
  await page.dispatchEvent('#mjc-qv-slider-input', 'input');
  const atCapResult = await page.evaluate(() => window.__lastSliderResult);
  expect(atCapResult.valid).toBe(true);
  expect(atCapResult.points).toBe(100);
  await expect(page.locator('#mjc-qv-slider-remaining')).toHaveText('Remaining budget: 0');

  // --- 6. Screenshot for ART-4 ---
  const screenshotPath = join(SCREENSHOTS_DIR, 'community-hub.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // --- 7. WCAG 2.1 AA via axe-core, across each of the 4 tab states ---
  /** @type {Record<string, { violationCount: number, criticalOrSerious: number }>} */
  const axeResultsByTab = {};
  let totalCriticalOrSerious = 0;
  let totalViolations = 0;
  for (const key of TAB_KEYS) {
    await page.click(`[data-tab-key="${key}"]`);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const criticalOrSerious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    axeResultsByTab[key] = {
      violationCount: results.violations.length,
      criticalOrSerious: criticalOrSerious.length,
    };
    totalCriticalOrSerious += criticalOrSerious.length;
    totalViolations += results.violations.length;
    expect(criticalOrSerious, `tab "${key}" has critical/serious WCAG 2.1 AA violations: ${JSON.stringify(criticalOrSerious.map((v) => v.id))}`).toEqual([]);
  }

  // --- 8. Assert zero page/console errors, and that window.print() was never invoked, across the whole run ---
  expect(pageErrors, `pageerror(s): ${JSON.stringify(pageErrors)}`).toEqual([]);
  expect(consoleErrors, `console error(s): ${JSON.stringify(consoleErrors)}`).toEqual([]);
  const finalPrintCallCount = await page.evaluate(() => window.__printCallCount);
  expect(finalPrintCallCount).toBe(0);

  // --- 9. Write the verification report backing ART-4 ---
  const report = {
    schemaVersion: 'sf-e2e/v1',
    evaluatedAtIso: new Date().toISOString(),
    harnessUrl,
    tabsExercised: TAB_KEYS,
    keyboardNavigationVerified: true,
    askFirstDeflectionExercised: true,
    digestExportExercised: true,
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
  };
  writeFileSync(join(REPORTS_DIR, 'community-hub-wcag-report.json'), JSON.stringify(report, null, 2));
});
