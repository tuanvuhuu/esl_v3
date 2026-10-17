import { spawnSync } from 'node:child_process';

// Bảng map các task vừa hoàn thành với test tương ứng (Vitest và/hoặc Playwright)
// Giúp chỉ chạy test cho task cụ thể mà không phải chạy all test suite (tiết kiệm thời gian)
export const TASK_MAP = {
  '15.3': {
    name: 'Trang Học sinh chuẩn tham chiếu & đo kích thước token',
    e2e: 'e2e/chuan.spec.ts',
  },
  '15.4': {
    name: 'Phụ huynh: sửa qua modal, xoá, kiểm tra trùng số',
    e2e: 'e2e/catalog.spec.ts',
    grep: 'phụ huynh: thêm, sửa',
  },
  '15.6': {
    name: 'Điểm danh: thanh hành động dính dưới mobile & đếm có mặt',
    e2e: 'e2e/work.spec.ts',
    grep: 'điểm danh: có mặt cả lớp',
  },
  '15.8': {
    name: 'Chuẩn giao diện toàn diện: mọi route, modal dialog, profile',
    e2e: 'e2e/chuan.spec.ts',
  },
  '18.5': {
    name: 'Bài giảng & tài liệu đa cơ sở',
    vitest: 'tests/unit/lesson-validation.test.ts',
    e2e: 'e2e/work.spec.ts',
    grep: 'bài giảng: tạo cho cơ sở',
  },
  '22.7': {
    name: 'Mở rộng nghiên cứu giảng dạy (rubric, kỹ năng, ngưỡng, tệp)',
    vitest: 'tests/unit/assignment-scoring.test.ts tests/unit/skill-stats.test.ts tests/unit/level-rule.test.ts',
  },
  '25': {
    name: 'P25. Bài giảng và tài liệu (25.1, 25.2, 25.3)',
    vitest: 'tests/unit/lesson-validation.test.ts',
    e2e: 'e2e/work.spec.ts',
    grep: 'bài giảng: tạo cho cơ sở',
  },
  '25.1': { alias: '25' },
  '25.2': { alias: '25' },
  '25.3': { alias: '25' },
  '27.1': {
    name: 'Chọn trình độ CEFR cho lớp học trong form Tạo/Sửa lớp',
    vitest: 'tests/unit/class-validation.test.ts',
    e2e: 'e2e/catalog.spec.ts',
    grep: 'chọn trình độ CEFR',
  },
  '27': { alias: '27.1' },
  '28': {
    name: 'P28. Cổng học sinh trực tuyến (28.1 - 28.4)',
    vitest: 'tests/unit/student-access.test.ts tests/unit/student-account.test.ts',
    e2e: 'e2e/work.spec.ts',
    grep: 'cổng học sinh: tạo tài khoản',
  },
  '28.1': { alias: '28' },
  '28.2': { alias: '28' },
  '28.3': { alias: '28' },
  '28.4': { alias: '28' },
  '30.2': {
    name: 'Mật khẩu ban đầu esl123 cho nhân viên mới & học sinh',
    vitest: 'tests/unit/student-account.test.ts',
    e2e: 'e2e/auth.spec.ts',
    grep: 'mật khẩu mặc định esl123',
  },
  '32.3': {
    name: 'Phân quyền cơ sở: Server Action chặn ngoài phạm vi',
    vitest: 'tests/unit/campus.test.ts',
    e2e: 'e2e/work.spec.ts',
    grep: 'phân quyền theo cơ sở',
  },
};

// Danh sách các task vừa hoàn thành
export const RECENT_TASK_KEYS = [
  '15.3', '15.4', '15.6', '15.8', '18.5', '22.7', '25', '27.1', '28', '30.2', '32.3'
];

function resolveTask(key) {
  let task = TASK_MAP[key];
  while (task && task.alias) {
    task = TASK_MAP[task.alias];
  }
  return task;
}

function runCommand(cmd, env = {}) {
  console.log(`\n\x1b[36m> ${cmd}\x1b[0m`);
  const res = spawnSync(cmd, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) {
    console.error(`\x1b[31m❌ Lệnh thất bại (mã thoát ${res.status}): ${cmd}\x1b[0m`);
    return false;
  }
  return true;
}

function runTaskTest(key) {
  const task = resolveTask(key);
  if (!task) {
    console.error(`\x1b[31mKhông tìm thấy định nghĩa test cho task "${key}".\x1b[0m`);
    return false;
  }

  console.log(`\n\x1b[32m============================================================\x1b[0m`);
  console.log(`\x1b[32m🎯 Chạy test cho Task ${key}: ${task.name}\x1b[0m`);
  console.log(`\x1b[32m============================================================\x1b[0m`);

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
  let ok = true;

  if (task.vitest) {
    console.log(`\n\x1b[33m--- Chạy Unit Test (Vitest) ---\x1b[0m`);
    const vitestCmd = `npx vitest run ${task.vitest}`;
    if (!runCommand(vitestCmd)) ok = false;
  }

  if (task.e2e) {
    console.log(`\n\x1b[33m--- Chạy E2E Test (Playwright) ---\x1b[0m`);
    const grepFlag = task.grep ? ` -g "${task.grep}"` : '';
    const pwCmd = `npx playwright test ${task.e2e}${grepFlag} --no-deps`;
    if (!runCommand(pwCmd, { E2E_BASE_URL: baseUrl })) ok = false;
  }

  return ok;
}

const arg = process.argv[2]?.trim();

if (!arg || arg === '--help' || arg === '-h') {
  console.log(`\n\x1b[1mHướng dẫn chạy test riêng cho từng task:\x1b[0m`);
  console.log(`Cú pháp: npm run test:task <mã-task>   (hoặc node scripts/test-task.mjs <mã-task>)`);
  console.log(`Chạy toàn bộ các task vừa hoàn thành: npm run test:recent\n`);
  console.log(`\x1b[1mDanh sách các task vừa hoàn thành [🆕 VỪA HOÀN THÀNH]:\x1b[0m`);
  for (const k of RECENT_TASK_KEYS) {
    const t = TASK_MAP[k];
    console.log(`  - \x1b[33m${k.padEnd(6)}\x1b[0m : ${t.name}`);
  }
  console.log(`\nVí dụ:`);
  console.log(`  npm run test:task 30.2   -> Chạy test mật khẩu esl123`);
  console.log(`  npm run test:task 15.6   -> Chạy test điểm danh mobile sticky bar`);
  console.log(`  npm run test:task 15.8   -> Chạy test chuẩn giao diện mọi trang & dialog`);
  console.log(`  npm run test:recent      -> Chạy toàn bộ test của các task vừa xong`);
  process.exit(0);
}

if (arg === 'recent' || arg === 'all-recent') {
  console.log(`\n\x1b[1m🚀 Đang chạy kiểm thử cho TOÀN BỘ ${RECENT_TASK_KEYS.length} task vừa hoàn thành...\x1b[0m`);
  let failed = 0;
  for (const k of RECENT_TASK_KEYS) {
    const success = runTaskTest(k);
    if (!success) failed++;
  }
  if (failed > 0) {
    console.error(`\n\x1b[31m❌ Có ${failed} task gặp lỗi khi kiểm thử.\x1b[0m`);
    process.exit(1);
  } else {
    console.log(`\n\x1b[32m🎉 Tất cả ${RECENT_TASK_KEYS.length} task vừa hoàn thành đều test XANH 100%!\x1b[0m`);
    process.exit(0);
  }
}

const success = runTaskTest(arg);
process.exit(success ? 0 : 1);
