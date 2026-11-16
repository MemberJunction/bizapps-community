-- =============================================================================
--  BizApps Community (PostgreSQL) — Create schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS __mj_BizAppsCommunity;
SET search_path TO __mj_BizAppsCommunity, public;
