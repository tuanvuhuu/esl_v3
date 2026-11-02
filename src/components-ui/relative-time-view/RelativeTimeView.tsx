'use client';

import { RelativeTime, RelativeTimeProps } from '@primer/react';
import moment from 'moment';
import { useCallback, useState } from 'react';

export type IRelativeTimeViewProps = RelativeTimeProps;

const RelativeTimeView = (props: IRelativeTimeViewProps) => {
    const [isShowRawData, setIsShowRawData] = useState(false);
    const toggleViewMode = useCallback(() => {
        setIsShowRawData((prev) => !prev);
    }, []);
    const renderRawData = () => {
        if (props.datetime) {
            return <>{moment(props.datetime).format("HH:mm DD/MM/YYYY")}</>;
        }
        if (props.date) {
            return <>{moment(props.date).format("DD/MM/YYYY")}</>;
        }
        return null;
    };
    return (
        <div className='cursor-pointer' onClick={toggleViewMode}>
            {isShowRawData ? renderRawData() : <RelativeTime {...props} />}
        </div>
    );
};

export default RelativeTimeView;
