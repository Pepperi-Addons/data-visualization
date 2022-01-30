import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../../services/addon.service';
import { config } from '../addon.config';
import { DataQuery, Serie } from '../../../../server-side/models/data-query';
import { SeriesEditorComponent } from '../series-editor/series-editor.component';
import { Overlay } from '../models/overlay ';

import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { v4 as uuid } from 'uuid';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { Color } from '../models/color';
import { DropShadow } from '../models/dropshadow';
import { ChartConfiguration } from '../models/chart-configuration';

@Component({
    selector: 'chart-editor',
    templateUrl: './chart-editor.component.html',
    styleUrls: ['./chart-editor.component.scss']
})

export class ChartEditorComponent implements OnInit {

    private _hostObject: any
    @Input()
    set hostObject(value) {
        if (value && value.configuration) {
            this._configuration = value.configuration
        } else {
            if (this.blockLoaded) {
                this.loadDefaultConfiguration();
            }
        }
    }
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    private _configuration: ChartConfiguration;
    get configuration() {
        return this._configuration;
    }

    label = false;
    currentDataQuery: DataQuery;
    activeTabIndex = 0;
    charts: any;
    blockLoaded = false;
    currentSeries: Serie;
    chartsOptions: { key: string, value: string }[] = [];
    seriesButtons: Array<Array<PepButton>> = [];
    DropShadowStyle: Array<PepButton> = [];

    constructor(private addonService: PepAddonService,
        public routeParams: ActivatedRoute,
        public router: Router,
        public route: ActivatedRoute,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        private dataVisualizationService: DataVisualizationService,
        public pluginService: AddonService) {
        this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
    }

    ngOnInit(): void {
        if (!this.configuration) {
            this.loadDefaultConfiguration();
        }
        this.DropShadowStyle = [
            { key: 'Soft', value: this.translate.instant('Soft') },
            { key: 'Regular', value: this.translate.instant('Regular') }
        ];

        this.fillChartsOptions().then(() => {
            const queryID = this.configuration?.query?.Key;
            if (queryID) {
                this.configuration.query = { Key: queryID };
                this.pluginService.getDataQueryByKey(queryID).then((res) => {
                    this.currentDataQuery = res[0];
                    this.blockLoaded = true;
                    this.buildSeriesButtons();
                    this.configuration.executeQuery = true;
                    this.updateHostObject();
                    this.hostEvents.emit({ action: 'block-editor-loaded' });
                })
            } else {
                this.pluginService.upsertDataQuery({
                    Name: uuid()
                }).then((res) => {
                    this.currentDataQuery = res;
                    this.configuration.query = { Key: res.Key }
                });
                this.blockLoaded = true;
            }
        });
    }

    private loadDefaultConfiguration() {
        this._configuration = this.getDefaultHostObject();
         this.updateHostObject();
    }

    private getDefaultHostObject(): ChartConfiguration {
        return new ChartConfiguration();
    }

    onEditClick() {
    }

    private fillChartsOptions() {
        return this.pluginService.getCharts().then((charts) => {
            this.charts = charts.sort((a, b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
            if (!this._configuration.chart) {
                // set the first chart to be default
                const firstChart = this.charts[0];
                this._configuration.chart = firstChart;
            }
            charts.forEach(chart => {
                this.chartsOptions.push({ key: chart.Key, value: chart.Name });
            });
        });
    }

    loadSrcJSFiles(imports) {

        let promises = [];

        imports.forEach(src => {
            promises.push(new Promise<void>((resolve) => {
                const existing = document.getElementById(src);
                if (!existing) {
                    let _oldDefine = window['define'];
                    const node = document.createElement('script');
                    node.src = src;
                    node.id = src;
                    node.onload = (script) => {
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

    private updateHostObject() {

        this.hostEvents.emit({
            action: 'set-configuration',
            configuration: this.configuration,
        });
    }

    onValueChanged(type, event) {
        let promise: Promise<any> = Promise.resolve();
        switch (type) {
            case 'Chart':
                if (event) {
                    const selectedChart = this.charts.filter(c => c.Key == event)[0];
                    this._configuration.chart = selectedChart;
                }
                else {
                    this._configuration.chart = null;
                }
                this.configuration.executeQuery = true;

                break;
            case 'Label':
                this._configuration.label = event;
                this.configuration.executeQuery = false;

                break;
        }
        this.updateHostObject();
    }

    add() {
        this.showSeriesEditorDialog(null);
    }

    onFieldChange(key, event) {
        const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value : event;

        if (key.indexOf('.') > -1) {
            let keyObj = key.split('.');
            this.configuration[keyObj[0]][keyObj[1]] = value;
        }
        else {
            this.configuration[key] = value;
        }
        this.configuration.executeQuery = false;
        this.updateHostObject();
    }
    onEventCheckboxChanged(key, event){
        switch(key){
            case "Label":
                this.configuration.useLabel=event;
                if(!event){
                    this.configuration.label="";
                }
        }

    }

    editSeries(event) {
        if (event) {
            let serie =  this.currentDataQuery.Series.filter(s => s.Key === event.source.key)[0];
            this.currentSeries = this.dataVisualizationService.deepCloneObject(serie) as Serie; // deep clone because if not the oblect will change also if cancel will be pressed
        }
        this.showSeriesEditorDialog(this.currentSeries);
    }

    tabClick(event) {
    }

    showSeriesEditorDialog(series) {
        const seriesCount = this.currentDataQuery?.Series?.length ? this.currentDataQuery?.Series?.length : 0
        const input = {
            currentSeries: series,
            parent: 'chart',
            seriesName: series?.Name ? series.Name : `Series ${seriesCount + 1}`
        }
        const callbackFunc = (seriesToAddOrUpdate) => {
            if (seriesToAddOrUpdate) {
                this.currentDataQuery = this.updateQuerySeries(seriesToAddOrUpdate);
                this.pluginService.upsertDataQuery(this.currentDataQuery).then((res) => {
                    this.currentDataQuery = res;
                    this.buildSeriesButtons();
                    this.configuration.executeQuery = true;
                    this.updateHostObject();
                })
            }
        }

        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: null,
        };
        this.dataVisualizationService.openDialog(this.translate.instant('EditQuery'), SeriesEditorComponent, actionButton, input, callbackFunc);
    }


    updateQuerySeries(seriesToAddOrUpdate: any) {
        const idx = this.currentDataQuery?.Series?.findIndex(item => item.Key === seriesToAddOrUpdate.Key);
        if (idx > -1) {
            this.currentDataQuery.Series[idx] = seriesToAddOrUpdate;
        }
        else {
            if (!this.currentDataQuery?.Series) {
                this.currentDataQuery.Series = [];
            }
            this.currentDataQuery.Series.push(seriesToAddOrUpdate);
        }
        return this.currentDataQuery;
    }


    deleteSeries(event) {
        console.log(event);
        const idx = this.currentDataQuery.Series.findIndex(item => item.Key === event.source.key);;
        if (idx > -1) {
            this.currentDataQuery.Series.splice(idx, 1);
        }

        this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', this.currentDataQuery).toPromise().then((res) => {
            this.currentDataQuery = res;
            this.buildSeriesButtons();
            this.configuration.executeQuery = true;
            this.updateHostObject();
        });
    }

    buildSeriesButtons() {
        this.seriesButtons = [];
        this.currentDataQuery?.Series?.forEach(serise => {
            this.seriesButtons.push([
                {
                    key: serise.Key,
                    value: serise.Name,
                    callback: (event: IPepButtonClickEvent) => this.editSeries(event),
                },
                {
                    key: serise.Key,
                    classNames: 'caution',
                    callback: (event: IPepButtonClickEvent) => this.deleteSeries(event),
                    iconName: pepIconSystemBin.name,
                },
            ]);
        });
    }

    getSliderBackground(color) {
        if (!color) return;
        let alignTo = 'right';

        let col: Overlay = new Overlay();

        col.color = color;
        col.opacity = '100';

        let gradStr = this.dataVisualizationService.getRGBAcolor(col, 0) + ' , ' + this.dataVisualizationService.getRGBAcolor(col);

        return 'linear-gradient(to ' + alignTo + ', ' + gradStr + ')';
    }
}
