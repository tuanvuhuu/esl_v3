// Loại tệp chọn trên máy khi tải lên (client được dùng). Khớp với ALLOWED_TYPES ở src/lib/storage.ts, máy chủ vẫn kiểm lại.
export const UPLOAD_ACCEPT = 'audio/*,application/pdf,image/png,image/jpeg,text/plain,.docx';

// Âm thanh của câu hỏi (đề nghe)
export const AUDIO_ACCEPT = 'audio/*';

// Hình ảnh câu hỏi và đáp án tranh (P35)
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
