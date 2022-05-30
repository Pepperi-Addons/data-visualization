import { BaseConfiguration } from "./base-configuration";

export class ChartConfiguration extends BaseConfiguration {
    chart: Chart = null;
    useLabel: boolean = false;
    label: string = '';
    height: number = 22;
    secondQuery: Query = null;
}
export class Chart {
    Key: string = '';
    ScriptURI: string = '';
}

export class Query {
    Key: string = '';
}