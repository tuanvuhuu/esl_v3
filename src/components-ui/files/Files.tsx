'use client';

import { TrashIcon, XIcon } from "@primer/octicons-react";
import { ActionList, IconButton } from '@primer/react';
import { IUploadRespone } from "@/components-ui/_adapters/upload";
import { isImgFile } from "@/components-ui/_adapters/utils";
import ImagePreview from "../image-preview";
import LinkS3 from "../link-s3";
import FileType from './FileType';
import styles from './files.module.css';
interface IFilesProps {
    files: IUploadRespone[],
    isReadOnly?: boolean,
    onFileRemove?: (url: string) => void,
    isPreviewImg?: boolean
}
const Files = (props: IFilesProps) => {
    const { files } = props;
    const images = files.filter(x => isImgFile(x.url))
    const others = files.filter(x => !isImgFile(x.url))
    return (
        <div className="w-full">
            {/* {files.length === 0 && <Text text='Files.Empty' />} */}
            {files.length > 0 &&
                <div>
                    {images.length > 0 &&
                        <div>
                            <div className="d-flex flex-wrap gap-1">
                                {images.map((imgFile, idx) => {
                                    return (
                                        <div key={idx}>
                                            <ImagePreview
                                                url={imgFile.url}
                                                ArchorComponent={
                                                    <div style={{
                                                        backgroundImage: `url("${imgFile.url}")`,
                                                        position: "relative",
                                                        width: "80px",
                                                        height: "80px",
                                                        backgroundPosition: "center",
                                                        backgroundRepeat: "no-repeat",
                                                        backgroundSize: "cover",

                                                    }}
                                                        className={styles.files_box3}

                                                    >
                                                        {props.isReadOnly !== true &&
                                                            <IconButton variant='danger'
                                                                className={styles.files_iconButton}
                                                                aria-label=""
                                                                icon={XIcon}
                                                                onClick={() => {
                                                                    props.onFileRemove?.(imgFile.url)
                                                                }}
                                                            />
                                                        }
                                                    </div>
                                                }
                                            />
                                        </div>

                                    );
                                })}
                            </div>
                        </div>
                    }
                    {others.length > 0 &&
                        <ActionList showDividers>
                            {others.map((file, idx) => {
                                return (
                                    <ActionList.LinkItem key={idx} className="d-flex">
                                        {(props.isPreviewImg === undefined
                                            || props.isPreviewImg === false
                                            || (props.isPreviewImg && !isImgFile(file.url))
                                        ) &&
                                            <LinkS3 url={file.url} target="_blank" className={styles.files_linkS3}>
                                                <ActionList.LeadingVisual>
                                                    <FileType file_name={file.file_name} />
                                                </ActionList.LeadingVisual>
                                                {file.file_name}
                                            </LinkS3>
                                        }
                                        {props.isPreviewImg && isImgFile(file.url) &&
                                            <img src={file.url} alt={file.url}
                                                style={{
                                                    width: "100px",
                                                    height: "auto"
                                                }}
                                            />
                                        }
                                        {!props.isReadOnly &&
                                            <ActionList.TrailingVisual>
                                                <IconButton
                                                    className={styles.files_iconButton2}
                                                    aria-label={`Delete: ${idx}`}
                                                    title={`Delete: ${idx}`}
                                                    icon={TrashIcon}
                                                    variant="invisible"
                                                    onClick={() => {
                                                        if (props.onFileRemove) {
                                                            props.onFileRemove(file.url)
                                                        }
                                                    }}
                                                />
                                            </ActionList.TrailingVisual>
                                        }
                                    </ActionList.LinkItem>
                                );
                            })}
                        </ActionList>
                    }

                </div>
            }
        </div>
    );
};

export default Files;