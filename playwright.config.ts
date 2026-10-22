import { defineConfig, devices } from '@playwright/test';
import { loadEnvLocal } from './e2e/env';

// Kiểm thử đầu cuối trên máy dev. Đọc .env.local để lấy mật khẩu tài khoản mẫu.
// Trình duyệt: đặt E2E_CHROME_PATH nếu đã có Chromium trên máy, hoặc chạy "npx playwright install chromium".
loadEnvLocal();

const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts/,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 4, // spec chỉ đọc chạy song song; spec ghi dữ liệu xếp chuỗi (xem projects)
  globalTeardown: './e2e/global-teardown.ts', // dọn dữ liệu thử "E2E" sau mỗi lần chạy
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
    launchOptions: process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : {},
  },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  // Spec chỉ đọc (bố cục, thanh tab, đăng nhập) chạy song song với chuỗi spec ghi dữ liệu.
  // Các spec ghi dữ liệu nối tiếp qua dependencies để không tranh nhau bản ghi dùng chung.
  projects: [
    // Mọi spec không thuộc chuỗi ghi dữ liệu (students, catalog, work) là spec chỉ đọc, chạy song song
    { name: 'read', testMatch: /^(?!.*[\\/](students|catalog|work|telegram)\.spec\.ts$).*\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
    { name: 'students', testMatch: /students\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'catalog', testMatch: /catalog\.spec\.ts/, dependencies: ['students'], use: { ...devices['Desktop Chrome'] } },
    { name: 'work', testMatch: /(work|telegram)\.spec\.ts/, dependencies: ['catalog'], use: { ...devices['Desktop Chrome'] } },
  ],
});
