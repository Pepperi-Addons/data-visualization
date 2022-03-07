import { DataQuery } from "../../../../server-side/models/data-query";
import { BaseConfiguration } from "./base-configuration";
import { Color } from "./color";
import { DropShadow } from "./dropshadow";

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