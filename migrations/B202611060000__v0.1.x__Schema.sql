-- =============================================================================
--  BizApps Community — create the schema.
--
--  Own transaction (Flyway wraps each file). The sibling V file creates the
--  baseline tables, constraints, indexes, and access TVF. SchemaInfo,
--  including the name prefix and entity ID range, lives in
--  metadata/schema-info and is applied with mj sync push.
--
--  Spec: plans/plan.md §6
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = '__mj_BizAppsCommunity')
    EXEC('CREATE SCHEMA __mj_BizAppsCommunity');
GO
