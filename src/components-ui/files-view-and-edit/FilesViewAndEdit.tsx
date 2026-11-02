'use client';

import { UploadMultiple as UploadMulitple } from '@/components-ui/_adapters/uploadComponents';
import { UploadIcon } from '@primer/octicons-react';
import React from 'react';
import Button from '../button';
import FilesView from './FilesView';

export interface IFileViewAndEditData {
    url: string;
    file_name: string;
    description?: string;
}

interface IFilesViewAndEditProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "value" | "onValueChanged"> {
    value?: IFileViewAndEditData[];
    onValueChanged?: (files: IFileViewAndEditData[]) => void;
}

const FilesViewAndEdit = (props: IFilesViewAndEditProps) => {
    const files = props.value ?? [];
    return (
        <div className="d-grid gap-0">
            <UploadMulitple
                onUploadSuccess={(data) => {
                    props.onValueChanged?.([
                        ...files,
                        ...data.map((upload) => {
                            return {
                                file_name: upload.file_name,
                                url: upload.url,
                            };
                        }),
                    ]);
                }}
                render={(isUploading?: boolean) => {
                    return (
                        <Button
                            isLoading={isUploading}
                            leadingVisual={UploadIcon}
                            text={`${files.length > 0 ? 'Thêm file' : 'Tải lên'}`}
                        />
                    );
                }}
            />
            <FilesView
                value={files}
                onRemoveClick={(file) => {
                    props.onValueChanged?.([...files.filter((f) => f.url !== file.url)]);
                }}
            />
        </div>
    );
};

export default FilesViewAndEdit;
