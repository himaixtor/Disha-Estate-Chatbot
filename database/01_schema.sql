-- Disha Estate Management — AI Property Chatbot Platform
-- MySQL 8 schema, Release 1 (all tables created; Release-2/AI tables stay empty until that module is enabled)
-- Engine: InnoDB, Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- roles — RBAC permission matrix
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  uid CHAR(36) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  can_view_all_chats TINYINT(1) NOT NULL DEFAULT 0,
  can_download TINYINT(1) NOT NULL DEFAULT 0,
  can_manage_users TINYINT(1) NOT NULL DEFAULT 0,
  can_access_dashboard TINYINT(1) NOT NULL DEFAULT 1,
  can_access_train_ai TINYINT(1) NOT NULL DEFAULT 0,
  can_access_token_usage TINYINT(1) NOT NULL DEFAULT 0,
  can_access_scheduler TINYINT(1) NOT NULL DEFAULT 0,
  can_access_license_management TINYINT(1) NOT NULL DEFAULT 0,
  can_view_all_admin_chats TINYINT(1) NOT NULL DEFAULT 0,
  can_manage_categories TINYINT(1) NOT NULL DEFAULT 0,
  can_manage_roles TINYINT(1) NOT NULL DEFAULT 0,
  role_level ENUM('super_admin','admin','manager','viewer','other') NOT NULL DEFAULT 'other',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid),
  UNIQUE KEY uq_roles_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- users — admin/staff accounts (not chatbot end-users, see blueprint Issue G5)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  uid CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_uid CHAR(36) NOT NULL,
  contact_number VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (uid),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role_uid),
  CONSTRAINT fk_users_role FOREIGN KEY (role_uid) REFERENCES roles(uid) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- refresh_tokens — rotated on every use
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  uid CHAR(36) NOT NULL,
  user_uid CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid),
  KEY idx_refresh_user (user_uid),
  KEY idx_refresh_expires (expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  parent_id INT NULL,
  name VARCHAR(100) NOT NULL,
  cms_slug VARCHAR(180) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_parent_name (parent_id, name),
  UNIQUE KEY uq_categories_parent_cms_slug (parent_id, cms_slug),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- service_sectors — serviceable localities
-- ============================================================
CREATE TABLE IF NOT EXISTS service_sectors (
  id INT NOT NULL AUTO_INCREMENT,
  sector_name VARCHAR(150) NOT NULL,
  slug VARCHAR(250) NOT NULL,
  cms_slug VARCHAR(180) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_service_sector_name (sector_name),
  UNIQUE KEY uq_service_sector_cms_slug (cms_slug),
  KEY idx_service_sector_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- chatbot_sessions — one row per widget conversation (the "lead")
-- ============================================================
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  session_id CHAR(36) NOT NULL,
  name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  mobile_number VARCHAR(20) NULL,
  chat_language VARCHAR(10) NOT NULL DEFAULT 'en',
  category_id INT NULL,
  subcategory_id INT NULL,
  category_ids JSON NULL,
  subcategory_ids JSON NULL,
  service_sector_id INT NULL,
  service_sector_ids JSON NULL,
  configuration_ids JSON NULL,
  configuration_values JSON NULL,
  state ENUM(
    'WELCOME','COLLECT_NAME','VERIFY_NAME','COLLECT_MOBILE','SEND_OTP','VERIFY_OTP',
    'PROPERTY_CATEGORY','PROPERTY_SUBCATEGORY','PROPERTY_CONFIGURATION','LOCATION','VALIDATE_LOCATION',
    'LOCATION_UNSERVICEABLE','MATCHING_INVENTORY','NO_MATCH','SHOW_RESULTS','AI_SCHEME_QA'
  ) NOT NULL DEFAULT 'WELCOME',
  lead_generated TINYINT(1) NOT NULL DEFAULT 0,
  lead_status ENUM('new','verified','matched','converted','dropped') NOT NULL DEFAULT 'new',
  is_focus TINYINT(1) NOT NULL DEFAULT 0,
  review_rating TINYINT NULL,
  user_uid CHAR(36) NULL COMMENT 'admin who owns/reviewed this thread — never the lead''s own identity, see blueprint Issue G5',
  conversation_title VARCHAR(255) NULL,
  deleted_by_owner TINYINT(1) NOT NULL DEFAULT 0,
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  PRIMARY KEY (session_id),
  KEY idx_chatsess_user (user_uid),
  KEY idx_chatsess_created (created_at),
  KEY idx_chatsess_lead_status (lead_status),
  KEY idx_chatsess_category (category_id),
  KEY idx_chatsess_subcategory (subcategory_id),
  KEY idx_chatsess_sector (service_sector_id),
  CONSTRAINT fk_chatsess_user FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE SET NULL,
  CONSTRAINT fk_chatsess_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_chatsess_subcategory FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_chatsess_sector FOREIGN KEY (service_sector_id) REFERENCES service_sectors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT NOT NULL AUTO_INCREMENT,
  session_id CHAR(36) NOT NULL,
  response_type ENUM('user','bot','system') NOT NULL,
  message_text TEXT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  token_count INT NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  is_welcome TINYINT(1) NOT NULL DEFAULT 0,
  file_name VARCHAR(255) NULL,
  file_mime_type VARCHAR(100) NULL,
  file_data LONGBLOB NULL,
  PRIMARY KEY (id),
  KEY idx_chatmsg_session (session_id),
  KEY idx_chatmsg_timestamp (timestamp),
  CONSTRAINT fk_chatmsg_session FOREIGN KEY (session_id) REFERENCES chatbot_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- otp_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  session_id CHAR(36) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempt_count TINYINT NOT NULL DEFAULT 0,
  max_attempts TINYINT NOT NULL DEFAULT 5,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_otp_session (session_id),
  KEY idx_otp_mobile (mobile_number),
  CONSTRAINT fk_otp_session FOREIGN KEY (session_id) REFERENCES chatbot_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- token_usage — Release 2 (AI module), schema present from day one
-- ============================================================
CREATE TABLE IF NOT EXISTS token_usage (
  id BIGINT NOT NULL AUTO_INCREMENT,
  session_id CHAR(36) NULL,
  call_type VARCHAR(50) NOT NULL,
  vendor VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tokenusage_session (session_id),
  KEY idx_tokenusage_vendor_model (vendor, model),
  KEY idx_tokenusage_created (created_at),
  CONSTRAINT fk_tokenusage_session FOREIGN KEY (session_id) REFERENCES chatbot_sessions(session_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- model_pricing — Release 2
-- ============================================================
CREATE TABLE IF NOT EXISTS model_pricing (
  id INT NOT NULL AUTO_INCREMENT,
  vendor VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_price_per_1k DECIMAL(10,6) NOT NULL DEFAULT 0,
  completion_price_per_1k DECIMAL(10,6) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_model_pricing (vendor, model, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- audit_log — Release 2
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  session_id CHAR(36) NULL,
  turn_id VARCHAR(64) NULL,
  query TEXT NULL,
  answer TEXT NULL,
  sources JSON NULL,
  confidence DECIMAL(5,4) NULL,
  status VARCHAR(30) NULL,
  latency_ms INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_session (session_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_session FOREIGN KEY (session_id) REFERENCES chatbot_sessions(session_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- train_chatbot_files — Release 2
-- ============================================================
CREATE TABLE IF NOT EXISTS train_chatbot_files (
  id BIGINT NOT NULL AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NULL,
  file_data LONGBLOB NULL,
  chroma_document_id VARCHAR(100) NULL,
  extracted_text LONGTEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  trained_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_trainfiles_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- train_chatbot_urls — Release 2
-- ============================================================
CREATE TABLE IF NOT EXISTS train_chatbot_urls (
  id BIGINT NOT NULL AUTO_INCREMENT,
  page_name VARCHAR(255) NULL,
  url VARCHAR(1000) NOT NULL,
  chroma_document_id VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  trained_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_trainurls_url (url(500)),
  KEY idx_trainurls_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- licenses
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
  id INT NOT NULL AUTO_INCREMENT,
  license_id VARCHAR(100) NOT NULL,
  client_name VARCHAR(255) NULL,
  company_address VARCHAR(500) NULL,
  company_contact VARCHAR(50) NULL,
  company_email VARCHAR(255) NULL,
  product_name VARCHAR(100) NULL,
  deployment_type ENUM('cloud','on_premise','hybrid') NOT NULL DEFAULT 'cloud',
  max_users INT NOT NULL DEFAULT 0,
  max_admin_users INT NOT NULL DEFAULT 0,
  max_token_usage_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  license_type ENUM('trial','standard','enterprise') NOT NULL DEFAULT 'standard',
  environment ENUM('development','staging','production') NOT NULL DEFAULT 'development',
  remarks TEXT NULL,
  status ENUM('active','suspended','expired','revoked') NOT NULL DEFAULT 'active',
  valid_from DATE NULL,
  valid_till DATE NULL,
  created_date DATE NULL,
  assigned_date DATE NULL,
  created_by CHAR(36) NULL,
  created_by_email VARCHAR(255) NULL,
  license_version VARCHAR(20) NULL,
  created_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_modified_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_tampered TINYINT(1) NOT NULL DEFAULT 0,
  tamper_detected_at DATETIME NULL,
  license_file_path VARCHAR(500) NULL,
  license_file_hash CHAR(64) NULL COMMENT 'sha256 of the canonical payload written into license.txt — binds the encrypted file to this DB row',
  PRIMARY KEY (id),
  UNIQUE KEY uq_license_id (license_id),
  KEY idx_license_status (status),
  KEY idx_license_valid_till (valid_till),
  CONSTRAINT fk_license_created_by FOREIGN KEY (created_by) REFERENCES users(uid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- app_settings — generic operational config
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
