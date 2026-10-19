# Nghiên cứu: bài tập online và quiz cho học sinh 3–11 tuổi (nghe, nói, chấm nói)

Ngày: 2026-10-19. Nối tiếp `docs/NGHIEN-CUU-GIANG-DAY.md` (P16) và phần bài tập có câu hỏi đã làm (P22–P28).

## 1. Tóm tắt

- Các ứng dụng cho trẻ nhỏ (Lingokids, Duolingo ABC, Khan Academy Kids) mạnh ở trò chơi, bài học ngắn, chạm và kéo thả, nhưng phần nói còn yếu. Ở các ứng dụng này, luyện nói thật vẫn cần người dạy.
- Ở Việt Nam, Monkey Junior chấm phát âm tự động cho trẻ từ 3 tuổi, theo kiểu nghe mẫu rồi nói lại, có điểm và lời khen. ELSA Speak chấm phát âm rất sâu nhưng chủ yếu cho người lớn.
- Cách lớp học dùng nhiều là học sinh **ghi âm**, giáo viên **nghe lại và nhận xét** (Seesaw, Raz-Kids). Cách này hợp với trung tâm: giáo viên vẫn là người chấm, phần mềm chỉ giúp nghe nhanh, đánh dấu lỗi và gửi mẫu đúng.
- Đề xuất cho ESL Center:
  1. Thêm dạng câu cho trẻ nhỏ: chọn tranh, nghe rồi chọn, ghép đôi, sắp xếp, điền chỗ trống, và ba dạng nói (nhắc lại, đọc to, nói về tranh).
  2. Học sinh ghi âm ngay trên trình duyệt, nghe lại rồi mới nộp.
  3. Màn chấm nói: giáo viên đánh dấu lỗi theo **giây** trên đoạn ghi âm, chọn loại lỗi thường gặp của người Việt, ghi âm câu đúng để trẻ nghe và nói lại.
  4. Âm thanh đề sinh **một lần khi soạn** (giáo viên tự thu hoặc dùng giọng máy), lưu thành tệp, không gọi dịch vụ mỗi khi trẻ nghe.
  5. Chấm phát âm tự động chỉ là **gợi ý** cho giáo viên, làm ở giai đoạn sau, và chỉ khi phụ huynh đã đồng ý cho gửi giọng nói ra dịch vụ bên ngoài.
- Hai việc chặn trước khi chạy thật:
  - **Lưu tệp trên đám mây:** hiện tệp đang lưu trên ổ đĩa máy chủ, nên lên Vercel sẽ mất bản ghi âm.
  - **Sự đồng ý của phụ huynh:** giọng nói của trẻ là dữ liệu cá nhân theo luật hiện hành (mục 9).

## 2. Ba nhóm tuổi, ba cách làm bài

| Nhóm | Đặc điểm | Dạng bài hợp | Ghi chú giao diện |
|---|---|---|---|
| 3–5 tuổi | Chưa đọc được, tập trung 3–5 phút | Nghe rồi chạm tranh, nghe nhắc lại một từ, hát theo | Không dùng chữ làm hướng dẫn. Hướng dẫn bằng tiếng nói (có cả tiếng Việt), nút to, phụ huynh ngồi cùng |
| 6–8 tuổi | Học phonics, đọc câu ngắn | Chọn tranh, ghép từ với tranh, điền chữ cái, đọc to câu ngắn | Chữ to, mỗi màn một câu, có nút nghe lại |
| 9–11 tuổi | Trình độ Starters, Movers, Flyers (Pre A1 đến A2) | Đọc hiểu ngắn, điền từ, sắp xếp câu, nói về tranh, trả lời câu hỏi | Gần dạng đề Cambridge YLE, có thể làm bài dài 10–15 phút |

Bài nói của Cambridge YLE từ năm 2018 có bốn phần: giám khảo hỏi tên (Movers hỏi thêm tuổi), trẻ nói về đồ vật trong tranh, và câu "Tell me about…". Bài nói Movers kéo dài khoảng 3–5 phút. Đây là khung tốt để soạn dạng câu nói cho nhóm 9–11 tuổi.

## 3. Các nền tảng đang làm thế nào

| Nền tảng | Đối tượng | Cách học | Phần nói | Điều nên học theo |
|---|---|---|---|---|
| Lingokids | 2–8 tuổi | Trò chơi, bài hát, video; hơn 4.000 hoạt động | Hạn chế | Bài rất ngắn, học qua chơi, có phần thưởng |
| Duolingo ABC | 3–8 tuổi | Phonics, chữ cái, từ nhìn nhanh; tô chữ, ghép tranh với chữ; hơn 700 bài | Hầu như không | Lộ trình nhỏ từng bước, miễn phí, không quảng cáo |
| Khan Academy Kids | 2–7 tuổi | Học liệu tổng hợp, miễn phí | Không rõ | Giao diện không cần biết chữ |
| Monkey Junior (Việt Nam) | 0–11 tuổi | Đủ bốn kỹ năng; khoá Monkey Speak cho 3–11 tuổi | Nghe mẫu, nói lại, AI chấm điểm phát âm, độ trôi chảy, ngữ điệu, rồi khen | Vòng nghe, nói, nhận điểm và lời khen, rất hợp trẻ nhỏ |
| ELSA Speak (Việt Nam) | Chủ yếu người lớn | Luyện phát âm | Chấm sâu, so với giọng Mỹ | Chỉ ra đúng âm sai |
| Raz-Kids | Tiểu học | Sách đọc theo cấp độ | Trẻ ghi âm khi đọc sách. Bản ghi dài từ 30 giây tự gửi vào hộp của giáo viên | Đọc to theo sách, giáo viên nghe sau |
| Seesaw | Tiểu học | Lớp học số | Trẻ ghi âm đoạn đọc, giáo viên nghe và nhận xét, can thiệp khi trẻ chưa đọc | Ghi âm đầu năm và cuối năm để so sự tiến bộ |
| Wordwall | Giáo viên tự soạn | Mẫu trò chơi: ghép đôi, kéo thả, phân nhóm, sắp xếp từ | Không | Một bộ dạng câu dùng lại được cho mọi bài |

Rút ra ba điều:
1. Trẻ nhỏ cần bài ngắn và phản hồi ngay: đúng thì có hiệu ứng, sai thì được nghe lại, không bị trừ điểm nặng.
2. Phần nói có hai cách: máy chấm ngay (Monkey, ELSA) hoặc giáo viên nghe sau (Seesaw, Raz-Kids). Trung tâm có giáo viên nên đi theo cách thứ hai trước, dùng máy làm trợ lý sau.
3. Một bộ dạng câu chung, như các mẫu của Wordwall, giúp giáo viên soạn nhanh mà không phải học công cụ mới cho từng bài.

## 4. Dạng câu đề xuất

App hiện có ba loại câu: trắc nghiệm, trả lời viết và nộp tệp. Đề xuất mở rộng thành:

| Dạng | Kỹ năng | Tuổi | Cách làm | Chấm |
|---|---|---|---|---|
| Nghe rồi chọn tranh | Nghe | 3+ | Bấm loa nghe, chạm một trong 2–4 tranh | Tự động |
| Chọn tranh đúng với chữ | Đọc | 6+ | Đọc từ hoặc câu, chạm tranh | Tự động |
| Trắc nghiệm có âm thanh hoặc tranh | Nghe, đọc | 5+ | Như trắc nghiệm hiện có, đáp án có thể là tranh hoặc âm thanh | Tự động |
| Ghép đôi | Từ vựng | 5+ | Kéo từ vào tranh, hoặc nối hai cột | Tự động, mỗi cặp một phần điểm |
| Sắp xếp | Ngữ pháp, chính tả | 7+ | Kéo các chữ thành từ, các từ thành câu | Tự động |
| Điền chỗ trống | Đọc, viết | 7+ | Gõ hoặc chọn từ điền vào chỗ trống | Tự động, có danh sách đáp án chấp nhận |
| Nghe rồi nhắc lại | Nói | 3+ | Nghe mẫu, ghi âm nói lại một từ hoặc câu | Giáo viên (máy gợi ý sau) |
| Đọc to | Nói, đọc | 6+ | Đọc to đoạn chữ cho sẵn | Giáo viên (máy gợi ý sau) |
| Nói về tranh | Nói | 8+ | Xem tranh, trả lời "Tell me about…" | Giáo viên theo tiêu chí |
| Trả lời viết | Viết | 9+ | Như hiện có | Giáo viên theo tiêu chí (đã có) |

Mọi dạng tự động đều có nút **nghe lại** và cho làm lại ngay khi sai (chế độ luyện). Chế độ bài kiểm tra thì chỉ làm một lần.

## 5. Nguồn tài liệu

| Nguồn | Dùng được thế nào | Lưu ý bản quyền |
|---|---|---|
| Giáo trình trung tâm đang dạy | Nguồn chính: giáo viên soạn câu theo bài đang học | Không chụp, chép nguyên trang sách có bản quyền vào app |
| Đề mẫu Cambridge YLE (Starters, Movers, Flyers) và video bài nói mẫu | Tham khảo dạng đề và độ khó | Có bản quyền: chỉ tham khảo, tự soạn câu tương tự |
| StoryWeaver (Pratham Books) | Hơn 19.000 truyện tranh, 230 ngôn ngữ; có Readalongs (âm thanh và chữ chạy theo) | Creative Commons: dùng, sửa, dịch được, phải ghi nguồn |
| African Storybook, Book Dash, Storybooks Canada, Global Storybooks | Truyện theo cấp độ đọc, tải và in được | CC BY, ghi nguồn. Không phải truyện nào cũng có âm thanh |
| Ảnh minh hoạ | Giáo viên tự chụp hoặc vẽ, kho ảnh miễn phí bản quyền, hoặc ảnh do AI tạo | Ghi nguồn khi giấy phép yêu cầu |

Đề xuất: ngân hàng câu hỏi (đã có) thêm ô **nguồn và giấy phép** cho mỗi câu, để biết câu nào lấy từ tài liệu mở và cần ghi nguồn.

## 6. Âm thanh: phần nghe

Có ba cách tạo âm thanh cho đề:

1. **Giáo viên tự thu.** Giọng thật và đúng cách dạy của lớp. App đã cho tải âm thanh lên câu hỏi, nên chỉ cần thêm nút ghi âm ngay trong màn soạn.
2. **Giọng máy trên đám mây.** Ví dụ giọng neural của Azure hoặc Google: nghe tự nhiên, có giọng Anh và Mỹ. Một nguồn bên thứ ba ghi giá khoảng 16 USD cho mỗi triệu ký tự, Azure miễn phí 0,5 triệu ký tự mỗi tháng (nên đối chiếu bảng giá chính thức). Một bài tập 20 câu chỉ khoảng 1.000 ký tự, nên chi phí rất nhỏ.
3. **Giọng máy nguồn mở chạy trên máy chủ riêng.** Ví dụ Kokoro (giấy phép Apache 2.0): không tốn phí mỗi lần, không gửi dữ liệu ra ngoài, nhưng phải tự cài và vận hành.

Không nên dùng giọng đọc có sẵn của trình duyệt (Web Speech API) cho học sinh. Chất lượng khác nhau tuỳ máy: Chrome trên Android không trả danh sách giọng và có thể đổi sang giọng khác, iOS phải chạm mới phát được, Chrome trên máy tính lỗi với câu dài hơn 14 giây. Chỉ dùng để giáo viên nghe thử nhanh khi soạn.

**Đề xuất:** khi giáo viên soạn câu, bấm "Tạo giọng đọc" để sinh tệp mp3 một lần, nghe lại, rồi lưu như tệp âm thanh của câu (dùng lại bảng `uploaded_files`). Học sinh chỉ phát tệp đã lưu, nên nghe đồng đều trên mọi máy, không tốn phí mỗi lần nghe, và giáo viên được duyệt trước.

## 7. Dịch

Nên dùng dịch cho ba việc:
- Hướng dẫn làm bài bằng tiếng Việt (có cả bản ghi âm) cho nhóm 3–5 tuổi và cho phụ huynh ngồi cùng.
- Nghĩa tiếng Việt của từ mới, để phụ huynh kèm con ở nhà.
- Nhận xét của giáo viên gửi phụ huynh.

Không nên dịch tự động rồi hiện thẳng cho học sinh. Dịch máy có thể sai nghĩa với trẻ nhỏ. Cách làm đề xuất: máy gợi ý bản dịch, giáo viên sửa rồi lưu.

| Dịch vụ | Giá tham khảo | Ghi chú |
|---|---|---|
| Google Cloud Translation (NMT) | 20 USD cho mỗi triệu ký tự, có hạn mức miễn phí 10 USD | Nên đối chiếu danh sách ngôn ngữ và bảng giá chính thức |
| Google Translation dạng LLM | 10 USD cho mỗi triệu ký tự vào và ra | |
| DeepL | Khoảng 25–27,5 USD cho mỗi triệu ký tự, gói mới có phí tháng | Nên kiểm tra DeepL có hỗ trợ tiếng Việt trước khi chọn |
| Mô hình ngôn ngữ lớn | Theo lượng chữ | Hợp để giải thích nghĩa đơn giản cho trẻ, nhưng giáo viên vẫn phải duyệt |

## 8. Nói và chấm nói

### 8.1 Học sinh ghi âm

- Ghi âm ngay trên trình duyệt, kể cả điện thoại và máy tính bảng. Nút to: "Bấm để nói", "Nghe lại", "Nói lại", "Nộp".
- Giới hạn độ dài theo dạng câu: nhắc lại 10 giây, đọc to 60 giây, nói về tranh 90 giây.
- Trẻ nghe lại bản ghi trước khi nộp. Nộp xong vẫn có thể làm lại nếu giáo viên mở lại (app đã có cơ chế làm lại bài).
- iOS chỉ ghi âm sau một lần chạm và cần quyền micro. Màn hình hướng dẫn phụ huynh cấp quyền.

### 8.2 Giáo viên chấm

Tiêu chí đề xuất cho bài nói của trẻ (theo kiểu chấm từng mặt; app đã có chấm theo tiêu chí):

| Tiêu chí | 3–8 tuổi | 9–11 tuổi |
|---|---|---|
| Phát âm | 1–3 sao | 0–5 điểm |
| Trôi chảy | 1–3 sao | 0–5 điểm |
| Từ vựng | Không chấm riêng | 0–5 điểm |
| Ngữ pháp | Không chấm riêng | 0–5 điểm |
| Hoàn thành yêu cầu | 1–3 sao | 0–5 điểm |

Với trẻ nhỏ nên hiện sao hoặc mặt cười thay cho điểm số.

### 8.3 Chỉ ra lỗi cần sửa

Đây là phần cốt lõi bạn cần. Đề xuất màn chấm nói gồm:

1. **Thanh phát lại** có vạch thời gian. Giáo viên bấm vào đúng giây có lỗi để thêm một ghi chú.
2. **Loại lỗi** chọn nhanh từ danh sách lỗi thường gặp của người Việt:
   - Mất âm cuối: *cat* đọc thành "ca", *five* đọc thành "fai".
   - /θ/ và /ð/: *three* đọc thành "tree", *this* đọc thành "dis".
   - /ʃ/ và /s/, /z/ và /s/, /tʃ/.
   - Âm s và es của danh từ số nhiều và động từ ngôi thứ ba.
   - Đuôi *-ed* của động từ quá khứ.
   - Trọng âm từ, ngữ điệu câu hỏi.
   - Thiếu hoặc thừa từ, sai thì.
3. **Chữ đúng**: giáo viên gõ từ hoặc câu đúng, có thể kèm phiên âm.
4. **Mẫu nói đúng**: giáo viên bấm ghi âm câu đúng. Nghiên cứu cho thấy giáo viên lớp trẻ nhỏ chủ yếu dùng hai cách: nói lại câu đúng (recast) và sửa trực tiếp. Trẻ và giáo viên đều đánh giá tốt cách nói lại câu đúng, và lỗi phát âm không được sửa dễ thành thói quen khó bỏ.
5. **Giao lại một phần**: giáo viên đánh dấu "Nói lại câu này". Trẻ thấy danh sách lỗi, nghe mẫu và chỉ ghi âm lại đúng những câu đó.
6. **Lời khen trước, lỗi sau**: mỗi bài có một ô "Điều con làm tốt", và với trẻ nhỏ chỉ nên nêu 1–2 lỗi quan trọng nhất mỗi lần.

Phụ huynh xem được nhận xét và mẫu nói trong hồ sơ của con, phù hợp với tab Kỹ năng đã có.

### 8.4 Chấm tự động (giai đoạn sau, chỉ để gợi ý)

- **Azure Pronunciation Assessment**: cho điểm từng âm vị, từng âm tiết, từng từ, và điểm chung về độ chính xác, trôi chảy, đầy đủ và ngữ điệu. Hợp với dạng "Nghe rồi nhắc lại" và "Đọc to", vì có sẵn câu chuẩn để so. Một nguồn Trung Quốc ghi giá khoảng 3,05 NDT cho mỗi giờ âm thanh, dạng tính năng thêm; nên đối chiếu bảng giá chính thức theo vùng.
- **Giới hạn với giọng trẻ em:** máy nhận dạng giọng trẻ kém hơn giọng người lớn, nhất là với trẻ không phải người bản ngữ. Một nghiên cứu với học sinh tiểu học 7–11 tuổi (đọc to) cho Whisper tỉ lệ lỗi từ khoảng 14,8%. Ở nhóm học sinh lớn hơn, lỗi tăng từ khoảng 8% với người bản ngữ lên 24,8% với người không bản ngữ. Tuổi và độ dài câu ảnh hưởng nhiều nhất tới độ chính xác. Trên diễn đàn Microsoft cũng có người báo điểm luôn ra 100 dù đọc sai.
- **Vì vậy:** máy chỉ hiện điểm gợi ý và tô màu các từ nghi sai trên màn chấm. Giáo viên quyết định điểm cuối cùng. Với nhóm 3–5 tuổi, không cho máy chấm điểm hiển thị cho trẻ.

## 9. Quyền riêng tư và dữ liệu của trẻ

- Giọng nói gắn với một người cụ thể là dữ liệu cá nhân (định nghĩa ở Nghị định 13/2023, nay được thay bằng Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP, cùng có hiệu lực từ 01/01/2026).
- Xử lý dữ liệu của trẻ phải vì lợi ích tốt nhất của trẻ. Trẻ từ đủ 7 tuổi cần có sự đồng ý của chính trẻ và của cha mẹ hoặc người giám hộ. Khi phụ huynh rút lại sự đồng ý thì phải ngừng xử lý và xoá dữ liệu. Nên nhờ luật sư đối chiếu văn bản gốc trước khi chạy thật.
- Đề xuất cho app:
  - Phụ huynh tick đồng ý trước khi con ghi âm lần đầu. Có hai mức: ghi âm cho giáo viên chấm, và gửi giọng nói ra dịch vụ chấm tự động bên ngoài (tách riêng).
  - Bản ghi âm chỉ giáo viên của lớp, học sinh đó và phụ huynh nghe được. App đã kiểm quyền đọc tệp theo chủ và theo cơ sở.
  - Có thời hạn lưu, ví dụ tự xoá bản ghi sau 12 tháng hoặc khi học sinh nghỉ, và có nút xoá theo yêu cầu của phụ huynh.

## 10. Thay đổi cần làm trong app (đề xuất)

**Dữ liệu (dự kiến, chưa làm):**
- `assignment_items.item_type` thêm các dạng: `picture_choice`, `match`, `order`, `gap_fill`, `speak_repeat`, `speak_read`, `speak_picture`.
- `assignment_items`: thêm `reference_text` (câu chuẩn cho dạng nói), `model_audio_file_id` (âm thanh mẫu), `image_file_id` (tranh của câu), `max_seconds`.
- `assignment_item_options`: thêm `image_file_id`, `audio_file_id` để đáp án có thể là tranh hoặc âm thanh.
- Bảng mới `assignment_item_pairs` cho dạng ghép đôi, và cột `correct_order` cho dạng sắp xếp.
- Bảng mới `speaking_feedback`: `submission_id`, `item_id`, `at_ms` (giây trên bản ghi), `error_type`, `expected_text`, `note`, `model_audio_file_id`, `redo` (có cần nói lại không).
- Bảng mới `parent_consents`: `student_id`, loại đồng ý, người đồng ý, thời điểm, thời điểm rút lại.

**Phân kỳ đề xuất:**

| Bước | Nội dung | Phụ thuộc |
|---|---|---|
| 1 | Lưu tệp trên đám mây (Vercel Blob hoặc S3) thay cho ổ đĩa máy chủ | Bắt buộc trước mọi phần ghi âm |
| 2 | Dạng câu chạm và kéo: chọn tranh, ghép đôi, sắp xếp, điền chỗ trống; chế độ luyện có nghe lại và làm lại | Bước 1 (tranh, âm thanh) |
| 3 | Ghi âm trên trình duyệt cho ba dạng nói, có nghe lại trước khi nộp | Bước 1 |
| 4 | Màn chấm nói: đánh dấu lỗi theo giây, loại lỗi, ghi âm mẫu, giao nói lại từng câu | Bước 3 |
| 5 | Đồng ý của phụ huynh và thời hạn lưu bản ghi | Trước khi dùng bước 3 với học sinh thật |
| 6 | Sinh giọng đọc khi soạn (giọng máy), gợi ý dịch có duyệt | Bước 1 |
| 7 | Chấm phát âm tự động làm gợi ý cho giáo viên | Bước 4, 5 (cần đồng ý gửi ra ngoài) |

## 11. Câu hỏi cần bạn quyết định

1. Lưu tệp trên đám mây: dùng Vercel Blob (gọn với Vercel) hay S3, Cloudflare R2 (rẻ hơn khi nhiều âm thanh)?
2. Giọng mẫu: giáo viên tự thu là chính, hay sinh giọng máy cho mọi câu? Nếu dùng giọng máy thì giọng Anh hay giọng Mỹ?
3. Nhóm 3–5 tuổi có làm bài ở nhà một mình không, hay luôn có phụ huynh hoặc giáo viên ngồi cùng? Câu trả lời quyết định giao diện có phải hoàn toàn không dùng chữ hay không.
4. Có muốn chấm phát âm tự động không, và chấp nhận gửi giọng nói của trẻ ra dịch vụ nước ngoài (Azure) với sự đồng ý của phụ huynh không?
5. Thời hạn lưu bản ghi âm là bao lâu?
6. Bắt đầu từ bước nào: dạng câu chạm và kéo (bước 2), hay phần nói và chấm nói (bước 3–4)?
7. Trung tâm có linh vật hoặc nhân vật riêng chưa? Nếu chưa, có muốn thiết kế một nhân vật dẫn dắt cho trẻ không?
8. Có muốn chế độ trình chiếu để giáo viên chơi trò chơi cùng cả lớp trên màn hình không?

## 12. Mã nguồn mở tham khảo

Giấy phép quyết định cách dùng. Code MIT hoặc Apache 2.0 được đưa vào app của trung tâm. Code GPL hoặc AGPL thì chỉ nên tham khảo ý tưởng: chép code vào app sẽ buộc phải công bố mã nguồn app.

| Dự án | Là gì | Giấy phép | Dùng thế nào |
|---|---|---|---|
| H5P (h5p-standalone) | Bộ dạng bài tương tác: kéo thả, kéo từ vào chỗ trống, lật thẻ nhớ, tìm điểm trong tranh, tranh có điểm bấm, ghi âm | MIT (theo các trang gói; kiểm lại tệp LICENSE) | Tham khảo cách thiết kế từng dạng câu. Có thể nhúng bài H5P có sẵn mà không cần máy chủ |
| GCompris (KDE) | Hơn 100–150 trò chơi giáo dục cho trẻ 2–10 tuổi: đọc, số, trí nhớ, đoán chữ, cờ, phím và chuột | GPL-3.0 hoặc AGPL-3.0 (các nguồn ghi khác nhau) | Chỉ tham khảo ý tưởng và cách chia mức độ, không chép code |
| Oppia | Bài học tương tác kiểu gia sư một kèm một: mỗi câu trả lời sai có phản hồi riêng | Apache 2.0 | Học cách phản hồi theo từng lỗi cụ thể thay vì chỉ báo "sai" |
| Kolibri (Learning Equality) | Nền tảng học ngoại tuyến, kho hơn 159.000 tài liệu mở | MIT | Tham khảo cách tổ chức kho học liệu mở theo cấp độ |
| OpenPronounce | Chấm phát âm đến từng âm vị, trả về từ sai và âm nghe được (IPA), đường cao độ. Chạy trên máy chủ riêng, có API web | MIT | Phương án chấm phát âm tự động không gửi giọng trẻ ra nước ngoài. Tác giả lưu ý: giọng trẻ em, giọng nặng và nhiễu làm giảm độ chính xác; nhận dạng âm sai khoảng 1 trên 10 âm |
| AI Pronunciation Trainer | Chấm phát âm bằng AI, có giao diện thử nghiệm | MIT | Tham khảo thêm cho phần chấm tự động |
| Kokoro TTS | Giọng đọc máy nhỏ, nhanh, nhiều giọng tiếng Anh | Apache 2.0 | Sinh giọng đọc đề trên máy chủ riêng, không tốn phí mỗi lần |
| ts-fsrs | Thuật toán lặp lại ngắt quãng FSRS (thuật toán của Anki) viết bằng TypeScript | MIT | Lịch ôn từ vựng cho từng học sinh |
| dnd-kit | Thư viện kéo thả cho React, hỗ trợ cảm ứng, bàn phím và trình đọc màn hình | MIT | Dạng ghép đôi, sắp xếp, kéo từ vào chỗ trống |
| Phaser | Khung làm game HTML5 (WebGL, Canvas) cho máy tính và điện thoại | MIT | Chỉ dùng cho trò chơi có hoạt hình phức tạp. Phần lớn trò chơi trong app làm bằng React là đủ |
| Các bản sao Duolingo trên GitHub | Bố cục bài học, đường học, thanh tiến độ | Thường là MIT | Tham khảo bố cục. Không dùng hình ảnh, linh vật, dữ liệu câu hỏi của Duolingo vì có bản quyền |

## 13. Giao diện, tính năng và trò chơi đề xuất

### 13.1 Nguyên tắc

- **Một buổi học ngắn, có nhịp:** khởi động (nghe từ hoặc bài hát) → luyện 3–4 câu → một trò chơi → nói một câu → tổng kết sao. Khoảng 5 phút cho nhóm 3–5 tuổi, 10 phút cho 6–8 tuổi, 15 phút cho 9–11 tuổi.
- **Thưởng gắn với việc học:** sao mở khoá truyện, bài hát hoặc trò chơi mới, thay vì phần thưởng không liên quan. Nghiên cứu cho thấy điểm và chuỗi ngày giúp trẻ luyện đều trong ngắn hạn, nhưng thưởng bên ngoài quá nhiều có thể làm trẻ mất hứng thú tự thân với môn học.
- **Không phạt:** sai thì được nghe lại và làm lại, không mất mạng, không trừ sao.
- **Chuỗi học theo tuần, không theo ngày:** ví dụ "3 buổi trong tuần", để không ép trẻ nhỏ học mỗi ngày.
- **Không xếp hạng cá nhân với trẻ nhỏ:** thay bằng mục tiêu chung của cả lớp, ví dụ "cả lớp cùng đạt 100 sao để mở truyện mới".
- **Giao diện cho trẻ:** nút to (từ 64px cho nhóm 3–5 tuổi), hướng dẫn bằng giọng nói, hiệu ứng và âm thanh khi đúng, một linh vật riêng của trung tâm, không quảng cáo.
- **Góc phụ huynh** khoá bằng một phép tính đơn giản: xem tiến độ, nghe bài nói của con, đọc nhận xét của giáo viên, quản lý sự đồng ý ghi âm.

### 13.2 Trò chơi theo kỹ năng

Giáo viên soạn **một danh sách từ** (từ, tranh, âm thanh, nghĩa tiếng Việt), rồi app tạo ra nhiều trò chơi từ cùng danh sách đó, giống cách Wordwall làm.

| Trò chơi | Kỹ năng | Tuổi | Cách chơi |
|---|---|---|---|
| Lật thẻ nhớ | Từ vựng | 4+ | Lật hai thẻ: tranh và từ, hoặc âm thanh và tranh. Đúng cặp thì phát âm từ |
| Đập chuột từ vựng | Nghe | 4+ | Nghe một từ, chạm nhanh vào tranh đúng đang hiện lên |
| Bingo nghe | Nghe | 5+ | Bảng 3×3 tranh, nghe từ và đánh dấu. Đủ hàng thì thắng |
| Simon says | Nghe | 3+ | "Touch the red ball", trẻ chạm đúng đồ vật trong tranh |
| Tìm trong tranh | Nghe, từ vựng | 4+ | "Where is the cat?", trẻ chạm đúng chỗ trong tranh lớn |
| Ghép chữ | Chính tả, phonics | 6+ | Kéo các chữ cái thành từ, nghe từng âm khi kéo |
| Xây câu | Ngữ pháp | 7+ | Kéo các từ thành câu đúng thứ tự |
| Đoán chữ | Chính tả | 8+ | Đoán từng chữ cái của từ, có tranh gợi ý |
| Đua xe trả lời nhanh | Ôn tập | 9+ | Trả lời đúng thì xe chạy nhanh hơn. Chơi một mình hoặc cả lớp trên màn chiếu |
| Karaoke đọc theo | Nói, đọc | 6+ | Chữ sáng dần theo giọng mẫu, rồi trẻ ghi âm đọc theo |
| Vòng quay từ vựng | Ôn tập, nói | 5+ | Quay ra một từ, trẻ nói to từ đó. Dùng tốt khi giáo viên chơi trên lớp |

### 13.3 Tính năng cho học sinh

- **Hộp từ của con:** mỗi từ đã học thành một thẻ. App dùng lịch lặp lại ngắt quãng (ts-fsrs) để chọn từ cần ôn mỗi ngày, mỗi lần 5–10 từ.
- **Đường học theo bài:** các buổi học xếp thành một con đường, đi qua mở khoá chặng sau, có điểm dừng ôn tập.
- **Bộ sưu tập sticker và truyện** mở khoá bằng sao.
- **Nghe lại lời khen và nhận xét** của giáo viên bằng giọng nói.
- **So sánh bản ghi đầu năm và cuối năm**, giống gợi ý của Seesaw, để trẻ và phụ huynh thấy sự tiến bộ.

### 13.4 Tính năng cho giáo viên

- Soạn danh sách từ một lần, chọn trò chơi để giao (dùng lại ngân hàng câu hỏi đã có).
- **Chế độ trình chiếu trên lớp:** chơi trên màn chiếu, cả lớp cùng chơi, giáo viên điều khiển.
- Bảng theo dõi lớp: em nào chưa làm, từ nào cả lớp hay sai, bài nói nào đang chờ chấm.
- Màn chấm nói như mục 8.3.

### 13.5 Bổ sung vào phân kỳ ở mục 10

| Bước | Nội dung |
|---|---|
| 2b | Danh sách từ và 4 trò chơi đầu tiên (lật thẻ nhớ, đập chuột từ vựng, ghép chữ, xây câu), dùng dnd-kit |
| 2c | Sao, sticker, đường học, chuỗi học theo tuần, mục tiêu chung của lớp |
| 6b | Hộp từ và lịch ôn lặp lại ngắt quãng (ts-fsrs) |
| 7b | Thử chấm phát âm bằng OpenPronounce cài trên máy chủ riêng song song với Azure, so độ chính xác trên giọng học sinh của trung tâm trước khi chọn |
| 8 | Chế độ trình chiếu trên lớp và góc phụ huynh |

## 14. Nguồn đã dùng

- Lingokids, trang hỗ trợ: https://help.lingokids.com/hc/en-us/articles/9522274605585
- Duolingo ABC: https://toptenreviews.com/duolingo-abc-launches-early-helping-young-kids-learn-to-read-and-write-for-free , https://duolingo.fandom.com/wiki/Duolingo_ABC
- Monkey Junior: https://www.monkeyenglish.net/news/monkey-junior-curriculum-powered-by-exclusive-technologies-en , https://www.monkeyenglish.net/id
- ELSA Speak: https://vietnamnet.vn/en/vietnams-app-for-english-pronunciation-wins-over-learners-E218938.html , https://saigoneer.com/saigon-technology/15790-vietnamese-educational-app-elsa-secure-$7m-from-goodle-s-ai-fund
- Raz-Kids, ghi âm khi đọc: https://help.learninga-z.com/en/articles/13413304-recording-a-student-reading-a-raz-kid-or-raz-plus-book
- Seesaw và đọc trôi chảy: https://remc.org/mitechkids/1st-grade/first-grade-reading-fluency-and-seesaw/
- Wordwall, mẫu ghép đôi: https://wordwall.net/about/template/match-up
- Cambridge YLE: https://www.cambridgeenglish.org/images/419671-young-learners-2018-exam-update.pdf , https://www.cambridgeenglish.org/exams-and-tests/movers-digital/test-format
- StoryWeaver: https://storyweaver.org.in/about ; tài liệu mở cho trẻ: https://oerafrica.org/content/online-and-offline-reading-resources-children
- Azure Pronunciation Assessment: https://docs.azure.cn/en-us/ai-services/speech-service/language-learning-with-pronunciation-assessment , https://learn.microsoft.com/en-us/answers/questions/1680083/cognitive-services-pronunciation-assessment-always
- Giá Azure Speech: https://www.azure.cn/en-us/pricing/details/cognitive-services/ , https://costbench.com/software/ai-voice-tools/microsoft-speech/
- Nhận dạng giọng trẻ em: https://clin33.uantwerpen.be/abstract/automatic-speech-recognition-of-dutch-child-speech-for-language-learning-applications , https://arxiv.org/abs/2309.07927v3 , https://awesomepapers.io/speech-audio/papers/2502.08587
- Web Speech API: https://readium.org/speech/docs/WebSpeech.html , https://docs.responsivevoice.org/guides/browser-support/
- Kokoro và Piper: https://www.codesota.com/text-to-speech/piper-vs-kokoro , https://bestllmfor.com/guides/kokoro-tts-guide/
- Giá dịch: https://cloud.google.com/products/translate/pricing , https://simplelocalize.io/blog/posts/ai-machine-translation-cost-comparison/
- Sửa lỗi phát âm cho trẻ: https://www.scitepress.org/Papers/2017/71641/ , https://journal.uhamka.ac.id/index.php/jer/article/view/155
- Dữ liệu cá nhân của trẻ em: https://hethongphapluat.com/nghi-dinh-13-2023-nd-cp-ve-bao-ve-du-lieu-ca-nhan/dieu-20 , https://hatinh.gov.vn/vi/bai-viet/luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-thi-hanh-tu-ngay-112026 , https://lsvn.vn/cong-bo-du-lieu-ca-nhan-cua-tre-tu-07-tuoi-phai-duoc-nguoi-dai-dien-dong-y-a167752.html
- H5P: https://docs.moodle.org/en/Interactive_Content_-_H5P_activity , https://www.jsdelivr.com/package/npm/h5p-standalone
- GCompris: https://gcompris.net/ , https://interoperable-europe.ec.europa.eu/eu-oss-catalogue/solutions/gcompris
- Oppia: https://opensource.googleblog.com/2014/02/oppia-tool-for-interactive-learning.html , https://oppia-user-guide.readthedocs.io
- Kolibri: https://www.learningequality.org/kolibri/ , https://www.mintlify.com/learningequality/kolibri/introduction
- OpenPronounce: https://github.com/Halleck45/OpenPronounce ; AI Pronunciation Trainer: https://huggingface.co/spaces/aletrn/ai-pronunciation-trainer
- ts-fsrs: https://www.jsdelivr.com/package/npm/ts-fsrs , https://snyk.io/advisor/npm-package/ts-fsrs
- dnd-kit: https://cdn.jsdelivr.net/npm/@dnd-kit/core@6.3.1/README.md ; Phaser: https://github.com/phaserjs/phaser
- Bản sao Duolingo: https://github.com/topics/duolingo-clone , https://github.com/MMAFL/Duolingo
- Trò chơi hoá và động lực: https://lcl.media.mit.edu/resources/readings/chapter3-gamification.pdf , https://screenwiseapp.com/guides/gamification-and-kids-motivation
