'use client';

import { UploadIcon, XIcon } from '@primer/octicons-react';
import { Button, Dialog, Text } from '@primer/react';
import clsx from 'clsx';
import React, { useRef, useState } from 'react';
import { NotifyHelper } from '../_adapters/toast';
import { uploadApi } from '../_adapters/upload';
import UserAvatar from '../user-avatar';
import styles from './name-and-avatar.module.css';

export interface NhanVienProps {
  ho_ten?: string;
  ma_nv?: string;
  avatar?: string;
  dm_nhanvien_id?: number;
}

export interface DonViCoSoProps {
  ten_dvcs?: string;
  logo?: string;
  dm_dvcs_id?: number;
}

export interface NameAndAvatarProps {
  nhanVien?: NhanVienProps;
  donViCoSo?: DonViCoSoProps;
  canEdit?: boolean;
  onLogoChange?: (logoUrl: string) => void;
  isEditing?: boolean;
  showName?: boolean;
}

const NameAndAvatar = (props: NameAndAvatarProps): React.JSX.Element => {
  const {
    nhanVien,
    donViCoSo,
    canEdit = true,
    onLogoChange,
    isEditing = false,
    showName = true,
  } = props;
  const externalAvatar = nhanVien?.avatar || donViCoSo?.logo;
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(externalAvatar);
  const [prevExternalAvatar, setPrevExternalAvatar] = useState(externalAvatar);

  if (externalAvatar !== prevExternalAvatar) {
    setPrevExternalAvatar(externalAvatar);
    setCurrentAvatar(externalAvatar);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDonViCoSo = !!donViCoSo;
  const displayName = nhanVien?.ho_ten || donViCoSo?.ten_dvcs;
  const displayId = nhanVien?.ma_nv;
  const entityId = nhanVien?.dm_nhanvien_id || donViCoSo?.dm_dvcs_id;

  const handleAvatarClick = () => {
    setIsOpen(true);
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
    if (!selectedFile || !entityId || (!nhanVien?.ma_nv && !donViCoSo?.dm_dvcs_id)) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadApi.uploadFile(
        selectedFile,
        isDonViCoSo ? 'logo' : 'avatar',
      );
      if (result.is_success) {
        const newUrl = result.data.url;
        setCurrentAvatar(newUrl);
        onLogoChange?.(newUrl);
        resetState();
        setIsOpen(false);
      }
    } catch (error) {
      console.error(`Error uploading ${isDonViCoSo ? 'logo' : 'avatar'}:`, error);
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
      style={
        !showName
          ? { padding: 0, height: '100%', display: 'flex', alignItems: 'center' }
          : undefined
      }
    >
      <div className="cursor-pointer d-flex items-center h-full">
        {isDonViCoSo ? (
          <div
            style={{
              position: 'relative',
              cursor: canEdit && isEditing ? 'pointer' : 'default',
              width: '150px',
              height: '70px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: currentAvatar ? 'transparent' : '#f6f8fa',
              border: currentAvatar ? 'none' : '1px dashed #d0d7de',
            }}
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Logo đơn vị cơ sở"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  backgroundRepeat: 'no-repeat',
                }}
                onClick={canEdit && isEditing ? handleAvatarClick : undefined}
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
                onClick={handleAvatarClick}
              >
                <UploadIcon fill="white" size={24} />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.avatarWrapper}>
            <UserAvatar fullName={nhanVien?.ho_ten} url={currentAvatar} size="xlarge" />

            {canEdit && isEditing ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                onClick={handleAvatarClick}
              >
                <UploadIcon fill="white" size={24} />
              </div>
            ) : (
              <div
                className={clsx(styles.avatarOverlay, 'avatar-overlay')}
                onClick={handleAvatarClick}
              >
                <UploadIcon fill="white" size={20} />
              </div>
            )}
          </div>
        )}
      </div>
      {showName && (
        <div className="d-flex flex-col">
          <Text className={styles.displayName}>{displayName}</Text>
          {!isDonViCoSo && <Text className={styles.displayCode}>{displayId}</Text>}
        </div>
      )}

      {isOpen && (
        <Dialog
          className={styles.styledDialog}
          title={`Cập nhật ${isDonViCoSo ? 'Logo đơn vị cơ sở' : 'Avatar'}`}
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

export default NameAndAvatar;
