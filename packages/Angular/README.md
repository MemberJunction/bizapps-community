# `@mj-biz-apps/community-ng`

Angular Explorer surface, Community Hub resource, and OpenApp client bootstrap for **BizApps Community**.

## Overview

`@mj-biz-apps/community-ng` provides:

- **Client Bootstrap (`LoadBizAppsCommunityClient`)**: Declared as `packages.client[].startupExport` in `mj-app.json`; registers all 25 Community entity subclasses, built-in post-type UI drivers, and retains generated `BaseFormComponent` subclasses via `GeneratedFormsModule`.
- **Community Hub Resource (`CommunityHubResource`)**: Registered via `@RegisterClass(BaseResourceComponent, 'CommunityHubResource')` matching `metadata/applications/.applications.json` `DefaultNavItems`, wrapped in `<mj-page-layout>` with deferred `NotifyLoadStarted()` (`queueMicrotask`) and `NotifyLoadComplete()`.
- **In-Place & Slide-Over MJ Artifact Viewer (`CommunityArtifactViewerComponent`)**: Theme-native wrapper around `@memberjunction/ng-artifacts` (`<mj-artifact-viewer-panel>`) for `ForumArtifactPost` (`ArtifactID` / `PinnedArtifactVersionID`) and `ForumInteractivePost` (`ComponentArtifactID` / `PinnedArtifactVersionID`) viewing.

---

## `CommunityArtifactViewerComponent` (`mjc-community-artifact-viewer`)

Wraps `<mj-artifact-viewer-panel>` from `@memberjunction/ng-artifacts` (`ArtifactsModule`) in both **in-place (`inline`)** and **slide-over drawer (`drawer`)** layouts using `ChangeDetectionStrategy.OnPush`, `@if`/`@switch`, and `inject()`.

### Inputs

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'inline' \| 'drawer'` | `'drawer'` | Renders either inside an existing card/detail panel (`inline`) or as a fixed slide-over overlay (`drawer`) preserving feed scroll and filter context. |
| `open` | `boolean` | `false` | Controls drawer visibility in `drawer` mode (`inline` mode renders whenever `request` is non-null). |
| `request` | `CommunityArtifactViewerRequest \| null` | `null` | Describes the `ForumArtifactPost` or `ForumInteractivePost` (`postId`, `postTitle`, `postKind`, `artifactId`, `pinnedArtifactVersionId`, `pinnedVersionNumber`, `artifactModality`, `collaborationMode`, `experienceKind`, `fallbackSummaryMarkdown`, `spaceLabel`). |
| `preloadedMetadata` | `ResolvedCommunityArtifactMetadata \| null` | `null` | Optional batch-loaded metadata from `LoadBatchedArtifactsMetadata` so opening a card avoids redundant `RunView` round-trips. |
| `currentUser` | `UserInfo \| null` | `null` | Current MJ user passed to `<mj-artifact-viewer-panel [CurrentUser]>`; falls back to `Metadata.Provider?.CurrentUser`. |
| `environmentId` | `string` | `''` | Optional environment identifier passed through to `<mj-artifact-viewer-panel [EnvironmentId]>`. |
| `showPanelHeader` | `boolean` | `true` | Forwards `[ShowHeader]` to `<mj-artifact-viewer-panel>`. |
| `showPanelTabs` | `boolean` | `true` | Forwards `[ShowTabs]` to `<mj-artifact-viewer-panel>`. |
| `showSaveToCollection` | `boolean` | `false` | Forwards `[ShowSaveToCollection]` to `<mj-artifact-viewer-panel>`. |

### Outputs

| Output | Payload | Description |
| --- | --- | --- |
| `closed` | `void` | Emitted when the user presses `Escape`, clicks the backdrop, clicks the close button, or when `<mj-artifact-viewer-panel>` emits `(Closed)`. |
| `maximizedChanged` | `boolean` | Emitted when drawer width is toggled between standard (`860px`) and maximized (`100%`). Preference persists via `UserInfoEngine.Instance` (`bizapps-community.artifactViewerMaximized`). |
| `versionSaved` | `ArtifactVersionSavedEvent` | Re-emitted from `<mj-artifact-viewer-panel (VersionSaved)>`. |
| `stateChanged` | `'closed' \| 'loading' \| 'ready' \| 'missing' \| 'error'` | Emitted whenever the viewer state machine transitions. |

### `PinnedArtifactVersionID` Pass-Through & Batched `RunView` Loading

`<mj-artifact-viewer-panel>` accepts `[artifactId]` and `[VersionNumber]`. To avoid N+1 entity hydrations across community feeds:

1. `LoadBatchedArtifactsMetadata` validates and deduplicates UUIDs (`BuildValidatedUuidInFilter`), short-circuits on empty sets (zero queries), chunks IDs into bounded batches (`DEFAULT_ARTIFACT_BATCH_CHUNK_SIZE = 50`), and executes batched `RunViews` / `RunView` queries against `MJ: Artifacts` and `MJ: Artifact Versions` with `ResultType: 'simple'` and `ExtraFilter: "ID IN (...)"`.
2. `ResolveArtifactViewerState` verifies that the referenced artifact exists and that any `PinnedArtifactVersionID` belongs to that exact artifact before passing `[VersionNumber]` to `<mj-artifact-viewer-panel>`.
3. `CommunityArtifactViewerController` tracks a monotonic `requestToken` so stale async responses are discarded if a member rapidly switches cards or dismisses the drawer mid-load.

### Keyboard Accessibility & Focus Management

- **Escape-to-Close**: Pressing `Escape` while the `drawer` is open immediately dismisses the drawer (`@HostListener('document:keydown.escape')` and dialog `(keydown)`), cancels any in-flight metadata lookup, emits `(closed)`, and restores focus to the button that opened the drawer.
- **Backdrop & Close Button**: Clicking the dimmed backdrop or the accessible close button (`aria-label="Close artifact viewer"`) closes the drawer.
- **Tab Focus Trap**: `Tab` and `Shift+Tab` cycle focus cleanly within the `role="dialog" aria-modal="true"` drawer container.

### Graceful Missing-Artifact Fallback

When an artifact is missing, revoked by RLS, has an invalid UUID, or references an unavailable `PinnedArtifactVersionID`:

- The viewer transitions to `'missing'` (or `'error'` on transport failure) and renders a themed fallback banner (`#mjc-artifact-viewer-fallback`) with structured Artifact ID / Pinned Version ID diagnostics.
- Any fallback post summary is stripped via `StripMarkdownToPlainText`, ensuring zero raw Markdown syntax (`###`, `**bold**`, fenced code blocks) leaks into visible UI.
- Relational `ForumPost` discussion replies remain fully visible and interactive in the parent thread view.

### Semantic `--mj-*` Theming Tokens

All styles in `community-artifact-viewer.component.css` use MemberJunction semantic CSS custom properties exclusively (zero raw `#hex`, `rgb()`, `rgba()`, or `hsl()` literals) so light and dark themes adapt automatically:

- Surfaces & Borders: `--mj-bg-surface`, `--mj-bg-surface-sunken`, `--mj-bg-surface-hover`, `--mj-border-default`, `--mj-border-subtle`
- Typography: `--mj-font-family`, `--mj-font-mono`, `--mj-text-primary`, `--mj-text-secondary`, `--mj-text-muted`, `--mj-text-xs`, `--mj-text-sm`, `--mj-text-base`, `--mj-font-semibold`
- Brand & Status Accents: `--mj-brand-primary`, `--mj-status-info`, `--mj-status-info-bg`, `--mj-status-info-text`, `--mj-status-warning`, `--mj-status-warning-text`, `--mj-status-danger`, `--mj-status-danger-text`
- Spacing & Radii: `--mj-space-1` through `--mj-space-5`, `--mj-radius-sm`, `--mj-radius-md`

---

## Development & Verification

```bash
# Build Angular package (ngc + asset copy)
pnpm --filter @mj-biz-apps/community-ng run build

# Run Angular unit tests (artifact viewer, design tokens, OpenApp parity, UX alignment)
pnpm --filter @mj-biz-apps/community-ng run test
```
