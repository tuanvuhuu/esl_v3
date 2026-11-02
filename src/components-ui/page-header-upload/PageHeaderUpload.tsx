'use client';

import { UploadIcon, XIcon } from '@primer/octicons-react';
import { Button, Dialog, Text } from '@primer/react';
import React, { useRef, useState } from 'react';
import { NotifyHelper } from '../_adapters/toast';
import { uploadApi } from '../_adapters/upload';
import styles from './page-header-upload.module.css';

export interface PageHeaderUploadProps {
  pageHeaderUrl?: string | null;
  dm_dvcs_id?: number;
  canEdit?: boolean;
  onPageHeaderChange?: (url: string) => void;
  isEditing?: boolean;
}

const PageHeaderUpload = (props: PageHeaderUploadProps): React.JSX.Element => {
  const {
    pageHeaderUrl,
    dm_dvcs_id,
    canEdit = true,
    onPageHeaderChange,
    isEditing = false,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(pageHeaderUrl);
  const [prevPageHeaderUrl, setPrevPageHeaderUrl] = useState(pageHeaderUrl);

  if (pageHeaderUrl !== prevPageHeaderUrl) {
    setPrevPageHeaderUrl(pageHeaderUrl);
    setCurrentUrl(pageHeaderUrl);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (canEdit && isEditing) {
      setIsOpen(true);
    }
  };

  const resetState = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsUploading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        NotifyHelper.Error('Kích thước file phải nhỏ hơn 5MB');
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
    if (!selectedFile || !dm_dvcs_id) return;

    setIsUploading(true);
    try {
      const result = await uploadApi.uploadFile(selectedFile, 'page_header', dm_dvcs_id);
      if (result.is_success) {
        const newUrl = result.data.url;
        setCurrentUrl(newUrl);
        onPageHeaderChange?.(newUrl);
        resetState();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error uploading page header:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        NotifyHelper.Error('Kích thước file phải nhỏ hơn 5MB');
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
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          ...(currentUrl ? {} : { width: '160px' }),
          height: '70px',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: currentUrl ? 'transparent' : '#f6f8fa',
          border: currentUrl ? 'none' : '1px dashed #d0d7de',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canEdit && isEditing ? 'pointer' : 'default',
        }}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Ảnh tiêu đề trang"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : null}

        {canEdit && isEditing && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <UploadIcon fill="white" size={18} />
          </div>
        )}
      </div>

      {isOpen && (
        <Dialog
          className={styles.styledDialog}
          title="Cập nhật ảnh tiêu đề trang"
          onClose={() => {
            setIsOpen(false);
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
                <div className="relative d-inline-block w-full">
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
                  <Text className={styles.subText}>
                    Hỗ trợ: JPG, PNG (tối đa 5MB) · Nên dùng ảnh ngang rộng
                  </Text>
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
                  setIsOpen(false);
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
    </>
  );
};

export default PageHeaderUpload;
