'use client';

import React, { useRef, useState } from "react";
import { nhanVienApi, uploadApi } from "@/components-ui/_adapters/upload";
import Button from "../button";
import Modal from "../modal";
import ModalActions from "../modal/ModalActions";
import Text from "../text";
import { NotifyHelper } from "@/components-ui/_adapters/toast";
import { localizedResourceMap } from "@/components-ui/_adapters/localizedResourceMap";
import { UploadIcon } from "@primer/octicons-react";
import styles from "./UserAvatar.module.css";

interface IAvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  nhanVienId: number;
  currentAvatarUrl: string | null | undefined;
  onSuccess: () => void;
}

const AvatarUploadModal = (props: IAvatarUploadModalProps) => {
  const { isOpen, onClose, nhanVienId, currentAvatarUrl, onSuccess } = props;
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Upload file
      const uploadResult = await uploadApi.uploadFile(file, "avatar");
      if (!uploadResult.is_success || !uploadResult.data?.url) {
        NotifyHelper.Error(uploadResult.message || "Lỗi upload ảnh");
        return;
      }

      const imageUrl = uploadResult.data.url;

      // Lấy thông tin nhân viên hiện tại
      const nhanVienRes = await nhanVienApi.selectDetail(nhanVienId);
      if (!nhanVienRes.is_success) {
        NotifyHelper.Error("Không thể tải thông tin nhân viên");
        return;
      }

      // Update with new avatar
      const updateData = {
        ...nhanVienRes.data,
        avatar: imageUrl,
      };

      const updateRes = await nhanVienApi.saveChange(updateData);
      if (updateRes.is_success) {
        NotifyHelper.Success("Cập nhật avatar thành công");
        onSuccess();
        onClose();
      } else {
        NotifyHelper.Error(updateRes.message || "Có lỗi xảy ra");
      }
    } catch (error: unknown) {
      console.error("Error updating avatar:", error);
      const message = error instanceof Error ? error.message : "";
      NotifyHelper.Error(message || "Có lỗi xảy ra khi cập nhật avatar");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) {
      return;
    }

    try {
      setIsUploading(true);

      // Lấy thông tin nhân viên hiện tại
      const nhanVienRes = await nhanVienApi.selectDetail(nhanVienId);
      if (!nhanVienRes.is_success) {
        NotifyHelper.Error("Không thể tải thông tin nhân viên");
        return;
      }

      // Cập nhật avatar rỗng (xóa ảnh)
      const updateData = {
        ...nhanVienRes.data,
        avatar: "",
      };

      const updateRes = await nhanVienApi.saveChange(updateData);
      if (updateRes.is_success) {
        NotifyHelper.Success("Đã xóa avatar");
        onSuccess();
        onClose();
      } else {
        NotifyHelper.Error(updateRes.message || "Có lỗi xảy ra khi xóa avatar");
      }
    } catch (error: unknown) {
      console.error("Error deleting avatar:", error);
      const message = error instanceof Error ? error.message : "";
      NotifyHelper.Error(message || "Có lỗi xảy ra khi xóa avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangeImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Avatar"
      onClose={onClose}
      className={styles.avatarUploadModal_modal}
    >
      <div className={styles.uploadPreview}>
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              borderRadius: "8px",
            }}
          />
        ) : (
          <Text text="Chưa có ảnh avatar" className="text-muted" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <ModalActions>
        <Button
          text={localizedResourceMap.BASE.CLOSE}
          onClick={onClose}
          disabled={isUploading}
        />
        {currentAvatarUrl && (
          <Button
            text="Xóa ảnh"
            variant="danger"
            onClick={handleDeleteAvatar}
            disabled={isUploading}
            isLoading={isUploading}
          />
        )}
        <Button
          text="Thay đổi ảnh"
          variant="primary"
          onClick={handleChangeImageClick}
          disabled={isUploading}
          isLoading={isUploading}
          leadingVisual={UploadIcon}
        />
      </ModalActions>
    </Modal>
  );
};

export default AvatarUploadModal;
