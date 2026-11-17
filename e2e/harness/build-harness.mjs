/**
 * Builds the minimal host HTML document for the real compiled `@mj-biz-apps/community-ng`
 * `CommunityHubResource` Angular 21 bundle (`/harness-bundle.js`, compiled by `ngc` and bundled
 * for the browser by `esbuild`).
 *
 * The `--mj-*` CSS custom properties below represent the MJ Explorer host theme stylesheet; the
 * shipped `@mj-biz-apps/community-ng` components reference `var(--mj-*)` exclusively.
 */
export function BuildCommunityHubHarnessHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BizApps Community — Real Angular 21 Community Hub (E2E)</title>
<style>
  :root {
    --mj-bg-page: #f5f6f8;
    --mj-bg-surface: #ffffff;
    --mj-bg-surface-card: #ffffff;
    --mj-bg-surface-sunken: #eef1f5;
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
    --mj-text-base: 1rem;
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
    --mj-badge-info-bg: #e8eefc;
    --mj-badge-info-text: #163ba8;
  }
  html, body {
    margin: 0;
    padding: 0;
    min-height: 100vh;
    background: var(--mj-bg-page);
    color: var(--mj-text-primary);
    font-family: var(--mj-font-family);
  }
</style>
</head>
<body>
  <main aria-label="Customer Success Community">
    <mjc-community-hub-resource></mjc-community-hub-resource>
  </main>
  <script type="module" src="/harness-bundle.js"></script>
</body>
</html>
`;
}
