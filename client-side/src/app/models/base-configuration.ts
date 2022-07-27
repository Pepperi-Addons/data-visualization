import { Color } from "./color";
import { DropShadow } from "./dropshadow";

export class BaseConfiguration {
    query: Query = null;
    useDropShadow: boolean = true;
    dropShadow: DropShadow = new DropShadow();
    useBorder: boolean = false;
    border: Color = new Color();
    variablesData: {[key : string] : {source: string, value: string}};
}
export class Query {
    Key: string = '';
}