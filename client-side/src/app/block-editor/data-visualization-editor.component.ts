import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { Serie } from '../../../../server-side/models/data-query';
import { SeriesEditorComponent } from '../series-editor/series-editor.component';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { v4 as uuid } from 'uuid';

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
                this._configuration = {
                    chart: {
                        Key: '',
                        ScriptURI: ''
                    },
                    query: {
                        Key: ''
                    },
                    data: undefined
                };
                this.updateHostObject();
            }
        }
    }
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();


    private _configuration = {
        chart: {
            Key: '',
            ScriptURI: ''
        },
        query: {
            Key: ''
        },
        data: {}
    };

    get configuration() {
        return this._configuration;
    }

    charts: any;
    dialogRef: MatDialogRef<any>;
    blockLoaded = false;
    currentSeries: Serie;
    queryResult: any;
    queriesList: any;
    chartsOptions: { key: string, value: string }[] = [];
    queriesOptions: { key: string, value: string }[] = [];
    seriesButtons: Array<Array<PepButton>> = [];
    selectedQuery: any;
    chartInstance: any;
    currentChart;
    currentQuery;

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
        this.fillChartsOptions();
        this.fillQueriesOptions();
        this.hostEvents.emit({ action: 'block-editor-loaded' });
        this.blockLoaded = true;
        if (this.configuration?.query) {
            this.selectedQuery = this.configuration?.query;
            this.buildSeriesButtons(this.configuration?.query);
        }
        if (this.queryResult) {

            this.configuration.data = this.queryResult;
        }
    }

    private fillQueriesOptions() {
        this.addonService.getAddonApiCall(config.AddonUUID, 'api', 'queries').toPromise()

            .then((dataQueries) => {
                this.queriesList = dataQueries;
                dataQueries.forEach(dataQuerie => {
                    this.queriesOptions.push({ key: dataQuerie.Key, value: dataQuerie.Name });
                });
                if (this.configuration?.query?.Key) {
                    this.currentQuery = this.configuration.query.Key
                }
            });
    }

    onEditClick() {
    }

    private fillChartsOptions() {
        this.addonService.getAddonApiCall('3d118baf-f576-4cdb-a81e-c2cc9af4d7ad', 'api', 'charts').toPromise().then((charts) => {
            this.charts = charts;
            charts.forEach(chart => {
                this.chartsOptions.push({ key: chart.Key, value: chart.Name });
            });
            if (this.configuration?.chart?.Key) {
                this.currentChart = this.configuration.chart.Key
            }
        });
    }

    onRemoveClick() {
    }

    getQueryOption(key) {
        return this.queriesOptions.filter(qo => qo.key === key)[0];
    }

    onChartSelected(event: IPepFieldValueChangeEvent) {

        if (event) {
            const selectedChart = this.charts.filter(c => c.Key == event)[0];
            this._configuration.chart = selectedChart;

            this.updateHostObject();
        }
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

    onValueChanged(element, $event) {
    }

    getRandomNumber() {
        return Math.floor(Math.random() * 100);
    }

    add() {
        this.showSeriesEditorDialog(null);
    }

    editSeries(event) {
        if (event) {
            this.currentSeries = this.selectedQuery.Series.filter(s => s.Key === event.source.key)[0] as Serie
        }
        this.showSeriesEditorDialog(this.currentSeries);
        // this.showSeriesEditor = true;
    }

    showSeriesEditorDialog(currentSeries) {
        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: null,
        };

        this.openDialog(this.translate.instant('EditSeries'), SeriesEditorComponent, actionButton, {
            currentSeries: currentSeries
        }, (seriesToAddOrUpdate) => {
            if (seriesToAddOrUpdate) {
                debugger;
                const idx = this.selectedQuery.Series.findIndex(item => item.Key === seriesToAddOrUpdate.Key);;
                if (idx > -1) {
                    this.selectedQuery.Series[idx] = seriesToAddOrUpdate;
                }
                else {
                    this.selectedQuery.Series.push(seriesToAddOrUpdate);
                }

                this.addonService.postAddonApiCall(
                    config.AddonUUID,
                    'api',
                    'queries',
                    this.selectedQuery).toPromise().then((res) => {
                        this.selectedQuery = res;
                        this.buildSeriesButtons(this.selectedQuery);
                        this.executeQuery();
                
                    })
            }

        });
    }

    executeQuery() {
        const body = {
            QueryId: this.currentQuery.Key
        };
        this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', 'execute', body).toPromise().then((res) => {
            this.queryResult = res;
            this._configuration.data = res;
            this.updateHostObject();

        });
    }

    reload(): any {
        throw new Error('Method not implemented.');
    }

    openDialog2(title: string, content: string, callback?: any) {
        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: callback,
        };

        const dialogData = new PepDialogData({
            title: title,
            content: content,
            actionButtons: [actionButton],
            actionsType: "custom",
            showClose: false,
        });
        this.dialogService.openDefaultDialog(dialogData);
    }

    openDialog(title, content, buttons,
        input, callbackFunc = null): void {
        const config = this.dialogService.getDialogConfig(
            {
                disableClose: false,
                panelClass: 'pepperi-standalone'
            },
            'inline'
        );
        //const dialogConfig = this.dialogService.getDialogConfig({ disableClose: true, panelClass: 'pepperi-standalone', maxWidth: '832px', minWidth: '832px', maxHeight: '100%' }, 'large',)
        const data = new PepDialogData({ title: title, content: content, actionButtons: buttons, actionsType: "custom", showHeader: true, showFooter: true, showClose: true })
        config.data = data;

        this.dialogRef = this.dialogService.openDialog(content, input, config);
        this.dialogRef.afterClosed().subscribe(res => {
            callbackFunc(res);
        });
    }

    deleteSeries(event) {
        console.log(event);
        const idx = this.selectedQuery.Series.findIndex(item => item.Key === event.source.key);;
        if (idx > -1) {
            this.selectedQuery.Series.splice(idx, 1);
        }

        this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', this.selectedQuery).toPromise().then((res) => {
            this.buildSeriesButtons(res);
            this.executeQuery();
        });
    }

    onDataQuerySelected(event: IPepFieldValueChangeEvent) {
        this.seriesButtons = [];
        console.log(event);

        this.selectedQuery = this.queriesList.filter(x => x.Key == event)[0];
        this._configuration.query = this.selectedQuery;


        this.buildSeriesButtons(this.selectedQuery);
        this.executeQuery();
        this.updateHostObject();

    }

    private buildSeriesButtons(selectedQuery) {
        this.seriesButtons = [];
        selectedQuery.Series.forEach(serise => {
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
