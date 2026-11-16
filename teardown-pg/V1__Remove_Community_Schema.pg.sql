-- =============================================================================
--  Teardown for BizApps Community (PostgreSQL) — executed by `mj app remove`.
--  Drops all tables, constraints, functions, and the schema cascade.
-- =============================================================================

-- Remove application settings
DELETE FROM "__mj"."ApplicationSetting"
WHERE "ApplicationID" IN (SELECT "ID" FROM "__mj"."Application" WHERE "Name" = 'Community');

-- Drop the schema and all owned objects cascade
DROP SCHEMA IF EXISTS __mj_BizAppsCommunity CASCADE;
