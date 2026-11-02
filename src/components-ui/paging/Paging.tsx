'use client';

import { Pagination } from '@primer/react';
import clsx from 'clsx';
import { IPagingResultBase } from '@/components-ui/_adapters/upload';
import Button from '../button';
import styles from './Paging.module.css';

export interface IPagingData extends IPagingResultBase {
  page_size_items?: number[];
  page_index: number;
}

interface IPagingProps {
  data: IPagingData;
  onValueChanged: (data: IPagingData) => void;
}

const Paging = (props: IPagingProps) => {
  return (
    <div id="paging" className={clsx(styles.pagingContainer, 'd-flex flex-wrap items-center gap-2')}>
      <div className="flex-1">
        {props.data?.page_size_items && (
          <div className="d-flex items-center gap-1">
            <div className="fs-0 text-muted">Số dòng&nbsp;</div>
            {props.data.page_size_items.map((x) => (
              <Button
                key={x}
                className={clsx(
                  'text-default fw-normal',
                  x === props.data.page_size && 'bg-accent-emphasis text-on-emphasis',
                )}
                variant="invisible"
                onClick={() => {
                  props.onValueChanged({
                    ...props.data,
                    page_size: x,
                    page_index: 0,
                  });
                }}
              >
                {x.toString()}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div id="info" className={clsx(styles.paging_info, 'text-center')}>
        <div className="text-muted fs-0">
          {props.data.total_count === 0 ? 0 : props.data.page_index * props.data.page_size + 1} –{' '}
          {(props.data.page_index + 1) * props.data.page_size > props.data.total_count
            ? props.data.total_count
            : (props.data.page_index + 1) * props.data.page_size}{' '}
          / {props.data.total_count}
        </div>
      </div>
      <div className="flex-1 d-flex justify-end">
        {props.data.page_count > 1 && (
          <Pagination
            pageCount={props.data.page_count}
            currentPage={props.data.page_index + 1}
            showPages={{ narrow: false }}
            onPageChange={(e, n) => {
              e.preventDefault();
              props.onValueChanged({
                ...props.data,
                page_index: n - 1,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Paging;
