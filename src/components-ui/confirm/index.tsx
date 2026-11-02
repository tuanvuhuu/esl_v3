'use client';

// = DialogWidth / DialogHeight của Dialog (drafts) — khai báo lại để không import đường dẫn nội bộ lib-esm
type DialogWidth = 'small' | 'medium' | 'large' | 'xlarge';
type DialogHeight = 'small' | 'large' | 'auto';
import React from 'react';
import Modal from '../modal';
import Text from '../text';
import Button from '../button';
import styles from './confirm.module.css';
type AnimationConfrimProps = {
    icon?: string,
    // text: string,
    text_confirm_button?: string,
    text_close_button?: string,
    onConfirmed: () => void,
    onClose: () => void,
    type?: 'default' | 'primary' | 'danger' | 'success',
    size?: "small" | "large",
    is_saving?: boolean | false,
    animationOf?: string,
    iconComponent?: React.ReactNode,
    text?: string,
    closeButtonText?: string,
    confirmButtonText?: string,
    children?: React.ReactNode,
    title?: string,
    subtitle?: string,
    width?: DialogWidth,
    height?: DialogHeight,
    isSaving?: boolean
}
type DefaultConfrimProps = {
    icon?: string,
    text_confirm_button?: string,
    text_close_button?: string,
    onConfirmed: () => void,
    onClose: () => void,
    size?: "small" | "large",
    is_saving?: boolean | false,
    // onConfirm: () => void,
    // onCancel: () => void,
    type?: 'default' | 'primary' | 'danger' | 'success',
    iconComponent?: React.ReactNode,
    text?: string,
    closeButtonText?: string,
    confirmButtonText?: string,
    children?: React.ReactNode,
    title?: string,
    subtitle?: string,
    width?: DialogWidth,
    height?: DialogHeight,
    isSaving?: boolean
}
const AnimationConfirm = (props: AnimationConfrimProps) => {
    // const [closePopUp, setClosePopUp] = useState<boolean>(false);
    const { onClose, onConfirmed } = props;
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            // title={props.title ?? "Xác nhận"}
            subtitle={props.subtitle}
            width={props.width ?? "medium"}
            height={props.height ?? "auto"}
            renderHeader={() => {
                return (
                    <div className={styles.animationConfirm_box}>
                        {props.title ?? "Confirm"}
                    </div>
                );
            }}
        >
            <div className={styles.animationConfirm_box2}>
                {props.iconComponent && <div>
                    {props.iconComponent}
                </div>
                }
                {props.text && <div>
                    <Text text={props.text} className={styles.animationConfirm_text} />
                </div>}

            </div>
            {props.children}
            <div className={styles.animationConfirm_box3}>

                <Button text='Base.Label.Confirm' variant={props.type === "success" ? "primary" : "danger"}
                    onClick={onConfirmed}
                    isLoading={props.isSaving ?? props.is_saving}
                    size='medium'
                />
                <Button text='Base.Label.Cancel'
                    onClick={onClose}
                    size='medium'
                    className={styles.animationConfirm_button}
                />
            </div>
        </Modal>

    );
}
const DefaultConfirm = (props: DefaultConfrimProps) => {
    const { onClose, onConfirmed } = props;

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            // title={props.title ?? "Xác nhận"}
            subtitle={props.subtitle}
            width={props.width ?? "medium"}
            height={props.height ?? "auto"}
            renderHeader={() => {
                return (
                    <div className={styles.defaultConfirm_box}>
                        {props.title ?? "Confirm"}
                    </div>
                );
            }}
        >
            <div className={styles.defaultConfirm_box2}>
                {props.iconComponent && <div>
                    {props.iconComponent}
                </div>
                }
                {props.text && <div>
                    <Text text={props.text} className={styles.animationConfirm_text} />
                </div>}

            </div>
            {props.children}
            <div className={styles.defaultConfirm_box3}>

                <Button text='Base.Label.Confirm' variant={props.type === "success" ? "primary" : "danger"}
                    onClick={onConfirmed}
                    isLoading={props.isSaving}
                    size='medium'
                />
                <Button text='Base.Label.Cancel'
                    onClick={onClose}
                    size='medium'
                    className={styles.animationConfirm_button}
                />
            </div>
        </Modal>

    );
}


export { AnimationConfirm, DefaultConfirm };

