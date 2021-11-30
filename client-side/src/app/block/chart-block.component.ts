import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import 'systemjs'
import 'systemjs-babel'

@Component({
    selector: 'chart-block',
    templateUrl: './chart-block.component.html',
    styleUrls: ['./chart-block.component.scss']
})
export class DataVisualizationComponent implements OnInit {

    _hostObject;
    existing: any;
    data;
    chartID;
    isLibraryAlreadyLoaded = {};
    @Input('hostObject')
    get hostObject() {
        return this._hostObject;
    }
    set hostObject(value) {

        // If only things of meta data have changed, like 'label',there is no need to redraw the graph
        const newChart = value.configuration?.chart?.Key;
        const newData = value.configuration?.data;
      
        this._hostObject = value;
        const needToChangeChart = !(newChart && this.chartID && newData && this.data && newChart == this.chartID &&
                                        JSON.stringify(newData) == JSON.stringify(this.data))
        if (!needToChangeChart) {
            return;
        }
        if (newChart && newData) {

            this.drawChart(this._hostObject.configuration);
        }
        else {
            this.deleteChart();
        }
        this.chartID=value.configuration?.chart?.Key;
        this.data=value.configuration?.data;

    }

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    chartInstance: any;
    @ViewChild("previewArea") divView: ElementRef;

    oldDefine: any;

    constructor(private translate: TranslateService) { }

    ngOnInit(): void {
        // When finish load raise block-loaded.
        this.hostEvents.emit({ action: 'block-loaded' });
    }

    ngOnChanges(e: any): void {
    }

    drawChart(configuration: any) {
        try {
            debugger;
            System.import(configuration.chart.ScriptURI).then((res) => {
                const configuration = {
                    label: 'Sales'
                }


                this.loadSrcJSFiles(res.deps).then(() => {
                    this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                    this.chartInstance.data = this.hostObject.configuration.data;
                    this.chartInstance.update();

                }).catch(err => {
                    console.log(err);
                })
            }).catch(err => {
                console.log(err);
            });
        }
        catch (err) {

        }
    }

    getRandomNumber() {
        return Math.floor(Math.random() * 100);
    }

    loadSrcJSFiles(imports) {

        let promises = [];

        imports.forEach(src => {
            promises.push(new Promise<void>((resolve) => {
                debugger
                this.isLibraryAlreadyLoaded[src] = false;
                if (!this.isLibraryAlreadyLoaded[src]) {
                    let _oldDefine = window['define'];
                    this.oldDefine = _oldDefine;
                    //this.lockObject = true;
                    window['define'] = null;

                    const node = document.createElement('script');
                    node.src = src;
                    node.id = src;
                    node.onload = (script) => {
                        window['define'] = _oldDefine;
                        this.isLibraryAlreadyLoaded[src] = true;
                        //this.lockObject = false;
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

    deleteChart() {
        this.chartInstance = undefined;
    }
}
