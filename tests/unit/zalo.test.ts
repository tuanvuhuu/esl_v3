import { describe, expect, it } from 'vitest';
import { zaloUrl } from '@/lib/zalo';

describe('đường dẫn Zalo', () => {
  it('đổi số về dạng 0xxxxxxxxx và bỏ ký tự thừa', () => {
    expect(zaloUrl('0912 345 678')).toBe('https://zalo.me/0912345678');
    expect(zaloUrl('+84 912-345-678')).toBe('https://zalo.me/0912345678');
    expect(zaloUrl('84912345678')).toBe('https://zalo.me/0912345678');
  });

  it('không tạo đường dẫn cho số sai', () => {
    expect(zaloUrl('358965509')).toBeNull();
    expect(zaloUrl('')).toBeNull();
    expect(zaloUrl('abc')).toBeNull();
  });
});
