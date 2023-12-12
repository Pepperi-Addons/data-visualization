import { AddonData } from "@pepperi-addons/papi-sdk";
import { JSONFilter } from "@pepperi-addons/pepperi-filters/build/json-filter";

export interface GroupBy {
    FieldID: string;
    Interval?: Interval;
    Format?: string;
    Alias?:string;
}

export interface DataQuery extends AddonData {
    Key: string;
    Name: string;
    Description?: string;
    Resource: string;
    Series: Serie[];
}

export interface Serie {
    Key: string,
    Name: string,
    Label: string,
    Top?: Top;
    Resource: ResourceType,
    DynamicFilterFields: string[],
    GroupBy?: GroupBy[],
    AggregatedFields: AggregatedField[];
    AggregatedParams?: AggregatedParam[],
    IntervalUnit?: Interval;
    BreakBy: BreakBy;
    Filter: JSONFilter,
    Scope: {
        User: UserType,
        Account: AccountType
    }
}

export type BreakBy = GroupBy

export interface Top {
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
    Aggregator: ScriptAggregator,
    Name: string,
}
export const UserTypes = ["AllUsers", "CurrentUser"];
export declare type UserType = typeof UserTypes[number];

export const AccountTypes = ["AllAccounts", "AccountsAssignedToCurrentUser", "CurrentAccount"];
export declare type AccountType = typeof AccountTypes[number];

export const ResourceTypes = ["all_activities", "transaction_lines"];
export declare type ResourceType = typeof ResourceTypes[number];

export const DataTypes = ["Single", "Series", "MultiSeries"];
export declare type DataType = typeof DataTypes[number];

export const Intervals = ["Day", "Week", "Month", "Quarter", "Year"];
export declare type Interval = typeof Intervals[number];

export const Aggregators = ["Sum", "Count", "Average", "Script", "CountDistinct"];
export declare type Aggregator = typeof Aggregators[number];

export const ScriptAggregators = ["Sum", "Count", "CountDistinct"];
export declare type ScriptAggregator = typeof ScriptAggregators[number];

export const DateOperation = ['InTheLast', 'Today', 'ThisWeek', 'ThisMonth', 'Before', 'After', 'Between', 'DueIn', 'On', 'NotInTheLast', 'NotDueIn', 'IsEmpty', 'IsNotEmpty']
export const OrderType = ["Ascending", "Decending"];

export const DATA_QUREIES_TABLE_NAME = 'DataQueries';
export const SERIES_LABEL_DEFAULT_VALUE = '${label}';


