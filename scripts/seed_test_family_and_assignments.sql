-- ==============================================================================
-- SCRIPT SEED DỮ LIỆU KIỂM THỬ: PHỤ HUYNH, HỌC SINH & BÀI TẬP ONLINE TƯƠNG TÁC
-- Phụ huynh: Vũ Hữu Tuấn (SĐT: 0963882797)
-- Con: Vũ Minh Phúc (Mật khẩu mặc định: esl123)
-- Bài tập mẫu: 2 bài phong phú đầy đủ 8 dạng câu hỏi P35 (chọn tranh, ghép đôi, sắp xếp, điền từ, đọc to, nhắc lại...)
-- ==============================================================================

DO $$
DECLARE
  v_class_id integer;
  v_parent_id integer;
  v_student_id integer;
  v_account_id integer;
  v_assign1_id integer;
  v_assign2_id integer;
  v_item_id integer;
BEGIN
  -- 1. Tìm lớp phù hợp (ưu tiên lớp thiếu nhi KIDS, hoặc lấy lớp đầu tiên)
  SELECT id INTO v_class_id FROM classes WHERE name LIKE 'KIDS%' ORDER BY id LIMIT 1;
  IF v_class_id IS NULL THEN
    SELECT id INTO v_class_id FROM classes ORDER BY id LIMIT 1;
  END IF;
  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy lớp học nào trong hệ thống. Vui lòng tạo lớp học trước.';
  END IF;

  -- 2. Thêm hoặc cập nhật Phụ huynh Vũ Hữu Tuấn
  SELECT id INTO v_parent_id FROM parents WHERE replace(phone, ' ', '') = '0963882797' LIMIT 1;
  IF v_parent_id IS NULL THEN
    INSERT INTO parents (full_name, phone, email, note, created_at, updated_at)
    VALUES ('Vũ Hữu Tuấn', '0963882797', 'tuan.vu@example.com', 'Phụ huynh em Vũ Minh Phúc - tài khoản test Telegram & bài tập', now(), now())
    RETURNING id INTO v_parent_id;
  ELSE
    UPDATE parents SET full_name = 'Vũ Hữu Tuấn', email = 'tuan.vu@example.com', updated_at = now() WHERE id = v_parent_id;
  END IF;

  -- 3. Thêm hoặc cập nhật Học sinh Vũ Minh Phúc
  SELECT id INTO v_student_id FROM students WHERE full_name = 'Vũ Minh Phúc' LIMIT 1;
  IF v_student_id IS NULL THEN
    INSERT INTO students (full_name, search_key, gender, dob, class_id, status, start_date, sessions_done, note, created_at, updated_at)
    VALUES ('Vũ Minh Phúc', 'vu minh phuc', 'male', '2017-06-15', v_class_id, 'active', '2026-09-01', 5, 'Học sinh test bài tập online & Telegram', now(), now())
    RETURNING id INTO v_student_id;
  ELSE
    UPDATE students SET class_id = v_class_id, status = 'active', updated_at = now() WHERE id = v_student_id;
  END IF;

  -- 4. Liên kết Phụ huynh - Học sinh (student_parents)
  INSERT INTO student_parents (student_id, parent_id, relation, is_primary, created_at, updated_at)
  VALUES (v_student_id, v_parent_id, 'father', true, now(), now())
  ON CONFLICT (student_id, parent_id) DO UPDATE SET is_primary = true, updated_at = now();

  -- 5. Tạo tài khoản đăng nhập cho Vũ Minh Phúc (accounts)
  -- Mật khẩu mặc định: esl123
  SELECT id INTO v_account_id FROM accounts WHERE student_id = v_student_id LIMIT 1;
  IF v_account_id IS NULL THEN
    INSERT INTO accounts (full_name, email, role, status, student_id, password_hash, created_at, updated_at)
    VALUES (
      'Vũ Minh Phúc',
      'minhphuc.vu@student.esl-center.vn',
      'student',
      'active',
      v_student_id,
      'scrypt$f475aca18e218b5122158fb474a85387$2b45af6065161aeec35e2d3b6b8eefbbc3546a16a68475ec3608b16a1b89fd653c851df661f2b3cc884120bef356eced2d179fb9f1e35249ef809fa2e91af150',
      now(),
      now()
    );
  ELSE
    UPDATE accounts
    SET password_hash = 'scrypt$f475aca18e218b5122158fb474a85387$2b45af6065161aeec35e2d3b6b8eefbbc3546a16a68475ec3608b16a1b89fd653c851df661f2b3cc884120bef356eced2d179fb9f1e35249ef809fa2e91af150',
        status = 'active',
        updated_at = now()
    WHERE id = v_account_id;
  END IF;

  -- 6. Tạo mã kết nối Telegram mẫu có hạn 30 ngày cho phụ huynh Vũ Hữu Tuấn
  INSERT INTO telegram_link_codes (code, parent_id, expires_at, created_at)
  VALUES ('tuan0963882797tuan096', v_parent_id, now() + interval '30 days', now())
  ON CONFLICT (code) DO UPDATE SET parent_id = v_parent_id, expires_at = now() + interval '30 days', used_at = NULL;

  -- 7. Tạo Bài tập 1: "Unit 1: Fun with Animals & Everyday Vocabulary"
  SELECT id INTO v_assign1_id FROM assignments WHERE class_id = v_class_id AND title = 'Unit 1: Fun with Animals & Everyday Vocabulary' LIMIT 1;
  IF v_assign1_id IS NULL THEN
    INSERT INTO assignments (class_id, title, description, due_at, max_score, created_at, updated_at)
    VALUES (v_class_id, 'Unit 1: Fun with Animals & Everyday Vocabulary', 'Bài tập tương tác online sinh động gồm 8 dạng câu hỏi: Chọn tranh, Ghép đôi, Sắp xếp câu, Điền từ, Phát âm và Luyện đọc.', now() + interval '14 days', 10, now(), now())
    RETURNING id INTO v_assign1_id;
  ELSE
    UPDATE assignments SET due_at = now() + interval '14 days', updated_at = now() WHERE id = v_assign1_id;
    DELETE FROM assignment_items WHERE assignment_id = v_assign1_id;
  END IF;

  -- Câu 1 (picture_choice): Chọn tranh
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign1_id, 1, 'listening', 'picture_choice', 'Which animal is a playful puppy?', 'Em hãy chọn hình ảnh chú cún con đáng yêu:', 1, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_options (item_id, position, label, is_correct) VALUES
    (v_item_id, 1, '🐶 Playful Puppy', true),
    (v_item_id, 2, '🐱 Little Kitten', false),
    (v_item_id, 3, '🦜 Color Bird', false),
    (v_item_id, 4, '🐰 Cute Bunny', false);

  -- Câu 2 (match): Ghép đôi
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign1_id, 2, 'reading', 'match', 'Match the English words with their Vietnamese meanings:', 'Ghép các từ tiếng Anh với nghĩa tiếng Việt tương ứng:', 2, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_pairs (item_id, position, left_label, right_label) VALUES
    (v_item_id, 1, 'Dog', 'Con chó'),
    (v_item_id, 2, 'Cat', 'Con mèo'),
    (v_item_id, 3, 'Bird', 'Con chim'),
    (v_item_id, 4, 'Fish', 'Con cá');

  -- Câu 3 (order): Sắp xếp câu
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, points, created_at, updated_at)
  VALUES (v_assign1_id, 3, 'writing', 'order', 'Arrange the words to make a correct sentence:', 'Sắp xếp các từ sau thành câu hoàn chỉnh:', 'I love learning English every day', 2, now(), now());

  -- Câu 4 (gap_fill): Điền từ vào chỗ trống
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, points, created_at, updated_at)
  VALUES (v_assign1_id, 4, 'writing', 'gap_fill', 'Complete the proverb: An apple a day keeps the _____ away.', 'Điền từ còn thiếu vào chỗ trống:', 'doctor', 1, now(), now());

  -- Câu 5 (speak_repeat): Nghe và nhắc lại
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, max_seconds, points, created_at, updated_at)
  VALUES (v_assign1_id, 5, 'speaking', 'speak_repeat', 'Listen and repeat the greeting clearly:', 'Bấm ghi âm và nhắc lại câu chào sau:', 'Good morning teacher, how are you today?', 10, 1, now(), now());

  -- Câu 6 (speak_read): Luyện đọc to
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, max_seconds, points, created_at, updated_at)
  VALUES (v_assign1_id, 6, 'speaking', 'speak_read', 'Read aloud the sentence with clear pronunciation:', 'Đọc to đoạn văn ngắn sau vào micro:', 'The little cat sat on the warm sunny rug.', 15, 1, now(), now());

  -- Câu 7 (choice): Trắc nghiệm kiến thức
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign1_id, 7, 'reading', 'choice', 'How many legs does a spider have?', 'Một chú nhện có bao nhiêu chiếc chân?', 1, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_options (item_id, position, label, is_correct) VALUES
    (v_item_id, 1, '4 legs', false),
    (v_item_id, 2, '6 legs', false),
    (v_item_id, 3, '8 legs', true),
    (v_item_id, 4, '10 legs', false);

  -- Câu 8 (text): Viết câu trả lời tự do
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign1_id, 8, 'writing', 'text', 'What is your favorite animal? Write 1-2 sentences about it.', 'Con vật yêu thích của em là gì? Hãy viết 1-2 câu tiếng Anh miêu tả về nó nhé.', 1, now(), now());


  -- 8. Tạo Bài tập 2: "Unit 2: Colors, Numbers & Everyday Words"
  SELECT id INTO v_assign2_id FROM assignments WHERE class_id = v_class_id AND title = 'Unit 2: Colors, Numbers & Everyday Words' LIMIT 1;
  IF v_assign2_id IS NULL THEN
    INSERT INTO assignments (class_id, title, description, due_at, max_score, created_at, updated_at)
    VALUES (v_class_id, 'Unit 2: Colors, Numbers & Everyday Words', 'Khám phá thế giới màu sắc, các cặp từ trái nghĩa và luyện tập đàm thoại hàng ngày.', now() + interval '20 days', 10, now(), now())
    RETURNING id INTO v_assign2_id;
  ELSE
    UPDATE assignments SET due_at = now() + interval '20 days', updated_at = now() WHERE id = v_assign2_id;
    DELETE FROM assignment_items WHERE assignment_id = v_assign2_id;
  END IF;

  -- Câu 1 (match): Ghép cặp từ trái nghĩa
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign2_id, 1, 'reading', 'match', 'Match the opposites:', 'Ghép các cặp từ trái nghĩa với nhau:', 2, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_pairs (item_id, position, left_label, right_label) VALUES
    (v_item_id, 1, 'Big', 'Small'),
    (v_item_id, 2, 'Hot', 'Cold'),
    (v_item_id, 3, 'Fast', 'Slow'),
    (v_item_id, 4, 'Happy', 'Sad');

  -- Câu 2 (order): Sắp xếp câu hỏi
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, points, created_at, updated_at)
  VALUES (v_assign2_id, 2, 'writing', 'order', 'Arrange the words to form a correct question:', 'Sắp xếp các từ để tạo thành câu hỏi đúng:', 'What time do you usually wake up', 2, now(), now());

  -- Câu 3 (gap_fill): Điền từ
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, points, created_at, updated_at)
  VALUES (v_assign2_id, 3, 'writing', 'gap_fill', 'Fill in the blank: There are seven days in a _____.', 'Điền từ còn thiếu vào chỗ trống:', 'week', 2, now(), now());

  -- Câu 4 (picture_choice): Chọn tranh màu sắc
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign2_id, 4, 'reading', 'picture_choice', 'Which fruit is bright yellow and sweet?', 'Trái cây nào có màu vàng tươi và ngọt?', 1, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_options (item_id, position, label, is_correct) VALUES
    (v_item_id, 1, '🍌 Sweet Yellow Banana', true),
    (v_item_id, 2, '🍎 Red Crisp Apple', false),
    (v_item_id, 3, '🍇 Purple Juicy Grape', false),
    (v_item_id, 4, '🍓 Red Sweet Strawberry', false);

  -- Câu 5 (speak_repeat): Luyện nói câu châm ngôn
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, reference_text, max_seconds, points, created_at, updated_at)
  VALUES (v_assign2_id, 5, 'speaking', 'speak_repeat', 'Listen and say the idiom clearly:', 'Ghi âm phát âm câu nói tiếng Anh nổi tiếng sau:', 'Practice makes perfect.', 10, 1, now(), now());

  -- Câu 6 (choice): Câu hỏi về màu sắc
  INSERT INTO assignment_items (assignment_id, position, skill, item_type, prompt, prompt_vi, points, created_at, updated_at)
  VALUES (v_assign2_id, 6, 'listening', 'choice', 'What color do you get when you mix blue and yellow?', 'Khi pha màu xanh dương với màu vàng, ta được màu gì?', 2, now(), now())
  RETURNING id INTO v_item_id;
  INSERT INTO assignment_item_options (item_id, position, label, is_correct) VALUES
    (v_item_id, 1, 'Green', true),
    (v_item_id, 2, 'Orange', false),
    (v_item_id, 3, 'Purple', false),
    (v_item_id, 4, 'Brown', false);


  -- 9. Gán bài tập cho học sinh Vũ Minh Phúc (assignment_submissions)
  INSERT INTO assignment_submissions (assignment_id, student_id, status, feedback, created_at, updated_at)
  VALUES (v_assign1_id, v_student_id, 'not_submitted', '', now(), now())
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET status = 'not_submitted', updated_at = now();

  INSERT INTO assignment_submissions (assignment_id, student_id, status, feedback, created_at, updated_at)
  VALUES (v_assign2_id, v_student_id, 'not_submitted', '', now(), now())
  ON CONFLICT (assignment_id, student_id) DO UPDATE SET status = 'not_submitted', updated_at = now();

  RAISE NOTICE 'Hoàn tất khởi tạo dữ liệu kiểm thử!';
  RAISE NOTICE 'Lớp: %', v_class_id;
  RAISE NOTICE 'Phụ huynh: Vũ Hữu Tuấn (ID: %, SĐT: 0963882797)', v_parent_id;
  RAISE NOTICE 'Học sinh: Vũ Minh Phúc (ID: %)', v_student_id;
END $$;
