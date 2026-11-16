# Tasks, Execution Slices & Verification Evidence

- **Canonical Spec Directory:** `.mj/specs/bizapps-community-production-build-waves-0-6/`
- **Branch:** `factory/3a63a82c-bizapps-community-waves-0-6`
- **Latest Head SHA:** `HEAD`

## Execution Slices
| Task ID | Slice | Status | Branch | PR | Head SHA |
| --- | --- | --- | --- | --- | --- |
| primary | BizApps Community Production Build (Waves 0-6) | Active | factory/3a63a82c-bizapps-community-waves-0-6 | - | `HEAD` |

## Required Verification Artifacts
| Artifact ID | Kind | Purpose | Target |
| --- | --- | --- | --- |
| ART-1 | BuildLog | Regression | `Workspace TypeScript build` |
| ART-2 | TestRun | NewBehavior | `Unit and integration tests` |
| ART-3 | MigrationDryRun | Migration | `Dual-dialect migration rehearsal` |
| ART-4 | OpenAppReadinessReport | NewBehavior | `OpenApp v3 readiness report` |
| ART-5 | PlaywrightScreenshot | NewBehavior | `Playwright E2E verification` |
