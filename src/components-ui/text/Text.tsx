'use client';

import { useCommonContext } from '@/components-ui/_adapters/commonContext';
export interface IMyTextProps {
    text: string
    className?: string
    style?: React.CSSProperties
}
const MyText = (props: IMyTextProps) => {
    const { translate } = useCommonContext();
    return (
        <span className={props.className} style={props.style}>
            {translate(props.text ?? "")}
        </span>
    );
};

export default MyText;
