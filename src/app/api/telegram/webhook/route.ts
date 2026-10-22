// Telegram gọi vào đây mỗi khi có tin nhắn gửi cho bot (P34). Không cần đăng nhập, nhưng phải đúng mã bí mật:
// Telegram gửi lại mã đã đặt lúc setWebhook trong header X-Telegram-Bot-Api-Secret-Token.
import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';
import { webhookSecret } from '@/lib/telegram/api';
import { handleCallbackQuery, handleIncoming } from '@/lib/telegram/service';

type Update = {
  message?: {
    chat?: { id?: number; type?: string };
    from?: { id?: number; first_name?: string; last_name?: string; username?: string; is_bot?: boolean };
    text?: string;
    // Danh bạ gửi bằng nút "Chia sẻ số điện thoại" (kịch bản 1.2)
    contact?: { phone_number?: string; user_id?: number };
    reply_to_message?: {
      message_id?: number;
      text?: string;
    };
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name?: string; last_name?: string; username?: string };
    message?: { message_id?: number; chat?: { id?: number } };
    data?: string;
  };
};

function sameSecret(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  await connection();
  const secret = webhookSecret();
  if (!secret || !sameSecret(request.headers.get('x-telegram-bot-api-secret-token'), secret)) {
    return new Response('Không có quyền', { status: 401 });
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return new Response('ok');
  }

  // Xử lý khi người dùng bấm nút Inline Keyboard
  const cb = update.callback_query;
  const cbChatId = cb?.message?.chat?.id;
  const cbData = cb?.data;
  if (cb?.id && cbData && typeof cbChatId === 'number') {
    const fromName = [cb.from?.first_name, cb.from?.last_name].filter(Boolean).join(' ') || cb.from?.username || '';
    try {
      await handleCallbackQuery({
        id: cb.id,
        chatId: cbChatId,
        data: cbData,
        fromName,
        messageId: cb.message?.message_id,
      });
    } catch (error) {
      console.error('Lỗi xử lý callback query:', error);
    }
    return new Response('ok');
  }

  const message = update.message;
  // Chỉ xử lý tin chữ và danh bạ trong chat riêng với bot. Nhóm, kênh, ảnh, tệp thì bỏ qua.
  const contact = message?.contact?.phone_number ? { phone: message.contact.phone_number, userId: message.contact.user_id } : undefined;
  if ((!message?.text && !contact) || message?.chat?.type !== 'private' || typeof message.chat.id !== 'number' || message.from?.is_bot) {
    return new Response('ok');
  }
  const fromName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || message.from?.username || '';
  try {
    await handleIncoming({
      chatId: message.chat.id,
      text: (message.text ?? '').slice(0, 4000),
      fromName,
      fromId: message.from?.id,
      contact,
      replyToText: message.reply_to_message?.text,
    });
  } catch (error) {
    // Vẫn trả 200 để Telegram không gửi lại cùng một tin nhiều lần
    console.error('Lỗi xử lý tin Telegram:', error);
  }
  return new Response('ok');
}
