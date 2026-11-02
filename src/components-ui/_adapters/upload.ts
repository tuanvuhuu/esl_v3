'use client';

import { uploadAsStaff } from '@/lib/upload-client';

export interface IUploadResult {
  id?: number | string;
  url: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface IUploadRespone {
  id?: number | string;
  url: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
}

export type IUploadResponse = IUploadRespone;

export interface IPagingResultBase {
  page_size: number;
  total_count: number;
  page_count: number;
  page_index?: number;
}

export interface IPagingResult<T = unknown> extends IPagingResultBase {
  data: T[];
}

export interface IApiResult<T> {
  is_success: boolean;
  message?: string;
  data: T;
}

export type UploadFileHandler = (
  file: File,
  subFolder?: string,
  dmDvcsId?: number | string,
) => Promise<IApiResult<IUploadResult>>;

let customUploadHandler: UploadFileHandler | null = null;

export function configureUploadHandler(handler: UploadFileHandler | null): void {
  customUploadHandler = handler;
}

async function defaultUploadSingle(
  file: File,
  subFolder?: string,
  dmDvcsId?: number | string,
): Promise<IApiResult<IUploadResult>> {
  if (customUploadHandler) {
    return customUploadHandler(file, subFolder, dmDvcsId);
  }
  try {
    const res = await uploadAsStaff(file);
    if (res.ok) {
      return {
        is_success: true,
        data: {
          id: res.fileId,
          url: `/api/files/${res.fileId}`,
          file_name: res.name || file.name,
          file_size: file.size,
          file_type: file.type,
        },
      };
    }
    return {
      is_success: false,
      message: res.message,
      data: { url: '', file_name: file.name },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không tải được tệp lên';
    return {
      is_success: false,
      message,
      data: { url: '', file_name: file.name },
    };
  }
}

export const uploadApi = {
  uploadFile: async (
    file: File,
    subFolder?: string,
    dmDvcsId?: number | string,
  ): Promise<IApiResult<IUploadResult>> => {
    return defaultUploadSingle(file, subFolder, dmDvcsId);
  },

  uploadFiles: async (
    files: File[],
    subFolder?: string,
    dmDvcsId?: number | string,
  ): Promise<IApiResult<IUploadResult[]>> => {
    const uploaded: IUploadResult[] = [];
    for (const file of files) {
      const single = await defaultUploadSingle(file, subFolder, dmDvcsId);
      if (!single.is_success) {
        return {
          is_success: false,
          message: single.message ?? 'Tải tệp lên thất bại',
          data: uploaded,
        };
      }
      uploaded.push(single.data);
    }
    return {
      is_success: true,
      data: uploaded,
    };
  },
};

export interface IMultiUploadPayload {
  status: 'success' | 'error';
  images: string[];
  count: number;
  message?: string;
}

export const apiClient = {
  upload: async (
    path: string,
    formData: FormData,
  ): Promise<IApiResult<IMultiUploadPayload>> => {
    void path;
    const entries = formData.getAll('files');
    const files = entries.filter((entry): entry is File => entry instanceof File);
    const res = await uploadApi.uploadFiles(files);
    if (!res.is_success) {
      return {
        is_success: false,
        message: res.message,
        data: { status: 'error', images: [], count: 0, message: res.message },
      };
    }
    const urls = res.data.map((item) => item.url);
    return {
      is_success: true,
      data: {
        status: 'success',
        images: urls,
        count: urls.length,
      },
    };
  },

  delete: async (path: string): Promise<IApiResult<null>> => {
    void path;
    return { is_success: true, data: null };
  },
};

export interface INhanVienDetail {
  id: number;
  avatar?: string;
  [key: string]: unknown;
}

export const nhanVienApi = {
  selectDetail: async (id: number): Promise<IApiResult<INhanVienDetail>> => {
    return { is_success: true, data: { id } };
  },
  saveChange: async (data: INhanVienDetail): Promise<IApiResult<INhanVienDetail>> => {
    return { is_success: true, data };
  },
};
