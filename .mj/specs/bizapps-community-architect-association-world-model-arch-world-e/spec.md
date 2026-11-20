# BizApps Community — Architect Association World Model (`ARCH-WORLD`) & Feature Showcase Specification

**Status:** Implemented & Verified  
**Epic TaskID:** `90B12CC2-B021-4F3D-9534-D2ED8A36C224`  
**Approved FactoryPlanID:** `EEE694CF-4D66-4DEB-8C66-3CC72B84F69E`  
**Schema:** `__mj_BizAppsCommunity` (zero schema, migration, or metadata changes)  
**Target Branch:** `next`

---

## 1. Epic Overview

This specification covers the three sequential slices delivering the **American Guild of Practicing Architects (`ARCH-WORLD`)** persistent integration dataset, expanded zero-`any` backend unit suites, Playwright 1440x900 marketing screenshot capture, and comprehensive feature showcase documentation:

1. **Slice 1 (`scripts/world/**`, `scripts/seed-world.test.mjs`)**:
   - Deterministic `ARCH-WORLD` dataset (`arch-world-data.mjs`) with 26 members, 4 Community Spaces, 13 Forums across all 6 `ForumType` codes, 22 Topic Tags, 68 Posts & multi-turn threads across all 13 `PostType` codes, and 25 Quadratic Ideation allocations.
   - Idempotent natural-key loader (`LoadArchitectAssociationWorld`) and deliberate no-op teardown (`TeardownArchitectAssociationWorld`) in `arch-world-loader.mjs` so seeded state persists for repeat integration runs, Explorer smoke testing, and visual verification.
   - Persistent integration suite (`arch-world-integration.mjs`) wired into `scripts/seed-world.test.mjs` verifying 2 consecutive runs, embedding digests, HMAC Reply-by-Email, Ask-First deflection, Living Thread Synthesis, Quadratic Voting, and idempotent 1-Click Graduation.
2. **Slice 2 (`packages/*/src/**/*.test.ts`)**:
   - Expanded strict zero-`any` unit test coverage in `packages/Core/src/rules.test.ts`, `packages/Core/src/wave3-rules.test.ts`, `packages/Actions/src/custom-actions.test.ts`, `packages/CoreEntitiesServer/src/server-entities.test.ts`, and `packages/Server/src/server.test.ts`.
3. **Slice 3 (`e2e/**`, `docs/COMMUNITY_GUIDE.md`, `docs/screenshots/*.png`, `README.md`)**:
   - Extended Playwright E2E harness (`e2e/community-hub.spec.mjs`, `e2e/harness/*`) with an `ARCH-WORLD` showcase mode capturing 5 crisp 1440x900 (`deviceScaleFactor: 2`) marketing screenshots into `docs/screenshots/` with `0` pageErrors, `0` consoleErrors, and `0` critical/serious WCAG 2.1 AA violations.
   - Comprehensive [`docs/COMMUNITY_GUIDE.md`](../../../docs/COMMUNITY_GUIDE.md) and polished root [`README.md`](../../../README.md) showcasing every capability and `ARCH-WORLD` quickstart workflow.
