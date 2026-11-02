'use client';

import { PencilIcon } from "@primer/octicons-react";
import { AnchoredOverlay } from "@primer/react";
import clsx from "clsx";
import { useState } from "react";
import AvatarUploadModal from "./AvatarUploadModal";
import LazyImage from "../lazy-image";
import styles from "./UserAvatar.module.css";

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["#e17055", "#d63031"], // đỏ cam
  ["#fdcb6e", "#e17055"], // vàng cam
  ["#6c5ce7", "#a29bfe"], // tím
  ["#00b894", "#00cec9"], // xanh lá
  ["#0984e3", "#74b9ff"], // xanh dương
  ["#e84393", "#fd79a8"], // hồng
  ["#636e72", "#b2bec3"], // xám
];

/** Hash tên → index màu ổn định */
function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % AVATAR_COLORS.length;
}

/** Lấy chữ cái đầu cuối của tên (bỏ số cuối nếu có) */
// function getInitial(fullName: string): string {
//   const parts = fullName.trim().split(/\s+/);
//   const last = parts.at(-1) ?? "";
//   const isNum = !isNaN(Number(last)) && last !== "";
//   const word = isNum ? (parts.at(-2) ?? parts[0]) : last;
//   const c = word[0]?.toUpperCase() ?? "?";
//   const map: Record<string, string> = { Đ: "D", Ă: "A", Â: "A", Ê: "E", Ơ: "O", Ư: "U" };
//   return map[c] ?? c;
// }
function getInitial(fullName: string, size: number): string {
  const parts = fullName.trim().split(/\s+/);

  // Bỏ phần số cuối (0120, 0222...)
  const filtered = parts.filter(p => isNaN(Number(p)));

  const map: Record<string, string> = { Đ: "D", Ă: "A", Â: "A", Ê: "E", Ơ: "O", Ư: "U" };
   const normalize = (w: string) => {
      if (!w) return "";
    const c = w[0]?.toUpperCase() ?? "";
    return map[c] ?? c;
  };

  // Size nhỏ → 1 chữ (chữ cuối tên)
  if (size <= 24) {
    return normalize(filtered.at(-1) ?? filtered[0]);
  }

  // Size lớn → 2 chữ (chữ đầu họ + chữ đầu tên)
  if (filtered.length >= 2) {
    return normalize(filtered[0]) + normalize(filtered.at(-1)!);
  }

  return normalize(filtered[0]);
}
const SIZE_MAP = {
  small: 16,
  medium: 24,
  large: 32,
  xlarge: 40,
} as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

interface InitialAvatarProps {
  fullName: string;
  size: number;
}

function InitialAvatar({ fullName, size }: InitialAvatarProps) {
  const initial = getInitial(fullName, size);
  const [from, to] = AVATAR_COLORS[hashName(fullName)];
  const fontSize = Math.max(13, Math.round(size * 0.42));
  if (!initial) return null;
  return (
    <div
      className={styles.initial}
      style={{
        "--avatar-size": `${size}px`,
        "--avatar-from": from,
        "--avatar-to": to,
      } as React.CSSProperties}
    >
      <span
        style={{
          color: "#fff",
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {initial}
      </span>
    </div>
  );
}

interface EditBadgeProps {
  onClick: (e: React.MouseEvent) => void;
}

function EditBadge({ onClick }: EditBadgeProps) {
  return (
    <div onClick={onClick} className={styles.editBadge}>
      <PencilIcon size={12} fill="white" />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface IUserAvatarProps {
  url?: string;
  fullName?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  nhanVienId?: number;
  onAvatarUpdate?: () => void;
}

const UserAvatar = ({
  url,
  fullName = "",
  size = "medium",
  nhanVienId,
  onAvatarUpdate,
}: IUserAvatarProps) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const px = SIZE_MAP[size];
  const hasImage = !!url && url !== "null" && url !== "" && !imgError;
  const canEdit = !!nhanVienId;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUploadModalOpen(true);
  };

  const avatarContent = hasImage ? (
    <img
      alt={fullName || "avatar"}
      src={url}
      width={px}
      height={px}
      onError={() => setImgError(true)}
      style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
    />
  ) : (
    <InitialAvatar fullName={fullName} size={px} />
  );

  // ── Nếu có ảnh: bọc AnchoredOverlay để preview ──
  if (hasImage) {
    return (
      <>
        <AnchoredOverlay
          open={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          overlayProps={{ role: "dialog", "aria-modal": true, "aria-label": "Avatar preview" }}
          focusZoneSettings={{ disabled: true }}
          renderAnchor={(anchorProps) => (
            <div
              {...anchorProps}
              onKeyDown={undefined}
              onMouseEnter={() => setIsPreviewOpen(true)}
              onMouseLeave={() => setIsPreviewOpen(false)}
              onClick={canEdit ? handleEditClick : undefined}
              className={clsx(styles.avatar, canEdit && styles.editable)}
            >
              {avatarContent}
              {canEdit && <EditBadge onClick={handleEditClick} />}
            </div>
          )}
        >
          <div
            onMouseEnter={() => setIsPreviewOpen(true)}
            onMouseLeave={() => setIsPreviewOpen(false)}
          >
            <LazyImage
              src={url}
              alt={"url"}
              rootMargin="50px 0px"
              style={{
                maxHeight: "400px",
                maxWidth: "180px",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
            {/* <img
              alt={fullName || "avatar"}
              src={url}
              style={{ height: "180px", width: "auto", borderRadius: "8px", display: "block" }}
            /> */}
          </div>
        </AnchoredOverlay>

        {canEdit && (
          <AvatarUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            nhanVienId={nhanVienId!}
            currentAvatarUrl={url}
            onSuccess={() => {
              onAvatarUpdate?.();
              setIsUploadModalOpen(false);
            }}
          />
        )}
      </>
    );
  }

  // ── Không có ảnh: hiện InitialAvatar ──
  return (
    <>
      <div
        onClick={canEdit ? handleEditClick : undefined}
        className={clsx(styles.avatar, canEdit && styles.editable)}
      >
        {avatarContent}
        {canEdit && <EditBadge onClick={handleEditClick} />}
      </div>

      {canEdit && (
        <AvatarUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          nhanVienId={nhanVienId!}
          currentAvatarUrl={url}
          onSuccess={() => {
            onAvatarUpdate?.();
            setIsUploadModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default UserAvatar;
