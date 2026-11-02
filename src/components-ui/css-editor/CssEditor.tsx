'use client';

import { BoldIcon, ItalicIcon } from "@primer/octicons-react";
import { ButtonGroup, FormControl, IconButton } from '@primer/react';
import clsx from 'clsx';
import ColorPicker from "../color-picker";
import TextInput from '../text-input';
import styles from './css-editor.module.css';

export interface ICssEditorValue {
    fontSize: number;
    color: string;
    isBold: boolean;
    isItalic: boolean;
    align: "left" | "center" | "right";
    rowIdx: number;
    sortIdx: number;
    width: number;
}

interface ICssEditorProps {
    value: ICssEditorValue;
    onValueChanged: (value: ICssEditorValue) => void;
}

const AlignLeftIcon = () => {
    return (
        <img
            src='../../images/align-left.png'
            alt='Left'
            style={{
                width: "15px",
            }}
        />
    );
};

const AlignCenterIcon = () => {
    return (
        <img
            src='../../images/align-center.png'
            alt='Center'
            style={{
                width: "15px",
            }}
        />
    );
};

const AlignRightIcon = () => {
    return (
        <img
            src='../../images/align-right.png'
            alt='Right'
            style={{
                width: "15px",
            }}
        />
    );
};

const CssEditor = (props: ICssEditorProps) => {
    const {
        fontSize,
        color,
        isBold,
        isItalic,
        align,
        width,
        rowIdx,
    } = props.value;

    return (
        <div className="d-grid gap-2">
            <FormControl>
                <div className="d-flex gap-1">
                    <TextInput
                        value={fontSize}
                        className={styles.cssEditor_textInput}
                        type='number'
                        min={8}
                        max={30}
                        trailingVisual="px"
                        onChange={(e) => {
                            props.onValueChanged({
                                ...props.value,
                                fontSize: parseInt(e.target.value, 10),
                            });
                        }}
                    />
                    <div>
                        <ColorPicker
                            color={color}
                            onValueChanged={(nextColor) => {
                                props.onValueChanged({
                                    ...props.value,
                                    color: nextColor,
                                });
                            }}
                        />
                    </div>
                    <div>
                        <ButtonGroup>
                            <IconButton
                                icon={BoldIcon}
                                aria-label="Bold"
                                className={clsx("noHoverCss", isBold && styles.cssEditor_iconButton_isBold)}
                                onClick={() => {
                                    props.onValueChanged({ ...props.value, isBold: !isBold });
                                }}
                            />
                            <IconButton
                                icon={ItalicIcon}
                                aria-label="Italic"
                                className={clsx("noHoverCss", isItalic && styles.cssEditor_iconButton2_isItalic)}
                                onClick={() => {
                                    props.onValueChanged({ ...props.value, isItalic: !isItalic });
                                }}
                            />
                        </ButtonGroup>
                    </div>
                    <div className="mr-2">
                        <ButtonGroup>
                            <IconButton
                                icon={AlignLeftIcon}
                                aria-label="Left"
                                className={clsx("noHoverCss", align === "left" && styles.cssEditor_iconButton3_alignLeft)}
                                onClick={() => {
                                    props.onValueChanged({ ...props.value, align: "left" });
                                }}
                            />
                            <IconButton
                                icon={AlignCenterIcon}
                                aria-label="Center"
                                className={clsx("noHoverCss", align === "center" && styles.cssEditor_iconButton4_alignCenter)}
                                onClick={() => {
                                    props.onValueChanged({ ...props.value, align: "center" });
                                }}
                            />
                            <IconButton
                                icon={AlignRightIcon}
                                aria-label="Right"
                                className={clsx("noHoverCss", align === "right" && styles.cssEditor_iconButton5_alignRight)}
                                onClick={() => {
                                    props.onValueChanged({ ...props.value, align: "right" });
                                }}
                            />
                        </ButtonGroup>
                    </div>
                </div>
            </FormControl>
            {rowIdx >= 0 && (
                <div className="d-flex gap-1">
                    <div>
                        <TextInput
                            value={width}
                            type='number'
                            block
                            min={0}
                            max={100}
                            leadingVisual="Kích thước"
                            trailingVisual="%"
                            onChange={(e) => {
                                props.onValueChanged({
                                    ...props.value,
                                    width: parseInt(e.target.value, 10),
                                });
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CssEditor;
