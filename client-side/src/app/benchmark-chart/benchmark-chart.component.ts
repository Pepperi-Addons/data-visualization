import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import 'systemjs'
import 'systemjs-babel'
import { PepAddonService, PepLoaderService } from '@pepperi-addons/ngx-lib';
import { Color } from '../models/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { AddonService } from 'src/services/addon.service';

@Component({
    selector: 'benchmark-chart',
    templateUrl: './benchmark-chart.component.html',
    styleUrls: ['./benchmark-chart.component.scss']
})
export class BenchmarkChartComponent implements OnInit {

    @Input('hostObject')
    set hostObject(value) {
        console.log("AccountUUID from page = " + value.pageParameters?.AccountUUID)
        if (value.configuration?.chart && value.configuration?.query) {
            if (this.drawRequired(value) || this.parameters?.AccountUUID != value.pageParameters?.AccountUUID) {
                this.parameters = value.pageParameters;
                this.drawChart(value.configuration);
            }
        }
        else {
            this.deleteChart();
        }
        this.parameters = value.pageParameters;
        this._configuration = value?.configuration;
    }

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild("previewArea") divView: ElementRef;
    private _configuration: ChartConfiguration;
    get configuration(): ChartConfiguration {
        return this._configuration;
    }
    chartInstance: any;
    isLibraryAlreadyLoaded = {};
    oldDefine: any;
    parameters;

    constructor(private translate: TranslateService,
        private pluginService: AddonService,
        private addonService: PepAddonService,
        public dataVisualizationService: DataVisualizationService,
        public loaderService: PepLoaderService
        ) { }

    ngOnInit(): void {
        this.hostEvents.emit({ action: 'block-loaded' });
    }

    ngOnChanges(e: any): void {
    }

    drawChart(configuration: any) {
        this.loaderService.show();
        // sending variable names and values as body
        let values = this.dataVisualizationService.buildVariableValues(configuration.variablesData, this.parameters);
        let benchmarkValues = this.dataVisualizationService.buildVariableValues(configuration.benchmarkVariablesData, this.parameters);
        const body = { VariableValues: values } ?? {};
        const benchmarkBody = { VariableValues: benchmarkValues } ?? {};
        this.pluginService.executeQuery(configuration.query, body).then((firstQueryData) => {
            this.pluginService.executeQuery(configuration.secondQuery, benchmarkBody).then((secondQueryData) => {
                System.import(configuration.chartCache).then((res) => {
                    const configuration = {
                        label: 'Sales'
                    }
                    this.dataVisualizationService.loadSrcJSFiles(res.deps).then(() => {
                        this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                        this.chartInstance.data = firstQueryData;
                        this.chartInstance.data["BenchmarkQueries"] = []
                        this.chartInstance.data["BenchmarkSet"] = []
                        if(secondQueryData) {
                            this.chartInstance.data["BenchmarkQueries"] = secondQueryData["DataQueries"]
                            this.chartInstance.data["BenchmarkSet"] = secondQueryData["DataSet"]
                        }
                        this.chartInstance.update();
                        window.dispatchEvent(new Event('resize'));
                        this.loaderService.hide();
                    }).catch(err => {
                        this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
                    })
                }).catch(err => {
                    this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.chartCache}, error: ${err}`;
                });
            }).catch((err) => {
                this.divView.nativeElement.innerHTML = `Failed to execute second query: ${configuration.secondQuery} , error: ${err}`;;
            })
        }).catch((err) => {
            this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query} , error: ${err}`;;
        })

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

    drawRequired(value) {
    return (
      this.configuration?.query != value.configuration.query ||
      this.configuration?.chart != value.configuration.chart ||
      this.configuration?.secondQuery != value.configuration.secondQuery ||
      !this.pluginService.variableDatasEqual(this.configuration?.variablesData, value.configuration.variablesData) ||
      !this.pluginService.variableDatasEqual(this.configuration?.benchmarkVariablesData, value.configuration.benchmarkVariablesData)
    );
    }
}

