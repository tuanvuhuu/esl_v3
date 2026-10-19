// Tài khoản học thử (vào thẳng bài học, không cần mật khẩu). Dùng được ở cả server và giao diện.
// Tắt bằng DEMO_LOGIN=off trong biến môi trường.
export const DEMO_STUDENT_EMAIL = 'hoc-thu@demo.esl-center.vn';
export const DEMO_CAMPUS_NAME = 'Cơ sở học thử';
export const DEMO_CLASS_NAME = 'HOC-THU';

export function demoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN !== 'off';
}

export function isDemoAccount(email: string): boolean {
  return email === DEMO_STUDENT_EMAIL;
}
