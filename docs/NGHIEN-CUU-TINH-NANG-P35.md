# Nghiên cứu kỹ thuật cho các tính năng còn lại của P35

Ngày: 2026-10-22. Tiếp theo `docs/NGHIEN-CUU-BAI-TAP-ONLINE.md` (P33.1). Tài liệu trước trả lời "nên làm gì". Tài liệu này trả lời "làm bằng gì, thế nào, tốn bao nhiêu, vướng gì" cho từng mục 35.4–35.23 còn mở, và thêm một việc mới (AI soạn câu nháp).

Phiên bản thư viện lấy trực tiếp từ npm ngày 2026-10-22. Giá dịch vụ lấy từ các trang tổng hợp vì trang giá chính thức của Azure không hiện số khi đọc tự động; cần đối chiếu lại trên trang giá hoặc máy tính giá của nhà cung cấp trước khi chốt ngân sách.

## 1. Tóm tắt

| Mục | Kết luận |
|---|---|
| Ghi âm (35.6) | Dùng `MediaRecorder` có sẵn, chọn định dạng bằng `isTypeSupported`: ưu tiên `audio/webm;codecs=opus`, không có thì `audio/mp4`. iPhone từ iOS 18.4 ghi được WebM Opus; iPhone cũ hơn chỉ ghi MP4 (AAC). Không cần thư viện ghi âm riêng. |
| Karaoke (35.7) | Lấy mốc thời gian từng từ ngay lúc sinh giọng máy (Azure có sự kiện WordBoundary, ElevenLabs có điểm cuối kèm mốc thời gian). Giọng giáo viên tự thu thì chia đều theo số âm tiết, cho giáo viên kéo chỉnh. Căn tự động (WhisperX) để sau. |
| Chấm nói (35.8–35.10) | `wavesurfer.js` 8 (BSD-3) với plugin Regions và Timeline: vạch lỗi là một region chỉ có điểm đầu. Có gói `@wavesurfer/react`. |
| Kéo thả (35.5) | `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10 (ổn định, MIT, nhận React 19). Gói mới `@dnd-kit/react` mới bản 0.5, chưa nên dùng. |
| Trò chơi (35.15–35.17) | React + `motion` 14 (MIT) cho chuyển động, `canvas-confetti` (ISC) cho pháo giấy. Âm thanh dùng `<audio>` hoặc Web Audio, không cần thêm thư viện; `howler` không cập nhật từ 2023. |
| Lịch ôn (35.18) | `ts-fsrs` 5.4.2 (MIT, Node ≥ 20). Bản 6 còn beta và đổi API, yêu cầu Node ≥ 24; chờ bản 6 ổn định rồi mới nâng. |
| Trình chiếu (35.19) | Giáo viên điều khiển bằng bàn phím trên cùng máy chiếu: không cần máy chủ thời gian thực. Điều khiển bằng điện thoại thì dùng Supabase Realtime Broadcast (gói miễn phí 200 kết nối đồng thời, 100 tin/giây). |
| Chấm tự động (35.22–35.23) | Ba ứng viên: Azure Pronunciation Assessment, SpeechSuper, OpenPronounce (MIT, tự cài). Có bộ dữ liệu mở speechocean762 (một nửa là giọng trẻ em, CC BY 4.0) để thử trước khi dùng giọng học sinh thật. |
| Pháp lý (35.12) | Đồng ý của phụ huynh theo từng mục đích, lưu bằng chứng, trẻ từ 7 tuổi cùng đồng ý, rút lại thì ngừng xử lý (Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP). |
| AI soạn câu nháp (mới) | Giáo viên dán danh sách từ, Claude (`claude-opus-5-5`) trả về câu nháp đúng định dạng JSON của app, giáo viên duyệt rồi lưu. Ước tính khoảng 0,1–0,2 USD cho một bài 20 câu. |

## 2. Ghi âm trên trình duyệt (35.6)

### 2.1 Định dạng theo trình duyệt

| Máy | Ghi được | Phát được |
|---|---|---|
| Chrome, Edge, Android | WebM Opus | WebM, MP4 |
| Firefox | WebM Opus, Ogg Opus | WebM, Ogg, MP4 |
| Safari 14.1–18.3 (iPhone, iPad, Mac) | Chỉ MP4 (AAC) | MP4; WebM Opus trong thẻ `<audio>` từ Safari 15 |
| Safari 18.4 trở lên (ra tháng 3/2025) | Thêm WebM Opus, Ogg, MP4 phân mảnh, ALAC, PCM | Như trên |

Hệ quả cho app:
- Phát lại chéo máy không có vấn đề: giáo viên dùng iPhone nghe được bài ghi trên Android và ngược lại, vì cả hai định dạng đều phát được trên trình duyệt hiện nay.
- **Không dò theo tên trình duyệt.** Gọi `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')`, không được thì `'audio/mp4'`, rồi lấy đúng `recorder.mimeType` để đặt đuôi tệp và `Content-Type` khi tải lên. Code hiện tại (`InteractiveExercisePlayer.tsx`) đang ép `audio/webm` và tên tệp `.webm`, nên trên iPhone cũ tệp sẽ bị gán sai loại. Đây là lỗi cần sửa đầu tiên của 35.6.
- Máy chủ (`ALLOWED_TYPES` trong `src/lib/storage.ts`) đã nhận `audio/webm`, `audio/mp4`, `audio/x-m4a`, `audio/ogg`, nhưng tra theo đúng chuỗi. `recorder.mimeType` thường có tham số (ví dụ `audio/webm;codecs=opus`), nên phải cắt phần sau dấu `;` trước khi tạo `File`, nếu không tệp bị từ chối.
- Phát hiện kèm: màn soạn cho chọn ảnh `image/webp` và `image/gif` (`IMAGE_ACCEPT`), nhưng máy chủ chỉ nhận PNG và JPEG, nên giáo viên chọn ảnh WebP sẽ bị báo lỗi. Thêm hai loại này vào `ALLOWED_TYPES` hoặc bỏ khỏi `IMAGE_ACCEPT`.
- Dịch vụ chấm tự động thường cần WAV 16 kHz một kênh. Việc đổi định dạng làm ở máy chủ chấm (OpenPronounce đã cần ffmpeg), không làm trên Vercel. Không ghi WAV ngay trên trình duyệt: tệp nặng gấp khoảng 8 lần (60 giây ≈ 1,9 MB so với ≈ 0,25 MB Opus).

### 2.2 Luồng ghi âm đề xuất

1. Trẻ bấm "Bấm để nói" (một lần chạm là bắt buộc trên iOS). Lần đầu trình duyệt hỏi quyền micro; nếu bị từ chối thì hiện hướng dẫn mở quyền theo từng loại máy, không dùng `alert`.
2. Đếm ngược theo `max_seconds`, tự dừng khi hết giờ (đã sửa ở P35 rà soát).
3. **Nghe lại → Nói lại hoặc Nộp.** Code hiện tại tải lên ngay khi dừng; nên giữ bản ghi trong bộ nhớ, chỉ tải khi trẻ bấm "Dùng bản này", để không sinh tệp rác mỗi lần nói lại.
4. Tải thẳng lên Supabase bằng link có chữ ký (đã có ở P34) thay cho gửi qua server action (giới hạn 1 MB).
5. Không có đồng ý ghi âm của phụ huynh (35.12) thì không hiện nút ghi âm, thay bằng dòng "Cần phụ huynh đồng ý trước khi con ghi âm".

### 2.3 Kiểm thử

Playwright chạy Chromium với cờ `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` cho micro giả, nên E2E ghi âm chạy được trên máy dev. Safari và iPhone phải thử tay.

## 3. Giọng mẫu và karaoke (35.4, 35.7)

### 3.1 Nguồn giọng mẫu

| Cách | Mốc thời gian từng từ | Chi phí | Ghi chú |
|---|---|---|---|
| Giáo viên tự thu trong màn soạn | Không có sẵn | 0 | Giọng thật của lớp. Dùng lại đúng luồng ghi âm ở mục 2 |
| Azure Neural TTS | Có, sự kiện WordBoundary (đơn vị tick 100 ns, chia 10.000 ra mili giây) | Khoảng 15–16 USD/1 triệu ký tự; miễn phí 0,5 triệu ký tự/tháng (gói F0) | Có giọng trẻ em tiếng Anh và giọng tiếng Việt cho lời hướng dẫn. Có báo lỗi mốc thời gian trả về 0 ở vài phiên bản SDK, cần thử đúng giọng định dùng |
| ElevenLabs | Có, điểm cuối "with timestamps" trả mốc từng ký tự | 0,05–0,10 USD/1.000 ký tự tuỳ mô hình (đắt hơn Azure khoảng 3–6 lần) | Giọng tự nhiên hơn, hợp đọc truyện |
| Kokoro (`kokoro-js` 1.2.1, Apache 2.0) | Không trực tiếp | 0 | Chạy được ngay trong trình duyệt hoặc trên máy chủ. Hợp để giáo viên nghe thử khi soạn |

Một bài 20 câu khoảng 1.000 ký tự, nên với Azure, cả năm dùng chưa vượt hạn mức miễn phí 0,5 triệu ký tự mỗi tháng nếu chỉ sinh giọng lúc soạn rồi lưu tệp (như đề xuất ở tài liệu trước).

### 3.2 Karaoke

- Lưu mốc thời gian từng từ cùng câu: thêm cột `word_timings` (JSON: `[{ "w": "The", "s": 0, "e": 180 }, ...]`, đơn vị mili giây) vào `assignment_items`.
- Giọng máy: lấy mốc ngay lúc sinh tệp, lưu cùng tệp.
- Giọng giáo viên tự thu: chia thời lượng theo số âm tiết của từng từ làm bản đầu, giáo viên kéo vạch chỉnh trên thanh sóng âm (dùng chung `wavesurfer.js` ở mục 4).
- Khi phát: đọc `audio.currentTime` mỗi khung hình (`requestAnimationFrame`) rồi tô từ đang đọc. Không dùng sự kiện `timeupdate` vì chỉ bắn khoảng 4 lần mỗi giây, chữ sẽ giật.
- Căn tự động cho giọng tự thu (WhisperX, BSD-2, dùng wav2vec2 để căn từng từ) cần máy chủ Python có GPU hoặc CPU mạnh. Để sau, gộp cùng máy chủ chấm tự động ở mục 9 nếu có.

## 4. Màn chấm nói (35.8–35.10)

- **Thư viện:** `wavesurfer.js` 8.0.3 (BSD-3-Clause), có `@wavesurfer/react` 1.0.12. Plugin dùng: Regions (vùng và vạch; bản 7 đã bỏ plugin Markers, vạch là region chỉ có điểm đầu), Timeline (vạch giây dưới sóng âm), Hover (hiện giây khi rê chuột).
- **Không có plugin bình luận sẵn.** Ghi chú lỗi là dữ liệu của app: bảng `speaking_feedback` (đã có trong kế hoạch 35.8) gồm `submission_item_id`, `at_ms`, `error_type`, `correct_text`, `model_audio_file_id`, `redo` (đánh dấu nói lại), `comment`. Mỗi dòng vẽ thành một region; bấm region thì phát từ giây đó.
- **Trên điện thoại:** sóng âm co theo chiều rộng; thêm nút "Thêm lỗi tại giây hiện tại" vì chạm đúng vạch trên màn nhỏ rất khó.
- **Danh sách loại lỗi** của người Việt lấy từ mục 8.3 tài liệu trước, lưu thành hằng trong code (giống `RUBRIC_PRESETS`), không cần bảng riêng.
- **35.10, học sinh nói lại:** giữ bản ghi cũ, bản mới thành lượt mới của cùng câu. Cần thêm `attempt` vào `submission_item_scores` hoặc bảng `speaking_attempts`, để giáo viên đặt hai bản cạnh nhau.

## 5. Kéo thả cho trẻ (35.5)

| Thư viện | Bản | Giấy phép | Đánh giá |
|---|---|---|---|
| `@dnd-kit/core` + `@dnd-kit/sortable` | 6.3.1 / 10.0.0 (12/2024) | MIT | Ổn định, nhận React ≥ 16.8 nên chạy với React 19.3 của app. Có cảm biến chuột, chạm, bàn phím và thông báo cho trình đọc màn hình |
| `@dnd-kit/react` | 0.5.1 (cập nhật 10/2026) | MIT | Bản viết lại, khai báo React 18–19, nhưng vẫn dưới 1.0 nên API còn đổi |
| `@atlaskit/pragmatic-drag-and-drop` | 4.0.0 | Apache 2.0 | Nhẹ, dựa trên kéo thả gốc của trình duyệt; kéo bằng cảm ứng trên điện thoại kém hơn, phải tự làm phần hiệu ứng |

Chọn `@dnd-kit/core` + `@dnd-kit/sortable`. Cài đặt cho trẻ nhỏ:
- Cảm biến chạm có độ trễ ngắn (khoảng 150 ms) và dung sai vài pixel, để vuốt cuộn trang không bị hiểu là kéo.
- Vẫn giữ cách "chạm chọn rồi chạm chỗ đặt" đang có làm cách thứ hai: trẻ 3–5 tuổi chạm dễ hơn kéo.
- Bàn phím: Space hoặc Enter để nhấc, mũi tên để di chuyển, Esc để huỷ (có sẵn trong thư viện).

## 6. Trò chơi và động lực (35.14–35.17)

- **Chuyển động:** `motion` 14.5 (MIT, trước là Framer Motion). Lật thẻ, nảy khi đúng, rung nhẹ khi sai.
- **Pháo giấy:** `canvas-confetti` 1.9.4 (ISC). Tôn trọng cài đặt giảm chuyển động của máy (`prefers-reduced-motion`).
- **Âm thanh hiệu ứng:** tệp mp3 ngắn phát bằng `<audio>` hoặc Web Audio. iOS chỉ cho phát sau lần chạm đầu, nên "mở khoá âm thanh" ở nút Bắt đầu của mỗi trò. Không cần `howler` (bản cuối 2023).
- **Không cần Phaser** cho 8 trò trong kế hoạch: đều là lưới thẻ, chạm, kéo, đếm giờ.
- **Danh sách từ (35.14):** bảng `word_lists` và `word_list_items` (từ, nghĩa tiếng Việt, emoji hoặc ảnh, âm thanh). Bộ bài học thử ở `src/lib/demo-lessons.ts` đã dùng emoji làm tranh; danh sách từ dùng cùng cách, nên chưa có ảnh vẫn chơi được.
- **Sao và chuỗi tuần (35.17):** tính từ dữ liệu bài nộp đã có, không lưu riêng: sao của bài = làm tròn (điểm / điểm tối đa × 3); một tuần tính là "đã học" khi có ít nhất N lượt nộp hoặc lượt chơi. Viết thành hàm thuần để unit test. Màn chúc mừng hiện đang luôn 3 sao, phải đổi sang sao thật.

## 7. Hộp từ và lịch ôn (35.18)

- `ts-fsrs` 5.4.2 (MIT, Node ≥ 20; máy dev đang Node 24.21). API bản 5: `createEmptyCard()`, `fsrs()`, `scheduler.repeat(card, now)` hoặc `scheduler.next(card, now, Rating.Good)`.
- Bản 6 đang beta (6.0.0-beta.15): đổi sang `DefaultScheduler()`, `scheduler.review(...)`, mặc định thuật toán FSRS-7, đòi Node ≥ 24. Dùng bản 5, ghi chú nâng cấp khi bản 6 ra chính thức.
- Lưu mỗi thẻ là một dòng `student_word_cards` (học sinh, từ, các trường của card FSRS: `due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `last_review`) và nhật ký `student_word_reviews`.
- Với trẻ, quy đổi kết quả trò chơi thành mức đánh giá: đúng ngay lần đầu là Good, đúng sau khi thử lại là Hard, sai là Again. Không dùng mức Easy, để trẻ không phải tự đánh giá.

## 8. Chế độ trình chiếu (35.19)

Hai mức, làm mức 1 trước:
1. **Trên cùng máy chiếu.** Trang toàn màn hình (Fullscreen API), chữ và nút rất to, giáo viên bấm phím mũi tên hoặc dùng bút trình chiếu (bút gửi phím mũi tên hoặc Page Up/Down). Không cần máy chủ.
2. **Giáo viên cầm điện thoại điều khiển.** Màn chiếu hiện mã QR, điện thoại giáo viên mở trang điều khiển, hai bên trao đổi qua Supabase Realtime Broadcast (gửi thẳng giữa các máy, không ghi CSDL). Gói miễn phí cho 200 kết nối đồng thời và 100 tin mỗi giây, thừa cho một trung tâm. Vercel không giữ kết nối WebSocket, nên không tự làm máy chủ thời gian thực trên Vercel.

## 9. Chấm phát âm tự động (35.22–35.23)

| Lựa chọn | Cách chạy | Giá tham khảo | Ghi chú |
|---|---|---|---|
| Azure Pronunciation Assessment | Gọi API, cần câu chuẩn | Là phần cộng thêm của nhận dạng giọng nói thời gian thực; các nguồn ghi khác nhau (khoảng 0,30 USD/giờ phần cộng thêm, cộng phí nhận dạng). Miễn phí 5 giờ/tháng ở gói F0 | Không chạy được trên điểm cuối "fast transcription". Gửi giọng trẻ ra nước ngoài |
| SpeechSuper | Gọi API | Khoảng 0,004–0,008 USD mỗi lượt theo độ dài, tối thiểu 20 USD/tháng (nguồn cũ, cần hỏi lại) | Chấm tới âm vị, có nhịp và độ trôi chảy. Không thấy nêu mô hình riêng cho trẻ em |
| OpenPronounce 0.3.0 | Tự cài trên máy chủ Python 3.10+, cần ffmpeg và espeak-ng, tải hai mô hình wav2vec2 khoảng 1,2 GB mỗi cái, chạy được bằng CPU | 0 tiền dịch vụ, tốn máy chủ | MIT. Tiếng Anh là ngôn ngữ đã hiệu chỉnh. Chưa có đánh giá độc lập; ít người dùng (khoảng 1.000 lượt tải mỗi tháng) |

**Cách thử không cần giọng học sinh thật:** bộ dữ liệu speechocean762 (OpenSLR 101, CC BY 4.0) có 5.000 câu tiếng Anh của người học, khoảng một nửa là trẻ em, mỗi câu do 5 chuyên gia chấm. Chạy cả ba lựa chọn trên bộ này, so điểm máy với điểm chuyên gia, rồi mới thử với khoảng 50 bản ghi của học sinh đã có đồng ý loại thứ hai (35.12). Lưu ý người nói trong bộ này có tiếng mẹ đẻ là tiếng Trung, nên kết quả chỉ để loại bớt lựa chọn, không thay cho thử trên giọng học sinh Việt.

## 10. Pháp lý: đồng ý của phụ huynh (35.12, 35.13)

Tóm tắt từ các trang tổng hợp, chưa đối chiếu toàn văn. **Cần luật sư đọc văn bản gốc trước khi chạy thật.**

### 10.1 Đồng ý (Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP, cùng hiệu lực từ 01/01/2026)

- Đồng ý phải tự nguyện, rõ ràng, theo **từng mục đích**, in hoặc sao chép thành văn bản được, kể cả dạng điện tử kiểm chứng được (Điều 9). Im lặng không phải là đồng ý. Không được để ô đồng ý tích sẵn.
- Bên xử lý phải lưu bằng chứng đồng ý; khi có tranh chấp, bên xử lý phải chứng minh.
- Trẻ em: người đại diện theo pháp luật thực hiện quyền thay trẻ. Trẻ từ đủ 7 tuổi: khi xử lý nhằm công bố hoặc tiết lộ đời sống riêng tư, cần đồng ý của cả trẻ và cha mẹ (Điều 24). Phải ngừng xử lý khi người đồng ý rút lại.
- Dữ liệu sinh trắc học thuộc danh mục dữ liệu nhạy cảm (Điều 4 Nghị định 356). Bộ Công an đã nói giọng nói là dữ liệu sinh trắc học nhạy cảm (trong dự thảo tiêu chuẩn về sinh trắc học giọng nói). Bản ghi giọng để giáo viên chấm không dùng để nhận diện người, nhưng an toàn nhất là coi như dữ liệu nhạy cảm.

Áp vào bảng `parent_consents` (35.12):
- Mỗi dòng một mục đích: `voice_teacher_review` (ghi âm cho giáo viên chấm), `voice_auto_scoring` (gửi giọng ra dịch vụ chấm tự động), sau này thêm mục đích khác thì thêm dòng, không gộp.
- Lưu: ai đồng ý (phụ huynh nào, qua kênh nào: nút Telegram, nhân viên ghi nhận kèm ảnh giấy), thời điểm, phiên bản nội dung điều khoản đã hiện, thời điểm rút lại. Không xoá dòng khi rút lại, chỉ ghi thời điểm rút.
- Trẻ từ 7 tuổi: thêm bước trẻ tự bấm đồng ý trong khu học sinh (một câu đơn giản, có giọng đọc), lưu riêng.
- Nội dung hiện cho phụ huynh nêu rõ: dữ liệu gì (giọng nói), để làm gì, ai nghe được, lưu bao lâu, cách rút lại.

### 10.2 Nơi lưu dữ liệu

Người dùng chốt ngày 2026-10-22: không làm hồ sơ chuyển dữ liệu ra nước ngoài. Mục này không còn trong kế hoạch.

## 11. Việc mới đề xuất: AI soạn câu nháp

Ý tưởng: giáo viên dán danh sách từ hoặc chủ đề (ví dụ "Food: rice, egg, noodles, milk"), chọn độ tuổi và dạng câu, bấm "Soạn nháp". App trả về 10–20 câu nháp theo đúng cấu trúc `ItemInput` (cùng schema zod đang dùng để lưu), hiện trong màn soạn để giáo viên sửa, xoá, rồi lưu như câu tự soạn.

- **Mô hình:** Claude Opus 5.5 (`claude-opus-5-5`), giá 4 USD mỗi triệu token vào và 20 USD mỗi triệu token ra. Dùng structured outputs (`output_config.format` với JSON schema sinh từ schema zod) để luôn ra JSON hợp lệ, không phải tự sửa chuỗi. Đặt `effort` thấp vì đây là việc soạn ngắn.
- **Ước tính chi phí:** một bài 20 câu khoảng 2.000 token vào (hướng dẫn, danh sách từ, ví dụ định dạng) và 4.000–6.000 token ra kể cả phần suy nghĩ, tức khoảng 0,09–0,13 USD mỗi lần soạn. Một giáo viên soạn 10 bài mỗi tuần tốn khoảng 1–1,5 USD mỗi tuần.
- **An toàn nội dung:** máy chỉ soạn nháp, không bao giờ giao thẳng cho học sinh; giáo viên phải duyệt. Không gửi tên hay dữ liệu học sinh lên dịch vụ, chỉ gửi danh sách từ và yêu cầu, nên không phát sinh chuyển dữ liệu cá nhân.
- **Kiểm chứng tự động:** chạy từng câu nháp qua `itemFormSchema` và các kiểm tra như `tests/unit/demo-lessons.test.ts` (đáp án đúng duy nhất, câu sắp xếp chấm đủ điểm với chính đáp án) trước khi hiện cho giáo viên.
- Cần thêm khoá API Anthropic vào biến môi trường của Vercel (chỉ ở máy chủ).

## 12. Thứ tự làm đề xuất (cập nhật phân kỳ P35)

1. **Sửa nhỏ ngay:** định dạng ghi âm theo `isTypeSupported` và cắt tham số MIME (mục 2.1); loại ảnh WebP, GIF lệch giữa màn soạn và máy chủ (mục 2.1); màn chúc mừng hiện sao theo điểm thật (mục 6).
2. **Đồng ý của phụ huynh trước khi ghi âm thật:** 35.12 bảng đồng ý theo mục 10.1.
3. **35.6 hoàn chỉnh:** nghe lại trước khi nộp, tải thẳng Supabase, chặn khi chưa đồng ý.
4. **35.5 kéo thả** bằng dnd-kit, giữ cách chạm chọn.
5. **35.8–35.10 chấm nói** với wavesurfer.js.
6. **35.4 giọng mẫu:** ghi âm trong màn soạn, sau đó sinh giọng Azure kèm mốc từng từ; rồi **35.7 karaoke**.
7. **35.14–35.17 danh sách từ, trò chơi, sao.** Song song: **AI soạn câu nháp** (mục 11) nếu người dùng muốn.
8. **35.18 hộp từ** với ts-fsrs 5.
9. **35.19 trình chiếu** mức 1, rồi mức 2 nếu cần.
10. **35.22–35.23 chấm tự động**, thử trên speechocean762 trước.

## 13. Nguồn

Phiên bản thư viện: lệnh `npm view <gói> version license` ngày 2026-10-22 cho `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/react`, `@atlaskit/pragmatic-drag-and-drop`, `ts-fsrs`, `wavesurfer.js`, `@wavesurfer/react`, `motion`, `canvas-confetti`, `howler`, `kokoro-js`, `extendable-media-recorder`.

Ghi âm và phát lại:
- [WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/)
- [Ghi âm trên iPhone Safari bằng MediaRecorder](https://www.buildwithmatija.com/blog/md/iphone-safari-mediarecorder-audio-recording-transcription)
- [WebKit Bugzilla 290002](https://bugs.webkit.org/show_bug.cgi?id=290002), [WebKit Bugzilla 221745](https://bugs.webkit.org/show_bug.cgi?id=221745)
- [Hỗ trợ MediaRecorder theo trình duyệt](https://www.testmuai.com/web-technologies/mediarecorder/)
- [Ogg Opus vẫn lỗi trên Safari 18.4](https://frequal.com/java/OggOpusStillNotWorkingInSafari18_4.html)
- [Apple Developer Forums: WebM audio playback](https://developer.apple.com/forums/thread/775937)

Giọng máy, karaoke, căn từ:
- [Microsoft Q&A: WordBoundary trả 0](https://learn.microsoft.com/en-sg/answers/questions/1651510/azure-text-to-speech-wordboundary-event-always-ret)
- [Pipecat: Azure TTS](https://docs.pipecat.ai/server/services/tts/azure)
- [Azure Speech: bảng giá](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/) (hạn mức miễn phí F0)
- [Azure TTS: giá và hạn mức miễn phí](https://texttolab.com/blog/azure-text-to-speech-pricing)
- [ElevenLabs: bảng giá API](https://elevenlabs.io/pricing/api)
- [WhisperX trên PyPI](https://pypi.org/project/whisperx)

Chấm nói, kéo thả, lịch ôn:
- [wavesurfer.js trên GitHub](https://github.com/katspaugh/wavesurfer.js), [tài liệu API](https://wavesurfer.xyz/docs/api/)
- [dnd-kit trên GitHub](https://github.com/clauderic/dnd-kit)
- [So sánh dnd-kit, react-beautiful-dnd, Pragmatic DnD](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026)
- [ts-fsrs trên GitHub](https://github.com/open-spaced-repetition/ts-fsrs)
- [Supabase Realtime: giới hạn](https://supabase.com/docs/guides/realtime/limits)

Chấm phát âm tự động:
- [OpenPronounce trên GitHub](https://github.com/Halleck45/OpenPronounce)
- [speechocean762 (OpenSLR 101)](https://openslr.org/101/)
- [So sánh giá Speechace, SpeechSuper, Azure](https://api.toneperfect.app/blog/pronunciation-assessment-api-pricing-compared/)
- [Microsoft Q&A: giá Pronunciation Assessment](https://learn.microsoft.com/en-us/answers/questions/5608069/pricing-and-usage-of-pronunciation-assessment-feat)
- [SpeechSuper API Samples](https://github.com/speechsuper/SpeechSuper-API-Samples)

Pháp lý:
- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 (Thư viện pháp luật)](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx)
- [Tóm tắt Luật 91/2025/QH15 (LexData)](https://lexdata.vn/van-ban-phap-luat/luat-bao-ve-du-lieu-ca-nhan-2025/)
- [Nghị định 356/2025/NĐ-CP (Thư viện pháp luật)](https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx)
- [Điểm mới của Nghị định 356/2025 so với Nghị định 13/2023](https://luatvietnam.vn/dan-su/diem-moi-cua-nghi-dinh-356-2025-so-voi-nghi-dinh-13-2023-ve-bao-ve-du-lieu-ca-nhan-568-106269-article.html)
- [Bổ sung danh mục dữ liệu cá nhân nhạy cảm từ 01/01/2026](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/chinh-sach-moi/102178/bo-sung-danh-muc-du-lieu-ca-nhan-nhay-cam-tu-01-01-2026)
- [Tuổi Trẻ: dữ liệu sinh trắc học giọng nói là thông tin nhạy cảm](https://tuoitre.vn/bo-cong-an-du-lieu-sinh-trac-hoc-giong-noi-mong-mat-la-thong-tin-nhay-cam-phai-quan-ly-chat-che-2025101511361673.htm)
- [Bảo vệ dữ liệu cá nhân của trẻ em trên website trường học](https://uptech.vn/thiet-ke-website/truong-hoc/du-lieu-hoc-sinh)

AI soạn câu: giá và mã mô hình Claude lấy từ tài liệu Claude API (bảng mô hình cập nhật 2026-10-06).
