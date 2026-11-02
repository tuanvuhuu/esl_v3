import {
    DataTableRowRecord,
    eSortMode,
    IColumn,
    ICondition,
    IExpression,
} from "./DataTable";

export const removeAccents = (str: string) => {
    if (!str) return str;
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
};

export const dynamicSort = (property: string, mode: eSortMode) => {
    const sortOrder = mode === eSortMode.ASC ? 1 : -1;
    return function (a: DataTableRowRecord, b: DataTableRowRecord) {
        const valA = a[property] as string | number;
        const valB = b[property] as string | number;
        const result = valA < valB ? -1 : valA > valB ? 1 : 0;
        return result * sortOrder;
    };
};

export const handleSearch = (
    columns: IColumn[],
    data: DataTableRowRecord[],
    key: string,
): DataTableRowRecord[] => {
    const normalizedKey = removeAccents(key.toLowerCase());
    const searchableColumns = columns.filter((col) => col.dataField);
    return data.filter((item) =>
        searchableColumns.some((col) => {
            const value = item[`${col.dataField}`];
            return (
                Boolean(value) &&
                removeAccents(String(value).toLowerCase()).includes(normalizedKey)
            );
        }),
    );
};

export const handleFilter = (
    conditions: ICondition[],
    data: DataTableRowRecord[],
    logicOperator: string,
): DataTableRowRecord[] => {
    const filterExpression = conditions
        .map((cond): IExpression => [cond.field, cond.operator, cond.value])
        .reduce<Array<IExpression | string>>(
            (acc, curr, i) => (i > 0 ? [...acc, logicOperator, curr] : [curr]),
            [],
        );

    return data.filter((item) => {
        let result = true;
        let currentOperator = "and";

        for (let i = 0; i < filterExpression.length; i++) {
            const expr = filterExpression[i];
            if (typeof expr === "string") {
                currentOperator = expr;
                continue;
            }
            const [field, operator, value]: IExpression = expr;
            const itemValue = item[field];

            let conditionResult: boolean;
            switch (operator) {
                case "equals":
                    conditionResult = itemValue === value;
                    break;
                case "contains":
                    conditionResult = String(itemValue ?? "")
                        .toLowerCase()
                        .includes(String(value ?? "").toLowerCase());
                    break;
                case "greaterThan":
                    conditionResult = Number(itemValue) > Number(value);
                    break;
                case "lessThan":
                    conditionResult = Number(itemValue) < Number(value);
                    break;
                case "greaterThanOrEqual":
                    conditionResult = Number(itemValue) >= Number(value);
                    break;
                case "lessThanOrEqual":
                    conditionResult = Number(itemValue) <= Number(value);
                    break;
                default:
                    conditionResult = true;
            }
            result =
                currentOperator === "and"
                    ? result && conditionResult
                    : result || conditionResult;
        }
        return result;
    });
};
