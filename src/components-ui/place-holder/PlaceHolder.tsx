'use client';

import styles from "./place-holder.module.css";

interface IPlaceHolderProps {
    lineNumber?: number;
    className?: string;
    title?: string;
    lineHeight?: number;
}
const PlaceHolder = (props: IPlaceHolderProps) => {
    const lineNumber = props.lineNumber || 3;
    const lines: number[] = [];
    for (let index = 0; index < lineNumber; index++) {
        lines.push(index);
    }
    return (
        <div className={props.className} title={props.title} style={{ lineHeight: props.lineHeight }}>
            {lines.map(x => {
                return (
                    <div key={x} className={styles.loadingLine} style={{ width: `${(x === 1 ? 100 : 55 + ((x * 19) % 45))}%` }}>
                        <div className={styles.activity}></div>
                    </div>
                );
            })}
        </div>
    );
};
export { PlaceHolder };
