'use client';

import { UploadIcon, XIcon } from '@primer/octicons-react';
import { Button, Dialog, Text } from '@primer/react';
import React, { useRef, useState } from 'react';
import { NotifyHelper } from '../_adapters/toast';
import { uploadApi } from '../_adapters/upload';
import styles from './icon-upload.module.css';

export interface IconUploadProps {
  icon?: string;
  dm_dvcs_id?: number;
  canEdit?: boolean;
  onIconChange?: (iconUrl: string) => void;
  isEditing?: boolean;
}

const IconUpload = (props: IconUploadProps): React.JSX.Element => {
  const { icon, dm_dvcs_id, canEdit = true, onIconChange, isEditing = false } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(icon);
  const [prevIcon, setPrevIcon] = useState(icon);

  if (icon !== prevIcon) {
    setPrevIcon(icon);
    setCurrentIcon(icon);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
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
      if (file.size > 2 * 1024 * 1024) {
        NotifyHelper.Error('File size must be less than 2MB');
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
      const result = await uploadApi.uploadFile(selectedFile, 'icon', dm_dvcs_id);
      if (result.is_success) {
        const newUrl = result.data.url;
        setCurrentIcon(newUrl);
        onIconChange?.(newUrl);
        resetState();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error uploading icon:', error);
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
      if (file.size > 2 * 1024 * 1024) {
        NotifyHelper.Error('File size must be less than 2MB');
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
    <div
      className={styles.container}
      style={{ padding: 0, height: '100%', display: 'flex', alignItems: 'center' }}
    >
      <div className="cursor-pointer relative d-flex items-center h-full">
        <div
          style={{
            position: 'relative',
            cursor: canEdit && isEditing ? 'pointer' : 'default',
            width: '70px',
            height: '70px',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: currentIcon ? 'transparent' : '#f6f8fa',
            border: currentIcon ? 'none' : '1px dashed #d0d7de',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleIconClick}
        >
          {currentIcon ? (
            <img
              src={currentIcon}
              alt="Icon đơn vị cơ sở"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '4px',
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
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={handleIconClick}
            >
              <UploadIcon fill="white" size={20} />
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <Dialog
          className={styles.styledDialog}
          title="Cập nhật Icon đơn vị cơ sở"
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
    </div>
  );
};

export default IconUpload;
