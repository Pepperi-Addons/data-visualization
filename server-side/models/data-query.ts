
import { AddonData } from "@pepperi-addons/papi-sdk";

export interface DataQuery extends AddonData {
    Type: DataType,
    Name: string;
    Description?: string;
    Series: Serie[],

}

export interface GroupBy {
    FieldID: string;
    Interval?: number;
    IntervalUnit?: IntervalUnit;
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
    Interval?: number;
    IntervalUnit?: IntervalUnit;
    BreakBy: BreakBy;
    Filter: {},
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

export const AccountTypes = ["AllAccounts", "CurrentAccount", "AccountsWithTheSameFieldValue"];
export declare type AccountType = typeof AccountTypes[number];

export const ResourceTypes = ["None", "all_activities", "transaction_lines"];
export declare type ResourceType = typeof ResourceTypes[number];

export const DataTypes = ["Single", "Series", "MultiSeries"];
export declare type DataType = typeof DataTypes[number];

export const IntervalUnits = ["None", "Days", "Weeks", "Months", "Years"];
export declare type IntervalUnit = typeof IntervalUnits[number];

export const Aggregators = ["None", "Sum", "Count", "Average", "Script", "CountDistinct"];
export declare type Aggregator = typeof Aggregators[number];

export const DateOperation = ['InTheLast', 'Today', 'ThisWeek', 'ThisMonth', 'Before', 'After', 'Between', 'DueIn', 'On', 'NotInTheLast', 'NotDueIn', 'IsEmpty', 'IsNotEmpty']
export const OrderType = ["Ascending", "Decending"];

export const DATA_QUREIES_TABLE_NAME = 'DataQueries';
export const SERIES_LABEL_DEFAULT_VALUE = '${label}';


