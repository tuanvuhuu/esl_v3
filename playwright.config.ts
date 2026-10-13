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
  workers: 1, // các kịch bản ghi dữ liệu chung, chạy lần lượt
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
