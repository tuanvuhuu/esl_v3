// Gọi Telegram Bot API. Chỉ chạy trên server. Token chỉ nằm trong biến môi trường, không gửi xuống trình duyệt.
// Chưa đặt TELEGRAM_BOT_TOKEN (máy dev, E2E) thì không gọi mạng: tin vẫn được lưu nhưng ghi là chưa gửi.

const API = 'https://api.telegram.org';

export function botToken(): string | null {
  const raw =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    process.env.BOT_TOKEN ||
    '';
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function botUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME || process.env.BOT_USERNAME || '';
  return raw.replace(/^@/, '').trim() || null;
}

export function webhookSecret(): string | null {
  const raw = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  return raw.length >= 16 ? raw : null;
}

// retryable: lỗi tạm thời (mạng, Telegram quá tải 429, lỗi 5xx), thử lại sau được. Lỗi 400/403 (chat không tồn tại,
// người dùng chặn bot) thì thử lại cũng vô ích.
type ApiResult<T> = { ok: true; result: T } | { ok: false; description: string; retryable?: boolean };

async function call<T>(method: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  const token = botToken();
  if (!token) {
    console.error('❌ Lỗi gọi Telegram: Thiếu TELEGRAM_BOT_TOKEN trong biến môi trường!');
    return { ok: false, description: 'Chưa cấu hình TELEGRAM_BOT_TOKEN', retryable: false };
  }
  try {
    const response = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) {
      console.error(`❌ Telegram ${method} thất bại:`, data.description ?? `HTTP ${response.status}`);
    }
    return data.ok
      ? { ok: true, result: data.result as T }
      : { ok: false, description: data.description ?? `HTTP ${response.status}`, retryable: response.status === 429 || response.status >= 500 };
  } catch (error) {
    // Không ghi token vào log: chỉ ghi tên phương thức và lỗi
    console.error(`❌ Lỗi mạng khi gọi Telegram ${method}:`, error instanceof Error ? error.message : error);
    return { ok: false, description: 'Không kết nối được Telegram', retryable: true };
  }
}

export type SendOutcome = { ok: boolean; retryable: boolean; blocked: boolean };

// Gửi tin và cho biết lỗi có nên thử lại không, người dùng có chặn bot không (để ngừng gửi cho chat đó)
export async function sendMessageDetailed(chatId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<SendOutcome> {
  const body: Record<string, unknown> = { chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const result = await call('sendMessage', body);
  if (result.ok) return { ok: true, retryable: false, blocked: false };
  const blocked = /bot was blocked|user is deactivated|bot was kicked/i.test(result.description);
  return { ok: false, retryable: result.retryable ?? false, blocked };
}

// Gửi ảnh PNG kèm chú thích (tối đa 1024 ký tự). Ảnh tải lên trực tiếp (multipart), không qua đường dẫn công khai.
export async function sendPhotoDetailed(chatId: number, png: Uint8Array, caption: string): Promise<SendOutcome> {
  const token = botToken();
  if (!token) {
    console.error('❌ Lỗi gọi Telegram: Thiếu TELEGRAM_BOT_TOKEN trong biến môi trường!');
    return { ok: false, retryable: false, blocked: false };
  }
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption.slice(0, 1024));
  form.append('photo', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'qr.png');
  try {
    const response = await fetch(`${API}/bot${token}/sendPhoto`, { method: 'POST', body: form, signal: AbortSignal.timeout(15_000) });
    const data = (await response.json()) as { ok: boolean; description?: string };
    if (data.ok) return { ok: true, retryable: false, blocked: false };
    console.error('❌ Telegram sendPhoto thất bại:', data.description ?? `HTTP ${response.status}`);
    return { ok: false, retryable: response.status === 429 || response.status >= 500, blocked: /bot was blocked|user is deactivated|bot was kicked/i.test(data.description ?? '') };
  } catch (error) {
    console.error('❌ Lỗi mạng khi gọi Telegram sendPhoto:', error instanceof Error ? error.message : error);
    return { ok: false, retryable: true, blocked: false };
  }
}

// Gửi tin dạng chữ thường (không bật HTML/Markdown, để nội dung do người dùng gõ không phá định dạng)
export async function sendMessage(chatId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const result = await call('sendMessage', body);
  return result.ok;
}

// Sửa lại chữ và nút của một tin bot đã gửi (vẽ lại tin cài đặt khi phụ huynh bấm bật/tắt)
export async function editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: Record<string, unknown>): Promise<boolean> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text: text.slice(0, 4000), disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const result = await call('editMessageText', body);
  return result.ok;
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
  const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  const result = await call('answerCallbackQuery', body);
  return result.ok;
}

export async function setWebhook(url: string, secret: string): Promise<ApiResult<boolean>> {
  return call<boolean>('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}

export async function getMe(): Promise<ApiResult<{ username: string; first_name: string }>> {
  return call('getMe', {});
}

export async function setMyCommands(
  commands: { command: string; description: string }[],
): Promise<ApiResult<boolean>> {
  return call<boolean>('setMyCommands', { commands });
}

export async function getWebhookInfo(): Promise<ApiResult<{ url: string; pending_update_count: number; last_error_message?: string }>> {
  return call('getWebhookInfo', {});
}


