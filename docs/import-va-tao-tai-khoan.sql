-- =============================================================================
-- SCRIPT TỔNG HỢP: NHẬP DỮ LIỆU 2 CƠ SỞ (HOÀNG GIA & TUỔI THẦN TIÊN)
-- VÀ TẠO TÀI KHOẢN QUẢN LÝ RIÊNG CHO TỪNG CƠ SỞ (ADMIN ĐƠN VỊ)
-- =============================================================================
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'campus_admin' AFTER 'admin';

BEGIN;

INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'students.view', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'students.edit', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'students.delete', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'parents.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'classes.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'teachers.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'attendance.record', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'assignments.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'learning.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'tuition.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'reports.view', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'accounts.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
INSERT INTO role_permissions (role, permission, granted) VALUES ('campus_admin', 'settings.manage', true) ON CONFLICT (role, permission) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();

-- =============================================================================
-- DỮ LIỆU NHẬP TỪ FILE: hoàng gia.xlsx
-- =============================================================================
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (57, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (65, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (66, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (67, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (68, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
UPDATE teachers SET updated_at = now(), name = 'Cô Hường' WHERE id = 63;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (63, 328) ON CONFLICT (teacher_id, campus_id) DO NOTHING;

-- =============================================================================
-- DỮ LIỆU NHẬP TỪ FILE: tuổi thần tiên.xlsx
-- =============================================================================
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (63, 329) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (69, 329) ON CONFLICT (teacher_id, campus_id) DO NOTHING;
INSERT INTO teacher_campuses (teacher_id, campus_id) VALUES (70, 329) ON CONFLICT (teacher_id, campus_id) DO NOTHING;

-- =============================================================================
-- TẠO TÀI KHOẢN QUẢN LÝ RIÊNG CHO TỪNG CƠ SỞ (Mật khẩu mặc định: esl123)
-- =============================================================================
INSERT INTO accounts (full_name, email, role, status, password_hash) VALUES ('Quản lý cơ sở Hoàng Gia', 'hoanggia@esl-center.vn', 'campus_admin', 'active', 'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9') ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = 'active', updated_at = now();
INSERT INTO account_campuses (account_id, campus_id) SELECT a.id, c.id FROM accounts a JOIN campuses c ON a.email = 'hoanggia@esl-center.vn' AND lower(trim(c.name)) = lower('ESL Hoàng Gia') ON CONFLICT (account_id, campus_id) DO NOTHING;
INSERT INTO accounts (full_name, email, role, status, password_hash) VALUES ('Quản lý cơ sở Tuổi Thần Tiên', 'tuoithantien@esl-center.vn', 'campus_admin', 'active', 'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9') ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = 'active', updated_at = now();
INSERT INTO account_campuses (account_id, campus_id) SELECT a.id, c.id FROM accounts a JOIN campuses c ON a.email = 'tuoithantien@esl-center.vn' AND lower(trim(c.name)) = lower('ESL TTT') ON CONFLICT (account_id, campus_id) DO NOTHING;
INSERT INTO accounts (full_name, email, role, status, password_hash) VALUES ('Quản lý cơ sở Mầm Xanh', 'mamxanh@esl-center.vn', 'campus_admin', 'active', 'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9') ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = 'active', updated_at = now();
INSERT INTO account_campuses (account_id, campus_id) SELECT a.id, c.id FROM accounts a JOIN campuses c ON a.email = 'mamxanh@esl-center.vn' AND lower(trim(c.name)) = lower('ESL Mầm Xanh') ON CONFLICT (account_id, campus_id) DO NOTHING;
INSERT INTO accounts (full_name, email, role, status, password_hash) VALUES ('Quản lý cơ sở Anh ngữ SILA', 'sila@esl-center.vn', 'campus_admin', 'active', 'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9') ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, status = 'active', updated_at = now();
INSERT INTO account_campuses (account_id, campus_id) SELECT a.id, c.id FROM accounts a JOIN campuses c ON a.email = 'sila@esl-center.vn' AND lower(trim(c.name)) = lower('Anh ngữ SILA') ON CONFLICT (account_id, campus_id) DO NOTHING;

COMMIT;
