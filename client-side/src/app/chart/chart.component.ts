import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import 'systemjs'
import 'systemjs-babel'
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';
import { Color } from '../models/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';

@Component({
    selector: 'chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

    existing: any;
    chartID;
    isLibraryAlreadyLoaded = {};
    @Input('hostObject')
    set hostObject(value) {
        this._configuration = value?.configuration;
        if (value.configuration?.chart?.Key && value.configuration?.query.Key && value.configuration?.query?.Series && value.configuration?.query?.Series.length > 0) {

            this.drawChart(this.configuration);
        }
        else {
            this.deleteChart();
        }
        this.chartID = value.configuration?.chart?.Key;
    }

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    chartInstance: any;
    @ViewChild("previewArea") divView: ElementRef;

    private _configuration: ChartConfiguration;
    get configuration(): ChartConfiguration {
        return this._configuration;
    }
    oldDefine: any;

    constructor(private translate: TranslateService, private addonService: PepAddonService, public dataVisualizationService: DataVisualizationService) { }

    ngOnInit(): void {
        // When finish load raise block-loaded.
        this.hostEvents.emit({ action: 'block-loaded' });
    }

    ngOnChanges(e: any): void {
    }

    async executeQuery(queryID) {
        const params = {
            key: queryID
        };
        return this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', 'execute', null, { params: params }).toPromise();
    }

    drawChart(configuration: any) {
        this.executeQuery(configuration.query.Key).then((data) => {
            debugger;
            System.import(configuration.chart.ScriptURI).then((res) => {
                const configuration = {
                    label: 'Sales'
                }
                this.loadSrcJSFiles(res.deps).then(() => {
                    this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                    this.chartInstance.data = data;
                    this.chartInstance.update();

                }).catch(err => {
                    this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
                })
            }).catch(err => {
                this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.chart.ScriptURI}, error: ${err}`;
            });
        }).catch((err) => {
            this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query.Key} , error: ${err}`;;
        })

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

    getGalleryBorder() {
        if (this.configuration?.useBorder) {
            let col: Color = this.configuration?.border;
            return '1px solid ' + this.dataVisualizationService.getRGBAcolor(col);
        }
        else {
            return 'none';
        }
    }

    deleteChart() {
        if (this.divView)
            this.divView.nativeElement.innerHTML = "";
    }

}
