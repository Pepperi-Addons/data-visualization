import { PepHorizontalAlignment, PepSizeType} from "@pepperi-addons/ngx-lib";
import { PepShadowSettings} from "@pepperi-addons/ngx-composite-lib/shadow-settings";
import { PepColorSettings } from "@pepperi-addons/ngx-composite-lib/color-settings";
import { DropShadow } from "./models/dropshadow";
import { Color } from "./models/color";
export type textColor = 'system-primary' | 'dimmed' | 'invert' | 'strong';
export type verticalAlignment = 'start' | 'center' | 'end';
export type textPositionStyling = 'overlyed' | 'separated';
export type groupTitleAndDescription = 'grouped' | 'ungrouped';
export type FontWeight = 'normal' | 'bold' | 'bolder';

export interface IHostObject {
    configuration: IScorecards;
    parameters: any;
    // pageConfiguration?: PageConfiguration;
    // pageType?: any;
    // context?: any;
    // filter?: any;
}

export interface IScorecards{
    scorecardsConfig: IScorecardsEditor,
    cards: Array<ICardEditor>
}

export class IScorecardsEditor {
    maxColumns: number = 1;
    gap: number = 0.5;
    cardHeight: number = 16;
    useText: boolean = true;
    cardTextColor: textColor = 'system-primary';
    verticalAlign: verticalAlignment  = 'center';
    horizontalAlign: PepHorizontalAlignment = 'center';
    textPosition: textPositionStyling = 'overlyed';
    useTitle: boolean = true;
    titleSize: PepSizeType = 'xl';
    titleWeight: FontWeight = 'normal';
    useDescription: boolean = true;
    groupTitleAndDescription: groupTitleAndDescription = 'ungrouped';
    descriptionSize: PepSizeType = 'sm';
    descriptionMaxNumOfLines: number = 1;
    gradientOverlay: PepColorSettings = new PepColorSettings();
    overlay: PepColorSettings = new PepColorSettings();
    editSlideIndex: number = -1;
    useRoundCorners: boolean = false;
    roundCornersSize: PepSizeType = 'md';

    useDropShadow: boolean = true;
    dropShadow: DropShadow = new DropShadow();
    useBorder: boolean = false;
    border: Color = new Color();
}

export class ICardEditor {
    id: number;
    title: string = "Scorecard";
    description: string = "Description";
    chart;
    query;
    secondQuery;
    imageURL: string = "";
    // linkTo: string = "";
    script: any;
}
