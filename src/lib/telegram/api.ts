// Gọi Telegram Bot API. Chỉ chạy trên server. Token chỉ nằm trong biến môi trường, không gửi xuống trình duyệt.
// Chưa đặt TELEGRAM_BOT_TOKEN (máy dev, E2E) thì không gọi mạng: tin vẫn được lưu nhưng ghi là chưa gửi.

const API = 'https://api.telegram.org';

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function botUsername(): string | null {
  return (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '') || null;
}

export function webhookSecret(): string | null {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

type ApiResult<T> = { ok: true; result: T } | { ok: false; description: string };

async function call<T>(method: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  const token = botToken();
  if (!token) return { ok: false, description: 'Chưa cấu hình TELEGRAM_BOT_TOKEN' };
  try {
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
    return data.ok ? { ok: true, result: data.result as T } : { ok: false, description: data.description ?? `HTTP ${response.status}` };
  } catch (error) {
    // Không ghi token vào log: chỉ ghi tên phương thức và lỗi
    console.error(`Lỗi gọi Telegram ${method}:`, error instanceof Error ? error.message : error);
    return { ok: false, description: 'Không kết nối được Telegram' };
  }
}

// Gửi tin dạng chữ thường (không bật HTML/Markdown, để nội dung do người dùng gõ không phá định dạng)
export async function sendMessage(chatId: number, text: string): Promise<boolean> {
  const result = await call('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true });
  return result.ok;
}

export async function setWebhook(url: string, secret: string): Promise<ApiResult<boolean>> {
  return call<boolean>('setWebhook', { url, secret_token: secret, allowed_updates: ['message'], drop_pending_updates: true });
}

export async function getMe(): Promise<ApiResult<{ username: string; first_name: string }>> {
  return call('getMe', {});
}

export async function getWebhookInfo(): Promise<ApiResult<{ url: string; pending_update_count: number; last_error_message?: string }>> {
  return call('getWebhookInfo', {});
}
