'use client';

import { Checkbox } from '@primer/react';
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from "@primer/octicons-react"
import CssEditor, { ICssEditorValue } from '../css-editor/CssEditor';
import styles from './css-editor-element.module.css';
export interface ICssEditorElementData {
    elementId: string,
    elementText: string,
    isDisplay: boolean,
    cssValue?: ICssEditorValue
}
export interface ICssEditorElementProps {
    data: ICssEditorElementData
    onValueChanged: (value?: ICssEditorElementData) => void
}
const CssEditorElement = (props: ICssEditorElementProps) => {
    const [isShowDetail, setIsShowDetail] = useState(false);

    return (
        <div
            className={styles.cssEditorElement_box}
        >
            <div className="d-flex">
                <div id='display'>
                    <Checkbox checked={props.data.isDisplay}
                        onChange={(e) => {
                            props.onValueChanged({
                                ...props.data,
                                isDisplay: e.target.checked
                            })
                        }}
                    />
                </div>
                <div className={styles.cssEditorElement_box3}>
                    {props.data.elementText}
                </div>
                <div className="cursor-pointer"
                    onClick={() => {
                        setIsShowDetail(!isShowDetail)
                    }}
                >
                    {isShowDetail ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </div>
            </div>
            {isShowDetail &&
                <div className={styles.cssEditorElement_box5}>
                    <CssEditor
                        value={
                            props.data.cssValue ??
                            {
                                color: "#1E1E1E",
                                fontSize: 14,
                                align: "left",
                                isBold: false,
                                isItalic: false,
                                rowIdx:0,
                                sortIdx:0,
                                width:0
                            }
                        }
                        onValueChanged={(cssValue) => {
                            
                            props.onValueChanged({
                                ...props.data,
                                cssValue: cssValue
                            })

                        }}
                    />
                </div>
            }
        </div>
    );
};

export default CssEditorElement;