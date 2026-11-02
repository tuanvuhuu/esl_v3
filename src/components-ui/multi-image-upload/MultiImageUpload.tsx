'use client';

import { TrashIcon, UploadIcon } from '@primer/octicons-react';
import { Button } from '@primer/react';
import { useState } from 'react';
import { NotifyHelper } from '@/components-ui/_adapters/toast';
import { apiClient } from '@/components-ui/_adapters/upload';
import styles from './multi-image-upload.module.css';

interface MultiImageUploadProps {
  value?: string[];
  onValueChanged: (images: string[]) => void;
  maxImages?: number;
  lichSuYTeId?: number; // ID của lịch sử y tế để upload
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onValueChanged,
  maxImages = 10,
  lichSuYTeId,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      // Sử dụng API khác nhau tùy theo có ID hay không
      const uploadPath = lichSuYTeId
        ? `lich-su-y-te/upload/lich-su-y-te/${lichSuYTeId}`
        : 'lich-su-y-te/upload/lich-su-y-te-temp';

      const response = await apiClient.upload(uploadPath, formData);

      if (response.is_success) {
        const result = response.data;
        if (result.status === 'success') {
          const newImages = [...value, ...result.images];
          onValueChanged(newImages);
          NotifyHelper.Success(`Đã upload ${result.count} ảnh thành công`);
        } else {
          NotifyHelper.Error(result.message || 'Upload ảnh thất bại');
        }
      } else {
        NotifyHelper.Error(response.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Upload error:', error);
      NotifyHelper.Error('Có lỗi xảy ra khi upload ảnh');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = value[index];
    if (!lichSuYTeId) {
      // Nếu chưa có ID, chỉ xóa khỏi state
      const newImages = value.filter((_, i) => i !== index);
      onValueChanged(newImages);
      return;
    }

    try {
      const response = await apiClient.delete(`lich-su-xuong-phong-y-te/delete-image/lich-su-y-te/${lichSuYTeId}/${encodeURIComponent(imageUrl)}`);

      if (response.is_success) {
        const newImages = value.filter((_, i) => i !== index);
        onValueChanged(newImages);
        NotifyHelper.Success('Đã xóa ảnh thành công');
      } else {
        NotifyHelper.Error(response.message || 'Xóa ảnh thất bại');
      }
    } catch (error) {
      console.error('Delete error:', error);
      NotifyHelper.Error('Có lỗi xảy ra khi xóa ảnh');
    }
  };

  const canUploadMore = value.length < maxImages;

  return (
    <div>
      {/* Hiển thị danh sách ảnh đã upload */}
      {value.length > 0 && (
        <div className="mb-3">
          <div className="mb-2 fs-1 text-muted">
            Đã upload {value.length} ảnh (tối đa {maxImages} ảnh)
          </div>
          <div className={styles.multiImageUpload_box3}>
            {value.map((imageUrl, index) => (
              <div
                key={index}
                className={styles.multiImageUpload_box4}
              >
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Button
                  variant="danger"
                  leadingVisual={TrashIcon}
                  onClick={() => handleRemoveImage(index)}
                  className={styles.multiImageUpload_button}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload area */}
      {canUploadMore && (
        <div
          className={styles.multiImageUpload_box5}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              handleFileUpload(target.files);
            };
            input.click();
          }}
        >
          <UploadIcon size={20} />
          <div className="mt-1 fs-1">
            {isUploading ? 'Đang upload...' : 'Click để chọn ảnh'}
          </div>
        </div>
      )}

      {!canUploadMore && (
        <div
          className={styles.multiImageUpload_box7}
        >
          Đã đạt giới hạn tối đa {maxImages} ảnh
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-2 fs-1 text-muted">
          {value.length}/{maxImages} ảnh
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;
