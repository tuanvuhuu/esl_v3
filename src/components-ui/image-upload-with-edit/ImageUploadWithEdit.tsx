'use client';

import { UploadIcon, XIcon } from '@primer/octicons-react';
import { Button, Dialog, IconButton, Text } from '@primer/react';
import React, { useRef, useState } from 'react';
import { useCommonSelectedHook } from '../_adapters/hooks';
import { NotifyHelper } from '../_adapters/toast';
import { uploadApi } from '../_adapters/upload';
import styles from './image-upload-with-edit.module.css';

export interface ImageUploadWithEditProps {
  imageUrl?: string;
  onImageChange?: (imageUrl: string) => void;
  uploadType?: string;
  placeholder?: string;
}

const ImageUploadWithEdit = (props: ImageUploadWithEditProps): React.JSX.Element => {
  const {
    imageUrl,
    onImageChange,
    uploadType = 'image',
    placeholder = 'Chưa có ảnh',
  } = props;

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dm_dvcs_id } = useCommonSelectedHook();

  const resetState = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsUploading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        NotifyHelper.Error('Kích thước file phải nhỏ hơn 2MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const result = await uploadApi.uploadFile(selectedFile, uploadType, dm_dvcs_id);
      if (result.is_success) {
        const newUrl = result.data.url;
        onImageChange?.(newUrl);
        resetState();
        setIsUploadModalOpen(false);
        NotifyHelper.Success('Tải ảnh lên thành công');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      NotifyHelper.Error('Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = () => {
    onImageChange?.('');
    NotifyHelper.Success('Đã xóa ảnh');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        NotifyHelper.Error('Kích thước file phải nhỏ hơn 2MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {imageUrl ? (
        <div className={styles.imagePreviewWrapper}>
          <img
            className={styles.imagePreview}
            src={imageUrl}
            alt="Preview"
            onClick={() => setIsPreviewModalOpen(true)}
          />
          <div className={styles.deleteButtonWrapper}>
            <IconButton
              icon={XIcon}
              aria-label="Xóa ảnh"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              variant="invisible"
              className={styles.imageUploadWithEdit_iconButton}
            />
          </div>
        </div>
      ) : (
        <div className={styles.placeholderBox} onClick={() => setIsUploadModalOpen(true)}>
          <UploadIcon size={24} />
          <span className={styles.placeholderText}>{placeholder}</span>
        </div>
      )}

      {isUploadModalOpen && (
        <Dialog
          className={styles.styledDialog}
          title="Chọn ảnh"
          onClose={() => {
            setIsUploadModalOpen(false);
            resetState();
          }}
        >
          <div className="p-4">
            <div
              className={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="relative d-inline-block">
                  <img className={styles.previewImage} src={previewUrl} alt="Preview" />
                  <Button
                    className={styles.removeButton}
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetState();
                    }}
                  >
                    <XIcon />
                  </Button>
                </div>
              ) : (
                <>
                  <UploadIcon size={32} />
                  <Text className={styles.uploadText}>
                    Kéo thả ảnh vào đây hoặc click để chọn
                  </Text>
                  <Text className={styles.subText}>Hỗ trợ: JPG, PNG (tối đa 2MB)</Text>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div className={styles.buttonContainer}>
              <Button
                variant="invisible"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  resetState();
                }}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Đang tải...' : 'Tải lên'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {imageUrl && isPreviewModalOpen && (
        <Dialog
          className={styles.styledDialog}
          title="Xem ảnh"
          onClose={() => setIsPreviewModalOpen(false)}
        >
          <div className="p-4 text-center">
            <img
              src={imageUrl}
              alt="Full preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          </div>
        </Dialog>
      )}
    </>
  );
};

export default ImageUploadWithEdit;
