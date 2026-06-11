CREATE SCHEMA IF NOT EXISTS ai_care;
SET search_path TO ai_care;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE consultation_assets
  ADD COLUMN IF NOT EXISTS asset_type VARCHAR(50) NOT NULL DEFAULT 'AI_REPORT_PDF',
  ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

ALTER TABLE ai_results
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS consultation_assets_consultation_asset_type_uq
  ON consultation_assets (consultation_id, asset_type);

GRANT USAGE, CREATE ON SCHEMA ai_care TO dbadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai_care TO dbadmin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai_care TO dbadmin;
