# Kịch bản bot Telegram ESL Center

Tài liệu này mô tả từng việc bot làm: ai nhận, khi nào gửi, nội dung, nút bấm, kiểm quyền và các trường hợp lệch. Mã ở `src/lib/telegram/`. Kế hoạch ở `PLAN.md` mục P34 và P37.

Trạng thái: **Có** là đã có trước đợt này, **Mới** là làm trong P37 (2026-10-22), **Sau** là để đợt sau.

## 0. Quy tắc chung

- **Ba loại người dùng bot:** phụ huynh (chat gắn `parent_id`), nhân viên (chat gắn `account_id`: giáo viên, giáo vụ, kế toán, quản trị), người lạ (chưa kết nối). Người lạ chỉ nhận hướng dẫn kết nối, không bao giờ nhận thông tin học sinh.
- **Không tin dữ liệu trong nút bấm.** Mọi `callback_data` (mã học sinh, buổi học, đơn) được kiểm lại trên máy chủ: chat có quyền với học sinh hay lớp đó không (E-072).
- **Không gửi trùng.** Mỗi tin tự động có một mã sự kiện, ví dụ `remind_schedule` + `s:812:hs:45`. Bảng `telegram_notification_log` giữ cặp (chat, loại, mã) duy nhất; ghi được dòng thì mới gửi. Chạy cron hai lần, lưu điểm danh hai lần, hai máy chủ chạy cùng lúc đều không gửi trùng.
- **Gửi lỗi không làm hỏng việc chính.** Lưu điểm danh, chấm bài, huỷ buổi... xong rồi mới gửi tin; lỗi gửi chỉ ghi log.
- **Phụ huynh tự tắt từng loại tin** bằng `/caidat` (mục 1.6). Tin trả lời lệnh, kết quả đơn nghỉ, tin giáo viên nhắn riêng và thông báo chung thì luôn gửi.
- **Chữ ký:** tin tự động ký "ESL Center"; tin giáo viên ký tên giáo viên và lớp (P34.12).
- **Giờ:** mọi mốc thời gian tính theo giờ Việt Nam (UTC+7), không theo giờ của máy chủ database.
- **Bản sao cho quản trị (super admin):** trao đổi giáo viên và phụ huynh, đơn nghỉ và kết quả, cảnh báo vắng nhiều.

## 1. Phụ huynh

### 1.1 Kết nối bằng link (Có)
Nhân viên bấm ⋯ → Kết nối Telegram ở màn Phụ huynh → gửi link `t.me/<bot>?start=<mã>` cho phụ huynh. Mã dùng một lần, hạn 7 ngày. Bấm link → bot chào, hiện menu và bàn phím tra cứu.

### 1.2 Kết nối bằng số điện thoại (Mới, thay cách cũ)
**Lỗi cũ:** gõ bất kỳ số điện thoại nào của phụ huynh là bot kết nối, nên người lạ dò được điểm, học phí, lịch học của trẻ.

Kịch bản mới:
1. Người lạ nhắn bất kỳ tin gì → bot trả lời hướng dẫn kèm nút **📱 Chia sẻ số điện thoại** (nút `request_contact` của Telegram).
2. Người dùng bấm nút → Telegram gửi danh bạ của chính họ. Bot chỉ chấp nhận khi `contact.user_id` trùng người gửi (không nhận danh bạ chuyển tiếp của người khác).
3. Số khớp đúng một phụ huynh (bỏ khoảng trắng, dấu chấm, `+84` → `0`) → kết nối, chào và hiện menu.
4. Không khớp → "Trung tâm chưa có số này. Liên hệ văn phòng hoặc xin link kết nối."
5. Khớp từ hai phụ huynh trở lên (số dùng chung) → không tự kết nối, hướng dẫn xin link.
6. Gõ số tay → bot nhắc dùng nút chia sẻ, không kết nối.

### 1.3 Tra cứu (Có, bổ sung)
Nút cố định và lệnh: `/lich`, `/diem`, `/chuyencan`, `/hocphi`, `/baitap`, `/nghi`, `/caidat`, `/help`. Phụ huynh nhiều con thì mỗi câu trả lời chia theo từng con.
- Lịch học (bổ sung): mỗi buổi ghi giờ, phòng, giáo viên dạy, chủ đề; buổi đã xin nghỉ ghi "(đã xin nghỉ: chờ duyệt / đã duyệt)".

### 1.4 Xin nghỉ học (Mới, thay bản cũ)
Bản cũ: không có lý do, không lưu đơn, giáo viên duyệt nhiều lần được, phụ huynh gửi trùng được.

1. Phụ huynh bấm **🩺 Xin nghỉ học** hoặc `/nghi`.
2. Có từ hai con → nút chọn con. Một con thì bỏ qua bước này.
3. Bot liệt kê tối đa 5 buổi sắp tới **chưa bắt đầu** của lớp con. Buổi đã có đơn chờ duyệt hoặc đã duyệt không hiện nút, ghi kèm trạng thái.
4. Chọn buổi → bot hỏi lý do, kèm 4 nút: **Ốm, sức khoẻ** · **Việc gia đình** · **Đi xa** · **Gửi không ghi lý do**. Hoặc gõ lý do (tối đa 200 ký tự) trong 15 phút.
   - Chưa chọn lý do thì đơn ở trạng thái *nháp*, giáo viên chưa thấy.
   - Quá 15 phút mà phụ huynh mới gõ chữ → coi là tin nhắn thường gửi giáo viên.
5. Đơn chuyển *chờ duyệt*. Phụ huynh nhận xác nhận kèm nút **Huỷ đơn**. Giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài của lớp (đã kết nối) nhận tin có tên con, lớp, buổi, lý do, kèm nút **✓ Duyệt** và **✕ Từ chối**. Quản trị nhận bản sao.
6. Giáo viên bấm Duyệt → kiểm quyền điểm danh, đúng cơ sở (E-072), đơn còn *chờ duyệt*. Đạt thì đơn *đã duyệt*, ghi vắng vào sổ điểm danh ngày đó, phụ huynh nhận "Đơn đã được Cô X duyệt", quản trị nhận bản sao.
7. Giáo viên khác bấm sau → "Đơn này đã được Cô X duyệt lúc 08:12", không đổi dữ liệu.
8. Từ chối → đơn *từ chối*, phụ huynh nhận tin, giáo viên sẽ liên hệ trực tiếp.
9. Phụ huynh bấm **Huỷ đơn** khi đơn còn *chờ duyệt* và buổi chưa bắt đầu → đơn *đã huỷ*, giáo viên nhận tin. Đơn đã duyệt hoặc từ chối thì báo không huỷ được, liên hệ giáo viên.
10. Phụ huynh xin lại buổi đã bị từ chối hoặc đã huỷ → mở lại đơn đó (không tạo đơn thứ hai).
11. Kiểm tra máy chủ ở mọi bước: chat là phụ huynh của học sinh, buổi thuộc lớp của học sinh, buổi chưa bắt đầu, chưa huỷ.

### 1.5 Đơn nghỉ cho giáo viên `/donnghi` (Mới)
Giáo viên gõ `/donnghi` hoặc bấm **🩺 Đơn nghỉ chờ duyệt** → danh sách đơn *chờ duyệt* của các lớp mình dạy và được làm việc ở cơ sở đó, mỗi đơn một tin kèm hai nút. Quản trị thấy mọi đơn. Không có đơn → "Không có đơn nào chờ duyệt."

### 1.6 Cài đặt nhận tin `/caidat` (Mới)
Bot gửi danh sách loại tin, mỗi dòng một nút bật/tắt (✅ đang nhận, 🔕 đã tắt). Bấm là đổi ngay và tin được vẽ lại.

| Mã | Loại tin | Mặc định |
|---|---|---|
| `schedule` | Nhắc lịch học buổi sáng | bật |
| `absence` | Báo con vắng hoặc đi trễ | bật |
| `session_change` | Buổi học bị huỷ, khôi phục, đổi giờ hoặc phòng | bật |
| `homework` | Bài tập mới, nhắc hạn nộp, con đã nộp bài | bật |
| `score` | Có điểm hoặc nhận xét mới | bật |
| `tuition` | Nhắc học phí sắp đến hạn, quá hạn | bật |
| `weekly` | Báo cáo tuần | bật |

Nút **Nhắc học phí** do nhân viên bấm trong app luôn gửi, không theo cài đặt.

### 1.7 Thông báo khi có sự kiện (Mới)
| Sự kiện (ở đâu trong app) | Người nhận | Nội dung | Chống trùng |
|---|---|---|---|
| Lưu điểm danh: con **vắng** | Phụ huynh của con (`absence`) | "Em A vắng buổi lớp X hôm nay 18:00. Nếu có nhầm lẫn, phụ huynh nhắn lại cho Thầy/Cô." Có đơn nghỉ đã duyệt thì ghi "vắng có phép", không gửi. | học sinh + ngày + trạng thái |
| Lưu điểm danh: con **đi trễ** | Phụ huynh (`absence`) | "Em A đến lớp trễ buổi ..." | như trên |
| Sửa điểm danh từ vắng sang có mặt | Phụ huynh (`absence`) | "Cập nhật: em A có mặt buổi ..." | như trên |
| Huỷ buổi (màn Lịch học) | Phụ huynh mọi học sinh của lớp (`session_change`), nhân viên của lớp | Buổi, lý do huỷ | buổi + lần sửa |
| Khôi phục buổi đã huỷ | như trên | "Buổi ... được học lại như lịch cũ" | buổi + lần sửa |
| Đổi giờ hoặc phòng buổi chưa học, trong 14 ngày tới | Phụ huynh của lớp, giáo viên mới và cũ | Giờ cũ → giờ mới, phòng cũ → phòng mới | buổi + giờ mới + phòng mới |
| Giao bài tập mới | Phụ huynh của lớp (`homework`) | Tên bài, hạn nộp, mô tả ngắn (tối đa 300 ký tự) | bài |
| Học sinh tự nộp bài ở khu học sinh | Phụ huynh (`homework`) | "Em A đã nộp bài X lúc ...", kèm điểm tự chấm nếu có | bài + học sinh + lần nộp |
| Giáo viên chấm xong (bảng chấm hoặc chấm từng câu) | Phụ huynh (`score`) | Điểm/điểm tối đa, nhận xét. Bài còn câu chưa chấm thì chưa gửi. | bài + học sinh + điểm + nhận xét |

### 1.8 Nhắc tự động theo giờ (Mới, thay bản cũ)
Bản cũ chống trùng theo chat nên phụ huynh có hai con hoặc hai buổi trong ngày chỉ nhận một nhắc.

| Việc | Giờ chạy (VN) | Người nhận | Nội dung |
|---|---|---|---|
| Nhắc lịch học | từ 6:00, buổi trong ngày chưa bắt đầu | Phụ huynh (`schedule`) | Giờ, phòng, giáo viên, chủ đề; nút **🩺 Xin nghỉ buổi này** (đi thẳng tới bước chọn lý do). Buổi có đơn nghỉ đã duyệt thì không nhắc. |
| Nhắc hạn bài | bất kỳ lúc nào, hạn trong 24 giờ tới, chưa nộp | Phụ huynh (`homework`) | Tên bài, hạn nộp |
| Học phí sắp đến hạn | từ 8:00, 3 ngày trước ngày hạn trong Cài đặt (theo cờ "Nhắc trước hạn") | Phụ huynh còn nợ (`tuition`) | Số còn thiếu, ngày hạn |
| Học phí quá hạn | từ 8:00, ngày sau ngày hạn, mỗi tháng một lần | Phụ huynh còn nợ (`tuition`) | Số còn thiếu, phí trễ hạn theo Cài đặt |
| Báo cáo tuần | Chủ nhật từ 18:00 (theo cờ "Báo cáo tuần") | Phụ huynh (`weekly`) | Mỗi con: số buổi có mặt/trễ/vắng trong tuần, bài đã nộp/chưa nộp, điểm mới, buổi tuần tới |

## 2. Giáo viên và nhân viên

| Việc | Trạng thái | Kịch bản |
|---|---|---|
| `/homnay`, `/chocham` | Có | Lịch dạy hôm nay; bài chờ chấm |
| Lịch dạy buổi sáng | Mới | Từ 6:00, giáo viên có ca dạy hôm nay nhận danh sách: lớp, giờ, phòng, số học sinh, số đơn nghỉ đã duyệt |
| Nhận đơn nghỉ, `/donnghi` | Mới | Mục 1.4, 1.5 |
| Nhắc chấm bài | Mới | Từ 8:00, bài có bài nộp chờ chấm quá 2 ngày → giáo viên của lớp, mỗi ngày một lần mỗi bài |
| Cảnh báo vắng nhiều | Mới | Sau khi lưu điểm danh: học sinh vắng 3 buổi liên tiếp gần nhất → giáo viên của lớp và quản trị (theo cờ "Cảnh báo vắng"), một lần cho mỗi chuỗi vắng |
| Học sinh nộp bài | Có | Báo giáo viên lớp (P34.9) |
| Lịch buổi bị đổi | Mới | Mục 1.7, giáo viên cũ và mới |

## 3. Quản trị

| Việc | Trạng thái | Kịch bản |
|---|---|---|
| `/baocao` | Có | Báo cáo nhanh trong ngày |
| Báo cáo cuối ngày | Mới | Từ 20:00 tự gửi, mỗi ngày một lần (trước đây chỉ gửi khi gọi cron với `?report=1`) |
| Bản sao | Có, bổ sung | Trao đổi giáo viên và phụ huynh, đơn nghỉ và kết quả, cảnh báo vắng nhiều |

## 4. Hệ thống

- **Cron** `/api/cron/telegram` gọi mỗi giờ (cron-job.org hoặc Vercel Cron gói Pro). Mỗi việc tự kiểm giờ VN; chạy lại trong cùng giờ không gửi trùng nhờ nhật ký. `?jobs=a,b` chạy đúng các việc chỉ định, bỏ qua kiểm giờ (dùng cho kiểm thử và chạy tay).
- **Gỡ endpoint gỡ lỗi** `GET /api/telegram/webhook`: không cần khoá mà trả về 10 ký tự đầu của bot token và tên các biến môi trường (Mới).
- **Webhook** nhận thêm tin danh bạ (`message.contact`) cho mục 1.2.

## 5. Đợt sau
- Màn Đơn nghỉ trong app cho giáo vụ (xem, duyệt, lọc theo lớp).
- Gửi nhận xét bài nói kèm âm thanh mẫu (35.11).
- Học bù: phụ huynh chọn buổi bù của lớp khác cùng trình độ.
- Khảo sát hài lòng cuối khoá qua nút bấm.
- Mã QR chuyển khoản học phí trong tin nhắc học phí.
