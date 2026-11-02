'use client';

import { Pagination } from "@primer/react";
import clsx from "clsx";
import { useContext } from "react";
import { DataTableContainerContext, IDataTableContext } from "./DataTable";
import styles from "./DataTable.module.css";
import Button from "../button";
const Paging = () => {
  const { props, pageIndex, pageSize, setPageIndex, setPageSize, pageCount } =
    useContext<IDataTableContext>(DataTableContainerContext);
  return (
    <>
      <div
        id="paging"
        className={clsx(styles.pagingContainer, "d-flex items-center")}
      >
        <div className="flex-1">
          {props.paging?.pageSizeItems && (
            <div
              className="d-flex items-center"
            >
              <div
                className={styles.paging_box2}
              >
                Page size&nbsp;&nbsp;
              </div>
              {props.paging?.pageSizeItems.map((x) => {
                return (
                  <Button
                    key={x}
                    className={clsx(styles.pageSize, styles.paging_pageSize, (x === pageSize) && styles.paging_pageSize_pageSize)}
                    variant="invisible"
                    onClick={() => {
                      setPageSize(x);
                      setPageIndex(0);
                    }}
                  >
                    {x.toString()}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        <div id="info" className={styles.paging_info}>
          <div
            className={styles.paging_box3}
          >
            {pageIndex * pageSize + 1} -{" "}
            {(pageIndex + 1) * pageSize > props.data.length
              ? props.data.length
              : (pageIndex + 1) * pageSize}{" "}
            of {props.data.length}
          </div>
        </div>
        <div className={styles.paging_box4}>
          {pageCount > 1 && (
            <Pagination
              pageCount={pageCount}
              currentPage={pageIndex + 1}
              showPages={{
                narrow: false,
              }}
              onPageChange={(e, n) => {
                setPageIndex(n - 1);
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Paging;
