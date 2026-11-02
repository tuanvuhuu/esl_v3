'use client';

import { GearIcon } from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import { useState } from "react";
import Modal from "../modal";
import SettingCotent from "../setting-content";

const SettingButton = () => {
  const [isShowModal, setIsShowModal] = useState(false);

  return (
    <>
      <IconButton
        icon={GearIcon}
        aria-label="Cài đặt"
        variant="invisible"
        size="medium"
        // className={styles.settingButton}
        onClick={() => {
          setIsShowModal(true);
        }}
        style={{
          position:"relative",
          borderRadius:"50%",
          backgroundColor:"var(--app-accent-subtle)",
          color:"var(--app-accent-emphasis)"
        }}
      />
      {isShowModal && (
        <Modal
          isOpen
          style={{
            width: "650px"
          }}
          onClose={() => {
            setIsShowModal(false);
          }}
          title="Cài đặt"
        >
          <div className="p-3">
            <SettingCotent />
          </div>
        </Modal>
      )}
    </>
  );
};

export default SettingButton;
