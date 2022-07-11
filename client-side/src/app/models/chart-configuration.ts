import { BaseConfiguration } from "./base-configuration";
import { PepHorizontalAlignment} from "@pepperi-addons/ngx-lib";

export class ChartConfiguration extends BaseConfiguration {
    chart: Chart = null;
    useLabel: boolean = false;
    label: string = '';
    height: number = 22;
    secondQuery: Query = null;
    horizontalAlign: PepHorizontalAlignment = 'left';
}
export class Chart {
    Key: string = '';
    ScriptURI: string = '';
}

export class Query {
    Key: string = '';
}