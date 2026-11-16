# BizApps Community Production Build (Waves 0-6) — MemberJunction Engineering & User Guide

## Overview
Master Architecture, Schema & 7-Wave Execution Plan for MemberJunction/bizapps-community (__mj_BizAppsCommunity).

Canonical repository specifications live in:
- [Product Brief](../.mj/specs/bizapps-community-production-build-waves-0-6/product-brief.md)
- [Architecture & EARS Plan](../.mj/specs/bizapps-community-production-build-waves-0-6/architecture-plan.md)
- [Tasks & Evidence](../.mj/specs/bizapps-community-production-build-waves-0-6/tasks-and-evidence.md)

## Conventions & Standards Enforced
- **Type Safety:** Strict TypeScript — zero `any`, zero lazy `unknown`, zero untyped entity `.Get()`/`.Set()`.
- **Singletons & State:** `BaseSingleton<T>` for shared engines; `UserInfoEngine.Instance` for user preferences (never `localStorage`).
- **UI & Design Tokens:** Angular `ChangeDetectionStrategy.OnPush`, `--mj-*` semantic CSS tokens, WCAG 2.1 AA landmarks & accessible labels.
- **Testing Standard:** Unit tests plus world data model integration verification required unless repository lacks a data model.

## Verification Commands
```bash
pnpm run build
pnpm run test
```
