'use client';

import clsx from 'clsx';
import { useMemo } from 'react';
import styles from "./FileType.module.css";

interface IFileTypeProps {
    className?: string;
    file_name?: string;
    file_type?: string;
}

const FileType = (props: IFileTypeProps) => {
    const { file_name, file_type } = props;
    const fileType = useMemo(() => {
        if (!file_type && file_name) {
            return file_name.split('.').pop()?.toLowerCase();
        }
        return (file_type ?? "").toLowerCase();
    }, [file_name, file_type]);

    return (
        <div className={clsx(styles.fileType_box, props.className)}>
            {fileType === "pdf" && <img src='../../../images/pdf.svg' alt='pdf' className={styles.icon} />}
            {fileType === "msg" && <img src='../../../images/msg.png' alt='msg' className={styles.icon} />}
            {(
                fileType === "png" ||
                fileType === "svg" ||
                fileType === "jpg" ||
                fileType === "gif" ||
                fileType === "jpeg"
            ) && <img src='../../../images/image.svg' alt='image' className={styles.icon} />}
            {(fileType === "doc" || fileType === "docx") && <img src='../../../images/word.svg' alt='word' className={styles.icon} />}
            {(fileType === "xls" || fileType === "xlsx") && <img src='../../../images/excel.svg' alt='excel' className={styles.icon} />}
        </div>
    );
};

export default FileType;
