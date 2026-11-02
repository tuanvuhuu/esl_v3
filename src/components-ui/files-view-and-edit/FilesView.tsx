'use client';

import { isImgFile } from '@/components-ui/_adapters/utils';
import { TrashIcon } from '@primer/octicons-react';
import { ActionList, IconButton, Link } from '@primer/react';
import clsx from 'clsx';
import React from 'react';
import FileType from '../files/FileType';
import QuickViewHover from '../quick-view-hover';
import TextWithEllipse from '../text-with-ellipse';
import { IFileViewAndEditData } from './FilesViewAndEdit';
import styles from './files-view-and-edit.module.css';

interface IFilesViewProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "value" | "onValueChanged"> {
    value?: IFileViewAndEditData[];
    onRemoveClick?: (file: IFileViewAndEditData) => void;
}

const FilesView = (props: IFilesViewProps) => {
    const { value } = props;
    const files = value ?? [];
    return (
        <ActionList variant='full' showDividers>
            {files.map((file) => {
                const isImg = isImgFile(file.url);
                return (
                    <ActionList.Item key={file.url}>
                        <ActionList.LeadingVisual>
                            {!isImg && <FileType file_name={file.url} />}
                            {isImg && (
                                <QuickViewHover
                                    renderAnchor={(isHovered) => {
                                        return (
                                            <div
                                                style={{ backgroundImage: `url(${file.url})` }}
                                                className={clsx(styles.filesView_box, isHovered && styles.filesView_box_isHovered)}
                                            />
                                        );
                                    }}
                                    renderOverlay={() => {
                                        return <img src={file.url} alt={file.file_name || ''} width={200} />;
                                    }}
                                />
                            )}
                        </ActionList.LeadingVisual>
                        <Link href={file.url} target='_blank' className={styles.filesView_link}>
                            <TextWithEllipse text={file.file_name} />
                        </Link>
                        {props.onRemoveClick && (
                            <ActionList.TrailingVisual>
                                <IconButton
                                    icon={TrashIcon}
                                    aria-label='Xóa file này'
                                    variant='invisible'
                                    onClick={() => {
                                        props.onRemoveClick?.(file);
                                    }}
                                    className={styles.filesView_iconButton}
                                />
                            </ActionList.TrailingVisual>
                        )}
                    </ActionList.Item>
                );
            })}
        </ActionList>
    );
};

export default FilesView;
