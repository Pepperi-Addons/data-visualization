import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { DataQuery, Serie } from '../../../../server-side/models/data-query';
import { SeriesEditorComponent } from '../series-editor/series-editor.component';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { v4 as uuid } from 'uuid';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

@Component({
    selector: 'data-visualization-editor',
    templateUrl: './data-visualization-editor.component.html',
    styleUrls: ['./data-visualization-editor.component.scss']
})

export class DataVisualizationEditorComponent implements OnInit {

    private _hostObject: any
    @Input()
    set hostObject(value) {
        if (value && value.configuration) {
            this._configuration = value.configuration
        } else {
            if (this.blockLoaded) {
                this.updateHostObject();
            }
        }
    }
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

    label = false;
    _configuration = {
        chart: null,
        query: null,
        label: '',
        data: null
    };

    get configuration() {
        return this._configuration;
    }
    activeTabIndex = 0;
    charts: any;
    dialogRef: MatDialogRef<any>;
    blockLoaded = false;
    currentSeries: Serie;
    queryResult: any;
    chartsOptions: { key: string, value: string }[] = [];
    seriesButtons: Array<Array<PepButton>> = [];
    chartInstance: any;
    SlideDropShadowStyle: Array<PepButton> = [];

    constructor(private addonService: PepAddonService,
        public routeParams: ActivatedRoute,
        public router: Router,
        public route: ActivatedRoute,
        private translate: TranslateService,
        private dialogService: PepDialogService,
        public pluginService: AddonService) {
        this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
    }

    ngOnInit(): void {

        this.SlideDropShadowStyle = [
            { key: 'Soft', value: this.translate.instant('Soft') },
            { key: 'Regular', value: this.translate.instant('Regular') }
        ];

        this.fillChartsOptions().then(() => {
            const queryID = this.configuration?.query?.Key;
            if (queryID) {
                this.getSeriesByKey(queryID).then((res) => {
                    this._configuration.query = res[0];
                    this.blockLoaded = true;
                    this.buildSeriesButtons();
                    this.executeQuery().then((res) => {
                        this._configuration.data = res;
                        this.updateHostObject();

                    })
                    this.hostEvents.emit({ action: 'block-editor-loaded' });
                })
            } else {
                this.upsertDataQuery().then((res) => {
                    this._configuration.query = res;
                });
                this.blockLoaded = true;
            }
        });

    }

    upsertDataQuery() {
        const body = {
            Name: uuid()
        };
        return this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', body).toPromise()

    }
    getSeriesByKey(Key: string) {
        const params = { where: `Key=${Key}` };
        return this.addonService.getAddonApiCall(config.AddonUUID, 'api', 'queries', params).toPromise()

    }

    onEditClick() {
    }

    private fillChartsOptions() {
        return this.addonService.getAddonApiCall('3d118baf-f576-4cdb-a81e-c2cc9af4d7ad', 'api', 'charts').toPromise().then((charts) => {
            this.charts = charts;
            charts.forEach(chart => {
                this.chartsOptions.push({ key: chart.Key, value: chart.Name });
            });
        });
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
                    // window['define'] = null;

                    const node = document.createElement('script');
                    node.src = src;
                    node.id = src;
                    node.onload = (script) => {
                        // window['define'] = _oldDefine;
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
                break;
            case 'Label':
                this._configuration.label = event;
                break;
        }

        promise.then((res) => {
            if (type && type === 'Query') {
                this._configuration.data = res;
            }
            this.updateHostObject();
        })

    }

    add() {
        this.showSeriesEditorDialog(null);
    }

    editSeries(event) {
        if (event) {
            this.currentSeries = this._configuration.query.Series.filter(s => s.Key === event.source.key)[0] as Serie
        }
        this.showSeriesEditorDialog(this.currentSeries);
    }
    tabClick(event) {

    }

    onEventCheckboxChanged(eventType, event) {

    }

    showSeriesEditorDialog(series) {
        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: null,
        };
        const input = {
            currentSeries: series
        }
        this.openDialog(this.translate.instant('EditSeries'), SeriesEditorComponent, actionButton, input, (seriesToAddOrUpdate) => {
            if (seriesToAddOrUpdate) {
                this.updateQuerySeries(seriesToAddOrUpdate);
                this.addonService.postAddonApiCall(
                    config.AddonUUID,
                    'api',
                    'queries',
                    this._configuration.query).toPromise().then((res) => {
                        this._configuration.query = res;
                        this.buildSeriesButtons();
                        this.executeQuery().then((res) => {
                            this._configuration.data = res;
                            this.updateHostObject();
                        })

                    })
            }

        });
    }

    private updateQuerySeries(seriesToAddOrUpdate: any) {
        const idx = this._configuration.query.Series?.findIndex(item => item.Key === seriesToAddOrUpdate.Key);
        if (idx > -1) {
            this._configuration.query.Series[idx] = seriesToAddOrUpdate;
        }
        else {
            if (!this._configuration.query.Series) {
                this._configuration.query.Series = [];
            }
            this._configuration.query.Series.push(seriesToAddOrUpdate);
        }
    }

    async executeQuery() {
        const body = {
            QueryId: this._configuration.query.Key
        };
        return this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', 'execute', body).toPromise();
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

    deleteSeries(event) {
        console.log(event);
        const idx = this._configuration.query.Series.findIndex(item => item.Key === event.source.key);;
        if (idx > -1) {
            this._configuration.query.Series.splice(idx, 1);
        }

        this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', this._configuration.query.Series).toPromise().then((res) => {
            this._configuration.query = res;
            this.buildSeriesButtons();
            this.executeQuery().then((res) => {
                this._configuration.data = res;
                this.updateHostObject();
            })
        });
    }


    onSlideshowFieldChange(key, event) {


        this.updateHostObject();
    }

    private buildSeriesButtons() {
        this.seriesButtons = [];
        this._configuration.query?.Series?.forEach(serise => {
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
}
