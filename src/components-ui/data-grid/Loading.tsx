'use client';

import { IDataGridColumn } from "./type/IDataGridProps";
import PlaceHolder from "../place-holder";
interface ILoadingProps {
  dataColumn: IDataGridColumn[];
}
const rows = [1, 2, 3];
const Loading = ({ dataColumn }: ILoadingProps) => {
  return (
    <tbody>
      {rows.map((idx) => {
        return (
          <tr key={idx}>
            {dataColumn.filter(x => x.isVisible).map((col, idx) => {
              return (
                <td key={idx}>
                  <div>
                    <PlaceHolder lineNumber={1} />
                  </div>
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
};
export default Loading;
