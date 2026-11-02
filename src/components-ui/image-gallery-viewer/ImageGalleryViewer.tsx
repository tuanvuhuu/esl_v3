'use client';

import React, { useState, useRef } from "react";
import Modal from "../modal";
import ModalActions from "../modal/ModalActions";
import Button from "../button";
import { localizedResourceMap } from "@/components-ui/_adapters/localizedResourceMap";
import { useCommonContext } from "@/components-ui/_adapters/commonContext";
import { ChevronLeftIcon, ChevronRightIcon, UploadIcon, TrashIcon } from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import { IUploadResult } from "@/components-ui/_adapters/upload";
import styles from './image-gallery-viewer.module.css';
import clsx from 'clsx';

interface IImageGalleryViewerProps {
  isOpen: boolean;
  images: IUploadResult[];
  initialIndex?: number;
  onClose: () => void;
  onImageRemove?: (index: number) => void;
  onUpload?: (files: File[]) => void;
  maxImages?: number;
  currentImageCount?: number;
}

const ImageGalleryViewer = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  onImageRemove,
  onUpload,
  maxImages,
  currentImageCount,
}: IImageGalleryViewerProps) => {
  const { translate } = useCommonContext();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);
  const [prevImages, setPrevImages] = useState(images);

  if (initialIndex !== prevInitialIndex || images !== prevImages) {
    setPrevInitialIndex(initialIndex);
    setPrevImages(images);
    setCurrentIndex(initialIndex);
    setImageError(false);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = onUpload && maxImages && currentImageCount !== undefined && currentImageCount < maxImages;

  const currentImage = images[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
      setImageError(false);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
      setImageError(false);
    }
  };

  const handleRemove = () => {
    if (onImageRemove) {
      onImageRemove(currentIndex);
      if (images.length === 1) {
        onClose();
      } else if (currentIndex >= images.length - 1) {
        setCurrentIndex(images.length - 2);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpload) {
      const fileArray = Array.from(files);
      onUpload(fileArray);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      title={`Ảnh ${currentIndex + 1} / ${images.length}`}
      onClose={onClose}
      width="xlarge"
    >
      <div>
        <div className={styles.imageGalleryViewer_box}>
          {currentImage && !imageError ? (
            <>
              {hasPrevious && (
                <IconButton
                  icon={ChevronLeftIcon}
                  aria-label="Ảnh trước"
                  onClick={handlePrevious}
                  className={styles.imageGalleryViewer_iconButton}
                />
              )}
              <img
                src={currentImage.url}
                alt={currentImage.file_name || `Ảnh ${currentIndex + 1}`}
                onError={() => {
                  setImageError(true);
                }}
                className={styles.imageGalleryViewer_box2}
              />
              {hasNext && (
                <IconButton
                  icon={ChevronRightIcon}
                  aria-label="Ảnh sau"
                  onClick={handleNext}
                  className={styles.imageGalleryViewer_iconButton2}
                />
              )}
            </>
          ) : (
            <div className={styles.imageGalleryViewer_box3}>
              {imageError ? "Không thể tải ảnh" : "Không có ảnh"}
            </div>
          )}
        </div>

        {/* Thumbnail list */}
        {images.length > 1 && (
          <div className={styles.imageGalleryViewer_box4}>
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setImageError(false);
                }}
                className={clsx(styles.imageGalleryViewer_box5, (currentIndex === index) ? styles.imageGalleryViewer_box5_currentIndexIndex : styles.imageGalleryViewer_box5_notCurrentIndexIndex)}
              >
                <img
                  src={image.url}
                  alt={image.file_name || `Ảnh ${index + 1}`}
                  className={styles.imageGalleryViewer_box6}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <ModalActions>
        {canUpload && (
          <>
            <Button
              text="Upload"
              onClick={handleUploadClick}
              leadingVisual={UploadIcon}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </>
        )}
        {onImageRemove && (
          <Button
            text="Xóa ảnh"
            onClick={handleRemove}
            variant="danger"
            leadingVisual={TrashIcon}
          />
        )}
        <Button
          text={translate(localizedResourceMap.BASE.CLOSE)}
          onClick={onClose}
        />
      </ModalActions>
    </Modal>
  );
};

export default ImageGalleryViewer;
