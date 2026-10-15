# Nghiên cứu: bài giảng, bài tập, bài tập về nhà, quiz và chấm điểm theo kỹ năng

> Cập nhật 2026-10-14 theo yêu cầu người dùng: bài giảng có thể thuộc một hoặc nhiều cơ sở, không chỉ thuộc một lớp. Trợ giảng cũng có thể thuộc một hoặc nhiều cơ sở. Các chỗ nói "bài giảng thuộc lớp" dưới đây đọc theo quy tắc này (xem PLAN D7). Chưa xây dựng.

> Phạm vi: P16 trong [PLAN.md](../PLAN.md). Chỉ nghiên cứu và đề xuất. Chưa viết code, chưa tạo migration.
> Ngày: 2026-10-14. Trạng thái: người dùng đã trả lời một phần mục 8 (xem mục 10). Đã làm phần câu hỏi trong bài (PLAN P22). Phần còn lại chờ quyết định.

## 1. Tóm tắt

- Hiện tại, "bài tập" chỉ có một điểm nguyên cho mỗi học sinh. Chưa có kỹ năng, bài giảng, câu hỏi, đáp án, tiêu chí chấm, trình độ, tệp đính kèm, hay học sinh tự làm bài.
- Đề xuất: giữ `assignments` làm vỏ chung và thêm loại bài (về nhà, trên lớp, kiểm tra, đầu vào/cuối khoá). Mỗi bài gồm nhiều mục, mỗi mục gắn một kỹ năng. Câu khách quan chấm tự động. Câu viết và nói chấm theo tiêu chí. Điểm theo kỹ năng được lưu kèm điểm thô để xem tiến độ theo thời gian.
- Bài giảng là thực thể riêng, thuộc lớp và tuỳ chọn gắn với buổi học. Bài tập có thể trỏ về bài giảng.
- Giai đoạn đầu: giáo viên nhập kết quả, chưa có cổng học sinh và chưa tải tệp. Hai việc này kéo theo vai trò mới và cách lưu tệp, nên để sau khi người dùng quyết định.
- Mục 8 có 12 câu hỏi, mỗi câu có mặc định đề xuất. Trả lời "theo mặc định" là đủ để bắt đầu.

## 2. Hiện trạng (P16.1)

| Phần | Đã có | Chưa có |
|---|---|---|
| Bài tập | `assignments`: lớp, tiêu đề, mô tả, hạn, điểm tối đa (mặc định 10) ([schema.ts](../src/db/schema.ts)) | Loại bài, kỹ năng, liên kết bài giảng |
| Bài nộp | `assignment_submissions`: trạng thái, một điểm nguyên, nhận xét, mỗi cặp bài–học sinh một dòng | Điểm theo câu hoặc theo kỹ năng |
| Chấm điểm | [GradingView.tsx](../src/components/assignments/GradingView.tsx): web là bảng nhập nhanh, điện thoại chấm từng học sinh. Lưu tối đa 200 dòng một lần, điểm không vượt điểm tối đa (`src/app/(app)/bai-tap/actions.ts`) | Rubric, tiêu chí, nhiều điểm cho một bài |
| Lịch sử học tập | `learning_events` có loại `exam` ([schema.ts](../src/db/schema.ts)) | Điểm và kỹ năng của bài kiểm tra |
| Trình độ | Không có | Cột trình độ ở `students` và `classes`. `classes.course` chỉ là chuỗi tự do. Sự kiện "Lên trình độ" hiện chỉ là ghi chú (xem `src/db/seed.ts`) |
| Buổi học | `class_sessions.topic` (chuỗi 160 ký tự) | Bài giảng có cấu trúc |
| Tệp | Không có | Không có nơi lưu tệp nào trong `src` (tìm `upload`, `blob`, `bucket`, `s3` đều không có kết quả) |
| Quyền | `assignments.manage`, `learning.manage`, `students.view` ([permissions.ts](../src/lib/permissions.ts)) | Vai trò học sinh hoặc phụ huynh đăng nhập. Vai trò hiện có: quản trị, học vụ, giáo viên, kế toán |
| Kiểm thử | `e2e/work.spec.ts`: tạo bài, chấm vượt mức bị chặn, xoá bài kèm bài nộp | Kiểm thử cho bài giảng, câu hỏi, kỹ năng |

Hệ quả: hiện không trả lời được câu hỏi "học sinh A đang nghe ở mức nào, ba tháng qua tiến bộ ra sao".

## 3. Nghiên cứu cách làm phổ biến (P16.2)

Đã làm: bốn lượt tìm kiếm và mở trang chính thức của IELTS. Phần lớn nội dung dưới đây lấy từ đoạn trích kết quả tìm kiếm, chưa mở toàn văn. Riêng IELTS đã đối chiếu với trang gốc.

Nghiên cứu về bài giảng và bài tập về nhà có ít nguồn chất lượng. Kết quả tìm kiếm chủ yếu là trang trường phổ thông và tài liệu quảng bá. Vì vậy phần thiết kế cho hai mục này dựa nhiều hơn vào suy luận từ cấu trúc hiện tại.

### 3.1 Chấm theo kỹ năng

- **IELTS** (đã mở trang gốc): mỗi kỹ năng được chấm riêng.
  - Nghe và đọc: đếm câu đúng trên 40 câu, rồi quy đổi sang thang band 1–9, báo theo nguyên hoặc nửa band. Bảng quy đổi thay đổi chút ít giữa các đề.
  - Viết và nói: chấm theo tiêu chí. Viết gồm Task Achievement (Task 1) hoặc Task Response (Task 2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Nói gồm Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation.
  - Điểm tổng là trung bình bốn kỹ năng, làm tròn tới nửa band. Trung bình kết thúc bằng .25 thì lên nửa band, bằng .75 thì lên band nguyên. [Nguồn](https://ielts.org/for-test-takers/how-ielts-is-scored)
  - *Ý nghĩa cho thiết kế:* hai cách chấm (khách quan và theo tiêu chí) phải cùng tồn tại. Điểm kỹ năng là lớp riêng, điểm tổng là lớp trên.
- **Innsbruck**: tiêu chí riêng cho nghe, đọc và viết. Nghe và đọc chia ba mức. [Nguồn](https://www.uibk.ac.at/media/filer_public/19/44/19442abf-5c7a-4169-bd72-cb5221392add/assessment_criteria_for_language_courses_en.pdf)
- **UTS College (Úc)**: người học được đo theo mục tiêu của từng kỹ năng chính. Đạt khoá phải đạt cả bốn. Có bước chuẩn hoá chấm để điểm nhất quán. [Nguồn](https://www.utscollege.edu.au/courses/english)
- **LUT (Phần Lan)**: mọi giáo viên trong cùng một khoá làm theo cùng tiêu chí. [Nguồn](https://elut.lut.fi/en/node/303)
- **Avant STAMP** (chấm theo CEFR): mỗi bài viết hoặc nói có hai đánh giá. Một là mức thể loại văn bản. Hai là mức kiểm soát ngôn ngữ (cao, trung bình, thấp). Khoảng một trên năm bài được chấm lại để kiểm tra độ tin cậy. [Nguồn](https://www.avantassessment.com/guides/benchmark-rubric/stamp-cefr)
  - *Ý nghĩa:* chấm chéo một phần bài là cách rẻ để giữ điểm nhất quán giữa các giáo viên.

### 3.2 Bài giảng và mục tiêu

- **Marburg**: mỗi khoá gắn một mức CEFR. Các câu "can do" vừa là mục tiêu của lớp vừa là tiêu chí đạt. [Nguồn](https://www.uni-marburg.de/en/language-center/cefr)
  - *Ý nghĩa:* trường "mục tiêu" của bài giảng nên viết theo dạng "học sinh làm được gì", và có thể gắn với kỹ năng.
- **Oldenburg**: mọi khoá dựa trên CEFR nhưng không ghim cứng một mức. [Nguồn](https://uol.de/en/school3/language-centre/common-european-framework-of-reference)
- **Erasmus Rotterdam**: thường cần khoảng hai khoá để lên một bậc CEFR. Ngoại ngữ ngoài châu Âu cần nhiều hơn. [Nguồn](https://www.eur.nl/en/education/language-training-centre/cefr-levels)
  - *Ý nghĩa:* quy tắc lên trình độ nên là cấu hình, không viết cứng vào code.

### 3.3 Kiểm tra đầu vào, quiz và ngân hàng câu hỏi

- **EPU (Iraq)**: kiểm tra đầu vào khi bắt đầu, thi cuối khoá, và đánh giá cả bốn kỹ năng. [Nguồn](https://epu.edu.iq/?p=23599)
  - *Ý nghĩa:* cần loại bài "đầu vào / cuối khoá" tách khỏi bài tập thường.
- **Moodle**: tách định nghĩa câu hỏi trong ngân hàng khỏi bản ghi làm bài. Quiz có thể ghim một phiên bản cụ thể của câu hỏi (theo đoạn trích tài liệu cấu trúc cơ sở dữ liệu). [Nguồn](https://docs.moodle.org/dev/Question_database_structure)
  - *Ý nghĩa:* khi sửa câu hỏi, kết quả cũ không được đổi. Đề xuất chép nội dung câu vào mục bài tại thời điểm gắn.
- **Moodle rubric**: tiêu chí có nhiều mức, mỗi mức có điểm. Điểm tổng cộng các tiêu chí. Tài liệu này là bản 2.x, cần kiểm lại bản hiện tại. [Nguồn](https://docs.moodle.org/24/en/Rubrics)
- **LMS lớn (Canvas, Moodle)** có khái niệm mục tiêu năng lực (outcome) gắn với tiêu chí chấm. Mình chưa mở được tài liệu Canvas gốc, nên không dựa vào chi tiết của nó. Ý tưởng này phù hợp với "điểm theo kỹ năng".

## 4. Mô hình dữ liệu đề xuất

Đây là đề xuất, chưa tạo bảng. Khi làm thật: sửa `src/db/schema.ts`, chạy `npm run db:generate`, không sửa migration đã áp dụng (CLAUDE.md mục 4).

### 4.1 Danh mục

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `skills` | id, code, name, sort, active | code: `listening`, `speaking`, `reading`, `writing`, `grammar`, `vocabulary` (Q2) |
| `course_levels` | id, code, name, sort, cefr, note | Tuỳ chọn (Q5). `students.levelId` và `classes.levelId` nullable |
| `level_thresholds` | levelId, skillId, minScore | Ngưỡng để gợi ý lên trình độ (Q11). Thang theo Q1 |

### 4.2 Bài giảng và tài liệu

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `lessons` | id, classId (cascade), sessionId (set null), position, title, objectives, content, timestamps | Index theo (classId, position). `objectives` viết dạng "học sinh làm được..." |
| `lesson_materials` | id, lessonId (cascade), kind (`link` hoặc `file`), title, url, storageKey, mimeType, sizeBytes | Giai đoạn đầu chỉ dùng `link`. `file` để sau (Q4) |

### 4.3 Bài tập (mở rộng `assignments`)

- `kind`: `homework` (về nhà), `in_class` (trên lớp), `quiz` (kiểm tra ngắn), `test` (đầu vào, giữa kỳ, cuối khoá). Mặc định `homework` để dữ liệu cũ không đổi.
- `lessonId` nullable, set null khi xoá bài giảng.
- `skillId` nullable: bài chỉ đo một kỹ năng (ví dụ bài viết).
- `rubricId` nullable (Q8).
- Giữ nguyên `dueAt` và `maxScore`.

### 4.4 Mục bài (câu hỏi trong bài)

`assignment_items`: id, assignmentId (cascade), position, skillId, itemType, prompt, options (jsonb), answerKey (jsonb), points, sourceQuestionId (set null), createdAt.

- `itemType`: `single_choice`, `multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`, `essay`, `speaking_prompt`.
- Nội dung câu được chép vào mục bài khi gắn. Vì vậy sửa ngân hàng không đổi bài đã giao.

### 4.5 Ngân hàng câu hỏi

`questions`: id, skillId, levelId (nullable), itemType, prompt, options, answerKey, defaultPoints, createdByAccountId (set null), timestamps.

- Xoá câu đang được dùng trong bài thì chặn và nêu lý do, theo CLAUDE.md mục 3.

### 4.6 Chấm điểm

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `submission_item_scores` | submissionId (cascade), itemId (cascade), points (nullable), answerText, isCorrect (nullable), teacherComment | Unique (submissionId, itemId). Câu khách quan tự chấm khi nhập đáp án. Câu viết và nói chờ giáo viên |
| `rubrics` | id, name, skillId, createdAt | Mẫu tiêu chí dùng chung |
| `rubric_criteria` | id, rubricId (cascade), name, maxPoints, descriptors (jsonb), position | `descriptors` là mô tả từng mức |
| `submission_criterion_scores` | submissionId, criterionId, points, comment | Unique (submissionId, criterionId) |
| `submission_skill_scores` | submissionId (cascade), skillId, rawPoints, maxPoints, computedAt | Ảnh chụp để đọc nhanh. Tính lại trong cùng giao dịch khi lưu bài |

`assignment_submissions.score` giữ nguyên. Giá trị này là tổng điểm mục, hoặc điểm nhập tay với bài không có mục.

**Công thức điểm kỹ năng:**

- `raw_s` = tổng điểm các mục và tiêu chí thuộc kỹ năng `s`.
- `max_s` = tổng điểm tối đa tương ứng.
- Tỉ lệ = `raw_s / max_s`, hiển thị theo thang đã chọn (Q1).
- Lưu `raw_s` và `max_s`, để đổi thang không phải chấm lại.

### 4.7 Quan hệ tổng thể

```
lớp ─┬─ bài giảng ── tài liệu (link)
     └─ bài tập (kind, lesson?, skill?, rubric?)
           ├─ mục bài (skill, loại, đáp án, điểm) ◄── ngân hàng câu hỏi (chép nội dung)
           └─ bài nộp (học sinh)
                 ├─ điểm mục
                 ├─ điểm tiêu chí (rubric)
                 └─ điểm kỹ năng (raw, max)
                       └─ ngưỡng trình độ ──► gợi ý lên trình độ ──► learning_events (giáo viên xác nhận)
```

## 5. Luồng màn hình (đề xuất)

Theo [DESIGN.md](DESIGN.md): web từ 768px, điện thoại dưới 768px. Mọi màn mới dùng bộ thành phần chung (mục 8).

1. **Lớp học, tab "Bài giảng"** (mới). Web: bảng `DataGrid` theo thứ tự bài. Điện thoại: thẻ. Nút "Thêm bài giảng" là `Btn` chính. Mở một bài: mục tiêu, tài liệu, nút "Giao bài tập" (điền sẵn `lessonId`).
2. **Bài tập** (hiện có). Thêm chip lọc loại (Tất cả, Về nhà, Trên lớp, Kiểm tra, Đầu vào/cuối khoá) và `FilterSelect` kỹ năng. Form tạo: chọn loại. Bài một kỹ năng thì chọn kỹ năng. Bài nhiều mục thì thêm mục từ ngân hàng. Sau đó đặt hạn và điểm tối đa.
3. **Ngân hàng câu hỏi** (route mới, ví dụ `/ngan-hang-cau-hoi`). Web: `DataGrid` với cột kỹ năng, loại, trình độ, số bài đang dùng; chip lọc theo kỹ năng. Điện thoại: thẻ, nút "Thêm câu hỏi" có chữ. Hộp thoại soạn câu có xem trước.
4. **Chấm điểm** (mở rộng `GradingView`). Web: bảng học sinh × mục, câu khách quan tự điền, thêm cột điểm từng kỹ năng. Điện thoại: từng học sinh, danh sách mục, nút trước và sau. Câu viết và nói mở bảng tiêu chí: chọn mức cho từng tiêu chí, ghi nhận xét.
5. **Hồ sơ học sinh, tab "Kỹ năng"** (mới, bên cạnh Tổng quan, Phụ huynh, Học tập). Thẻ điểm từng kỹ năng có xu hướng, danh sách bài đã chấm theo kỹ năng, ngưỡng và gợi ý lên trình độ.
6. **Báo cáo kỹ năng lớp** (trang mới hoặc tab trong Báo cáo). `DataGrid` học sinh × kỹ năng, ô tô màu theo dải điểm bằng token trạng thái có sẵn (mint, butter, blush). Điện thoại: danh sách thẻ.
7. **Tổng quan** (tuỳ chọn). Mục "Cần chú ý" thêm học sinh dưới ngưỡng ở hai bài gần nhất.

## 6. Quy tắc kỹ thuật cần giữ

- **Quyền.** Giữ `assignments.manage`. Cân nhắc thêm `lessons.manage` và `questions.manage` (Q7).
- **Mọi thay đổi dữ liệu.** Server action, zod, `requirePermission`, `writeAudit`, `revalidatePath` (CLAUDE.md mục 2).
- **Xoá.** Bài giảng còn bài tập gắn: chặn và nêu lý do. Câu hỏi đang dùng: chặn. Bài tập đã có bài nộp: xoá kèm bài nộp, có xác nhận (như hiện tại).
- **Tương thích.** Bài cũ giữ `kind = homework`, không có mục, điểm nhập tay như cũ.
- **Lưu điểm.** Lưu điểm thô và điểm tối đa, không lưu điểm đã đổi thang.
- **Hiệu năng.** Báo cáo học sinh × kỹ năng đọc từ `submission_skill_scores`, không tính lại khi mở trang.
- **Kiểm thử đề xuất.** Unit test cho hàm tính điểm kỹ năng và quy đổi thang (hàm thuần). E2E cho: tạo bài, chấm câu khách quan, chặn xoá câu đang dùng.
- **Trình duyệt.** Mọi màn mới kiểm ở 360, 390, 768, 1024, 1440px (CLAUDE.md mục 3).

## 7. Phân kỳ đề xuất

Chưa đưa vào PLAN. Chờ người dùng trả lời mục 8.

- **A. Kỹ năng, kiểu bài, ngân hàng câu hỏi, mục bài.** Chấm câu khách quan, giáo viên nhập điểm mục. Không có cổng học sinh, không có tệp.
- **B. Bài giảng và tài liệu dạng link.** Gắn bài tập với bài giảng.
- **C. Rubric cho viết và nói, chấm chéo mẫu, báo cáo kỹ năng lớp, tab Kỹ năng trong hồ sơ, ngưỡng trình độ.**
- **D. Tuỳ chọn.** Tải tệp âm thanh và bài viết. Cổng học sinh và phụ huynh làm bài trực tuyến.

## 8. Câu hỏi cần người dùng quyết định

Mỗi câu có mặc định đề xuất in đậm. Trả lời "theo mặc định" là đủ.

1. **Thang điểm kỹ năng.** **0–10** / band IELTS 0–9 / CEFR A1–C2. Đề xuất: lưu điểm thô, hiển thị 0–10, cho đổi sang band hoặc CEFR.
2. **Danh sách kỹ năng.** **Bốn kỹ năng, cộng ngữ pháp và từ vựng** (sáu mục) / chỉ bốn kỹ năng.
3. **Cách học sinh làm bài.** **Giáo viên nhập kết quả** / học sinh đăng nhập làm trực tuyến (cần vai trò học sinh, phạm vi lớn).
4. **Tệp âm thanh và bài viết.** **Chỉ link** / tải lên (cần chọn nơi lưu: ổ đĩa máy chủ hay dịch vụ lưu trữ đám mây).
5. **Trình độ của trung tâm.** **CEFR, bảng sửa được** / tên riêng của trung tâm / chưa cần.
6. **Bài giảng và buổi học.** **Gắn buổi học, không bắt buộc** / độc lập hoàn toàn.
7. **Ngân hàng câu hỏi.** **Dùng chung toàn trung tâm; học vụ và giáo viên được soạn** / riêng từng lớp / chỉ học vụ soạn.
8. **Chấm viết và nói.** **Rubric bốn tiêu chí kiểu IELTS, sửa được; chấm chéo khoảng 1 trên 5 bài** / tiêu chí riêng của trung tâm / không chấm chéo.
9. **Điểm tổng bài nhiều kỹ năng.** **Mỗi kỹ năng một điểm** / một điểm tổng có trọng số.
10. **Quiz có giới hạn thời gian và số lần làm không.** **Không ở giai đoạn A** / có.
11. **Lên trình độ.** **Hệ thống gợi ý, giáo viên xác nhận** / tự động ghi.
12. **Điểm kỹ năng hiện tại.** **Trung bình ba bài gần nhất** / lần gần nhất.

## 10. Quyết định và việc đã làm (2026-10-14)

Người dùng yêu cầu: bài tập có câu hỏi bên trong, trắc nghiệm hoặc nộp tệp, đủ bốn kỹ năng nghe, nói, đọc, viết. Bảng dưới ghi quyết định cho từng câu ở mục 8.

| Câu | Quyết định | Trạng thái |
|---|---|---|
| 1. Thang điểm | Lưu điểm thô từng câu và tổng điểm tối đa của bài. Chưa có quy đổi sang band hoặc CEFR. | Một phần |
| 2. Kỹ năng | Bốn kỹ năng nghe, nói, đọc, viết theo yêu cầu. Chưa có ngữ pháp và từ vựng. | Đã làm |
| 3. Cách làm bài | Giáo viên nhập kết quả và tải tệp thay học sinh (mặc định). Học sinh chưa đăng nhập. | Mặc định |
| 4. Tệp | Tải lên, lưu trên ổ đĩa máy chủ `storage/uploads`, khoá ngẫu nhiên, giới hạn loại và cỡ. Chưa dùng dịch vụ đám mây. | Đã làm |
| 5. Trình độ | Chưa làm. | Để sau |
| 6. Bài giảng | Chưa làm. | Để sau |
| 7. Ngân hàng câu hỏi | Câu hỏi nằm trong từng bài. Chưa có ngân hàng dùng chung. | Để sau |
| 8. Chấm viết và nói | Chấm bằng điểm và nhận xét từng câu. Chưa có rubric và chấm chéo. | Để sau |
| 9. Điểm tổng nhiều kỹ năng | Một điểm tổng là tổng điểm các câu, kèm điểm theo kỹ năng. | Đã làm |
| 10. Quiz có giới hạn | Không làm ở giai đoạn này. | Mặc định |
| 11. Lên trình độ | Chưa làm. | Để sau |
| 12. Điểm kỹ năng hiện tại | Chưa làm, cần nhiều bài đã chấm. | Để sau |

**Khác với đề xuất ở mục 4:**
- Kỹ năng dùng kiểu enum `skill`, không có bảng `skills`.
- Điểm theo kỹ năng tính khi đọc (`summarizeSubmission`), không lưu bảng `submission_skill_scores`. Dữ liệu nhỏ nên không cần ảnh chụp. Nếu sau này cần đọc nhanh hàng nghìn bài thì mới lưu.
- Chưa có `assignment_items.kind` (homework, quiz...) và chưa có `lessonId`. Các phần này thuộc P16 B.

## 9. Nguồn đã dùng

- [IELTS: How IELTS is scored](https://ielts.org/for-test-takers/how-ielts-is-scored). Đã mở trang gốc.
- [Innsbruck: Assessment criteria for language courses](https://www.uibk.ac.at/media/filer_public/19/44/19442abf-5c7a-4169-bd72-cb5221392add/assessment_criteria_for_language_courses_en.pdf). Đoạn trích.
- [UTS College: English courses](https://www.utscollege.edu.au/courses/english). Đoạn trích.
- [LUT: Assessment on language courses](https://elut.lut.fi/en/node/303). Đoạn trích.
- [Avant: STAMP for CEFR](https://www.avantassessment.com/guides/benchmark-rubric/stamp-cefr). Đoạn trích.
- [Marburg: CEFR](https://www.uni-marburg.de/en/language-center/cefr). Đoạn trích.
- [Oldenburg: Common European Framework of Reference](https://uol.de/en/school3/language-centre/common-european-framework-of-reference). Đoạn trích.
- [Erasmus Rotterdam: CEFR levels](https://www.eur.nl/en/education/language-training-centre/cefr-levels). Đoạn trích.
- [EPU: English Language Center](https://epu.edu.iq/?p=23599). Đoạn trích.
- [Moodle: Question database structure](https://docs.moodle.org/dev/Question_database_structure). Đoạn trích.
- [Moodle 2.x: Rubrics](https://docs.moodle.org/24/en/Rubrics). Đoạn trích, tài liệu cũ.
