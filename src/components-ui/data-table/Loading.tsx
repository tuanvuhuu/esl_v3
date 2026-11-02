'use client';

import { useContext } from 'react';
import PlaceHolder from '../place-holder';
import { DataTableContainerContext, IDataTableContext } from './DataTable';

const Loading = () => {
    const { headerGroups, getTableBodyProps } = useContext<IDataTableContext>(DataTableContainerContext);
    return (
        <tbody {...getTableBodyProps()}>
            {headerGroups.map((headerGroup, hIdx) => (
                <tr {...headerGroup.getHeaderGroupProps()} key={`1-${hIdx}`}>
                    {headerGroup.headers.map((column, idx) => {
                        return (
                            <td
                                {...column.getHeaderProps()}
                                style={{
                                    width: column.placeholderOf
                                        ? column.placeholderOf.width ??
                                          column.placeholderOf.minWidth
                                        : column.width ?? column.minWidth,
                                }}
                                key={`1-${hIdx}-${idx}`}
                            >
                                <PlaceHolder lineNumber={1} />
                            </td>
                        );
                    })}
                </tr>
            ))}
            {headerGroups.map((headerGroup, hIdx) => (
                <tr {...headerGroup.getHeaderGroupProps()} key={`2-${hIdx}`}>
                    {headerGroup.headers.map((column, idx) => {
                        return (
                            <td
                                {...column.getHeaderProps()}
                                style={{
                                    width: column.placeholderOf
                                        ? column.placeholderOf.width ??
                                          column.placeholderOf.minWidth
                                        : column.width ?? column.minWidth,
                                }}
                                key={`2-${hIdx}-${idx}`}
                            >
                                <PlaceHolder lineNumber={1} />
                            </td>
                        );
                    })}
                </tr>
            ))}
            {headerGroups.map((headerGroup, hIdx) => (
                <tr {...headerGroup.getHeaderGroupProps()} key={`3-${hIdx}`}>
                    {headerGroup.headers.map((column, idx) => {
                        return (
                            <td
                                {...column.getHeaderProps()}
                                style={{
                                    width: column.placeholderOf
                                        ? column.placeholderOf.width ??
                                          column.placeholderOf.minWidth
                                        : column.width ?? column.minWidth,
                                }}
                                key={`3-${hIdx}-${idx}`}
                            >
                                <PlaceHolder lineNumber={1} />
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
    );
};

export default Loading;
