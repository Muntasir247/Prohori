"""0001 core schema.

The exact DDL from ``docs/PROHORI_DOC02.md`` Section 8, Migration 0001:
extensions, enums, and the core tables (users, sessions, auth_tokens, scam_types,
checks, risky_numbers, check_numbers, campaigns, cases, case_notes, audit_events)
with the append-only audit trigger.

Statements run one at a time because the async (asyncpg) driver does not accept
multiple statements in a single execute. The downgrade reverses the upgrade;
Postgres extensions are left installed (dropping them could affect other
databases/roles and they are created idempotently).

Revision ID: 0001
Revises:
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import text

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


_UPGRADE: list[str] = [
    # --- Extensions --------------------------------------------------------
    "CREATE EXTENSION IF NOT EXISTS vector",
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    "CREATE EXTENSION IF NOT EXISTS citext",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    # --- Enum types --------------------------------------------------------
    "CREATE TYPE user_role AS ENUM ('user','reviewer','admin')",
    "CREATE TYPE risk_level AS ENUM ('Low','Medium','High')",
    "CREATE TYPE check_kind AS ENUM ('message','payment')",
    "CREATE TYPE check_route AS ENUM ('rules_only','haiku','sonnet','fallback')",
    "CREATE TYPE case_status AS ENUM "
    "('new','in_review','confirmed_scam','not_scam','escalated','closed')",
    "CREATE TYPE number_status AS ENUM ('watch','confirmed_risky','cleared')",
    # --- users -------------------------------------------------------------
    """
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email citext NOT NULL UNIQUE,
      password_hash text NOT NULL,
      display_name varchar(80) NOT NULL,
      role user_role NOT NULL DEFAULT 'user',
      language char(2) NOT NULL DEFAULT 'bn' CHECK (language IN ('bn','en')),
      theme varchar(10) NOT NULL DEFAULT 'system',
      email_verified_at timestamptz,
      onboarding_completed_at timestamptz,
      consent_at timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- sessions ----------------------------------------------------------
    """
    CREATE TABLE sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash char(64) NOT NULL UNIQUE,
      user_agent varchar(200),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_sessions_user ON sessions(user_id)",
    # --- auth_tokens -------------------------------------------------------
    """
    CREATE TABLE auth_tokens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      email citext,
      purpose varchar(20) NOT NULL
        CHECK (purpose IN ('verify_email','reset_password','invite')),
      role user_role,
      token_hash char(64) NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- scam_types --------------------------------------------------------
    """
    CREATE TABLE scam_types (
      id smallint PRIMARY KEY,
      slug varchar(40) NOT NULL UNIQUE,
      name_en varchar(80) NOT NULL,
      name_bn varchar(80) NOT NULL
    )
    """,
    # --- checks ------------------------------------------------------------
    """
    CREATE TABLE checks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      guest_hash char(64),
      api_key_id uuid,
      kind check_kind NOT NULL,
      masked_text text,
      text_hash char(64),
      trimmed boolean NOT NULL DEFAULT false,
      detected_lang varchar(10),
      response_lang char(2) NOT NULL,
      claimed_sender varchar(40),
      amount_bdt numeric(14,2) CHECK (amount_bdt IS NULL OR amount_bdt > 0),
      recipient_status varchar(10)
        CHECK (recipient_status IN ('known','new','not_sure')),
      request_channel varchar(20),
      rushed varchar(10) CHECK (rushed IN ('yes','no','not_sure')),
      provider varchar(20),
      local_hour smallint CHECK (local_hour BETWEEN 0 AND 23),
      extracted jsonb NOT NULL DEFAULT '{}',
      rule_hits jsonb NOT NULL DEFAULT '[]',
      rule_level risk_level,
      llm_level risk_level,
      model_prob numeric(5,4),
      final_level risk_level,
      reasons jsonb NOT NULL DEFAULT '[]',
      red_flags jsonb NOT NULL DEFAULT '[]',
      highlights jsonb NOT NULL DEFAULT '[]',
      safe_action_ids text[] NOT NULL DEFAULT '{}',
      scam_type_id smallint REFERENCES scam_types(id),
      retrieved_chunk_ids bigint[] NOT NULL DEFAULT '{}',
      route check_route NOT NULL,
      is_fallback boolean NOT NULL DEFAULT false,
      prompt_version varchar(20),
      model_name varchar(40),
      risk_model_version varchar(20),
      input_tokens integer,
      output_tokens integer,
      cache_read_tokens integer,
      latency_ms integer,
      pause_outcome varchar(10) CHECK (pause_outcome IN ('finished','skipped')),
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_checks_user_created ON checks(user_id, created_at DESC)",
    "CREATE INDEX idx_checks_created ON checks(created_at DESC)",
    "CREATE INDEX idx_checks_level_created ON checks(final_level, created_at DESC)",
    "CREATE INDEX idx_checks_text_hash ON checks(text_hash)",
    # --- risky_numbers -----------------------------------------------------
    """
    CREATE TABLE risky_numbers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number_hmac char(64) NOT NULL UNIQUE,
      masked_display varchar(24) NOT NULL,
      check_count integer NOT NULL DEFAULT 0,
      report_count integer NOT NULL DEFAULT 0,
      high_count integer NOT NULL DEFAULT 0,
      status number_status NOT NULL DEFAULT 'watch',
      first_seen_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_numbers_reports ON risky_numbers(report_count DESC)",
    "CREATE INDEX idx_numbers_last_seen ON risky_numbers(last_seen_at DESC)",
    # --- check_numbers -----------------------------------------------------
    """
    CREATE TABLE check_numbers (
      check_id uuid NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
      number_id uuid NOT NULL REFERENCES risky_numbers(id),
      role varchar(12) NOT NULL CHECK (role IN ('sender','recipient','mentioned')),
      PRIMARY KEY (check_id, number_id, role)
    )
    """,
    "CREATE INDEX idx_check_numbers_number ON check_numbers(number_id, check_id)",
    # --- campaigns ---------------------------------------------------------
    """
    CREATE TABLE campaigns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      label varchar(120) NOT NULL,
      scam_type_id smallint REFERENCES scam_types(id),
      member_count integer NOT NULL DEFAULT 0,
      count_7d integer NOT NULL DEFAULT 0,
      prev_count_7d integer NOT NULL DEFAULT 0,
      is_surging boolean NOT NULL DEFAULT false,
      first_seen_at timestamptz,
      last_seen_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- cases -------------------------------------------------------------
    "CREATE SEQUENCE case_reference_seq START 1",
    """
    CREATE TABLE cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      reference varchar(12) NOT NULL UNIQUE
        DEFAULT 'PRO-' || lpad(nextval('case_reference_seq')::text, 6, '0'),
      check_id uuid NOT NULL UNIQUE REFERENCES checks(id),
      status case_status NOT NULL DEFAULT 'new',
      assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
      reporter_note varchar(500),
      reporter_consent_at timestamptz NOT NULL,
      scam_type_id smallint REFERENCES scam_types(id),
      campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
      decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
      decided_at timestamptz,
      decision_reason varchar(500),
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_cases_status_created ON cases(status, created_at)",
    "CREATE INDEX idx_cases_assigned ON cases(assigned_to)",
    "CREATE INDEX idx_cases_campaign ON cases(campaign_id)",
    # --- case_notes --------------------------------------------------------
    """
    CREATE TABLE case_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      author_id uuid REFERENCES users(id) ON DELETE SET NULL,
      body varchar(1000) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_case_notes_case ON case_notes(case_id, created_at DESC)",
    # --- audit_events (append-only) ---------------------------------------
    """
    CREATE TABLE audit_events (
      id bigserial PRIMARY KEY,
      actor_id uuid,
      actor_role varchar(12),
      action varchar(60) NOT NULL,
      entity_type varchar(30) NOT NULL,
      entity_id text NOT NULL,
      before jsonb,
      after jsonb,
      request_id varchar(40),
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id)",
    "CREATE INDEX idx_audit_created ON audit_events(created_at DESC)",
    """
    CREATE FUNCTION forbid_audit_change() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'audit_events is append-only'; END;
    $$ LANGUAGE plpgsql
    """,
    """
    CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_change()
    """,
]


_DOWNGRADE: list[str] = [
    "DROP TRIGGER IF EXISTS audit_append_only ON audit_events",
    "DROP FUNCTION IF EXISTS forbid_audit_change()",
    "DROP TABLE IF EXISTS audit_events CASCADE",
    "DROP TABLE IF EXISTS case_notes CASCADE",
    "DROP TABLE IF EXISTS cases CASCADE",
    "DROP SEQUENCE IF EXISTS case_reference_seq",
    "DROP TABLE IF EXISTS campaigns CASCADE",
    "DROP TABLE IF EXISTS check_numbers CASCADE",
    "DROP TABLE IF EXISTS risky_numbers CASCADE",
    "DROP TABLE IF EXISTS checks CASCADE",
    "DROP TABLE IF EXISTS scam_types CASCADE",
    "DROP TABLE IF EXISTS auth_tokens CASCADE",
    "DROP TABLE IF EXISTS sessions CASCADE",
    "DROP TABLE IF EXISTS users CASCADE",
    "DROP TYPE IF EXISTS number_status",
    "DROP TYPE IF EXISTS case_status",
    "DROP TYPE IF EXISTS check_route",
    "DROP TYPE IF EXISTS check_kind",
    "DROP TYPE IF EXISTS risk_level",
    "DROP TYPE IF EXISTS user_role",
]


def upgrade() -> None:
    for statement in _UPGRADE:
        op.execute(text(statement))


def downgrade() -> None:
    for statement in _DOWNGRADE:
        op.execute(text(statement))
