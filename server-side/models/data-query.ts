
import { AddonData } from "@pepperi-addons/papi-sdk";

export interface DataQuery extends AddonData {
    Type: DataType,
    Name: string;
    Description?: string;
    Series: Serie[],
    DynamicFilterFields: [],
    Filter: {},
    Scope: {
        User: UserType,
        Account: AccountType
    }
}

export interface GroupBy {
    FieldID: string;
    Interval?: number;
    IntervalUnit?: IntervalUnit;
    Top?: Top;
}

export interface Serie {
    Name: string,
    Label: string,
    Resource: ResourceType,
    GroupBy?: GroupBy[],
    AggregatedFields: AggregatedField[];
    AggregatedParams?: AggregatedParam[],
    Interval?: number;
    IntervalUnit?: IntervalUnit;
    BreakBy: BreakBy;
}


export interface BreakBy extends GroupBy {
    Top: Top;
}
export interface Top {
    FieldID: string,
    Max: number,
    Ascending: boolean,
}
export interface AggregatedField {
    FieldID: string,
    Aggregator: Aggregator,
    Alias?: string,
    Script?: string
}
export interface AggregatedParam {
    FieldID: string,
    Aggregator: Aggregator,
    Name: string,
}
export const UserTypes = ["Current", "UnderMyRole", "All"];
export declare type UserType = typeof UserTypes[number];

export const AccountTypes = ["Assigned", "All"];
export declare type AccountType = typeof AccountTypes[number];

export const ResourceTypes = ["all_activities", "transaction_lines", "None"];
export declare type ResourceType = typeof ResourceTypes[number];

export const DataTypes = ["Single", "Series", "MultiSeries"];
export declare type DataType = typeof DataTypes[number];

export const IntervalUnits = ["Days", "Weeks", "Months", "Years", "None"];
export declare type IntervalUnit = typeof IntervalUnits[number];

export const Aggregators = ["Sum", "Count", "Average", "Script", "None"];
export declare type Aggregator = typeof Aggregators[number];

export const DateOperation = ['InTheLast','Today','ThisWeek','ThisMonth','Before','After','Between','DueIn','On','NotInTheLast','NotDueIn', 'IsEmpty','IsNotEmpty']
export const OrderType = ["Ascending", "Decending"];

export const DATA_QUREIES_TABLE_NAME = 'DataQueries';
export const SERIES_LABEL_DEFAULT_VALUE = '${label}';


