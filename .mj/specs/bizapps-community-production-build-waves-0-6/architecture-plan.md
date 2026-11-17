# Architecture & Verification Plan: BizApps Community Production Build (Waves 0-6)

- **Branch:** `factory/3a63a82c-bizapps-community-waves-0-6`
- **Commit SHA:** `HEAD`
- **Risk:** `Medium`
- **MJ Standards & Docs Enforced:** `true`
- **Unit & World Data Model Integration Tests Enforced:** `true`

## Summary
Complete 7-Wave production build of MemberJunction/bizapps-community (__mj_BizAppsCommunity) targeting branch next across 25 physical tables and 8 workspace packages.

## Implementation Approach
1. Wave 0-2: DB rehearsal, CodeGen, metadata sync, dual-dialect migrations, and CommunityEngineBase.
2. Wave 3: Server drivers, AI deflection/grading/synthesis actions, pdfkit digest export, and ThreadGraduationService.
3. Wave 4-6: Angular 21 OnPush UI hub, Dual Form Registration Parity, >=25 world seed records, integration tests, and Playwright WCAG 2.1 AA E2E.

## Scope Boundaries
- **Packages:** @mj-biz-apps/community-core, @mj-biz-apps/community-entities, @mj-biz-apps/community-engine-base, @mj-biz-apps/community-core-entities-server, @mj-biz-apps/community-actions, @mj-biz-apps/community-server, @mj-biz-apps/community-ng-widgets, @mj-biz-apps/community-ng
- **Expected Paths:** migrations/, migrations-pg/, teardown/, teardown-pg/, metadata/, packages/, scripts/, docs/, .mj/specs/
- **Out of Scope:** Downstream domain bridge repositories

## EARS Acceptance Specifications
| Criterion | EARS Requirement | Verified By |
| --- | --- | --- |
| AC-1 | WHEN the governed workflow runs, THE SYSTEM SHALL waves 0-2: DB rehearsal, CodeGen, metadata sync, 25 dual-dialect tables, fnCommunityForumAccess, and CommunityEngineBase pass. | ART-1, ART-2, ART-3 |
| AC-2 | WHEN the governed workflow runs, THE SYSTEM SHALL wave 3: Server drivers, actions, pdfkit export, and ThreadGraduationService pass unit tests with >=80% coverage. | ART-1, ART-2 |
| AC-3 | WHEN the governed workflow runs, THE SYSTEM SHALL wave 4: Angular 21 OnPush UI, --mj-* tokens, CommunityHubResource, Dual Form Registration Parity, and UserInfoEngine preferences pass. | ART-1, ART-2, ART-4 |
| AC-4 | WHEN the governed workflow runs, THE SYSTEM SHALL waves 5-6: >=25 world seed records, integration tests, Playwright E2E + WCAG 2.1 AA, and OpenApp v3 readiness pass. | ART-2, ART-4, ART-5 |

## Alternatives Considered & Rejected
- **Client-side window.print()** — Rejected: Replaced by ExportCommunityDigestPDFAction with pdfkit.

## Tests to Add & Maintain
- `packages/EngineBase/src/__tests__/community-engine-base.test.ts`
- `packages/Actions/src/__tests__/community-actions.test.ts`
- `packages/Angular/src/__tests__/community-angular-standards.test.ts`
- `packages/Server/src/__tests__/world-integration.test.ts`
