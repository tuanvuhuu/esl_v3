'use client';

import { ChevronDownIcon, HomeIcon, UploadIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu, Button } from '@primer/react';
import React, { useRef, useState } from 'react';
import { useCommonContext } from './commonContext';
import { NotifyHelper } from './toast';
import { IUploadResult, uploadApi } from './upload';

export interface ISingleUploadProps {
  onUploadSuccess: (data: IUploadResult) => void;
  accept?: string;
  subFolder?: string;
  buttonText?: string;
}

export function Upload({
  onUploadSuccess,
  accept = 'image/*',
  subFolder,
  buttonText = 'Tải tệp lên',
}: ISingleUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadApi.uploadFile(file, subFolder);
      if (res.is_success) {
        onUploadSuccess(res.data);
      } else {
        NotifyHelper.Error(res.message ?? 'Tải tệp lên thất bại');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Button
        leadingVisual={UploadIcon}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? 'Đang tải...' : buttonText}
      </Button>
    </>
  );
}

export interface IMultipleUploadProps {
  onUploadSuccess: (data: Array<{ url: string; file_name: string }>) => void;
  accept?: string;
  subFolder?: string;
  render?: (isUploading?: boolean) => React.ReactNode;
}

export function UploadMultiple({
  onUploadSuccess,
  accept,
  subFolder,
  render,
}: IMultipleUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files = fileList ? Array.from(fileList) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const res = await uploadApi.uploadFiles(files, subFolder);
      if (res.is_success) {
        onUploadSuccess(
          res.data.map((item, idx) => ({
            url: item.url,
            file_name: item.file_name ?? files[idx]?.name ?? 'file',
          })),
        );
      } else {
        NotifyHelper.Error(res.message ?? 'Tải tệp lên thất bại');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <div
        onClick={() => {
          if (!isUploading) inputRef.current?.click();
        }}
        style={{ display: 'inline-block' }}
      >
        {render ? (
          render(isUploading)
        ) : (
          <Button leadingVisual={UploadIcon} disabled={isUploading}>
            {isUploading ? 'Đang tải...' : 'Tải lên'}
          </Button>
        )}
      </div>
    </>
  );
}

export interface ICampusOption {
  id: string;
  name: string;
}

export interface ICampusSelectorProps {
  value?: string;
  onValueChanged?: (id: string) => void;
  placeHolder?: string;
  options?: ICampusOption[];
  leadingVisual?: React.ElementType;
  trailingAction?: React.ElementType;
  variant?: 'default' | 'primary' | 'invisible' | 'danger';
  className?: string;
}

const DEFAULT_CAMPUS_OPTIONS: ICampusOption[] = [
  { id: '', name: 'Tất cả cơ sở' },
];

export function CampusSelector({
  value = '',
  onValueChanged,
  placeHolder = 'Chọn đơn vị cơ sở',
  options = DEFAULT_CAMPUS_OPTIONS,
  leadingVisual = HomeIcon,
  trailingAction = ChevronDownIcon,
  variant = 'invisible',
  className,
}: ICampusSelectorProps): React.JSX.Element {
  const selected = options.find((opt) => opt.id === value);
  return (
    <ActionMenu>
      <ActionMenu.Button
        leadingVisual={leadingVisual}
        trailingAction={trailingAction}
        variant={variant}
        className={className}
      >
        {selected?.name || placeHolder}
      </ActionMenu.Button>
      <ActionMenu.Overlay width="medium">
        <ActionList selectionVariant="single">
          {options.map((opt) => (
            <ActionList.Item
              key={opt.id || '__all__'}
              selected={opt.id === value}
              onSelect={() => onValueChanged?.(opt.id)}
            >
              {opt.name}
            </ActionList.Item>
          ))}
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}

export function LanguageSelection(): React.JSX.Element {
  const { lang, setLang } = useCommonContext();
  return (
    <ActionMenu>
      <ActionMenu.Button size="small" variant="invisible">
        {lang === 'en' ? 'English' : 'Tiếng Việt'}
      </ActionMenu.Button>
      <ActionMenu.Overlay width="small">
        <ActionList selectionVariant="single">
          <ActionList.Item selected={lang !== 'en'} onSelect={() => setLang('vi')}>
            Tiếng Việt
          </ActionList.Item>
          <ActionList.Item selected={lang === 'en'} onSelect={() => setLang('en')}>
            English
          </ActionList.Item>
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
}
