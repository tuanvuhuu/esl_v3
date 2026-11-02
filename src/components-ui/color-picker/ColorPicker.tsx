'use client';

import { useState } from 'react';
import { HexColorPicker } from "react-colorful";
import Modal from '../modal';
import TextInput from '../text-input';
import styles from './color-picker.module.css';
interface IColorPickerProps {
    color: string,
    onValueChanged: (color: string) => void
}
const ColorPicker = (props: IColorPickerProps) => {
    // Ensure we always have a valid color value
    const safeColor = props.color && props.color.trim() !== '' ? props.color : "#000000";
    const [isShowPicker, setIsShowPicker] = useState(false);

    return (
        <div >
            <div>
                <TextInput value={safeColor}
                    className={styles.colorPicker_textInput}
                    onChange={(e) => {
                        props.onValueChanged(e.target.value || "#000000")
                    }}
                    trailingVisual={<>
                        <div style={{ backgroundColor: safeColor }} className={styles.colorPicker_box}
                            onClick={() => {
                                setIsShowPicker(true)
                            }}
                        >
                            &nbsp;
                        </div>
                    </>}
                />
            </div>
            {isShowPicker &&

                <Modal
                    title="Chọn màu"
                    isOpen={true}
                    width={"small"}
                    onClose={() => {
                        setIsShowPicker(false)
                    }}
                >
                    <div className="d-flex flex-col justify-center items-center">
                        <HexColorPicker color={safeColor} onChange={(newColor) => {
                            // setColor(color)
                            props.onValueChanged(newColor)
                        }} />

                    </div>
                </Modal>
            }
        </div>
    );
};

export default ColorPicker;