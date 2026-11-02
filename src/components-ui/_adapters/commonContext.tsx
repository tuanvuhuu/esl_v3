'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { defaultTranslations } from './localizedResourceMap';

export interface ICommonUser {
  full_name?: string;
  username?: string;
  avatar?: string;
}

export interface ICommonContextValue {
  translate: (key?: string) => string;
  hasPermission: (permission?: string) => boolean;
  lang: string;
  setLang: (lang: string) => void;
  dm_dvcs_id: string;
  setDmDvcsId: (id: string) => void;
  mainColor: string;
  setMainColor: (color: string) => void;
  backgroundImUrl: string;
  setBackgroundImUrl: (url: string) => void;
  createUUID: () => string;
  user?: ICommonUser;
}

const defaultTranslate = (s?: string): string => {
  if (!s) return '';
  return defaultTranslations[s] ?? s;
};

const defaultContextValue: ICommonContextValue = {
  translate: defaultTranslate,
  hasPermission: () => true,
  lang: 'vi',
  setLang: () => undefined,
  dm_dvcs_id: '',
  setDmDvcsId: () => undefined,
  mainColor: '',
  setMainColor: () => undefined,
  backgroundImUrl: '',
  setBackgroundImUrl: () => undefined,
  createUUID: () => uuidv4(),
};

export const CommonContext = createContext<ICommonContextValue>(defaultContextValue);

export interface ICommonProviderProps {
  children: React.ReactNode;
  value?: Partial<ICommonContextValue>;
}

export function CommonProvider({ children, value }: ICommonProviderProps): React.JSX.Element {
  const [lang, setLang] = useState<string>(value?.lang ?? 'vi');
  const [dmDvcsId, setDmDvcsId] = useState<string>(value?.dm_dvcs_id ?? '');
  const [mainColor, setMainColor] = useState<string>(value?.mainColor ?? '');
  const [backgroundImUrl, setBackgroundImUrl] = useState<string>(value?.backgroundImUrl ?? '');

  const createUUID = useCallback(() => uuidv4(), []);

  const mergedValue = useMemo<ICommonContextValue>(
    () => ({
      translate: value?.translate ?? defaultTranslate,
      hasPermission: value?.hasPermission ?? (() => true),
      lang: value?.lang ?? lang,
      setLang: value?.setLang ?? setLang,
      dm_dvcs_id: value?.dm_dvcs_id ?? dmDvcsId,
      setDmDvcsId: value?.setDmDvcsId ?? setDmDvcsId,
      mainColor: value?.mainColor ?? mainColor,
      setMainColor: value?.setMainColor ?? setMainColor,
      backgroundImUrl: value?.backgroundImUrl ?? backgroundImUrl,
      setBackgroundImUrl: value?.setBackgroundImUrl ?? setBackgroundImUrl,
      createUUID: value?.createUUID ?? createUUID,
      user: value?.user,
    }),
    [lang, dmDvcsId, mainColor, backgroundImUrl, createUUID, value],
  );

  return <CommonContext.Provider value={mergedValue}>{children}</CommonContext.Provider>;
}

export function useCommonContext(): ICommonContextValue {
  return useContext(CommonContext);
}
