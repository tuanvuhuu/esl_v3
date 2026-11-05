-- =============================================================================
-- SCRIPT TẠO TÀI KHOẢN QUẢN LÝ RIÊNG CHO TỪNG CƠ SỞ (ESL CENTER)
-- =============================================================================
-- Hướng dẫn:
-- 1. Vào trang /nhap-du-lieu trên hệ thống, tải lên và nhấn "Nhập dữ liệu" cho 2 file đã được chuẩn hóa:
--    - docs/hoàng gia.xlsx       (Cơ sở: ESL Hoàng Gia - 116 dòng, 0 lỗi)
--    - docs/tuổi thần tiên.xlsx  (Cơ sở: ESL TTT       - 69 dòng, 0 lỗi)
-- 2. Sau đó chạy script SQL bên dưới để tạo tài khoản riêng (vai trò Giáo vụ / Quản lý cơ sở,
--    mật khẩu mặc định: esl123) và gán quyền truy cập đúng từng cơ sở.
--    (Script cũng tự động đảm bảo 2 cơ sở ESL Hoàng Gia và ESL TTT tồn tại nếu chạy trước).
-- =============================================================================

BEGIN;

-- 1. Đảm bảo các cơ sở tồn tại trong bảng campuses
INSERT INTO campuses (name, address)
SELECT 'ESL Hoàng Gia', 'Thôn Chỉ Đạo-Xã Lạc Đạo- Hưng Yên'
WHERE NOT EXISTS (
  SELECT 1 FROM campuses WHERE lower(trim(name)) = lower('ESL Hoàng Gia')
);

INSERT INTO campuses (name, address)
SELECT 'ESL TTT', 'Khu đô thị Lạc Hồng Phúc-Mỹ Hào-Hưng Yên'
WHERE NOT EXISTS (
  SELECT 1 FROM campuses WHERE lower(trim(name)) = lower('ESL TTT')
);

-- 2. Tạo tài khoản riêng cho từng cơ sở (Mật khẩu mặc định: esl123)
INSERT INTO accounts (full_name, email, role, status, password_hash)
VALUES
  (
    'Quản lý cơ sở Hoàng Gia',
    'hoanggia@esl-center.vn',
    'academic',
    'active',
    'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9'
  ),
  (
    'Quản lý cơ sở Tuổi Thần Tiên',
    'tuoithantien@esl-center.vn',
    'academic',
    'active',
    'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9'
  ),
  (
    'Quản lý cơ sở Mầm Xanh',
    'mamxanh@esl-center.vn',
    'academic',
    'active',
    'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9'
  ),
  (
    'Quản lý cơ sở Anh ngữ SILA',
    'sila@esl-center.vn',
    'academic',
    'active',
    'scrypt$afd4eac9f6c2eff118732b62162afef3$c44e68e572f076a55a9d1fbaf5b87eeff4b51bea0aa729553a8d4fd4f8f5a335bc2d64d9b3bce5de994e9706f7c3f133344cf6c296df8277e62d5fc83ddb6fc9'
  )
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = 'active',
  updated_at = now();

-- 3. Gán từng tài khoản vào đúng cơ sở tương ứng trong bảng account_campuses
INSERT INTO account_campuses (account_id, campus_id)
SELECT a.id, c.id
FROM accounts a
JOIN campuses c ON (
  (a.email = 'hoanggia@esl-center.vn'     AND lower(trim(c.name)) = lower('ESL Hoàng Gia'))
  OR (a.email = 'tuoithantien@esl-center.vn' AND lower(trim(c.name)) = lower('ESL TTT'))
  OR (a.email = 'mamxanh@esl-center.vn'      AND lower(trim(c.name)) = lower('ESL Mầm Xanh'))
  OR (a.email = 'sila@esl-center.vn'         AND lower(trim(c.name)) = lower('Anh ngữ SILA'))
)
ON CONFLICT (account_id, campus_id) DO NOTHING;

COMMIT;

