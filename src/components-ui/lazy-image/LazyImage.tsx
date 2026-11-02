'use client';

import { useLazyLoad } from "@/components-ui/_adapters/hooks";
import { CSSProperties, memo, useRef } from "react";

// LazyImage.tsx
interface ILazyImageProps {
    src: string;
    alt?: string;
    placeholder?: string;
    style?: CSSProperties;
    className?: string;
    rootMargin?: string; // mới
}

const LazyImage = memo((props: ILazyImageProps) => {
    const ref = useRef<HTMLImageElement>(null);
    const isVisible = useLazyLoad(ref, { rootMargin: props.rootMargin });

    return (
        <img
            className={props.className}
            ref={ref}
            src={isVisible ? props.src : (props.placeholder ?? `images/img-placeholder.svg`)}
            alt={props.alt ?? "image"}
            style={props.style}
            loading="lazy"
        />
    );
});
LazyImage.displayName = "LazyImage";
export default LazyImage;
