'use client';

import React, { useState } from "react";
import { IconButton, Text } from "@primer/react";
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { createPortal } from "react-dom";
import styles from './image-preview.module.css';

interface ImageViewerProps {
    images: string[];
    startIndex?: number;
    thumbnailSize?: number;
    maxVisible?: number;
}

const ImageViewer = ({ images, startIndex = 0, thumbnailSize = 100, maxVisible = 2 }: ImageViewerProps) => {
    void startIndex;
    const [current, setCurrent] = useState<number | null>(null);

    const openViewer = (index: number) => setCurrent(index);
    const closeViewer = () => setCurrent(null);
    const prevImage = () => setCurrent((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
    const nextImage = () => setCurrent((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));

    const remaining = images.length - maxVisible;
    const visibleImages = images.slice(0, maxVisible);

    return (
        <>
            <div className="d-flex gap-2 flex-wrap">
                {visibleImages.map((src, i) => {
                    const isLastVisible = i === maxVisible - 1 && remaining > 0;
                    return (
                        <div
                            style={{ width: thumbnailSize, height: thumbnailSize }}
                            key={i}
                            className={styles.imageViewer_box2}
                            onClick={() => openViewer(i)}
                        >
                            <img
                                src={src}
                                alt=""
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.src = '../../../images/noimage.jpg';
                                }}
                                className={styles.imageViewer_box3}
                            />
                            {isLastVisible && (
                                <div className={styles.imageViewer_box4}>
                                    +{remaining}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {current !== null && typeof document !== "undefined" &&
                createPortal(
                    <div
                        onClick={closeViewer}
                        className={styles.imageViewer_box5}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="relative d-flex items-center justify-center flex-col"
                        >
                            {/* Image */}
                            <img
                                src={images[current]}
                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.src = "../../../images/noimage.jpg";
                                }}
                                alt=""
                                className={styles.imageViewer_box7}
                            />

                            {/* Prev */}
                            <div className={styles.imageViewer_box8}>
                                <IconButton
                                    icon={ChevronLeftIcon}
                                    aria-label="Prev"
                                    variant="invisible"
                                    size="large"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        prevImage();
                                    }}
                                    className={styles.imageViewer_iconButton}
                                />
                            </div>

                            {/* Next */}
                            <div className={styles.imageViewer_box9}>
                                <IconButton
                                    icon={ChevronRightIcon}
                                    aria-label="Next"
                                    variant="invisible"
                                    size="large"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        nextImage();
                                    }}
                                    className={styles.imageViewer_iconButton}
                                />
                            </div>

                            {/* Close */}
                            <IconButton
                                icon={XIcon}
                                aria-label="Close"
                                variant="invisible"
                                size="large"
                                onClick={closeViewer}
                                className={styles.imageViewer_iconButton2}
                            />

                            {/* Index */}
                            <Text className={styles.imageViewer_text}>
                                {current + 1} / {images.length}
                            </Text>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default ImageViewer;
