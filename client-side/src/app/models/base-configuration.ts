import { DataQuery } from "../../../../server-side/models/data-query";
import { Color } from "./color";
import { DropShadow } from "./dropshadow";

export class BaseConfiguration {
    query: DataQuery = null;
    useDropShadow: boolean = true;
    dropShadow: DropShadow = new DropShadow();
    useBorder: boolean = false;
    border: Color = new Color();
}