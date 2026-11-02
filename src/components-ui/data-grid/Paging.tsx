'use client';

import { Pagination } from '@primer/react';
import clsx from 'clsx';
import Button from '../button';
import styles from './DataGrid.module.css';

interface IPagingProps {
  pageSizeItems?: number[];
  pageSize: number;
  pageIndex: number;
  pageCount: number;
  totalCount: number;
  onPagingChanged: (pageIndex: number, pageSize: number) => void;
}

const Paging = (props: IPagingProps) => {
  const { pageSizeItems, pageIndex, pageSize, pageCount, totalCount, onPagingChanged } = props;
  return (
    <div id="paging" className="d-flex flex-wrap items-center gap-2">
      <div className="flex-1">
        {pageSizeItems && (
          <div className="d-flex items-center gap-1">
            <div className="fs-0 text-muted">Số dòng&nbsp;</div>
            {pageSizeItems.map((x) => (
              <Button
                key={x}
                variant="invisible"
                className={clsx(
                  styles.pageSizeButton,
                  x === pageSize && styles.pageSizeSelected,
                )}
                onClick={() => {
                  onPagingChanged(0, x);
                }}
              >
                {x.toString()}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div id="info" className={styles.pagingInfo}>
        <div className="text-muted fs-0">
          {pageIndex * pageSize + 1} –{' '}
          {(pageIndex + 1) * pageSize > totalCount ? totalCount : (pageIndex + 1) * pageSize} / {totalCount}
        </div>
      </div>
      <div className={styles.pagingNav}>
        {pageCount > 1 && (
          <Pagination
            pageCount={pageCount}
            currentPage={pageIndex + 1}
            showPages={{ narrow: false }}
            onPageChange={(e, n) => {
              e.preventDefault();
              onPagingChanged(n - 1, pageSize);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Paging;
