
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
    Resource: ResourceType,
    GroupBy?: GroupBy[],
    AggregatedFields: AggregatedField[];
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
    Alias?: string
}

export declare const UserTypes: readonly ["Current", "UnderMyRole", "All"];
export declare type UserType = typeof UserTypes[number];

export declare const AccountTypes: readonly ["Assigned", "All"];
export declare type AccountType = typeof AccountTypes[number];

export declare const ResourceTypes: readonly ["all_activities", "transaction_lines"];
export declare type ResourceType = typeof ResourceTypes[number];

export declare const DataTypes: readonly ["Single", "Series", "MultiSeries"];
export declare type DataType = typeof DataTypes[number];

export declare const IntervalUnits: readonly ["Days", "Weeks", "Months", "Years"];
export declare type IntervalUnit = typeof IntervalUnits[number];

export declare const Aggregators: readonly ["Sum", "Count", "Average"];
export declare type Aggregator = typeof Aggregators[number];

export const DATA_QUREIES_TABLE_NAME = 'DataQueries';

