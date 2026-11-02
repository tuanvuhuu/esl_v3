'use client';

// Menu đổi giao diện Sáng/Tối & Màu chủ đề dùng ActionMenu + ActionList chính gốc của @primer/react v38.
import {
  BlockedIcon,
  DeviceDesktopIcon,
  ImageIcon,
  MoonIcon,
  PaintbrushIcon,
  SunIcon,
  UploadIcon,
  type Icon,
} from '@primer/octicons-react';
import { ActionList, ActionMenu, IconButton } from '@primer/react';
import { useRef, useState } from 'react';
import { BG_CUSTOM_KEY, BG_KEY } from '@/components/shell/AppBackdrop';
import { NATURE_LABEL, NATURE_SCENES } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

type Pref = 'light' | 'dark' | 'system';
type Accent = 'blue' | 'green' | 'rose' | 'violet' | 'honey';

const THEME_KEY = 'esl-theme';
const ACCENT_KEY = 'esl-primer-accent';

const OPTIONS: { value: Pref; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Sáng', icon: SunIcon },
  { value: 'dark', label: 'Tối', icon: MoonIcon },
  { value: 'system', label: 'Theo hệ thống', icon: DeviceDesktopIcon },
];

const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'blue', label: 'Xanh Primer (Mặc định)', swatch: '#0969da' },
  { value: 'green', label: 'Xanh lá GitHub', swatch: '#1f883d' },
  { value: 'rose', label: 'Đỏ cam Tsukuba', swatch: '#cf222e' },
  { value: 'violet', label: 'Tím Primer', swatch: '#8250df' },
  { value: 'honey', label: 'Hổ phách', swatch: '#b45309' },
];

const BG_CHOICES: { value: string; label: string }[] = [
  { value: 'none', label: 'Không ảnh nền (Chuẩn Primer)' },
  { value: 'auto', label: 'Tự đổi theo ngày' },
  ...NATURE_SCENES.map((s) => ({ value: s, label: NATURE_LABEL[s] })),
  { value: 'custom', label: 'Ảnh tải lên' },
];

function applyTheme(pref: Pref) {
  const root = document.documentElement;
  if (pref === 'system') {
    root.setAttribute('data-theme', 'system');
    root.setAttribute('data-color-mode', 'auto');
  } else {
    root.setAttribute('data-theme', pref);
    root.setAttribute('data-color-mode', pref);
  }
}

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  if (accent === 'blue') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
}

export function ThemeMenu() {
  const [storedTheme, setStoredTheme] = useLocalStorage(THEME_KEY, 'light');
  const [storedAccent, setStoredAccent] = useLocalStorage(ACCENT_KEY, 'blue');
  const pref: Pref = storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light';
  const accent: Accent = ACCENTS.find((a) => a.value === storedAccent)?.value ?? 'blue';
  const [storedBg, setStoredBg] = useLocalStorage(BG_KEY, 'none');
  const [storedCustom, setStoredCustom] = useLocalStorage(BG_CUSTOM_KEY, '');
  const [bgError, setBgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function chooseTheme(next: Pref) {
    setStoredTheme(next);
    applyTheme(next);
  }

  function chooseAccent(next: Accent) {
    setStoredAccent(next);
    applyAccent(next);
  }

  async function uploadBackground(file: File) {
    setBgError(null);
    if (!file.type.startsWith('image/')) return setBgError('Chỉ nhận tệp ảnh (JPEG, PNG, WebP).');
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.85);
      setStoredCustom(data);
      if (localStorage.getItem(BG_CUSTOM_KEY) !== data) return setBgError('Ảnh quá lớn để lưu trong trình duyệt, thử ảnh khác.');
      setStoredBg('custom');
    } catch {
      setBgError('Không đọc được ảnh này.');
    }
  }

  function chooseBackground(value: string) {
    if (value === 'custom' && !storedCustom) {
      fileRef.current?.click();
      return;
    }
    setBgError(null);
    setStoredBg(value);
  }

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[0];

  return (
    <div className="relative shrink-0">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void uploadBackground(file);
        }}
      />
      <ActionMenu>
        <ActionMenu.Anchor>
          <IconButton
            icon={current.icon}
            variant="invisible"
            unsafeDisableTooltip
            aria-label={`Giao diện: ${current.label}`}
            className="!size-[var(--icon-h)] max-[767px]:!size-[var(--icon-h-touch)]"
          />
        </ActionMenu.Anchor>
        <ActionMenu.Overlay align="end" width="medium">
          <ActionList selectionVariant="single">
            <ActionList.Group>
              <ActionList.GroupHeading>Chế độ hiển thị</ActionList.GroupHeading>
              {OPTIONS.map((o) => {
                const IconComp = o.icon;
                return (
                  <ActionList.Item key={o.value} selected={o.value === pref} onSelect={() => chooseTheme(o.value)}>
                    <ActionList.LeadingVisual>
                      <IconComp size={16} />
                    </ActionList.LeadingVisual>
                    {o.label}
                  </ActionList.Item>
                );
              })}
            </ActionList.Group>

            <ActionList.Divider />

            <ActionList.Group>
              <ActionList.GroupHeading>
                <span className="inline-flex items-center gap-1.5">
                  <PaintbrushIcon size={13} />
                  Màu chủ đề
                </span>
              </ActionList.GroupHeading>
              {ACCENTS.map((a) => (
                <ActionList.Item key={a.value} selected={a.value === accent} onSelect={() => chooseAccent(a.value)}>
                  <ActionList.LeadingVisual>
                    <span className="inline-block size-3.5 rounded-full border border-black/15" style={{ backgroundColor: a.swatch }} />
                  </ActionList.LeadingVisual>
                  {a.label}
                </ActionList.Item>
              ))}
            </ActionList.Group>

            <ActionList.Divider />

            <ActionList.Group>
              <ActionList.GroupHeading>
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  Ảnh nền
                </span>
              </ActionList.GroupHeading>
              {BG_CHOICES.map((c) => (
                <ActionList.Item key={c.value} selected={c.value === storedBg} onSelect={() => chooseBackground(c.value)}>
                  <ActionList.LeadingVisual>
                    {c.value === 'none' ? <BlockedIcon size={14} /> : <ImageIcon size={14} />}
                  </ActionList.LeadingVisual>
                  {c.label}
                </ActionList.Item>
              ))}
              <ActionList.Item onSelect={() => fileRef.current?.click()}>
                <ActionList.LeadingVisual>
                  <UploadIcon size={14} />
                </ActionList.LeadingVisual>
                Tải ảnh nền từ máy…
              </ActionList.Item>
            </ActionList.Group>
          </ActionList>
          {bgError && (
            <p role="alert" className="px-3 pb-2 text-xs text-[var(--fgColor-danger)]">
              {bgError}
            </p>
          )}
        </ActionMenu.Overlay>
      </ActionMenu>
    </div>
  );
}
