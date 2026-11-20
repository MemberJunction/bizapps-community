# BizApps Community (`mj-bizapps-community`)

## Metadata

A migration carries physical DDL: tables, columns, views, functions, constraints, and extended properties, plus the CodeGen output appended under its banner. Metadata rows are JSON under `metadata/`. Push them with `mj sync push` while developing. The build engineer generates the release `*__Metadata_Sync.sql` from a clean database. A feature pull request never writes that file. The model, and the Open App steps that differ from core (`--schema`, the `${mjSchema}` substitution): [Release Metadata Migrations Guide](https://github.com/MemberJunction/MJ/blob/next/guides/RELEASE_METADATA_MIGRATIONS_GUIDE.md).

Every metadata record has a `primaryKey`, nested `relatedEntities` children included. Author `JSONType` fields (such as `Configuration` and `DefaultNavItems`) as native JSON objects or arrays—never escaped strings. When an entity has a polymorphic foreign-key pair (`LinkedEntityID` + `LinkedRecordID`), decorate it in `metadata/entities/.polymorphic-fk-entity-fields.json` using `EntityField.EntityIDFieldName`. That rule and the others MJ and every BizApps repo share, such as plain migration DDL and CHECK values written for people, are in MJ's [Schema and Code Authoring Guide](https://github.com/MemberJunction/MJ/blob/next/guides/SCHEMA_AND_CODE_AUTHORING_GUIDE.md), each with its reason.

## Database Migrations & Dual-Dialect Parity

1. **Physical DDL**: Author plain DDL in `migrations/*.sql` and PostgreSQL counterparts in `migrations-pg/*.pg.sql`.
2. **Collation & System Columns**: Every character column must specify `COLLATE SQL_Latin1_General_CP1_CI_AS`. Every physical table must define `[__mj_CreatedAt]` and `[__mj_UpdatedAt]` with `SYSDATETIMEOFFSET()` defaults.
3. **50 Blank Lines Separator**: When appending CodeGen output, separate hand-written DDL from generated plumbing with at least 50 blank lines of whitespace and the standard CodeGen comment block.
4. **Teardown Parity**: Provide matching teardown scripts in `teardown/V1__Remove_Community_Schema.sql` and `teardown-pg/V1__Remove_Community_Schema.pg.sql`.

## Relationship to BizApps Collaboration

`BizApps Community` (`__mj_BizAppsCommunity`) extends [`BizApps Collaboration`](https://github.com/MemberJunction/bizapps-collaboration) (`__mj_BizAppsCollaboration`). Every community is a `Space`, every roster seat is a `SpaceMember`, every shared attachment is a `SpaceItem`, and read/write reach for threads and posts is evaluated through `__mj_BizAppsCollaboration.fnCollaborationAccess(@UserID)` and `__mj_BizAppsCollaboration.fnCollaborationSpaceStatuses()`. Never duplicate Space membership or file storage tables in `__mj_BizAppsCommunity`.

## Browser-Safe Metadata Engine (`@mj-biz-apps/community-engine-base`)

`CommunityEngineBase` lives in `packages/EngineBase`. It extends `BaseSingleton<CommunityEngineBase>` to cache `ForumType`, `PostType`, and `ForumRoleType` metadata, providing O(1) in-memory lookups and resolving the 4-tier configuration cascade without any Node or server-only dependencies. Client Angular widgets, Explorer resources, and backend servers consume this package as a shared library.

## Downstream Isolation Boundary

To preserve 100% generic purity, zero downstream app names (`voting`, `issues`, `credentialing`, `sonar`, `accounting`) are permitted inside `packages/`, `metadata/`, or `migrations/`. Verified in CI via `node scripts/check-downstream-names.mjs`.

## MemberJunction Version & Mega-Workspace Rules

Work runs on MemberJunction's `next` (`6.3+`), in a workspace made by `mj dev workspace` beside MemberJunction, BizApps Common, BizApps Tasks, and BizApps Collaboration. This clone sits inside the `M5` joined pnpm mega-workspace:
- **NEVER run `pnpm install` inside `bizapps-community/`**.
- **NEVER create per-package `node_modules` symlinks or run `pnpm link`**.

## Release lines

`next` is built on MJ Edge and never publishes. Production releases come from release lines (`lts/<MJ major.minor>`), listed in `release-lines.json`. Land every change on `next` first, then add a `backport lts/X.Y` label; a PR that adds a migration needs a label for every open line, or its files listed as edge-only in `release-lines.json`. Never open a PR straight into a line or into `main`. Full rules, publishing and the line cut: [guides/RELEASE_LINES.md](guides/RELEASE_LINES.md).
