'use client';

import { AnchoredOverlay } from '@primer/react';
import { ReactNode, useState } from 'react';
import styles from './image-preview.module.css';
interface IImagePreviewProps {
    url: string,
    ArchorComponent?: ReactNode,
    ViewComponent?: ReactNode
}
const ImagePreview = (props: IImagePreviewProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <AnchoredOverlay
            open={isOpen}
            onClose={() => {
                setIsOpen(false)
            }}
            overlayProps={{
                role: 'dialog',
                'aria-modal': true,
                'aria-label': 'User Card Overlay',

            }}
            focusZoneSettings={{
                disabled: true
            }}
            renderAnchor={(anchorProps) => {
                return (
                    <div
                        {...anchorProps}
                        onKeyDown={undefined}
                        className="cursor-pointer"
                        onClick={() => {
                            setIsOpen(true)
                        }}
                    >
                        {props.ArchorComponent ? props.ArchorComponent :
                            <div style={{
                                backgroundImage: `url("${props.url}")`,
                                position: "relative",
                                width: "80px",
                                height: "80px",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "cover",

                            }}
                                className={styles.imagePreview_box2}

                            >

                            </div>
                        }
                    </div>
                );
            }}

        >
            {props.ViewComponent ? props.ViewComponent :
                <img alt='avatar'
                    src={`${props.url}`}
                    style={{
                        maxWidth: '1000px', // Chiều dài tối đa
                        maxHeight: '500px', // Chiều cao tối đa
                        width: 'auto', // Giữ tỷ lệ gốc
                        height: 'auto', // Giữ tỷ lệ gốc
                        objectFit: 'contain', // Đảm bảo ảnh không bị méo
                    }}
                />
            }



        </AnchoredOverlay >
    );
};

export default ImagePreview;