-- ProjectShelf schema. All timestamps are UTC.

-- ---------- identity ----------
CREATE TABLE roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE
);
CREATE TABLE permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255)
);
CREATE TABLE role_permissions (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  college VARCHAR(160),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  deletion_requested_at DATETIME(6),
  last_login_at DATETIME(6),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- ---------- catalogue ----------
CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(90) NOT NULL UNIQUE,
  description VARCHAR(400),
  keywords VARCHAR(600),              -- comma-separated terms used by the rule-based classifier
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE technologies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(90) NOT NULL UNIQUE,
  aliases VARCHAR(300),               -- comma-separated lower-case match terms
  is_language BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE source_platforms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL,
  base_url VARCHAR(200) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_publish BOOLEAN NOT NULL DEFAULT FALSE,
  auto_publish_threshold DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE licences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  spdx_id VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  url VARCHAR(300),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  title_normalized VARCHAR(200) NOT NULL,
  short_description VARCHAR(600),
  overview TEXT,
  problem_statement TEXT,
  objectives JSON,
  features JSON,
  modules JSON,
  category_id BIGINT,
  project_type VARCHAR(30) NOT NULL,
  difficulty VARCHAR(20),
  author_name VARCHAR(160),
  author_url VARCHAR(400),
  source_platform_id BIGINT NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  canonical_url VARCHAR(500) NOT NULL,
  licence_id BIGINT,
  stars INT,
  forks INT,
  primary_language VARCHAR(60),
  demo_url VARCHAR(500),
  demo_verified BOOLEAN NOT NULL DEFAULT FALSE,
  documentation_url VARCHAR(500),
  source_available BOOLEAN NOT NULL DEFAULT TRUE,
  source_created_at DATETIME(6),
  source_updated_at DATETIME(6),
  last_verified_at DATETIME(6),
  discovered_at DATETIME(6) NOT NULL,
  published_at DATETIME(6),
  quality_score DECIMAL(5,2),
  analysis_status VARCHAR(20) NOT NULL DEFAULT 'NONE',   -- NONE | HEURISTIC | AI | FAILED
  status VARCHAR(30) NOT NULL,
  review_note VARCHAR(500),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  view_count BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uk_projects_canonical (canonical_url),
  KEY idx_projects_status (status, published_at),
  KEY idx_projects_category (category_id, status),
  KEY idx_projects_title_norm (title_normalized),
  KEY idx_projects_lang (primary_language),
  FULLTEXT KEY ft_projects (title, short_description, overview),
  CONSTRAINT fk_projects_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_projects_platform FOREIGN KEY (source_platform_id) REFERENCES source_platforms(id),
  CONSTRAINT fk_projects_licence FOREIGN KEY (licence_id) REFERENCES licences(id) ON DELETE SET NULL
);
CREATE TABLE project_technologies (
  project_id BIGINT NOT NULL,
  technology_id BIGINT NOT NULL,
  PRIMARY KEY (project_id, technology_id),
  KEY idx_pt_tech (technology_id),
  CONSTRAINT fk_pt_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tech FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE
);
CREATE TABLE project_assets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  kind VARCHAR(20) NOT NULL,           -- SCREENSHOT
  url VARCHAR(600) NOT NULL,
  attribution VARCHAR(300),
  permitted BOOLEAN NOT NULL DEFAULT FALSE,  -- only permitted assets are shown publicly
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_assets_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ---------- discovery (internal) ----------
CREATE TABLE external_source_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT,
  source_platform_id BIGINT NOT NULL,
  resource_kind VARCHAR(30) NOT NULL,   -- repository | dataset | notebook | model | competition
  external_id VARCHAR(200) NOT NULL,
  raw_metadata JSON,                    -- original source metadata, never overwritten by generated text
  readme MEDIUMTEXT,
  content_hash VARCHAR(64),
  fetched_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uk_esr (source_platform_id, resource_kind, external_id),
  CONSTRAINT fk_esr_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_esr_platform FOREIGN KEY (source_platform_id) REFERENCES source_platforms(id)
);
CREATE TABLE discovery_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_type VARCHAR(40) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL,    -- MANUAL | SCHEDULED
  status VARCHAR(20) NOT NULL,          -- RUNNING | SUCCEEDED | PARTIAL | FAILED
  started_at DATETIME(6) NOT NULL,
  ended_at DATETIME(6),
  records_discovered INT NOT NULL DEFAULT 0,
  records_processed INT NOT NULL DEFAULT 0,
  records_rejected INT NOT NULL DEFAULT 0,
  records_updated INT NOT NULL DEFAULT 0,
  records_published INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_jobs_type (job_type, started_at)
);
CREATE TABLE discovery_job_results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT NOT NULL,
  external_ref VARCHAR(300),
  outcome VARCHAR(30) NOT NULL,         -- CREATED | UPDATED | UNCHANGED | REJECTED | ERROR | PUBLISHED | FLAGGED | INFO
  detail VARCHAR(1000),
  project_id BIGINT,
  created_at DATETIME(6) NOT NULL,
  KEY idx_jr_job (job_id),
  CONSTRAINT fk_jr_job FOREIGN KEY (job_id) REFERENCES discovery_jobs(id) ON DELETE CASCADE
);
CREATE TABLE ai_analyses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  analysis_kind VARCHAR(20) NOT NULL,   -- AI | HEURISTIC
  provider VARCHAR(40),
  model VARCHAR(80),
  input_hash VARCHAR(64) NOT NULL,
  result JSON,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_aia_project (project_id, created_at),
  CONSTRAINT fk_aia_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE quality_scores (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  total DECIMAL(5,2) NOT NULL,
  breakdown JSON NOT NULL,              -- [{criterion, weight, value, evidence}]
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_qs_project (project_id, created_at),
  CONSTRAINT fk_qs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE duplicate_candidates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  other_project_id BIGINT NOT NULL,
  similarity DECIMAL(4,3) NOT NULL,
  reasons JSON,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | CONFIRMED | DISMISSED
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  UNIQUE KEY uk_dup (project_id, other_project_id),
  CONSTRAINT fk_dup_a FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_dup_b FOREIGN KEY (other_project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE ai_usage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  purpose VARCHAR(40) NOT NULL,
  provider VARCHAR(40),
  model VARCHAR(80),
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  estimated_cost_usd DECIMAL(12,6),     -- NULL when no price is configured
  created_at DATETIME(6) NOT NULL,
  KEY idx_aiu_created (created_at)
);

-- ---------- enquiries ----------
CREATE TABLE enquiries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(20) NOT NULL UNIQUE,
  user_id BIGINT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30),
  college VARCHAR(160),
  project_id BIGINT,
  service_type VARCHAR(30) NOT NULL,
  preferred_technology VARCHAR(160),
  requirements TEXT NOT NULL,
  notes TEXT,
  preferred_channel VARCHAR(20) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'NEW',
  follow_up_date DATE,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_enq_status (status, created_at),
  KEY idx_enq_user (user_id),
  KEY idx_enq_email (email),
  CONSTRAINT fk_enq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_enq_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);
CREATE TABLE enquiry_notes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  enquiry_id BIGINT NOT NULL,
  author_id BIGINT,
  note TEXT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_en_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_en_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE quotations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  enquiry_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  description TEXT,
  valid_until DATE,
  created_by BIGINT,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_q_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
  CONSTRAINT fk_q_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- engagement (internal) ----------
CREATE TABLE activity_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,                       -- only set when the student has granted activity consent
  event_type VARCHAR(40) NOT NULL,
  project_id BIGINT,
  category_id BIGINT,
  search_query VARCHAR(200),
  metadata JSON,
  created_at DATETIME(6) NOT NULL,
  KEY idx_ae_user (user_id, created_at),
  KEY idx_ae_type (event_type, created_at),
  KEY idx_ae_project (project_id),
  CONSTRAINT fk_ae_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ae_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_ae_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE TABLE interest_profiles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  observed JSON NOT NULL,               -- counted behaviour
  inferred JSON NOT NULL,               -- derived interests, labelled as inference
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0,
  last_activity_at DATETIME(6),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_ip_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE saved_projects (
  user_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (user_id, project_id),
  CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE recommendations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  score DECIMAL(6,3) NOT NULL,
  reason VARCHAR(300) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  UNIQUE KEY uk_rec (user_id, project_id),
  CONSTRAINT fk_rec_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rec_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE consent_records (             -- append-only history
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  enquiry_id BIGINT,
  email VARCHAR(190) NOT NULL,
  consent_type VARCHAR(30) NOT NULL,       -- ACTIVITY | EMAIL | WHATSAPP
  granted BOOLEAN NOT NULL,
  wording VARCHAR(600) NOT NULL,
  wording_version VARCHAR(20) NOT NULL,
  source VARCHAR(40) NOT NULL,             -- REGISTRATION | ENQUIRY_FORM | DASHBOARD | UNSUBSCRIBE_LINK | ADMIN
  created_at DATETIME(6) NOT NULL,
  KEY idx_cr_user (user_id, consent_type, created_at),
  KEY idx_cr_email (email),
  CONSTRAINT fk_cr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE communication_preferences (   -- current state derived from consent_records
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  activity_consent BOOLEAN NOT NULL DEFAULT FALSE,
  email_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_channel VARCHAR(20),
  unsubscribe_token VARCHAR(36) NOT NULL UNIQUE,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE message_drafts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject VARCHAR(200),
  body TEXT NOT NULL,
  trigger_reason VARCHAR(300) NOT NULL,    -- the observed behaviour this draft is based on
  generated_by VARCHAR(20) NOT NULL,       -- AI | TEMPLATE
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | APPROVED | REJECTED | DISCARDED | SENT | FAILED
  status_note VARCHAR(400),
  reviewed_by BIGINT,
  reviewed_at DATETIME(6),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  KEY idx_md_status (status, created_at),
  CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE message_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  draft_id BIGINT,
  user_id BIGINT,
  enquiry_id BIGINT,
  kind VARCHAR(30) NOT NULL,               -- ENGAGEMENT | ENQUIRY_ACK | ADMIN_NOTIFY | ENQUIRY_REPLY
  channel VARCHAR(20) NOT NULL,
  recipient VARCHAR(190) NOT NULL,
  subject VARCHAR(200),
  body TEXT,
  provider_message_id VARCHAR(200),
  status VARCHAR(30) NOT NULL,             -- SENT | FAILED | provider delivery states
  error VARCHAR(600),
  created_at DATETIME(6) NOT NULL,
  KEY idx_mh_user (user_id, created_at),
  KEY idx_mh_enquiry (enquiry_id),
  CONSTRAINT fk_mh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_mh_enquiry FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE SET NULL
);

-- ---------- platform ----------
CREATE TABLE integrations (                -- status metadata only; secrets live in environment variables
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at DATETIME(6),
  last_failure_at DATETIME(6),
  last_failure_message VARCHAR(600),
  last_sync_at DATETIME(6),
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT,
  actor_email VARCHAR(190),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60),
  entity_id VARCHAR(60),
  detail VARCHAR(1000),
  created_at DATETIME(6) NOT NULL,
  KEY idx_audit_created (created_at)
);
CREATE TABLE system_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME(6) NOT NULL
);
