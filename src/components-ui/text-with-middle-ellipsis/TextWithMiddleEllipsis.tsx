'use client';

import clsx from 'clsx';
import React, { useLayoutEffect, useRef, useState } from 'react';
import styles from './TextWithMiddleEllipsis.module.css';

interface ITextWithMiddleEllipsisProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    text: string;
    /** Số dòng tối đa trước khi bị cắt giữa. Mặc định: 1 */
    lineNumber?: number;
    /** Số ký tự luôn giữ lại ở cuối chuỗi. Mặc định: 6 */
    keepLast?: number;
    /** Cho phép click để xem đầy đủ / thu gọn. Mặc định: true */
    allowToggleText?: boolean;
    isExpanded?: boolean;
}

const buildCandidate = (text: string, headLength: number, keepLast: number): string => {
    const head = text.slice(0, Math.max(headLength, 0));
    const tail = keepLast > 0 ? text.slice(-keepLast) : '';
    return `${head}...${tail}`;
};

/** Cắt chữ ở giữa (giữ lại `keepLast` ký tự cuối), vd tên file: "bao-cao-thang-...2026.xlsx" */
const TextWithMiddleEllipsis = (props: ITextWithMiddleEllipsisProps) => {
    const {
        text,
        lineNumber = 1,
        keepLast = 6,
        allowToggleText,
        isExpanded: isExpandedProp,
        className,
        style,
        onClick,
        ...rest
    } = props;
    const [isExpanded, setIsExpanded] = useState(isExpandedProp ?? false);
    const [prevExpandedProp, setPrevExpandedProp] = useState(isExpandedProp);
    if (isExpandedProp !== prevExpandedProp) {
        setPrevExpandedProp(isExpandedProp);
        setIsExpanded(isExpandedProp ?? false);
    }

    const [displayText, setDisplayText] = useState(text);

    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    const canToggle = allowToggleText !== false;
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (canToggle) {
            setIsExpanded((prev) => !prev);
        }
        onClick?.(e);
    };

    useLayoutEffect(() => {
        const container = containerRef.current;
        const measurer = measureRef.current;
        if (!container || !measurer) return;

        const measure = () => {
            if (isExpanded || !text) {
                setDisplayText(text);
                return;
            }

            const width = container.clientWidth;
            if (width <= 0) {
                setDisplayText(text);
                return;
            }

            measurer.style.width = `${width}px`;
            measurer.style.whiteSpace = lineNumber > 1 ? 'normal' : 'nowrap';

            const computedStyle = getComputedStyle(container);
            const computedLineHeight = parseFloat(computedStyle.lineHeight);
            const lineHeightPx = Number.isNaN(computedLineHeight)
                ? parseFloat(computedStyle.fontSize) * 1.4
                : computedLineHeight;

            const fits = (candidate: string): boolean => {
                measurer.textContent = candidate;
                if (lineNumber <= 1) {
                    return measurer.scrollWidth <= width;
                }
                const usedLines = Math.round(measurer.scrollHeight / lineHeightPx);
                return usedLines <= lineNumber;
            };

            if (fits(text)) {
                setDisplayText(text);
                return;
            }

            // Tìm kiếm nhị phân độ dài phần đầu dài nhất còn vừa khung
            let low = 0;
            let high = Math.max(text.length - keepLast, 0);
            let best = 0;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (fits(buildCandidate(text, mid, keepLast))) {
                    best = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            setDisplayText(buildCandidate(text, best, keepLast));
        };

        measure();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        return () => observer.disconnect();
    }, [text, lineNumber, keepLast, isExpanded]);

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            title={!isExpanded && displayText !== text ? text : undefined}
            className={clsx(
                canToggle && 'cursor-pointer',
                isExpanded
                    ? styles.expanded
                    : lineNumber > 1
                        ? styles.clamped
                        : 'whitespace-nowrap overflow-hidden',
                className,
            )}
            style={{ '--line-clamp': lineNumber, ...style } as React.CSSProperties}
            {...rest}
        >
            {displayText}
            {/* Phần tử ẩn (cùng font với container) dùng để đo độ rộng/chiều cao thực tế của text ứng viên */}
            <div ref={measureRef} className={styles.measure} aria-hidden />
        </div>
    );
};

export default TextWithMiddleEllipsis;
