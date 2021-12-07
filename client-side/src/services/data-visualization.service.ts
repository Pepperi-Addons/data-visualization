import { CdkDragDrop, copyArrayItem, moveItemInArray, transferArrayItem } from "@angular/cdk/drag-drop";
import { Injectable } from "@angular/core";
import { PepColorService } from "@pepperi-addons/ngx-lib";
import { Color } from "src/app/models/color";


@Injectable({
    providedIn: 'root',
})
export class DataVisualizationService {
    

    constructor(private pepColorService: PepColorService) {};

    getRGBAcolor(colObj: Color, opac = null){
        let rgba = 'rgba(255,255,255,0';
            if(colObj){
                let color = colObj.color;
                let opacity = opac != null ? opac : parseInt(colObj.opacity);

                opacity = opacity > 0 ? opacity / 100 : 0;
                //check if allready rgba
                
                let hsl = this.pepColorService.hslString2hsl(color);
                let rgb = this.pepColorService.hsl2rgb(hsl);
                
                rgba = 'rgba('+ rgb.r + ','  + rgb.g + ',' + rgb.b + ',' + opacity + ')';
        }
        return rgba;
    }

    changeCursorOnDragStart() {
        document.body.classList.add('inheritCursors');
        document.body.style.cursor = 'grabbing';
    }

    changeCursorOnDragEnd() {
        document.body.classList.remove('inheritCursors');
        document.body.style.cursor = 'unset';
    }

}