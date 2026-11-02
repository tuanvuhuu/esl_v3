'use client';

import React, { useRef } from "react";
import PlaceHolder from "../place-holder";
import { useLazyLoad } from "@/components-ui/_adapters/hooks";

interface ILazyElementProps {
    children?: React.ReactNode;
    placeholder?: React.ReactNode;
    rootMargin?: string; // mới
}

const LazyElement = (props: ILazyElementProps) => {
    const { children } = props;
    const ref = useRef<HTMLDivElement | null>(null);
    const isVisible = useLazyLoad(ref, { rootMargin: props.rootMargin });

    return (
        <div ref={ref}>
            {isVisible ? children :
                <>
                    {props.placeholder ? props.placeholder :
                        <PlaceHolder lineNumber={1} />
                    }
                </>
            }
        </div>
    );
};

export default LazyElement;
