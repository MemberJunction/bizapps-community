# BizApps Community Production Build (Waves 0-6) — MemberJunction Engineering & User Guide

## Overview
Master Architecture, Schema & 7-Wave Execution Plan for MemberJunction/bizapps-community (__mj_BizAppsCommunity).

Canonical repository specifications live in:
- [Product Brief](../.mj/specs/bizapps-community-production-build-waves-0-6/product-brief.md)
- [Architecture & EARS Plan](../.mj/specs/bizapps-community-production-build-waves-0-6/architecture-plan.md)
- [Tasks & Evidence](../.mj/specs/bizapps-community-production-build-waves-0-6/tasks-and-evidence.md)

All 7 waves (0-6) are complete: DB rehearsal/CodeGen/metadata sync and dual-dialect migrations
(Wave 0-1), `CommunityEngineBase` and CoreEntities (Wave 2), server drivers/Actions/
`ThreadGraduationService` (Wave 3), the Angular Community Hub UI and World Data Model seeds
(Wave 4-5), and Playwright/WCAG/OpenApp-readiness verification (Wave 6, this document's scope).

## Conventions & Standards Enforced
- **Type Safety:** Strict TypeScript — zero `any`, zero lazy `unknown`, zero untyped entity `.Get()`/`.Set()`.
- **Singletons & State:** `BaseEngine<T>` (a `BaseSingleton<T>` subclass) for shared engines — see `CommunityEngineBase`; `UserInfoEngine.Instance` for user preferences (never `localStorage`) — see `CommunityHubPreferences`.
- **UI & Design Tokens:** Angular `ChangeDetectionStrategy.OnPush`, `--mj-*` semantic CSS tokens (zero raw hex/rgb/hsl), WCAG 2.1 AA landmarks & accessible labels, verified by a real headless Playwright + axe-core run.
- **Testing Standard:** Unit tests plus world data model integration verification (`scripts/seed-world.test.mjs`) and an OpenApp v3 5-pillar readiness report (`scripts/openapp-readiness.mjs`).

## Verification Commands
```bash
pnpm run build
pnpm run test               # unit + integration tests, then the Playwright E2E/WCAG suite, then the OpenApp readiness report
pnpm run test:e2e           # Playwright + axe-core WCAG 2.1 AA only
pnpm run report:openapp-readiness  # regenerates e2e/reports/openapp-readiness-report.json
node scripts/check-downstream-names.mjs  # zero downstream/sibling app-name leaks
```
