const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "m4v", "avi", "mkv"];

/** Kiểm tra URL/tên file có phải video không (theo phần mở rộng, bỏ qua query string). */
export const isVideoFile = (url?: string | null): boolean => {
  if (!url) return false;
  const ext = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
};
