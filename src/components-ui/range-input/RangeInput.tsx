'use client';

import "./RangeInput.css";

interface IRangeInputProps {
    id: string;
    value: number;
    // min/max/step giữ mặc định 0/100/1 (thang phần trăm) như hành vi cũ nếu không truyền vào
    min?: number;
    max?: number;
    step?: number;
    onValueChanged: (value: number) => void;
}

const RangeInput = (props: IRangeInputProps) => {
    const min = props.min ?? 0;
    const max = props.max ?? 100;
    // % vị trí con trượt trong thanh, quy đổi theo [min, max] chứ không phải mặc định coi value là %
    const percent = max === min ? 0 : ((props.value - min) / (max - min)) * 100;

    return (
        <>
            <style>
                {`
          .slider${props.id}::-webkit-slider-runnable-track {
            background: linear-gradient(to right, var(--secondary) ${percent}%, #ddd ${percent}%);
            border-radius: 0.4375rem;
            height: 0.4375rem;
          }
          .slider${props.id}::-moz-range-track {
            background: linear-gradient(to right, var(--secondary) ${percent}%, #ddd ${percent}%);
            border-radius: 0.4375rem;
            height: 0.4375rem;
          }
        `}
            </style>

            <input
                type='range'
                id={props.id}
                className={"slider" + props.id}
                min={min}
                max={max}
                step={props.step ?? 1}
                value={props.value}
                style={{
                    width: "100%",
                }}
                onChange={(e) => {
                    props.onValueChanged(parseFloat(e.target.value));
                }}
            />
        </>
    );
};

export default RangeInput;
