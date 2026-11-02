'use client';

import clsx from 'clsx';
import React, { useState } from 'react';
import styles from './TextWithEllipse.module.css';

interface ITextWithEllipseProps {
    text: string;
    lineNumber?: number;
    allowToggleText?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const TextWithEllipse = (props: ITextWithEllipseProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { text, lineNumber = 1, allowToggleText } = props;

    const toggleText = () => {
        if (allowToggleText !== false) {
            setIsExpanded((prev) => !prev);
        }
    };

    return (
        <div
            onClick={toggleText}
            className={clsx(
                styles.text,
                allowToggleText !== false && styles.toggleable,
                !isExpanded && styles.clamped,
                props.className,
            )}
            style={{ '--line-clamp': lineNumber, ...props.style } as React.CSSProperties}
        >
            {text}
        </div>
    );
};

export default TextWithEllipse;
