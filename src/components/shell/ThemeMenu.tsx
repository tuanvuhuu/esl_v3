'use client';

import {
  BlockedIcon,
  CheckIcon,
  DeviceDesktopIcon,
  ImageIcon,
  MoonIcon,
  PaintbrushIcon,
  SunIcon,
  TriangleDownIcon,
  UploadIcon,
  type Icon,
} from '@primer/octicons-react';
import { useEffect, useRef, useState } from 'react';
import { BG_CUSTOM_KEY, BG_KEY } from '@/components/shell/AppBackdrop';
import { NATURE_LABEL, NATURE_SCENES, NatureSvg, natureSceneFor } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

type Pref = 'light' | 'dark' | 'system';
type Accent = 'honey' | 'green' | 'blue' | 'violet' | 'rose';

const THEME_KEY = 'esl-theme';
const ACCENT_KEY = 'esl-accent';

const OPTIONS: { value: Pref; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Sáng', icon: SunIcon },
  { value: 'dark', label: 'Tối', icon: MoonIcon },
  { value: 'system', label: 'Theo hệ thống', icon: DeviceDesktopIcon },
];

const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'honey', label: 'Vàng mật', swatch: '#F0B73A' },
  { value: 'green', label: 'Xanh lá', swatch: '#2E9E68' },
  { value: 'blue', label: 'Xanh dương', swatch: '#3B7BE0' },
  { value: 'violet', label: 'Tím', swatch: '#7A5AD6' },
  { value: 'rose', label: 'Hồng', swatch: '#D1557F' },
];

const BG_CHOICES: { value: string; label: string }[] = [
  { value: 'auto', label: 'Tự đổi' },
  ...NATURE_SCENES.map((s) => ({ value: s, label: NATURE_LABEL[s] })),
  { value: 'custom', label: 'Của tôi' },
  { value: 'none', label: 'Không' },
];

// Đồng bộ cả data-theme (ESL Center) lẫn data-color-mode (@primer/primitives).
function applyTheme(pref: Pref) {
  const root = document.documentElement;
  if (pref === 'system') {
    root.removeAttribute('data-theme');
    root.setAttribute('data-color-mode', 'auto');
  } else {
    root.setAttribute('data-theme', pref);
    root.setAttribute('data-color-mode', pref);
  }
}

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  if (accent === 'honey') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
}

export function ThemeMenu() {
  const [storedTheme, setStoredTheme] = useLocalStorage(THEME_KEY, 'system');
  const [storedAccent, setStoredAccent] = useLocalStorage(ACCENT_KEY, 'honey');
  const pref: Pref = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system';
  const accent: Accent = ACCENTS.find((a) => a.value === storedAccent)?.value ?? 'honey';
  const [storedBg, setStoredBg] = useLocalStorage(BG_KEY, 'auto');
  const [storedCustom, setStoredCustom] = useLocalStorage(BG_CUSTOM_KEY, '');
  const [bgError, setBgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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

  const current = OPTIONS.find((o) => o.value === pref) ?? OPTIONS[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Giao diện: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] transition-colors hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)] max-[767px]:size-[var(--icon-h-touch)] min-[768px]:inline-flex min-[768px]:h-[var(--ctl-h)] min-[768px]:w-auto min-[768px]:gap-1 min-[768px]:px-2"
      >
        <CurrentIcon size={16} aria-hidden />
        <TriangleDownIcon size={12} className="hidden text-[var(--fgColor-muted)] min-[768px]:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Giao diện"
          className="absolute right-0 top-[calc(100%+8px)] z-[90] min-w-[296px] rounded-xl border border-[var(--borderColor-default)] bg-[var(--overlay-bgColor)] p-1.5 shadow-[var(--shadow-floating-large,var(--lift))]"
        >
          {OPTIONS.map((o) => {
            const IconComp = o.icon;
            const selected = o.value === pref;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => chooseTheme(o.value)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--borderRadius-small)] px-2.5 py-2 text-left text-sm font-medium text-[var(--fgColor-default)] transition-colors hover:bg-[var(--bgColor-muted)] ${
                  selected ? 'bg-[var(--bgColor-accent-muted)] font-semibold' : ''
                }`}
              >
                <IconComp size={16} className="text-[var(--fgColor-muted)]" aria-hidden />
                <span className="flex-1">{o.label}</span>
                {selected && <CheckIcon size={16} className="text-[var(--fgColor-accent)]" aria-hidden />}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-[var(--borderColor-muted)]" role="separator" />

          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">
            <PaintbrushIcon size={14} aria-hidden />
            <span>Màu chủ đề</span>
          </div>
          <div role="group" aria-label="Màu chủ đề" className="flex flex-wrap gap-1.5 px-1.5 pb-1">
            {ACCENTS.map((a) => {
              const selected = a.value === accent;
              return (
                <button
                  key={a.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => chooseAccent(a.value)}
                  className={`grid size-8 place-items-center rounded-full transition-transform hover:scale-110 ${
                    selected ? 'ring-2 ring-[var(--fgColor-default)] ring-offset-2 ring-offset-[var(--bgColor-default)]' : ''
                  }`}
                  style={{ backgroundColor: a.swatch }}
                >
                  {selected && <CheckIcon size={14} className="text-white" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="my-1.5 border-t border-[var(--borderColor-muted)]" role="separator" />

          <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">
            <ImageIcon size={14} aria-hidden />
            <span>Ảnh nền</span>
          </div>
          <div role="group" aria-label="Ảnh nền" className="grid grid-cols-4 gap-1.5 px-1.5 pb-1">
            {BG_CHOICES.map((c) => {
              const selected = c.value === storedBg;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => chooseBackground(c.value)}
                  className={`flex min-w-0 flex-col gap-1 rounded-[var(--borderRadius-small)] p-1 text-left transition-colors hover:bg-[var(--bgColor-muted)] ${
                    selected ? 'bg-[var(--bgColor-accent-muted)]' : ''
                  }`}
                >
                  <span
                    className={`block h-9 w-full overflow-hidden rounded border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] ${
                      selected ? 'ring-2 ring-[var(--fgColor-default)] ring-offset-1 ring-offset-[var(--bgColor-default)]' : ''
                    }`}
                  >
                    {c.value === 'none' ? (
                      <span className="grid size-full place-items-center text-[var(--fgColor-muted)]">
                        <BlockedIcon size={14} aria-hidden />
                      </span>
                    ) : c.value === 'custom' ? (
                      storedCustom ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL
                        <img src={storedCustom} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-[var(--fgColor-muted)]">
                          <UploadIcon size={14} aria-hidden />
                        </span>
                      )
                    ) : (
                      <NatureSvg scene={c.value === 'auto' ? natureSceneFor(new Date().getDay()) : (c.value as keyof typeof NATURE_LABEL)} />
                    )}
                  </span>
                  <span className="truncate text-[11px] font-medium leading-tight text-[var(--fgColor-muted)]">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--fgColor-link)] underline underline-offset-4"
            >
              <UploadIcon size={13} aria-hidden />
              Tải ảnh lên
            </button>
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
          </div>
          {bgError && (
            <p role="alert" className="px-2.5 pb-1.5 text-xs text-[var(--fgColor-danger)]">
              {bgError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
