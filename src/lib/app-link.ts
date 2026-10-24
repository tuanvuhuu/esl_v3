// Liên kết mở thẳng một trang của ứng dụng trong tin nhắn bot (35.20). Cần APP_URL (ví dụ https://esl.example.vn);
// chưa đặt hoặc đặt sai thì trả chuỗi rỗng, tin nhắn không kèm liên kết.
export function appLink(path: string, base: string = process.env.APP_URL ?? ''): string {
  const root = base.trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/.test(root) ? `${root}${path}` : '';
}
