'use client';

// Bảng chọn Giao diện (Sáng/Tối, Màu chủ đề dạng chấm tròn, Ảnh nền dạng ô xem trước trực quan) — 100% Primer Octicons.
import {
  BlockedIcon,
  CheckIcon,
  ChevronDownIcon,
  DeviceDesktopIcon,
  ImageIcon,
  MoonIcon,
  PaintbrushIcon,
  SunIcon,
  UploadIcon,
  type Icon,
} from '@primer/octicons-react';
import { useEffect, useRef, useState } from 'react';
import { BG_CUSTOM_KEY, BG_KEY } from '@/components/shell/AppBackdrop';
import { NATURE_LABEL, NATURE_SCENES, NatureSvg, natureSceneFor } from '@/components/ui/NatureBanner';
import { useLocalStorage } from '@/lib/use-local-storage';

type Pref = 'light' | 'dark' | 'system';
type Accent = 'tsukuba' | 'blue' | 'green' | 'rose' | 'violet' | 'honey';

const THEME_KEY = 'esl-theme';
const ACCENT_KEY = 'esl-accent-v2';

const OPTIONS: { value: Pref; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Sáng', icon: SunIcon },
  { value: 'dark', label: 'Tối', icon: MoonIcon },
  { value: 'system', label: 'Theo hệ thống', icon: DeviceDesktopIcon },
];

const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: 'tsukuba', label: 'Cam đỏ Tsukuba', swatch: '#d93b0e' },
  { value: 'blue', label: 'Xanh Primer', swatch: '#0969da' },
  { value: 'green', label: 'Xanh lá GitHub', swatch: '#1f883d' },
  { value: 'rose', label: 'Đỏ thẫm', swatch: '#cf222e' },
  { value: 'violet', label: 'Tím Primer', swatch: '#8250df' },
  { value: 'honey', label: 'Hổ phách', swatch: '#b45309' },
];

const BG_CHOICES: { value: string; label: string }[] = [
  { value: 'none', label: 'Không' },
  { value: 'auto', label: 'Tự đổi' },
  ...NATURE_SCENES.map((s) => ({ value: s, label: NATURE_LABEL[s] })),
  { value: 'custom', label: 'Của tôi' },
];

function runWithViewTransition(fn: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(fn);
  } else {
    fn();
  }
}

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
  if (accent === 'tsukuba') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
}

export function ThemeMenu() {
  const [storedTheme, setStoredTheme] = useLocalStorage(THEME_KEY, 'light');
  const [storedAccent, setStoredAccent] = useLocalStorage(ACCENT_KEY, 'tsukuba');
  const pref: Pref = storedTheme === 'dark' || storedTheme === 'system' ? storedTheme : 'light';
  const accent: Accent = ACCENTS.find((a) => a.value === storedAccent)?.value ?? 'tsukuba';
  const [storedBg, setStoredBg] = useLocalStorage(BG_KEY, 'none');
  const [storedCustom, setStoredCustom] = useLocalStorage(BG_CUSTOM_KEY, '');
  const [bgError, setBgError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    runWithViewTransition(() => {
      setStoredTheme(next);
      applyTheme(next);
    });
  }

  function chooseAccent(next: Accent) {
    runWithViewTransition(() => {
      setStoredAccent(next);
      applyAccent(next);
    });
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
  const CurrentIcon = current.icon;

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Giao diện: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] text-[var(--primary-deep)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] max-[767px]:size-[var(--icon-h-touch)] min-[768px]:inline-flex min-[768px]:h-[var(--ctl-h)] min-[768px]:w-auto min-[768px]:items-center min-[768px]:gap-1.5 min-[768px]:px-2"
      >
        <CurrentIcon size={16} className="text-[var(--primary)]" aria-hidden />
        <span className="hidden size-2 rounded-full bg-[var(--primary)] ring-1 ring-black/10 min-[768px]:inline-block" aria-hidden />
        <ChevronDownIcon size={12} className="hidden text-[var(--fgColor-muted)] min-[768px]:block" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Giao diện"
          className="tsukuba-rise absolute right-0 top-[calc(100%+8px)] z-[90] w-[308px] rounded-[var(--radius-panel)] border border-[var(--menu-border)] bg-[var(--glass)] p-2 shadow-[var(--lift)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-0.5">
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
                  className={`flex h-8 w-full items-center gap-2.5 rounded-[var(--radius-ctl)] px-2.5 text-left text-[13px] transition-colors max-[767px]:h-9 ${
                    selected
                      ? 'bg-[var(--primary-soft)] font-semibold text-[var(--primary-deep)]'
                      : 'font-medium text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]'
                  }`}
                >
                  <IconComp size={15} className={selected ? 'text-[var(--primary)]' : 'text-[var(--fgColor-muted)]'} aria-hidden />
                  <span className="flex-1">{o.label}</span>
                  {selected && <CheckIcon size={15} className="text-[var(--primary)]" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-[var(--borderColor-muted)]" role="separator" />

          <div className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--fgColor-muted)]">
            <PaintbrushIcon size={13} aria-hidden />
            <span>Màu chủ đề</span>
          </div>
          <div role="group" aria-label="Màu chủ đề" className="flex flex-wrap items-center gap-2 px-2 pb-1">
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
                  className={`grid size-8 place-items-center rounded-full transition-transform hover:scale-110 max-[767px]:size-9 ${
                    selected ? 'ring-2 ring-[var(--fgColor-default)] ring-offset-2 ring-offset-[var(--bgColor-default)]' : ''
                  }`}
                  style={{ backgroundColor: a.swatch }}
                >
                  {selected && <CheckIcon size={15} className="text-white" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-[var(--borderColor-muted)]" role="separator" />

          <div className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--fgColor-muted)]">
            <ImageIcon size={13} aria-hidden />
            <span>Ảnh nền</span>
          </div>
          <div role="group" aria-label="Ảnh nền" className="grid grid-cols-4 gap-1.5 px-1.5 pb-1">
            {BG_CHOICES.map((c) => {
              const selected = c.value === storedBg;
              return (
                <button
                  key={c.value}
                  type="button"
                  data-card="true"
                  role="menuitemradio"
                  aria-checked={selected}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => chooseBackground(c.value)}
                  className={`flex min-w-0 flex-col gap-1 rounded-[var(--radius-ctl)] p-1 text-left transition-colors hover:bg-[var(--bgColor-muted)] ${
                    selected ? 'bg-[var(--primary-soft)]' : ''
                  }`}
                >
                  <span
                    className={`block h-9 w-full overflow-hidden rounded-[6px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] ${
                      selected ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--bgColor-default)]' : ''
                    }`}
                  >
                    {c.value === 'none' ? (
                      <span className="grid size-full place-items-center text-[var(--fgColor-muted)]">
                        <BlockedIcon size={15} aria-hidden />
                      </span>
                    ) : c.value === 'custom' ? (
                      storedCustom ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh data URL, next/image không tối ưu được
                        <img src={storedCustom} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-[var(--fgColor-muted)]">
                          <UploadIcon size={15} aria-hidden />
                        </span>
                      )
                    ) : (
                      <NatureSvg
                        scene={c.value === 'auto' ? natureSceneFor(new Date().getDay()) : (c.value as keyof typeof NATURE_LABEL)}
                      />
                    )}
                  </span>
                  <span
                    className={`truncate text-[11px] leading-tight ${
                      selected ? 'font-semibold text-[var(--primary-deep)]' : 'font-medium text-[var(--ink-2)]'
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex items-center justify-between gap-2 px-1.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[var(--radius-ctl)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2.5 text-xs font-medium text-[var(--fgColor-default)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] max-[767px]:h-9"
            >
              <UploadIcon size={13} aria-hidden />
              Tải ảnh nền lên
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
            <p role="alert" className="px-2 pt-1.5 text-xs text-[var(--fgColor-danger)]">
              {bgError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
