'use client';

import clsx from 'clsx';
import styles from "./Steps.module.css";
import { useCommonContext } from '@/components-ui/_adapters/commonContext';

export interface IStepData {
    id: number,
    name: string,
    is_active: boolean
}
interface IStepsProps {
    steps: IStepData[],
    onChangedStep?: (step: number) => void
}
const Steps = (props: IStepsProps) => {
    const { translate } = useCommonContext();
    return (
        <div className={styles.steps}>
            {[...props.steps.slice(0, -1)].map((f, fIdx) => {
                return (
                    <div key={fIdx}
                        className={clsx(styles.step, f.is_active ? styles.is_active : "", fIdx === props.steps.length - 1 ? styles.step_end : "", "cursor-pointer")}
                        onClick={() => {
                            if (props.onChangedStep) props.onChangedStep(f.id)
                        }}
                    >
                        <div className={clsx(styles.step_count, f.is_active ? styles.steps_stepCount_fIsActive : styles.steps_stepCount_notFIsActive)}
                        >{f.id}</div>
                        <div className={styles.step_text}>{translate(f.name)}</div>
                        {fIdx !== props.steps.length - 1 && <div className={styles.step_arrow}></div>}
                    </div>
                );
            })}

            <div className={clsx(styles.step_end, "cursor-pointer")}
                onClick={() => {
                    if (props.onChangedStep) props.onChangedStep(props.steps.at(-1)?.id || 0)
                }}>
                <div className={clsx(styles.step_count, (props.steps.at(-1)?.is_active) ? styles.steps_stepCount2_atIsActive : styles.steps_stepCount2_notAtIsActive)}
                >{props.steps.at(-1)?.id}</div>
                <div className={styles.step_text}>
                    {translate(props.steps.at(-1)?.name || "")}
                </div>
            </div>
        </div>
    );
};

export default Steps;