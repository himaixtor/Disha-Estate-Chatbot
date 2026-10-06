-- Disha Estate Management — seed data for Release 1
-- Safe to re-run: uses INSERT IGNORE / fixed ids.

SET NAMES utf8mb4;

-- ---------- Roles ----------
-- role_level drives the management hierarchy (who may create/edit/assign a role —
-- see backend/src/services/rolesService.js): super_admin manages everything,
-- admin manages manager/viewer/other, and manager/viewer/other cannot manage roles.
-- Uses ON DUPLICATE KEY UPDATE (not INSERT IGNORE) so re-running this file keeps
-- the built-in roles' permissions in sync with this source of truth.
INSERT INTO roles
  (uid, role_name, can_view_all_chats, can_download, can_manage_users, can_access_dashboard,
   can_access_train_ai, can_access_token_usage, can_access_scheduler, can_access_license_management,
   can_view_all_admin_chats, can_manage_categories, can_manage_roles, role_level, is_system)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'super_admin', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'super_admin', 1),
  ('33333333-3333-4333-8333-333333333333', 'admin',       1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 'admin',       0),
  ('44444444-4444-4444-8444-444444444444', 'manager',     1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 'manager',     0),
  ('22222222-2222-4222-8222-222222222222', 'viewer',      1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 'viewer',      0)
ON DUPLICATE KEY UPDATE
  can_view_all_chats = VALUES(can_view_all_chats),
  can_download = VALUES(can_download),
  can_manage_users = VALUES(can_manage_users),
  can_access_dashboard = VALUES(can_access_dashboard),
  can_access_train_ai = VALUES(can_access_train_ai),
  can_access_token_usage = VALUES(can_access_token_usage),
  can_access_scheduler = VALUES(can_access_scheduler),
  can_access_license_management = VALUES(can_access_license_management),
  can_view_all_admin_chats = VALUES(can_view_all_admin_chats),
  can_manage_categories = VALUES(can_manage_categories),
  can_manage_roles = VALUES(can_manage_roles),
  role_level = VALUES(role_level),
  is_system = VALUES(is_system);

-- Admin user is NOT seeded here — its password must go through the app's own
-- hashing (bcryptjs), not a hand-typed hash in SQL. Run:
--   npm run create-admin -- --email you@disha-estate.com --password "yourPassword"
-- from backend/ after migrating.

-- ---------- Categories (per brief §19) ----------
INSERT IGNORE INTO categories (id, name, is_active, sort_order) VALUES
  (1, 'Residential', 1, 1),
  (2, 'Commercial',  1, 2),
  (3, 'Investment',  1, 3),
  (4, 'Other',       1, 4);

-- ---------- Child categories ----------
-- Residential, Commercial and Investment sets adopted from Chatbotprototype.html.
INSERT IGNORE INTO categories (parent_id, name, is_active, sort_order) VALUES
  (1, '2 BHK', 1, 1),
  (1, '3 BHK', 1, 2),
  (1, '4 BHK', 1, 3),
  (1, '5+ BHK / Penthouse', 1, 4),
  (2, 'Office Space', 1, 1),
  (2, 'Retail Shop', 1, 2),
  (2, 'Showroom', 1, 3),
  (3, 'Plots / Land', 1, 1),
  (3, 'Pre-leased', 1, 2),
  (3, 'Farmhouses', 1, 3),
  (4, 'General Inquiry', 1, 1);

-- ---------- Service sectors ----------
-- Sample Ahmedabad localities — replace/extend from the Admin Portal with Disha's
-- actual serviceable areas; these unblock local development and demos only.
INSERT IGNORE INTO service_sectors (sector_name, area_code, is_active) VALUES
  ('SG Highway',     '380054', 1),
  ('Satellite',      '380015', 1),
  ('Prahladnagar',   '380015', 1),
  ('Bopal',          '380058', 1),
  ('South Bopal',    '380058', 1),
  ('Vastrapur',      '380015', 1),
  ('Thaltej',        '380059', 1),
  ('Science City',   '380060', 1);

-- ---------- App settings ----------
INSERT INTO app_settings (setting_key, setting_value) VALUES
  ('otp_expiry_seconds', '300'),
  ('otp_max_attempts', '5'),
  ('otp_resend_cooldown_seconds', '60'),
  ('enabled_modules', JSON_ARRAY('verification', 'inventory'))
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
