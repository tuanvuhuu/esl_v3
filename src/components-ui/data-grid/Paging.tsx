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
    onPagingChanged: (pageIndex: number, pageSize: number) => void
}
const Paging = (props: IPagingProps) => {
    const { pageSizeItems, pageIndex, pageSize, pageCount, totalCount, onPagingChanged } = props;
    return (
        <div id="paging" className="d-flex items-center">
            <div className="flex-1">
                {pageSizeItems && (
                    <div className="d-flex items-center">
                        <div className="fs-0 text-muted">
                            Page size&nbsp;&nbsp;
                        </div>
                        {pageSizeItems.map((x) => {
                            return (
                                <Button
                                    key={x}
                                    // className={clsx(
                                    //     styles.pageSize,
                                    //     x === pageSize ? styles.selected : ""
                                    // )}
                                    variant="invisible"
                                    className={clsx(
                                        styles.pageSizeButton,
                                        x === pageSize && styles.pageSizeSelected,
                                    )}
                                    onClick={() => {
                                        onPagingChanged(0, x)
                                    }}
                                >
                                    {x.toString()}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>
            <div id="info" className={styles.pagingInfo}>
                <div className="text-muted">
                    {pageIndex * pageSize + 1} -{" "}
                    {(pageIndex + 1) * pageSize > totalCount
                        ? totalCount
                        : (pageIndex + 1) * pageSize}{" "}
                    of {totalCount}
                </div>
            </div>
            <div className={styles.pagingNav}>
                {pageCount > 1 && (
                    <Pagination
                        pageCount={pageCount}
                        currentPage={pageIndex + 1}
                        showPages={{
                            narrow: false,
                        }}
                        onPageChange={(e, n) => {

                            onPagingChanged(n - 1, pageSize)
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default Paging;