'use client';

import { normalizeChar } from '@/components-ui/_adapters/utils';
import { AnchoredOverlay } from '@primer/react';
import { useMemo, useState } from 'react';
import styles from './user-avatar-text.module.css';
interface IUserAvatarProps {
    url?: string,
    fullName?: string,
    size?: "small" | "medium" | "large" | "xlarge",
    width?: string
}
const UserAvatarText = (props: IUserAvatarProps) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const character = useMemo(() => {
        if (!props.fullName) return "";

        const parts = props.fullName.trim().split(/\s+/);
        let first = parts[0][0].toUpperCase();
        let last = parts[parts.length - 1][0].toUpperCase();

        first = normalizeChar(first);
        last = normalizeChar(last);

        return first + last;
    }, [props.fullName])

    const width = useMemo(() => {
        if (props.size === "small") {
            return "16px";
        }
        if (props.size === "large") {
            return "32px";
        }
        if (props.size === "xlarge") {
            return "48px";
        }
        return "24px";
    }, [props.size])

    return (
        <>
            {props.url && props.url !== 'null' && props.url !== "" &&
                <AnchoredOverlay
                    open={isPreviewOpen}
                    onClose={() => {
                        setIsPreviewOpen(false)
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
                                onClick={() => {
                                    if (props.url)
                                        setIsPreviewOpen(true)
                                }}
                                className="cursor-pointer"
                            >
                                <img alt='avatar' src={`${props.url}`}
                                    width={props.width ?? width}
                                    height={props.width ?? width}
                                    style={{
                                        borderRadius: "50%",

                                    }}
                                />
                            </div>
                        );
                    }}

                >
                    <div onClick={() => {
                        setIsPreviewOpen(false)
                    }}>
                        <img alt='avatar' src={`${props.url}`}
                            width={"auto"}
                            height={"200px"}
                            style={{
                                borderRadius: "8pxs",

                            }}
                        />
                    </div>


                </AnchoredOverlay >

            }
            {(!props.url || props.url === "" || props.url === 'null') &&
                <div
                    className={styles.userAvatarText_box2}>
                    {character}
                </div>

            }
        </>
    );
};

export default UserAvatarText;