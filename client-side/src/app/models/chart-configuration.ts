import { DataQuery } from "../../../../server-side/models/data-query";
import { BaseConfiguration } from "./base-configuration";
import { Color } from "./color";
import { DropShadow } from "./dropshadow";

export class ChartConfiguration extends BaseConfiguration {
    chart: Chart = null;
    label: string = '';
}
export class Chart {
    Key: string = '';
    ScriptURI: string = '';
}