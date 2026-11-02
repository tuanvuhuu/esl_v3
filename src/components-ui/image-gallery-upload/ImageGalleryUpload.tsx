'use client';

import { ImageIcon, XIcon } from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import { useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { uploadApi, IUploadResult } from "@/components-ui/_adapters/upload";
import Text from "../text";
import { NotifyHelper } from "@/components-ui/_adapters/toast";
import ImageGalleryViewer from "../image-gallery-viewer";
import { useCommonSelectedHook } from "@/components-ui/_adapters/hooks";
import styles from './image-gallery-upload.module.css';
import clsx from 'clsx';

interface IImageGalleryUploadProps {
  value?: IUploadResult[];
  onValueChanged: (images: IUploadResult[]) => void;
  accept?: Accept;
  subFolder?: string;
  maxImages?: number;
}

const ImageGalleryUpload = ({
  value = [],
  onValueChanged,
  accept,
  subFolder,
  maxImages = 10,
}: IImageGalleryUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { dm_dvcs_id } = useCommonSelectedHook();
  const defaultAccept: Accept = {
    "image/*": [],
  };
  const fileAccept = accept || defaultAccept;

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (value.length + acceptedFiles.length > maxImages) {
        NotifyHelper.Error(
          `Chỉ được upload tối đa ${maxImages} ảnh. Hiện tại đã có ${value.length} ảnh.`
        );
        return;
      }
      setIsUploading(true);
      const res = await uploadApi.uploadFiles(acceptedFiles, subFolder, dm_dvcs_id);
      setIsUploading(false);
      if (res.is_success) {
        onValueChanged([...value, ...res.data]);
        NotifyHelper.Success(`Đã upload ${res.data.length} ảnh thành công`);
      } else {
        NotifyHelper.Error(res.message ?? "Upload ảnh thất bại");
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileAccept,
    multiple: true,
  });

  const handleRemoveImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onValueChanged(newImages);
  };

  const handleImageClick = (index: number) => {
    setGalleryIndex(index);
    setIsGalleryOpen(true);
  };

  const handleImageRemove = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onValueChanged(newImages);
    if (newImages.length === 0) {
      setIsGalleryOpen(false);
    } else if (index >= newImages.length) {
      setGalleryIndex(newImages.length - 1);
    }
  };

  const canUploadMore = value.length < maxImages;

  return (
    <>
      <div>
        {/* Gallery hiển thị ảnh và Upload area cùng dòng */}
        {value.length === 0 ? (
          /* Khi chưa có ảnh: Upload area full width */
          <div
            {...getRootProps()}
            className={clsx(styles.imageGalleryUpload_box, isDragActive ? styles.imageGalleryUpload_box_isDragActive : styles.imageGalleryUpload_box_notIsDragActive)}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Text text="Đang tải lên..." />
            ) : (
              <>
                <ImageIcon size={24} />
                <div className="d-flex flex-col gap-1">
                  <Text text="Kéo thả ảnh vào đây hoặc" />
                  <Text text="Nhấn để chọn ảnh" />
                </div>
              </>
            )}
          </div>
        ) : (
          /* Khi đã có ảnh: Grid layout với ảnh và upload area */
          <div className={styles.imageGalleryUpload_box3}>
            {/* Gallery hiển thị ảnh - chỉ hiển thị tối đa 3 ảnh */}
            {value.slice(0, 3).map((image, index) => (
              <div key={index} className={styles.imageGalleryUpload_box4}>
                <img
                  src={image.url}
                  alt={image.file_name || `Ảnh ${index + 1}`}
                  onClick={() => handleImageClick(index)}
                  className={styles.imageGalleryUpload_box5}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <IconButton
                  icon={XIcon}
                  aria-label="Xóa ảnh"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  variant="danger"
                  className={styles.imageGalleryUpload_iconButton}
                />
              </div>
            ))}

            {/* Button "More" nếu có nhiều hơn 3 ảnh */}
            {value.length > 3 && (
              <div
                onClick={() => {
                  setGalleryIndex(0);
                  setIsGalleryOpen(true);
                }}
                className={styles.imageGalleryUpload_box6}
              >
                <Text text={`+${value.length - 3}`} className="fs-0 fw-bold" />
                <Text text="More" className="fs-0" />
              </div>
            )}

            {/* Upload area */}
            {canUploadMore && (
              <div
                {...getRootProps()}
                className={clsx(styles.imageGalleryUpload_box7, isDragActive ? styles.imageGalleryUpload_box7_isDragActive : styles.imageGalleryUpload_box7_notIsDragActive)}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <Text text="Đang tải..." className="fs-0" />
                ) : (
                  <>
                    <ImageIcon size={20} />
                    <Text text="Thêm ảnh" className="fs-0" />
                    <Text
                      text={`${value.length}/${maxImages}`}
                      className="fs-0 text-muted"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!canUploadMore && (
          <div className={styles.imageGalleryUpload_box8}>
            <Text text={`Đã đạt giới hạn tối đa ${maxImages} ảnh`} />
          </div>
        )}
      </div>

      {/* Gallery Viewer Modal */}
      <ImageGalleryViewer
        isOpen={isGalleryOpen}
        images={value}
        initialIndex={galleryIndex}
        onClose={() => setIsGalleryOpen(false)}
        onImageRemove={handleImageRemove}
        onUpload={async (files) => {
          if (value.length + files.length > maxImages) {
            NotifyHelper.Error(
              `Chỉ được upload tối đa ${maxImages} ảnh. Hiện tại đã có ${value.length} ảnh.`
            );
            return;
          }
          setIsUploading(true);
          const res = await uploadApi.uploadFiles(files, subFolder);
          setIsUploading(false);
          if (res.is_success) {
            onValueChanged([...value, ...res.data]);
            NotifyHelper.Success(`Đã upload ${res.data.length} ảnh thành công`);
          } else {
            NotifyHelper.Error(res.message ?? "Upload ảnh thất bại");
          }
        }}
        maxImages={maxImages}
        currentImageCount={value.length}
      />
    </>
  );
};

export default ImageGalleryUpload;
