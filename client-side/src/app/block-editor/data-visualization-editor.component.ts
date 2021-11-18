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
                    chart:{
                        Key:'',
                        ScriptURI:''
                    },
                    query: {
                        Key:''
                    }
                };
                this.updateHostObject();
            }
        }
    }
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

    
    private _configuration = {
        chart: {
            Key:'',
            ScriptURI:''
        },
        query: {
            Key:''
        },
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
        if(this.configuration?.query){
            this.selectedQuery = this.configuration?.query;
            this.buildQueriesButtons(this.configuration?.query);
        }
    }

    private fillQueriesOptions() {
        this.addonService.getAddonApiCall(config.AddonUUID, 'api', 'queries').toPromise()
        
        .then((dataQueries) => {
            this.queriesList = dataQueries;
            dataQueries.forEach(dataQuerie => {
                this.queriesOptions.push({ key: dataQuerie.Key, value: dataQuerie.Name });
            });
            if (this.configuration?.query?.Key){
                this.currentQuery =this.configuration.query.Key
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
            if (this.configuration?.chart?.Key){
                this.currentChart =this.configuration.chart.Key
            }
        });
    }

    onRemoveClick() {
    }

    getQueryOption(key){
        return this.queriesOptions.filter(qo=>qo.key === key)[0];
    }

    onChartSelected(event: IPepFieldValueChangeEvent) {

        if (event) {
            const selectedChart = this.charts.filter(c => c.Key == event)[0];
            this._configuration.chart = selectedChart;
            this.updateHostObject();
        }
    }

    private importChartFileAndExecute(chart) {
        const selectedChart = this.charts.filter(c => c.Key == chart)[0];
        this.hostEvents.emit({
            action: 'set-configuration',
            configuration: {
                selectedChart
            }
        });
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
        console.log(chart);
        const chats = this.charts.filter(c => c.Key == chart)[0];
        System.import(chats.ScriptURI).then((res) => {
            const configuration = {
                label: 'Sales'
            }
            this.loadSrcJSFiles(res.deps).then(() => {
                const previewDiv = document.getElementById("previewArea");
                this.chartInstance = new res.default(previewDiv, configuration);
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
            configuration: this.configuration
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
            this.currentSeries = this.selectedQuery.Series.filter(s => s.Name === event.source.key)[0] as Serie
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
        }, (addSeries) => {
            if (addSeries) {
                this.addonService.postAddonApiCall(
                    config.AddonUUID,
                    'inventory_allocation',
                    'user_allocations',
                    addSeries).toPromise().then(() => this.reload())
            }

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

    deleteQuery(event) {
        console.log(event);
        const body = {
            Key: this.selectedQuery.Key,
            Hidden: true
        }
        this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', body).toPromise().then((res) => {
            this.buildQueriesButtons(res);

        });
    }

    onDataQuerySelected(event: IPepFieldValueChangeEvent) {
        this.seriesButtons = [];
        console.log(event);

        this.selectedQuery = this.queriesList.filter(x => x.Key == event)[0];
        this._configuration.query = this.selectedQuery;

        this.updateHostObject();

        this.buildQueriesButtons(this.selectedQuery);
        const body = {
            QueryId: event
        }
        this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', `execute`, body).toPromise().then((res) => {
            this.queryResult(res);
        });
    }

    private buildQueriesButtons(selectedQuery) {
        selectedQuery.Series.forEach(serise => {
            this.seriesButtons.push([
                {
                    key: serise.Name,
                    value: serise.Name,
                    callback: (event: IPepButtonClickEvent) => this.editSeries(event),
                },
                {
                    key: serise.Name,
                    classNames: 'caution',
                    callback: (event: IPepButtonClickEvent) => this.deleteQuery(event),
                    iconName: pepIconSystemBin.name,
                },
            ]);
        });
    }
}
