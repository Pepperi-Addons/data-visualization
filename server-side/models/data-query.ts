
import { AddonData } from "@pepperi-addons/papi-sdk";
import { JSONFilter } from "@pepperi-addons/pepperi-filters/build/json-filter";

export interface DataQuery extends AddonData {
    Type: DataType,
    Name: string;
    Description?: string;
    Series: Serie[],

}

export interface GroupBy {
    FieldID: string;
    Interval?: Interval;
    Format?: string;
    Alias?:string;
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
        UserFilterField: string,
        Account: AccountType,
        AccountFilterField: string,
    }
}

export interface BreakBy extends GroupBy {
}

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
    Aggregator: Aggregator,
    Name: string,
}
export const UserTypes = ["AllUsers", "CurrentUser", "UsersWithTheSameFieldValue", "UnderCurrentUserRoleHierarchy"];
export declare type UserType = typeof UserTypes[number];

export const AccountTypes = ["AllAccounts", "CurrentAccount", "AccountsAssignedToCurrentUser","AccountsWithTheSameFieldValue"];
export declare type AccountType = typeof AccountTypes[number];

export const ResourceTypes = ["all_activities", "transaction_lines"];
export declare type ResourceType = typeof ResourceTypes[number];

export const DataTypes = ["Single", "Series", "MultiSeries"];
export declare type DataType = typeof DataTypes[number];

export const Intervals = ["Day", "Week", "Month", "Quarter", "Year"];
export declare type Interval = typeof Intervals[number];

export const Aggregators = ["Sum", "Count", "Average", "Script", "CountDistinct"];
export declare type Aggregator = typeof Aggregators[number];

export const DateOperation = ['InTheLast', 'Today', 'ThisWeek', 'ThisMonth', 'Before', 'After', 'Between', 'DueIn', 'On', 'NotInTheLast', 'NotDueIn', 'IsEmpty', 'IsNotEmpty']
export const OrderType = ["Ascending", "Decending"];

export const DATA_QUREIES_TABLE_NAME = 'DataQueries';
export const SERIES_LABEL_DEFAULT_VALUE = '${label}';


