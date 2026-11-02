import { formatVND as formatVndLib } from '@/lib/money';
import { normalizeSearch } from '@/lib/text';

export function formatVND(amount?: number | string | null): string {
  if (amount === null || amount === undefined || amount === '') {
    return formatVndLib(0);
  }
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(numeric)) {
    return formatVndLib(0);
  }
  return formatVndLib(numeric);
}

export const formatVnd = formatVND;

export function normalizeChar(input?: string | null): string {
  if (!input) return '';
  const normalized = normalizeSearch(input);
  const isAllUpper = input === input.toUpperCase() && input !== input.toLowerCase();
  return isAllUpper ? normalized.toUpperCase() : normalized;
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif',
]);

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv']);

export function getFileExtension(urlOrName?: string | null): string {
  if (!urlOrName) return '';
  const clean = urlOrName.split(/[?#]/)[0] ?? '';
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx === -1 || dotIdx === clean.length - 1) return '';
  return clean.slice(dotIdx + 1).toLowerCase();
}

export function isImgFile(urlOrName?: string | null): boolean {
  if (!urlOrName) return false;
  if (urlOrName.startsWith('data:image/')) return true;
  const ext = getFileExtension(urlOrName);
  return IMAGE_EXTENSIONS.has(ext);
}

export function isVideoFile(urlOrName?: string | null): boolean {
  if (!urlOrName) return false;
  if (urlOrName.startsWith('data:video/')) return true;
  const ext = getFileExtension(urlOrName);
  return VIDEO_EXTENSIONS.has(ext);
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const fileHelper = {
  getFileExtension,
  isImgFile,
  isVideoFile,
  formatFileSize,
};
