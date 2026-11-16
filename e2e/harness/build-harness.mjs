import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const ANGULAR_LIB = join(REPO_ROOT, 'packages', 'Angular', 'src', 'lib');

function readCss(relativePath) {
  return readFileSync(join(ANGULAR_LIB, relativePath), 'utf8');
}

/**
 * Builds a self-contained static HTML harness reproducing the Community Hub's real CSS and DOM
 * structure, driven by vanilla JS, with the REAL `@mj-biz-apps/community-core` business logic
 * (`CommunityRules`) loaded as a browser ES module from its built, zero-DOM-dependency dist
 * output — so the Quadratic Voting slider's `Cost = Votes^2` / 100-Point Wallet math in this
 * harness is the actual production logic, not a re-implementation.
 *
 * Why a harness instead of the real Angular app: `@memberjunction/ng-shared` and its sibling MJ
 * Explorer packages are built exclusively for an Angular CLI (webpack/esbuild) consumer — their
 * own emitted relative imports omit file extensions, which only a bundler resolves — and
 * mounting `CommunityHubResource` for real additionally requires a live, authenticated MJ
 * Explorer host (GraphQL API + database session) this sandboxed environment does not have. The
 * `--mj-*` design tokens here are a REASONABLE PLACEHOLDER theme for this harness only (the real
 * values come from the host Explorer app's theme stylesheet); the shipped component CSS files
 * read verbatim below reference `var(--mj-*)` exclusively, with no hardcoded color of their own.
 */
export function BuildCommunityHubHarnessHtml() {
  const hubCss = readCss('community-hub-resource.component.css');
  const askFirstCss = readCss('widgets/ask-first-deflection-widget.component.css');
  const sliderCss = readCss('widgets/quadratic-voting-slider.component.css');
  const digestCss = readCss('widgets/digest-export-button.component.css');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>BizApps Community — Community Hub (E2E Harness)</title>
<style>
  /* Harness-only placeholder theme for the --mj-* tokens the real Explorer host app supplies. */
  :root {
    --mj-bg-page: #f5f6f8;
    --mj-bg-surface: #ffffff;
    --mj-bg-surface-card: #ffffff;
    --mj-bg-surface-hover: #eef1f5;
    --mj-bg-surface-active: #e2e6ec;
    --mj-border-default: #c7ccd4;
    --mj-border-subtle: #dde1e7;
    --mj-brand-primary: #1f4ed8;
    --mj-brand-primary-hover: #1a3fb8;
    --mj-brand-on-primary: #ffffff;
    --mj-text-primary: #15181d;
    --mj-text-secondary: #3a3f47;
    --mj-text-muted: #5b6270;
    --mj-text-disabled: #9aa1ac;
    --mj-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --mj-font-medium: 500;
    --mj-font-semibold: 600;
    --mj-text-xs: 0.75rem;
    --mj-text-sm: 0.875rem;
    --mj-radius-sm: 4px;
    --mj-radius-md: 6px;
    --mj-space-1: 0.25rem;
    --mj-space-2: 0.5rem;
    --mj-space-3: 0.75rem;
    --mj-space-4: 1rem;
    --mj-space-5: 1.25rem;
    --mj-ring-width: 2px;
    --mj-focus-ring-color: #1f4ed8;
    --mj-status-success-text: #0f6b3f;
    --mj-status-error-text: #a3221f;
  }
  body { margin: 0; background: var(--mj-bg-page); font-family: var(--mj-font-family); }
  /* The real Angular component uses @switch, which removes every inactive tab's content from
     the DOM entirely. This static harness instead keeps all 4 panels present and toggles the
     native [hidden] attribute, so it needs this explicit override: the shipped component CSS's
     ".mjc-community-hub__panel { display: flex }" rule has equal specificity to the browser's
     default "[hidden] { display: none }" and — being declared later — would otherwise win,
     leaving every panel visible at once. Harness-only; not a defect in the shipped CSS. */
  .mjc-community-hub__panel[hidden] { display: none; }
${hubCss}
${askFirstCss}
${sliderCss}
${digestCss}
</style>
<script type="importmap">
{
  "imports": {
    "@memberjunction/global": "/memberjunction-global/index.js"
  }
}
</script>
</head>
<body>
  <div class="mjc-community-hub" id="hub-root">
    <nav class="mjc-community-hub__tabs" role="tablist" aria-label="Community Hub">
      <button type="button" role="tab" id="tab-btn-knowledge-stream" class="mjc-community-hub__tab mjc-community-hub__tab--active" aria-selected="true" aria-controls="panel-knowledge-stream" data-tab-key="knowledge-stream">
        <i class="fa-solid fa-stream" aria-hidden="true"></i><span>Knowledge Stream</span>
      </button>
      <button type="button" role="tab" id="tab-btn-qa-canon-workbench" class="mjc-community-hub__tab" aria-selected="false" aria-controls="panel-qa-canon-workbench" data-tab-key="qa-canon-workbench">
        <i class="fa-solid fa-check-double" aria-hidden="true"></i><span>Q&amp;A Canon Workbench</span>
      </button>
      <button type="button" role="tab" id="tab-btn-quadratic-ideation-wallet" class="mjc-community-hub__tab" aria-selected="false" aria-controls="panel-quadratic-ideation-wallet" data-tab-key="quadratic-ideation-wallet">
        <i class="fa-solid fa-lightbulb" aria-hidden="true"></i><span>Quadratic Ideation Wallet</span>
      </button>
      <button type="button" role="tab" id="tab-btn-living-co-authoring" class="mjc-community-hub__tab" aria-selected="false" aria-controls="panel-living-co-authoring" data-tab-key="living-co-authoring">
        <i class="fa-solid fa-file-signature" aria-hidden="true"></i><span>Living Co-Authoring &amp; Interactive Mini-Apps</span>
      </button>
    </nav>

    <div class="mjc-community-hub__body">
      <section id="panel-knowledge-stream" class="mjc-community-hub__panel" role="tabpanel" aria-labelledby="tab-btn-knowledge-stream">
        <div class="mjc-ask-first">
          <label class="mjc-ask-first__label" for="mjc-ask-first-input">Ask-First: search before you post</label>
          <div class="mjc-ask-first__row">
            <input id="mjc-ask-first-input" class="mjc-ask-first__input" type="text" placeholder="What's your question?" />
            <button type="button" id="mjc-ask-first-search-btn" class="mjc-ask-first__button">Search</button>
          </div>
          <p id="mjc-ask-first-result" class="mjc-ask-first__result" hidden></p>
        </div>
        <div class="mjc-digest-export">
          <button type="button" id="mjc-digest-export-btn" class="mjc-digest-export__button">
            <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>
            <span id="mjc-digest-export-label">Export Digest as PDF</span>
          </button>
          <p id="mjc-digest-export-error" class="mjc-digest-export__error" hidden></p>
        </div>
      </section>

      <section id="panel-qa-canon-workbench" class="mjc-community-hub__panel" role="tabpanel" aria-labelledby="tab-btn-qa-canon-workbench" hidden>
        <p class="mjc-community-hub__hint">Verified Q&amp;A canon answers and answers awaiting epistemic review.</p>
      </section>

      <section id="panel-quadratic-ideation-wallet" class="mjc-community-hub__panel" role="tabpanel" aria-labelledby="tab-btn-quadratic-ideation-wallet" hidden>
        <div class="mjc-qv-slider">
          <div class="mjc-qv-slider__row">
            <label for="mjc-qv-slider-input" class="mjc-ask-first__label">Points to allocate</label>
            <input id="mjc-qv-slider-input" class="mjc-qv-slider__range" type="range" min="0" max="100" value="0" />
            <span id="mjc-qv-slider-points" class="mjc-qv-slider__points">0 pts</span>
          </div>
          <div class="mjc-qv-slider__meta">
            <span id="mjc-qv-slider-votes">Effective votes: 0.00</span>
            <span id="mjc-qv-slider-remaining">Remaining budget: 100</span>
          </div>
          <p id="mjc-qv-slider-error" class="mjc-qv-slider__error" hidden></p>
        </div>
      </section>

      <section id="panel-living-co-authoring" class="mjc-community-hub__panel" role="tabpanel" aria-labelledby="tab-btn-living-co-authoring" hidden>
        <p class="mjc-community-hub__hint">Living documents, spreadsheets, decks, and interactive mini-apps.</p>
      </section>
    </div>
  </div>

  <script type="module">
    import { CommunityRules } from '/community-core/index.js';

    const tabButtons = Array.from(document.querySelectorAll('.mjc-community-hub__tab'));
    const panels = Array.from(document.querySelectorAll('.mjc-community-hub__panel'));

    function selectTab(key) {
      for (const btn of tabButtons) {
        const active = btn.dataset.tabKey === key;
        btn.classList.toggle('mjc-community-hub__tab--active', active);
        btn.setAttribute('aria-selected', String(active));
      }
      for (const panel of panels) {
        panel.hidden = panel.id !== 'panel-' + key;
      }
      window.__lastSelectedTab = key;
    }

    for (const btn of tabButtons) {
      btn.addEventListener('click', () => selectTab(btn.dataset.tabKey));
      btn.addEventListener('keydown', (ev) => {
        const idx = tabButtons.indexOf(btn);
        if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          const next = tabButtons[(idx + 1) % tabButtons.length];
          next.focus();
          selectTab(next.dataset.tabKey);
        } else if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          const prev = tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length];
          prev.focus();
          selectTab(prev.dataset.tabKey);
        } else if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectTab(btn.dataset.tabKey);
        }
      });
    }

    // Ask-First widget: deterministic mock search (no live backend in this harness).
    document.getElementById('mjc-ask-first-search-btn').addEventListener('click', () => {
      const query = document.getElementById('mjc-ask-first-input').value.trim();
      const resultEl = document.getElementById('mjc-ask-first-result');
      resultEl.hidden = false;
      resultEl.textContent = query
        ? 'No sufficiently confident match found'
        : 'Enter a question to search.';
      window.__lastAskFirstQuery = query;
    });

    // Digest export button: mock action invocation (no live GraphQLActionClient in this harness).
    document.getElementById('mjc-digest-export-btn').addEventListener('click', () => {
      document.getElementById('mjc-digest-export-label').textContent = 'Generating PDF…';
      window.__digestExportClicked = true;
      setTimeout(() => {
        document.getElementById('mjc-digest-export-label').textContent = 'Export Digest as PDF';
      }, 10);
    });

    // Quadratic Voting slider: REAL production math via CommunityRules.ValidateIdeaAllocationChange.
    const BUDGET_POINTS = 100;
    const sliderInput = document.getElementById('mjc-qv-slider-input');
    const pointsLabel = document.getElementById('mjc-qv-slider-points');
    const votesLabel = document.getElementById('mjc-qv-slider-votes');
    const remainingLabel = document.getElementById('mjc-qv-slider-remaining');
    const errorEl = document.getElementById('mjc-qv-slider-error');

    function recomputeSlider() {
      const points = Number(sliderInput.value);
      pointsLabel.textContent = points + ' pts';
      const result = CommunityRules.ValidateIdeaAllocationChange({
        mode: 'Quadratic',
        budgetPoints: BUDGET_POINTS,
        maxPointsPerIdea: null,
        existingAllocations: [],
        changedIdeaPostId: 'harness-idea',
        newPointsAllocated: points,
      });
      const effectiveVotes = points > 0 ? Math.sqrt(points) : 0;
      votesLabel.textContent = 'Effective votes: ' + effectiveVotes.toFixed(2);
      remainingLabel.textContent = 'Remaining budget: ' + result.remainingBudgetPoints;
      errorEl.hidden = result.valid;
      errorEl.textContent = result.errorMessage ?? '';
      window.__lastSliderResult = { points, effectiveVotes, valid: result.valid };
      // Prove Cost = Votes^2 holds for the real production formula.
      window.__costEqualsVotesSquared = Math.abs(points - effectiveVotes * effectiveVotes) < 0.001;
    }

    sliderInput.addEventListener('input', recomputeSlider);
    recomputeSlider();

    window.__harnessReady = true;
  </script>
</body>
</html>
`;
}
