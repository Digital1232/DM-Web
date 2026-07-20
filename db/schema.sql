-- AI Awards for Creativity Recognition - PostgreSQL Schema
-- This script creates all required tables, indexes, and constraints for the system
-- Database: PostgreSQL 12+
-- Date Created: 2026-07-01

-- ============================================================================
-- TEAM MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived'))
);

-- Index for frequent lookups by user_id
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_department ON team_members(department_id);
CREATE INDEX idx_team_members_status ON team_members(status);

-- ============================================================================
-- AWARD CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS award_categories (
  id SERIAL PRIMARY KEY,
  category_key VARCHAR(100) NOT NULL UNIQUE,
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  media_types VARCHAR(50)[] DEFAULT ARRAY['video', 'poster'],
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined categories
INSERT INTO award_categories (category_key, category_name, description, media_types)
VALUES 
  ('Best_Video', 'Best Video', 'Award for outstanding video creativity', ARRAY['video']),
  ('Best_Poster', 'Best Poster', 'Award for outstanding poster creativity', ARRAY['poster']),
  ('Best_Video_Poster_Content', 'Best Video/Poster Content', 'Award for exceptional content quality across both media types', ARRAY['video', 'poster'])
ON CONFLICT (category_key) DO NOTHING;

CREATE INDEX idx_award_categories_enabled ON award_categories(enabled);

-- ============================================================================
-- SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  submission_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Source Information
  jira_task_id VARCHAR(100) NOT NULL,
  jira_task_key VARCHAR(100),
  submission_timestamp BIGINT NOT NULL,
  
  -- Team Member Information
  team_member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  
  -- Media Information
  media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('video', 'poster')),
  media_format VARCHAR(50) NOT NULL,
  media_file_name VARCHAR(500),
  media_file_size BIGINT,
  media_storage_url TEXT,
  media_thumbnail_url TEXT,
  media_file_hash VARCHAR(64),
  
  -- Evaluation Information
  evaluation_status VARCHAR(50) DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'processing', 'completed', 'failed', 'evaluation_failed')),
  ai_model_version VARCHAR(100),
  evaluation_timestamp BIGINT,
  
  -- Creativity Scores
  composition_score NUMERIC(5, 2),
  color_theory_score NUMERIC(5, 2),
  balance_score NUMERIC(5, 2),
  creativity_score NUMERIC(5, 2),
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted_jira')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Error Tracking
  evaluation_errors TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at BIGINT
);

-- Indexes for submission queries - critical for performance
CREATE INDEX idx_submissions_timestamp ON submissions(submission_timestamp DESC);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_evaluation_status ON submissions(evaluation_status);
CREATE INDEX idx_submissions_status_eval ON submissions(status, evaluation_status);
CREATE INDEX idx_submissions_team_member ON submissions(team_member_id);
CREATE INDEX idx_submissions_jira_task ON submissions(jira_task_id);
CREATE INDEX idx_submissions_media_type ON submissions(media_type);
CREATE INDEX idx_submissions_creation ON submissions(created_at DESC);
CREATE INDEX idx_submissions_retry ON submissions(next_retry_at) WHERE evaluation_status = 'failed';
CREATE INDEX idx_submissions_media_hash ON submissions(media_file_hash);

-- Unique constraint to prevent duplicate submissions
CREATE UNIQUE INDEX idx_submissions_duplicate_detection 
  ON submissions(jira_task_id, media_file_hash) 
  WHERE status = 'active' AND evaluation_status IN ('pending', 'processing', 'completed');

-- ============================================================================
-- AWARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS awards (
  id SERIAL PRIMARY KEY,
  award_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Award Information
  award_type VARCHAR(50) NOT NULL CHECK (award_type IN ('weekly', 'monthly')),
  award_category_id INTEGER NOT NULL REFERENCES award_categories(id) ON DELETE RESTRICT,
  
  -- Period Information
  period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('week', 'month')),
  period_year INTEGER NOT NULL,
  period_month INTEGER,
  period_week INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Winner Information
  winner_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  
  -- Submission Reference
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE RESTRICT,
  
  -- Award Metrics
  creativity_score NUMERIC(5, 2) NOT NULL,
  composition_score NUMERIC(5, 2),
  color_theory_score NUMERIC(5, 2),
  balance_score NUMERIC(5, 2),
  
  -- Ranking
  rank_in_period INTEGER NOT NULL,
  total_contestants INTEGER,
  
  -- Calculation Information
  calculation_timestamp BIGINT NOT NULL,
  tiebreaker VARCHAR(50),
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'revoked')),
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for award queries
CREATE INDEX idx_awards_period ON awards(period_type, period_year, period_month);
CREATE INDEX idx_awards_period_week ON awards(period_year, period_week) WHERE period_type = 'week';
CREATE INDEX idx_awards_winner ON awards(winner_id, award_type);
CREATE INDEX idx_awards_category ON awards(award_category_id);
CREATE INDEX idx_awards_submission ON awards(submission_id);
CREATE INDEX idx_awards_status ON awards(status);
CREATE INDEX idx_awards_notification ON awards(notification_sent) WHERE status = 'active';
CREATE INDEX idx_awards_calculation ON awards(calculation_timestamp DESC);
CREATE INDEX idx_awards_creation ON awards(created_at DESC);

-- Unique constraint to prevent duplicate awards in same period/category
CREATE UNIQUE INDEX idx_awards_unique_per_period 
  ON awards(award_type, award_category_id, period_year, period_month, period_week) 
  WHERE status = 'active';

-- ============================================================================
-- AUDIT_LOGS TABLE (IMMUTABLE - APPEND ONLY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  audit_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Event Information
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  
  -- Change Data (JSON for flexibility)
  before_state JSONB,
  after_state JSONB,
  change_details JSONB,
  
  -- User/System Information
  actor_id VARCHAR(255) DEFAULT 'system',
  actor_type VARCHAR(50) DEFAULT 'system' CHECK (actor_type IN ('system', 'user', 'api')),
  
  -- Timestamp (immutable)
  event_timestamp BIGINT NOT NULL,
  
  -- Traceability
  correlation_id VARCHAR(255),
  source_system VARCHAR(100),
  
  -- Additional Context
  context JSONB,
  
  -- Immutable metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit table constraints:
-- 1. No UPDATE or DELETE allowed - created_at ensures write-once
-- 2. No direct row updates (enforced via application logic)
-- Indexes for audit trail queries
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(event_timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_correlation ON audit_logs(correlation_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_creation ON audit_logs(created_at DESC);

-- Composite index for common audit queries
CREATE INDEX idx_audit_entity_time ON audit_logs(entity_type, event_timestamp DESC);

-- ============================================================================
-- EVALUATION QUEUE TABLE (for async processing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_queue (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- Queue Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Retry Information
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at BIGINT,
  
  -- Error Information
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eval_queue_status ON evaluation_queue(status);
CREATE INDEX idx_eval_queue_pending ON evaluation_queue(next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_eval_queue_submission ON evaluation_queue(submission_id);
CREATE UNIQUE INDEX idx_eval_queue_unique_submission ON evaluation_queue(submission_id) WHERE status IN ('pending', 'processing');

-- ============================================================================
-- NOTIFICATION QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  award_id INTEGER NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE RESTRICT,
  
  -- Notification Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'deduped')),
  
  -- Channel Information
  email_sent BOOLEAN DEFAULT FALSE,
  in_app_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_status ON notification_queue(status);
CREATE INDEX idx_notification_recipient ON notification_queue(recipient_id);
CREATE INDEX idx_notification_award ON notification_queue(award_id);
CREATE INDEX idx_notification_pending ON notification_queue(created_at) WHERE status = 'pending';

-- Deduplication: unique constraint on (award_id, recipient_id) to prevent duplicate notifications
CREATE UNIQUE INDEX idx_notification_dedup ON notification_queue(award_id, recipient_id) WHERE status IN ('pending', 'sent');

-- ============================================================================
-- LEADERBOARD_CACHE TABLE (materialized view for performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  period_type VARCHAR(50) NOT NULL,
  period_year INTEGER,
  period_month INTEGER,
  period_week INTEGER,
  
  -- Cached leaderboard data (JSON)
  leaderboard_data JSONB NOT NULL,
  
  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_leaderboard_cache_expiry ON leaderboard_cache(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX idx_leaderboard_cache_period ON leaderboard_cache(period_type, period_year, period_month);

-- ============================================================================
-- SUBMISSION STATS CACHE TABLE (for quick aggregations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS submission_stats_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  
  -- Filter criteria
  period_type VARCHAR(50),
  period_start BIGINT,
  period_end BIGINT,
  media_type VARCHAR(50),
  category_id INTEGER,
  
  -- Cached stats (JSON)
  stats_data JSONB NOT NULL,
  
  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_stats_cache_expiry ON submission_stats_cache(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER team_members_updated_at_trigger
BEFORE UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER submissions_updated_at_trigger
BEFORE UPDATE ON submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER awards_updated_at_trigger
BEFORE UPDATE ON awards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER evaluation_queue_updated_at_trigger
BEFORE UPDATE ON evaluation_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notification_queue_updated_at_trigger
BEFORE UPDATE ON notification_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CONSTRAINTS AND VALIDATION
-- ============================================================================

-- Constraint: creativity scores must be in valid range [0, 100]
ALTER TABLE submissions 
  ADD CONSTRAINT check_composition_score CHECK (composition_score IS NULL OR (composition_score >= 0 AND composition_score <= 100)),
  ADD CONSTRAINT check_color_theory_score CHECK (color_theory_score IS NULL OR (color_theory_score >= 0 AND color_theory_score <= 100)),
  ADD CONSTRAINT check_balance_score CHECK (balance_score IS NULL OR (balance_score >= 0 AND balance_score <= 100)),
  ADD CONSTRAINT check_creativity_score CHECK (creativity_score IS NULL OR (creativity_score >= 0 AND creativity_score <= 100));

-- Constraint: award scores must be in valid range
ALTER TABLE awards 
  ADD CONSTRAINT check_award_creativity_score CHECK (creativity_score >= 0 AND creativity_score <= 100),
  ADD CONSTRAINT check_award_composition_score CHECK (composition_score IS NULL OR (composition_score >= 0 AND composition_score <= 100)),
  ADD CONSTRAINT check_award_color_theory_score CHECK (color_theory_score IS NULL OR (color_theory_score >= 0 AND color_theory_score <= 100)),
  ADD CONSTRAINT check_award_balance_score CHECK (balance_score IS NULL OR (balance_score >= 0 AND balance_score <= 100));

-- Constraint: period_end must be after or equal to period_start
ALTER TABLE awards 
  ADD CONSTRAINT check_period_dates CHECK (period_end >= period_start);

-- Constraint: rank must be positive
ALTER TABLE awards 
  ADD CONSTRAINT check_rank CHECK (rank_in_period > 0);

-- ============================================================================
-- DATA COMPLETENESS VERIFICATION
-- ============================================================================

-- View: Complete submissions with team member details
CREATE OR REPLACE VIEW complete_submissions AS
SELECT 
  s.id,
  s.submission_id,
  s.jira_task_id,
  s.media_type,
  s.creativity_score,
  s.composition_score,
  s.color_theory_score,
  s.balance_score,
  s.evaluation_status,
  s.status,
  tm.user_id,
  tm.name as team_member_name,
  tm.email,
  tm.department_id,
  s.created_at,
  s.updated_at
FROM submissions s
LEFT JOIN team_members tm ON s.team_member_id = tm.id
WHERE s.status = 'active';

-- View: Complete awards with winner details
CREATE OR REPLACE VIEW complete_awards AS
SELECT 
  a.id,
  a.award_id,
  a.award_type,
  a.award_category_id,
  ac.category_key,
  ac.category_name,
  a.period_type,
  a.period_year,
  a.period_month,
  a.period_week,
  a.period_start,
  a.period_end,
  a.rank_in_period,
  a.total_contestants,
  a.creativity_score,
  a.composition_score,
  a.color_theory_score,
  a.balance_score,
  tm.user_id as winner_id,
  tm.name as winner_name,
  tm.email as winner_email,
  tm.department_id,
  a.status,
  a.created_at
FROM awards a
LEFT JOIN team_members tm ON a.winner_id = tm.id
LEFT JOIN award_categories ac ON a.award_category_id = ac.id
WHERE a.status = 'active';

-- ============================================================================
-- COMMENT ON TABLES
-- ============================================================================

COMMENT ON TABLE team_members IS 'Team member profiles and department information';
COMMENT ON TABLE award_categories IS 'Predefined award categories with media type filters';
COMMENT ON TABLE submissions IS 'Media submissions from Jira with AI evaluation scores';
COMMENT ON TABLE awards IS 'Weekly and monthly award records with winner information';
COMMENT ON TABLE audit_logs IS 'Immutable append-only audit trail of all system events';
COMMENT ON TABLE evaluation_queue IS 'Async queue for pending AI evaluations';
COMMENT ON TABLE notification_queue IS 'Queue for award notifications with deduplication';
COMMENT ON TABLE leaderboard_cache IS 'Cached leaderboard data for performance';
COMMENT ON TABLE submission_stats_cache IS 'Cached submission statistics for dashboard';
