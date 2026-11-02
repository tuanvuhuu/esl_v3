'use client';

import { useCommonSelectedHook } from "@/components-ui/_adapters/hooks";
import { ChevronLeftIcon, ChevronRightIcon, CommentIcon, ImageIcon, TrashIcon, XIcon, ZoomInIcon } from "@primer/octicons-react";
import { IconButton, Label, Text } from "@primer/react";
import Tooltip from '@/components-ui/tooltip';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LazyImage from "../lazy-image";
import Button from "../button";
import { isVideoFile } from "../utils/fileType";
import styles from './image-gallery.module.css';
import clsx from 'clsx';

export interface IImgFile {
  id: string;
  url: string;
  name?: string;
  description?: string;
  hasDescription?: boolean;
}

interface IImageGalleryProps {
  className?: string;
  /** chiều cao khung (mặc định 600px) */
  height?: string | number;
  images: IImgFile[];
  selectedId?: string;
  onDelete?: (id: string) => void;
  onImageSelect?: (image: IImgFile) => void;
  onSelect?: (id: string) => void;
  sidePanel?: React.ReactNode;
}

const ImageGallery = (props: IImageGalleryProps) => {
  const { images, selectedId, onSelect, onDelete, onImageSelect, sidePanel } = props;
  const mainViewRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isZoomed, setIsZoomed] = useState(false);

  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(
    images[0]?.id,
  );

  const hasValidSelection =
    images.length === 0 || images.some((img) => img.id === internalSelectedId);
  const effectiveInternalId = hasValidSelection ? internalSelectedId : images[0]?.id;

  if (effectiveInternalId !== internalSelectedId) {
    setInternalSelectedId(effectiveInternalId);
  }

  const lastNotifiedFallbackRef = useRef<string | undefined>(effectiveInternalId);
  useEffect(() => {
    if (effectiveInternalId && effectiveInternalId !== lastNotifiedFallbackRef.current) {
      lastNotifiedFallbackRef.current = effectiveInternalId;
      const firstMatch = images.find((img) => img.id === effectiveInternalId);
      if (firstMatch && onImageSelect) {
        onImageSelect(firstMatch);
      }
    }
  }, [effectiveInternalId, images, onImageSelect]);

  const currentIdx = useMemo(() => {
    return images.findIndex((img) => img.id === effectiveInternalId);
  }, [images, effectiveInternalId]);

  const activeId = selectedId ?? effectiveInternalId;
  const { mainColor } = useCommonSelectedHook();
  const activeImage = useMemo(
    () => images.find((img) => img.id === activeId),
    [images, activeId],
  );

  const handleSelect = useCallback(
    (id: string) => {
      lastNotifiedFallbackRef.current = id;
      setInternalSelectedId(id);
      const img = images.find((i) => i.id === id);
      if (img && onImageSelect) onImageSelect(img);
      if (onSelect) onSelect(id);
    },
    [onSelect, images, onImageSelect],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDelete?.(id);
      if (id === activeId) {
        const currentIndex = images.findIndex((img) => img.id === id);
        const nextImage = images[currentIndex + 1] ?? images[currentIndex - 1];
        if (nextImage) {
          lastNotifiedFallbackRef.current = nextImage.id;
          setInternalSelectedId(nextImage.id);
          if (onImageSelect) onImageSelect(nextImage);
        }
      }
    },
    [activeId, images, onDelete, onImageSelect],
  );

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (images.length === 0) return;
      const currentIndex = images.findIndex((img) => img.id === activeId);
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + images.length) % images.length;
      const nextId = images[nextIndex]?.id;
      if (nextId) {
        handleSelect(nextId);
      }
    },
    [images, activeId, handleSelect],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape" && isZoomed) {
        setIsZoomed(false);
        return;
      }

      if (isTyping) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        navigate(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isZoomed]);

  useEffect(() => {
    if (!activeId) return;
    const el = itemRefs.current.get(activeId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  return (
    <div
      style={{ height: props.height ?? "600px" }}
      className={clsx("d-grid gap-3", sidePanel ? styles.imageGallery_box_sidePanel : styles.imageGallery_box_notSidePanel, props.className)}
    >
      <div className={styles.imageGallery_box2}>
        {images.map((img) => {
          const isActive = img.id === activeId;
          const isVideo = isVideoFile(img.url);
          const hasDesc = img.hasDescription || (!!img.description && img.description.trim() !== "");

          if (isVideo) {
            return (
              <div
                style={{ borderColor: isActive ? mainColor || "var(--app-accent-fg)" : "var(--app-border-default)" }}
                key={img.url}
                ref={(el: HTMLDivElement | null) => {
                  if (el) itemRefs.current.set(img.id, el);
                  else itemRefs.current.delete(img.id);
                }}
                className={styles.imageGallery_box3}
                onClick={() => handleSelect(img.id)}
              >
                <video
                  src={img.url}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            );
          }

          return (
            <div
              key={img.url}
              ref={(el: HTMLDivElement | null) => {
                if (el) itemRefs.current.set(img.id, el);
                else itemRefs.current.delete(img.id);
              }}
              className={clsx(styles.galleryItem, isActive && styles.galleryItemActive)}
              style={isActive ? {
                "--item-active-color": mainColor || "#0969da",
                "--item-active-shadow": mainColor || "rgba(9, 105, 218, 0.3)",
              } as React.CSSProperties : undefined}
              onClick={() => handleSelect(img.id)}
            >
              <LazyImage
                src={img.url}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              <div className={styles.imageGallery_box4}>
                {hasDesc && (
                  <Tooltip nonInteractive text="Ảnh có mô tả" direction="s">
                    <div className={styles.imageGallery_box5}>
                      <CommentIcon size={12} />
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={mainViewRef} className="overflow-hidden h-full d-flex flex-col">
        {activeImage ? (
          <div className="h-full d-flex flex-col items-center justify-between">
            <div className={styles.imageGallery_box9}>
              <Label variant="secondary">
                Ảnh {currentIdx + 1} / {images.length}
              </Label>
            </div>

            <div className={styles.imageGallery_box10}>
              {isVideoFile(activeImage.url) ? (
                <video
                  src={activeImage.url}
                  controls
                  style={{
                    maxHeight: "100%",
                    maxWidth: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <Tooltip nonInteractive text="Click để xem ảnh phóng to" direction="s">
                  <div
                    className={styles.imageGallery_box11}
                    onClick={() => setIsZoomed(true)}
                  >
                    <img
                      src={activeImage.url}
                      alt={activeImage.name ?? "image"}
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        borderRadius: "8px",
                        objectFit: "contain",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                      }}
                    />
                    <div className={clsx("zoom-icon", styles.imageGallery_box12)}>
                      <ZoomInIcon size={16} />
                    </div>
                  </div>
                </Tooltip>
              )}
            </div>

            <div className={styles.imageGallery_box13}>
              <Button
                text="Xóa ảnh này"
                leadingVisual={TrashIcon}
                variant="danger"
                onClick={(e) => {
                  handleDelete(e, activeImage.id);
                }}
              />
            </div>
          </div>
        ) : (
          <div className={styles.imageGallery_box14}>
            <ImageIcon size={32} />
            <Text className="mt-1">Chưa chọn ảnh</Text>
          </div>
        )}
      </div>

      {sidePanel && (
        <div className={styles.imageGallery_box15}>
          {sidePanel}
        </div>
      )}

      {isZoomed && activeImage && !isVideoFile(activeImage.url) && typeof document !== "undefined" &&
        createPortal(
          <div
            className={styles.imageGallery_box16}
            onClick={() => setIsZoomed(false)}
          >
            <div className={styles.imageGallery_box17}>
              <Label variant="secondary" className={styles.imageGallery_label}>
                Ảnh {currentIdx + 1} / {images.length}
              </Label>
              <IconButton
                aria-label="Đóng"
                icon={XIcon}
                variant="invisible"
                size="large"
                onClick={() => setIsZoomed(false)}
                className={styles.imageGallery_iconButton}
              />
            </div>

            {images.length > 1 && (
              <IconButton
                aria-label="Ảnh trước"
                icon={ChevronLeftIcon}
                variant="invisible"
                size="large"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(-1);
                }}
                className={styles.imageGallery_iconButton2}
              />
            )}

            <img
              src={activeImage.url}
              alt={activeImage.name ?? "Zoomed Image"}
              onClick={(e) => e.stopPropagation()}
              className={styles.imageGallery_box18}
            />

            {images.length > 1 && (
              <IconButton
                aria-label="Ảnh sau"
                icon={ChevronRightIcon}
                variant="invisible"
                size="large"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(1);
                }}
                className={styles.imageGallery_iconButton3}
              />
            )}

            {activeImage.description && (
              <div
                className={styles.imageGallery_box19}
                onClick={(e) => e.stopPropagation()}
              >
                <Text className="fs-1">{activeImage.description}</Text>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default ImageGallery;
