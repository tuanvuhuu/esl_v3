'use client';

import styles from './HtmlEditor.module.css';

interface IHtmlViewProps {
    value: string;
    height?: number;
    onFocusIn?: () => void;
}

const HtmlView = (props: IHtmlViewProps) => {
    const { value, onFocusIn } = props;
    return (
        <div className={styles.htmlView} onClick={onFocusIn}>
            <div dangerouslySetInnerHTML={{ __html: value }} />
        </div>
    );
};

export default HtmlView;
