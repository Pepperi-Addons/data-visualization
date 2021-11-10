import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { Serie } from '../../../../server-side/models/data-query';

@Component({
    selector: 'data-visualization-editor',
    templateUrl: './data-visualization-editor.component.html',
    styleUrls: ['./data-visualization-editor.component.scss']
})
export class DataVisualizationEditorComponent implements OnInit {
    activeTabIndex = 0;
    qureiesButtons: Array<Array<PepButton>> = [];
    queriesOptions: { key: string, value: string }[] = [];
    chartsOptions: { key: string, value: string }[] = [];
    queriesList: any;
    selectedQuery: any;
    @Input() hostObject: any;

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    charts: any;
    chartInstance: any;
    queryResult: any;
    showSeriesEditor = false;
    currentSeries: Serie;
    filterExampleJSON = '';
    resourceOptions = [{ key: '2', value: 'transaction_lines' }, { key: '99', value: 'all_activities' }];
    aggregationsOptions = [{ key: 'sum', value: 'sum' }, { key: 'average', value: 'average' }, { key: 'count', value: 'count' }];
    aggregationsFieldsOptions = [{ key: 'accountTsaChain', value: 'AccountTSAChain' }, { key: 'transactionType', value: 'TransactionType' }];
    breakByOptions = [];
    intervalOptions = [{ key: 'days', value: 'Days' }, { key: 'weeks', value: 'Weeks' }, { key: 'months', value: 'Months' }, { key: 'years', value: 'Years' }];
    orderOptions = [{ key: 'asc', value: 'Ascending' }, { key: 'desc', value: 'Decending' }];
    userFilterFieldOptions = [{ key: 'tsaChain', value: 'TSAChain' }];
    userFilterOptions = [{ key: 'currentUser', value: 'CurrentUser' }, { key: 'allUsers', value: 'AllUsers' }];
    accountFilterFieldOptions = [];
    accountFilterOptions = [{ key: 'currentAccount', value: 'CurrentAccount' }, { key: 'allAccounts', value: 'AllAccounts' }];
    periodOptions = [{ key: 'inTheLast', value: 'InTheLast' }, { key: 'between', value: 'Between' }];
    constructor(private addonService: PepAddonService,
        public routeParams: ActivatedRoute,
        public router: Router,
        public route: ActivatedRoute,
        public pluginService: AddonService) {
        this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
    }
    ngOnInit(): void {
        this.initCurrentSeries();
        this.getDataIndexFields();
        this.fillChartsOptions();
        this.fillQueriesOptions();
        this.filterExampleJSON = JSON.stringify({
            "Operation": "AND",
            "LeftNode": {
                "ApiName": "Item.ExternalID",
                "FieldType": "String",
                "Operation": "IsNotEqual",
                "Values": [
                    "25473982"
                ]
            },
            "RightNode": {
                "ApiName": "Item.MainCategory",
                "FieldType": "String",
                "Operation": "IsNotEqual",
                "Values": [
                    "Hallmark"
                ]
            }
        }, null, 2);
    }
    getDataIndexFields() {
        this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'all_activities_fields').toPromise().then((allActivitiesFields) => {
            this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'transaction_lines_fields').toPromise().then((trnsactionLinesFields) => {
                const allFields = allActivitiesFields.Fields.concat(trnsactionLinesFields.Fields);
                allFields.forEach(field => {
                    this.breakByOptions.push({ key: field, value: field })
                });
                const accountsFields = allFields.filter(f => f.startsWith('Account'));
                accountsFields.forEach(field => {
                    this.accountFilterFieldOptions.push({ key: field, value: field })
                });
            });
        });
    }
    private fillQueriesOptions() {
        this.addonService.getAddonApiCall(config.AddonUUID, 'api', 'queries').toPromise().then((dataQueries) => {
            this.queriesList = dataQueries;
            dataQueries.forEach(dataQuerie => {
                this.queriesOptions.push({ key: dataQuerie.Key, value: dataQuerie.Name });
            });
        });
    }
    backClicked() {
        this.showSeriesEditor = false;
        this.initCurrentSeries();
    }

    initCurrentSeries() {
        this.currentSeries = {
            Resource: undefined,
            Name: '',
            AggregatedFields: [{ FieldID: '', Aggregator: undefined }],
            Interval: 0,
            IntervalUnit: undefined,
            GroupBy: [{
                FieldID: "",
                Interval: undefined,
                IntervalUnit: undefined
            }],
            BreakBy: {
                FieldID: '',
                Top: { FieldID: '', Ascending: false, Max: 100 },
            }
        }
    }
    private fillChartsOptions() {
        this.addonService.getAddonApiCall('3d118baf-f576-4cdb-a81e-c2cc9af4d7ad', 'api', 'charts').toPromise().then((charts) => {
            this.charts = charts;
            charts.forEach(chart => {
                this.chartsOptions.push({ key: chart.Key, value: chart.Name });
            });
        });
    }

    tabClick(e) {
        this.activeTabIndex = e.index;
    }

    onEditClick() {
    }

    onRemoveClick() {
    }

    onChartSelected(event: IPepFieldValueChangeEvent) {
        if (event) {
            this.importChartFileAndExecute(event);
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
        // const seedData = {
        //     Groups: ["ActionDate"],
        //     Series: ["Series 1", "Series 2"],
        //     DataSet: [
        //       { "ActionDate": "01/01/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
        //       { "ActionDate": "01/02/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
        //       { "ActionDate": "01/03/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
        //       { "ActionDate": "01/04/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
        //       { "ActionDate": "01/05/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
        //       { "ActionDate": "01/06/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() }
        //     ]
        //   }
        // console.log(chart);
        // const chats = this.charts.filter(c=>c.Key==chart)[0];
        // System.import(chats.ScriptURI).then((res) => {
        //     const configuration = {
        //         label: 'Sales'
        //     }
        //     this.loadSrcJSFiles(res.deps).then(() => {
        //         const previewDiv = document.getElementById("previewArea");
        //         this.chartInstance = new res.default(previewDiv, configuration);
        //         this.chartInstance.data = seedData;
        //         this.chartInstance.update();
        //         //this.loaderService.hide();

        //     }).catch(err => {
        //         //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
        //     })
        // }).catch(err => {
        //     console.log(err);
        //     //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
        // });
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
    onValueChanged(element, $event) {

    }
    getRandomNumber() {
        return Math.floor(Math.random() * 100);
    }

    add() {
        this.showSeriesEditor = true;

    }

    editSeries(event) {
        if (event) {
            this.currentSeries = this.selectedQuery.Series.filter(s => s.Name === event.source.key)[0] as Serie
        }
        this.showSeriesEditor = true;
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
        this.qureiesButtons = [];
        console.log(event);
        this.selectedQuery = this.queriesList.filter(x => x.Key == event)[0];
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
            this.qureiesButtons.push([
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
