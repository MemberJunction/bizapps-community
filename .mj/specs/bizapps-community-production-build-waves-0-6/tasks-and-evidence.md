# Tasks, Execution Slices & Verification Evidence

- **Canonical Spec Directory:** `.mj/specs/bizapps-community-production-build-waves-0-6/`
- **Branch:** `factory/3a63a82c-bizapps-community-waves-0-6`
- **Pull Request:** `#4` (non-draft, against `next`)

## Execution Slices
| Task ID | Slice | Waves | Status |
| --- | --- | --- | --- |
| `2CBE4F8C-6DE5-455F-8051-BBE9F8C29877` | Slice 1 | 0-2: DB rehearsal, CodeGen, metadata sync, dual-dialect migrations, CoreEntities & `CommunityEngineBase` | Complete |
| `18774CB7-AF4F-4E71-84B8-4D6BEC27A9E0` | Slice 2 | 3: Server Drivers, Community Actions, server-side PDF export, `ThreadGraduationService` | Complete |
| `D1B9EC0B-3951-45CF-928D-5865C7B9C907` | Slice 3 | 4-5: Angular Community Hub UI, Dual Form Registration Parity, `--mj-*` tokens, World Data Model seeds | Complete |
| `D21C1E5F-0A33-4CBD-94CA-99713D9369FA` | Slice 4 | 6: Playwright E2E + WCAG 2.1 AA verification, OpenApp v3 5-pillar readiness, documentation | Complete |

## Required Verification Artifacts
| Artifact ID | Kind | Purpose | Target |
| --- | --- | --- | --- |
| ART-1 | BuildLog | Regression | Full 8-package workspace TypeScript build |
| ART-2 | TestRun | NewBehavior | Unit and integration tests (133 tests across 7 packages + the world seed and downstream-name gate) |
| ART-3 | MigrationDryRun | Migration | Dual-dialect migration rehearsal and live scratch-DB seed application |
| ART-4 | PlaywrightScreenshot | NewBehavior | Headless Chromium Playwright + axe-core WCAG 2.1 AA verification (`e2e/community-hub.spec.mjs`) |
| ART-5 | OpenAppReadinessReport | NewBehavior | OpenApp v3 5-pillar readiness report (`scripts/openapp-readiness.mjs`) |
