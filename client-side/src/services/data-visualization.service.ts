import { CdkDragDrop, CdkDragEnd, CdkDragStart, moveItemInArray } from "@angular/cdk/drag-drop";
import { EventEmitter, Injectable } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { TranslateService } from "@ngx-translate/core";
import { PepColorService } from "@pepperi-addons/ngx-lib";
import { PepDialogData, PepDialogService } from "@pepperi-addons/ngx-lib/dialog";
import { ICardEditor } from "src/app/card.model";
import { Color } from "src/app/models/color";
import { Overlay } from "src/app/models/overlay ";


@Injectable({
    providedIn: 'root',
})
export class DataVisualizationService {
    dialogRef: MatDialogRef<any>;
    constructor(private pepColorService: PepColorService,
        private dialogService: PepDialogService,
        protected translate: TranslateService,
        ) { };

    getRGBAcolor(colObj: Color, opac = null) {
        let rgba = 'rgba(255,255,255,0';
        if (colObj) {
            let color = colObj.color;
            let opacity = opac != null ? opac : parseInt(colObj.opacity);

            opacity = opacity > 0 ? opacity / 100 : 0;
            //check if allready rgba

            let hsl = this.pepColorService.hslString2hsl(color);
            let rgb = this.pepColorService.hsl2rgb(hsl);

            rgba = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')';
        }
        return rgba;
    }

    getSliderBackground(color) {
        if (!color) return;
        let alignTo = 'right';
    
        let col: Overlay = new Overlay();
    
        col.color = color;
        col.opacity = '100';
    
        let gradStr = this.getRGBAcolor(col, 0) + ' , ' + this.getRGBAcolor(col);
    
        return 'linear-gradient(to ' + alignTo + ', ' + gradStr + ')';
      }

    onDragStart(event: CdkDragStart) {
        this.changeCursorOnDragStart();
    }

    onDragEnd(event: CdkDragEnd) {
        this.changeCursorOnDragEnd();
    }

    changeCursorOnDragStart() {
        document.body.classList.add('inheritCursors');
        document.body.style.cursor = 'grabbing';
    }

    changeCursorOnDragEnd() {
        document.body.classList.remove('inheritCursors');
        document.body.style.cursor = 'unset';
    }

    getCardShadow(intensity, type) {
        let shadow = type === 'Soft' ? '0px 3px 6px 0px rgba(0, 0, 0, ' + intensity + '),0px 4px 8px 0px rgba(0, 0, 0, ' + intensity + '),0px 6px 12px 0px rgba(0, 0, 0, ' + intensity + ')' :
            '0px 8px 16px 0px rgba(0, 0, 0, ' + intensity + '), 0px 12px 24px 0px rgba(0, 0, 0, ' + intensity + '),0px 24px 48px 0px rgba(0, 0, 0, ' + intensity + ')'

        return `${shadow}`;
    }

    deepCloneObject(object) {
        var str = JSON.stringify(object)
        return JSON.parse(str) ;
    }
    
    openDialog(title, content, buttons, input, callbackFunc = null): void {
        const config = this.dialogService.getDialogConfig(
            {
                disableClose: true,
                panelClass: 'pepperi-standalone'
            },
            'inline'
        );
        const data = new PepDialogData({
            title: title,
            content: content,
            actionButtons: buttons,
            actionsType: "custom",
            showHeader: true,
            showFooter: true,
            showClose: true
        })
        config.data = data;

        this.dialogRef = this.dialogService.openDialog(content, input, config);
        this.dialogRef.afterClosed().subscribe(res => {
            callbackFunc(res);
        });
    }

    getChartBorder(useBorder, border) {
        if (useBorder) {
            let col: Color = border;
            return '1px solid ' + this.getRGBAcolor(col);
        }
        else {
            return 'none';
        }
    }

    loadSrcJSFiles(imports) {
        let promises = [];
        let isLibraryAlreadyLoaded = {}
        imports.forEach(src => {
            promises.push(new Promise<void>((resolve) => {
                isLibraryAlreadyLoaded[src] = false;
                if (!isLibraryAlreadyLoaded[src]) {
                    let _oldDefine = window['define'];
                    //this.lockObject = true;
                    window['define'] = null;

                    const node = document.createElement('script');
                    node.src = src;
                    node.id = src;
                    node.onload = (script) => {
                        window['define'] = _oldDefine;
                        isLibraryAlreadyLoaded[src] = true;
                        console.log(`${src} loaded`)
                        resolve()
                    };
                    node.onerror = (script) => {
                    };
                    document.getElementsByTagName('head')[0].appendChild(node);
                }
                else {
                    resolve();
                }
            }));
        });
        return Promise.all(promises);
    }

    buildVariableValues(variablesData, parameters) {
        let values = {}
        for(const varName in variablesData) {
            const varData = variablesData[varName];
            if(varData.source == 'Variable') {
                values[varName] = (parameters && parameters[varData.value]) ? parameters[varData.value] : '0';
            } else {
                values[varName] = varData.value ?? '0';
            }
        }
        return values;
    }

    getShadowStyles() {
        return [
            { key: 'Soft', value: this.translate.instant('Soft') },
            { key: 'Regular', value: this.translate.instant('Regular') }
          ];
    }

    onFieldChange(key, event, hostEvents: EventEmitter<any>, configuration) {
        const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value : event;
    
        if (key.indexOf('.') > -1) {
            let keyObj = key.split('.');
            configuration[keyObj[0]][keyObj[1]] = value;
        }
        else {
            configuration[key] = value;
        }
        this.updateHostObject(hostEvents,configuration);
    }

    updateHostObject(hostEvents: EventEmitter<any>, configuration) {
        hostEvents.emit({
            action: 'set-configuration',
            configuration: configuration,
        });
    }

    onValueChanged(type, event, hostEvents: EventEmitter<any>, configuration, charts) {
        let originalConf = null;
        // to support the structure of scorecards and table configurations
        if(configuration.scorecardsConfig) {
            originalConf = configuration;
            configuration = configuration.scorecardsConfig;
        }
        switch (type) {
            case 'Chart':
                if (event) {
                    const selectedChart = charts.filter(c => c.Key == event)[0];
                    configuration.chart = selectedChart.Key;
                    configuration.chartCache = selectedChart.ScriptURI;
                }
                else {
                    configuration.chart = null;
                    configuration.chartCache = null;
                }
                break;
    
            case 'Label':
                configuration.label = event;
                break;
    
            case 'useLabel':
                configuration.useLabel=event;
                if(!event)
                    configuration.label="";
                break;
    
            case 'Height':
                if(event == ""){
                    configuration.height = 22; //default value
                }
                else
                    configuration.height = event;
    
                break;
        }
        if(originalConf) {
            originalConf.scorecardsConfig = configuration;
            this.updateHostObject(hostEvents,originalConf);
        }
        else {
            this.updateHostObject(hostEvents,configuration);
        }
      }

      addNewCardClick(hostEvents, configuration, isTable = false) {
        let card = new ICardEditor();
        card.id = (configuration?.cards.length);
        if(isTable) card.title = "Query" + (card.id+1).toString();
        configuration?.cards.push(card);
        this.updateHostObject(hostEvents,configuration);
      }
    
      onCardRemoveClick(event, hostEvents, configuration) {
          configuration?.cards.splice(event.id, 1);
          configuration?.cards.forEach(function(card, index, arr) {card.id = index; });
          this.updateHostObject(hostEvents,configuration);
      }
    
      drop(event: CdkDragDrop<string[]>, hostEvents, configuration) {
          if (event.previousContainer === event.container) {
          moveItemInArray(configuration.cards, event.previousIndex, event.currentIndex);
          for(let index = 0 ; index < configuration.cards.length; index++){
              configuration.cards[index].id = index;
          }
              this.updateHostObject(hostEvents,configuration);
          } 
      }

      setDefaultChart(configuration, charts) {
        if (!configuration.chart) {
            // set the first chart to be default
            const firstChart = charts[0];
            configuration.chart = firstChart.Key;
            configuration.chartCache = firstChart.ScriptURI;
        }
      }
}