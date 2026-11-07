"""0002 knowledge, safety, operations.

The exact DDL from ``docs/PROHORI_DOC02.md`` Section 8, Migration 0002:
kb_documents, kb_chunks (with the generated tsvector and vector(1024) column),
check_embeddings, safe_actions, samples, tips, shares, notifications, api_keys
(plus the deferred FK from checks.api_key_id), rate_limit_counters,
prompt_versions (one-active partial unique index), eval_runs and daily_aggregates.

Revision ID: 0002
Revises: 0001
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import text

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


_UPGRADE: list[str] = [
    # --- kb_documents ------------------------------------------------------
    """
    CREATE TABLE kb_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(12) NOT NULL UNIQUE,
      title varchar(160) NOT NULL,
      scam_type_id smallint NOT NULL REFERENCES scam_types(id),
      language varchar(10) NOT NULL CHECK (language IN ('bn','en','banglish')),
      source_url text,
      body text NOT NULL,
      status varchar(12) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','published','retired')),
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- kb_chunks ---------------------------------------------------------
    """
    CREATE TABLE kb_chunks (
      id bigserial PRIMARY KEY,
      document_id uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
      chunk_index integer NOT NULL,
      content text NOT NULL,
      token_count integer NOT NULL,
      embedding vector(1024),
      embedding_model varchar(40),
      tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
      UNIQUE (document_id, chunk_index)
    )
    """,
    "CREATE INDEX idx_chunks_embedding ON kb_chunks "
    "USING hnsw (embedding vector_cosine_ops)",
    "CREATE INDEX idx_chunks_tsv ON kb_chunks USING gin (tsv)",
    "CREATE INDEX idx_chunks_trgm ON kb_chunks USING gin (content gin_trgm_ops)",
    # --- check_embeddings --------------------------------------------------
    """
    CREATE TABLE check_embeddings (
      check_id uuid PRIMARY KEY REFERENCES checks(id) ON DELETE CASCADE,
      embedding vector(1024) NOT NULL
    )
    """,
    # --- safe_actions ------------------------------------------------------
    """
    CREATE TABLE safe_actions (
      id varchar(40) PRIMARY KEY,
      label_en varchar(160) NOT NULL,
      label_bn varchar(160) NOT NULL,
      body_en text,
      body_bn text,
      context varchar(16) NOT NULL DEFAULT 'before_payment'
        CHECK (context IN ('before_payment','after_payment','both')),
      min_level risk_level NOT NULL DEFAULT 'Low',
      provider varchar(20),
      phone varchar(20),
      source_url text,
      verified_at date,
      is_active boolean NOT NULL DEFAULT false,
      sort_order smallint NOT NULL DEFAULT 100,
      CONSTRAINT phone_needs_source CHECK (
        phone IS NULL OR is_active = false
        OR (source_url IS NOT NULL AND verified_at IS NOT NULL))
    )
    """,
    # --- samples -----------------------------------------------------------
    """
    CREATE TABLE samples (
      id smallint PRIMARY KEY,
      label_en varchar(60) NOT NULL,
      label_bn varchar(60) NOT NULL,
      body text NOT NULL,
      language varchar(10) NOT NULL
    )
    """,
    # --- tips --------------------------------------------------------------
    """
    CREATE TABLE tips (
      id smallint PRIMARY KEY,
      title_en varchar(120) NOT NULL,
      title_bn varchar(120) NOT NULL,
      body_en text NOT NULL,
      body_bn text NOT NULL,
      active_from date NOT NULL
    )
    """,
    # --- shares ------------------------------------------------------------
    """
    CREATE TABLE shares (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      check_id uuid NOT NULL REFERENCES checks(id) ON DELETE CASCADE,
      token_hash char(64) NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- notifications -----------------------------------------------------
    """
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type varchar(30) NOT NULL,
      payload jsonb NOT NULL DEFAULT '{}',
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)",
    # --- api_keys ----------------------------------------------------------
    """
    CREATE TABLE api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(80) NOT NULL,
      key_prefix varchar(20) NOT NULL,
      key_hash char(64) NOT NULL UNIQUE,
      scopes text[] NOT NULL,
      rate_limit_per_min integer NOT NULL DEFAULT 60,
      last_used_at timestamptz,
      revoked_at timestamptz,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    ALTER TABLE checks ADD CONSTRAINT fk_checks_api_key
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
    """,
    # --- rate_limit_counters ----------------------------------------------
    """
    CREATE TABLE rate_limit_counters (
      key varchar(120) NOT NULL,
      window_start timestamptz NOT NULL,
      count integer NOT NULL DEFAULT 0,
      PRIMARY KEY (key, window_start)
    )
    """,
    # --- prompt_versions ---------------------------------------------------
    """
    CREATE TABLE prompt_versions (
      id serial PRIMARY KEY,
      name varchar(40) NOT NULL,
      version varchar(20) NOT NULL,
      body_sha256 char(64) NOT NULL,
      is_active boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (name, version)
    )
    """,
    "CREATE UNIQUE INDEX one_active_prompt ON prompt_versions(name) WHERE is_active",
    # --- eval_runs ---------------------------------------------------------
    """
    CREATE TABLE eval_runs (
      id serial PRIMARY KEY,
      prompt_version_id integer REFERENCES prompt_versions(id),
      dataset_version varchar(20) NOT NULL,
      item_count integer NOT NULL,
      high_precision numeric(5,4),
      high_recall numeric(5,4),
      genuine_high_rate numeric(5,4),
      unsafe_flags integer NOT NULL,
      report jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    # --- daily_aggregates --------------------------------------------------
    """
    CREATE TABLE daily_aggregates (
      day date NOT NULL,
      risk_level risk_level NOT NULL,
      scam_type_id smallint NOT NULL DEFAULT 0,
      check_count integer NOT NULL DEFAULT 0,
      case_count integer NOT NULL DEFAULT 0,
      decided_count integer NOT NULL DEFAULT 0,
      agreed_count integer NOT NULL DEFAULT 0,
      PRIMARY KEY (day, risk_level, scam_type_id)
    )
    """,
]


_DOWNGRADE: list[str] = [
    "DROP TABLE IF EXISTS daily_aggregates CASCADE",
    "DROP TABLE IF EXISTS eval_runs CASCADE",
    "DROP TABLE IF EXISTS prompt_versions CASCADE",
    "DROP TABLE IF EXISTS rate_limit_counters CASCADE",
    "ALTER TABLE checks DROP CONSTRAINT IF EXISTS fk_checks_api_key",
    "DROP TABLE IF EXISTS api_keys CASCADE",
    "DROP TABLE IF EXISTS notifications CASCADE",
    "DROP TABLE IF EXISTS shares CASCADE",
    "DROP TABLE IF EXISTS tips CASCADE",
    "DROP TABLE IF EXISTS samples CASCADE",
    "DROP TABLE IF EXISTS safe_actions CASCADE",
    "DROP TABLE IF EXISTS check_embeddings CASCADE",
    "DROP TABLE IF EXISTS kb_chunks CASCADE",
    "DROP TABLE IF EXISTS kb_documents CASCADE",
]


def upgrade() -> None:
    for statement in _UPGRADE:
        op.execute(text(statement))


def downgrade() -> None:
    for statement in _DOWNGRADE:
        op.execute(text(statement))
