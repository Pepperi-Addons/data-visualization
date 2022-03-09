import { BaseConfiguration } from "./base-configuration";

export class ChartConfiguration extends BaseConfiguration {
    chart: Chart = null;
    useLabel: boolean = false;
    label: string = '';
    height: string = '22'
}
export class Chart {
    Key: string = '';
    ScriptURI: string = '';
}