# Community

## Metadata

A migration carries DDL: tables, columns, views, functions, constraints, and extended properties, plus the CodeGen output appended under its banner. Metadata rows are JSON under `metadata/`. Push them with `mj sync push` while developing. The build engineer generates the release `*__Metadata_Sync.sql` from a clean database. A feature pull request never writes that file. The model, and the Open App steps that differ from core (`--schema`, the `${mjSchema}` substitution): [Release Metadata Migrations Guide](https://github.com/MemberJunction/MJ/blob/next/guides/RELEASE_METADATA_MIGRATIONS_GUIDE.md).

Every metadata record has a `primaryKey`, nested `relatedEntities` children included. That rule and the others MJ and every BizApps repo share, such as plain migration DDL and CHECK values written for people, are in MJ's [Schema and Code Authoring Guide](https://github.com/MemberJunction/MJ/blob/next/guides/SCHEMA_AND_CODE_AUTHORING_GUIDE.md), each with its reason.

## Relationship to BizApps Collaboration

`BizApps Community` (`__mj_BizAppsCommunity`) extends [`BizApps Collaboration`](https://github.com/MemberJunction/bizapps-collaboration) (`__mj_BizAppsCollaboration`). Every community is a `Space`, every roster seat is a `SpaceMember`, every shared attachment is a `SpaceItem`, and read/write reach for threads and posts is evaluated through `__mj_BizAppsCollaboration.fnCollaborationAccess(@UserID)`. Never duplicate Space membership or file storage tables in `__mj_BizAppsCommunity`.

## MemberJunction version

Work runs on MemberJunction's `next`, in a workspace made by `mj dev workspace` beside MemberJunction, BizApps Common, BizApps Tasks, and BizApps Collaboration. Install and build from that parent folder, never in this repo.
