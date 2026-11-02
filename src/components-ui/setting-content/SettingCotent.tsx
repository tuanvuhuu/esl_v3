'use client';

import { ChevronDownIcon, HomeIcon } from '@primer/octicons-react';
import { FormControl } from '@primer/react';
import React from 'react';
import { useLayoutState } from '../_adapters/hooks';
import { CampusSelector, ICampusOption } from '../_adapters/uploadComponents';
import Text from '../text';
import styles from './setting-content.module.css';

const sampleImgs = [
  { url: '../../../images/outlook-1.webp' },
  { url: '../../../images/outlook-2.webp' },
  { url: '../../../images/outlook-3.webp' },
  { url: '../../../images/outlook-4.webp' },
  { url: '../../../images/outlook-5.webp' },
  { url: '../../../images/outlook-6.webp' },
  { url: '../../../images/outlook-7.webp' },
  { url: '../../../images/outlook-8.webp' },
  { url: '../../../images/outlook-9.webp' },
  { url: '../../../images/outlook-10.webp' },
];

const colors = ['#0969da', '#E75632', '#D32D4A', '#4FA479', '#8C1AF0'];

export interface ISettingContentProps {
  campusOptions?: ICampusOption[];
  onCampusChanged?: (id: string) => void;
}

const SettingCotent = (props: ISettingContentProps = {}): React.JSX.Element => {
  const {
    dm_dvcs_id,
    mainColor,
    backgroundImUrl,
    setDmDvcsId,
    setMainColor,
    setBackgroundImUrl,
  } = useLayoutState();

  return (
    <div className="d-grid gap-3">
      <div>
        <div className="d-grid gap-2">
          <Text text="Thông tin" className="fs-3 fw-bolder" />
          <div className="d-grid gap-3">
            <FormControl>
              <FormControl.Label>Đơn vị cơ sở đang làm việc</FormControl.Label>
              <div className="d-flex gap-2">
                <CampusSelector
                  value={dm_dvcs_id}
                  options={props.campusOptions}
                  trailingAction={ChevronDownIcon}
                  variant="invisible"
                  onValueChanged={(id) => {
                    setDmDvcsId(id);
                    props.onCampusChanged?.(id);
                  }}
                  placeHolder="Chọn đơn vị cơ sở"
                  leadingVisual={HomeIcon}
                  className={styles.pillCombobox}
                />
              </div>
            </FormControl>
          </div>
        </div>
        <div className="d-grid gap-2 mt-3">
          <Text text="Giao diện" className="fs-3 fw-bolder" />
          <div className="d-grid gap-3">
            <FormControl>
              <FormControl.Label>Hình nền</FormControl.Label>
              <div className="d-flex gap-2">
                {sampleImgs.map((img) => (
                  <div
                    style={{
                      backgroundImage: `url("${img.url}")`,
                      boxShadow:
                        img.url === backgroundImUrl
                          ? '0 0 0 3px color-mix(in srgb, var(--app-accent-emphasis) 30.2%, transparent)'
                          : undefined,
                    }}
                    key={img.url}
                    className={styles.imgItem}
                    onClick={() => {
                      setBackgroundImUrl(img.url);
                    }}
                  >
                    &nbsp;
                  </div>
                ))}
              </div>
            </FormControl>
            <FormControl>
              <FormControl.Label>Màu sắc</FormControl.Label>
              <div className="d-flex gap-2">
                {colors.map((color) => (
                  <div
                    style={{
                      backgroundColor: color,
                      boxShadow:
                        mainColor === color
                          ? '0 0 0 3px color-mix(in srgb, var(--app-accent-emphasis) 30.2%, transparent)'
                          : undefined,
                    }}
                    key={color}
                    className={styles.colorItem}
                    onClick={() => {
                      setMainColor(color);
                    }}
                  >
                    &nbsp;
                  </div>
                ))}
              </div>
            </FormControl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingCotent;
