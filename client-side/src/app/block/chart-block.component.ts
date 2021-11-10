import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
    selector: 'chart-block',
    templateUrl: './chart-block.component.html',
    styleUrls: ['./chart-block.component.scss']
})
export class DataVisualizationComponent implements OnInit {
    @Input() hostObject: any;

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    chartInstance: any;
    @ViewChild("previewArea") divView: ElementRef;
    constructor(private translate: TranslateService) { }

    ngOnInit(): void {
        // When finish load raise block-loaded.
        this.hostEvents.emit({ action: 'block-loaded' });
    }

    ngOnChanges(e: any): void {
        this.drawChart(this.hostObject.configuration);
        console.log(this.hostObject.configuration);
    }
    drawChart(configuration: any) {
        const seedData = {
            Groups: ["ActionDate"],
            Series: ["Series 1", "Series 2"],
            DataSet: [
              { "ActionDate": "01/01/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
              { "ActionDate": "01/02/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
              { "ActionDate": "01/03/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
              { "ActionDate": "01/04/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
              { "ActionDate": "01/05/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
              { "ActionDate": "01/06/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() }
            ]
          }
        System.import(configuration.selectedChart.ScriptURI).then((res) => {
            const configuration = {
                label: 'Sales'
            }
            this.loadSrcJSFiles(res.deps).then(() => {
                //const previewDiv = document.getElementById("previewArea");
                this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                this.chartInstance.data = seedData;
                this.chartInstance.update();
                //this.loaderService.hide();

            }).catch(err => {
                //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
            })
        }).catch(err => {
            console.log(err);
            //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
        });
    }
    getRandomNumber() {
        return Math.floor(Math.random() * 100);
    }
    loadSrcJSFiles(imports) {

        let promises = [];

        imports.forEach(src => {
            promises.push(new Promise<void>((resolve) => {
                debugger
                const existing = document.getElementById(src);
                debugger;
                if (!existing) {
                    let _oldDefine = window['define'];
                    window['define'] = null;

                    const node = document.createElement('script');
                    node.src = src;
                    node.id = src;
                    node.onload = (script) => {
                        window['define'] = _oldDefine;
                        resolve()
                    };
                    node.onerror = (script) => {
                        // this.handleErrorDialog(this.translate.instant("FailedLoadLibrary", {
                        //   library: script['target'].id
                        // }));
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
}
