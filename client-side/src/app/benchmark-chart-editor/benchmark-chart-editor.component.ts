import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { BlockHelperService } from '../block-helper/block-helper.service';

@Component({
    selector: 'benchmark-chart-editor',
    templateUrl: './benchmark-chart-editor.component.html',
    styleUrls: ['./benchmark-chart-editor.component.scss']
})

export class BenchmarkChartEditorComponent extends BlockHelperService implements OnInit {

    benchmarkQueryOptions = [];
    selectedBenchmarkQuery: string = ''
    benchmarkInputVars;

    constructor(protected addonService: PepAddonService,
        public routeParams: ActivatedRoute,
        public router: Router,
        public route: ActivatedRoute,
        protected translate: TranslateService,
        protected dataVisualizationService: DataVisualizationService,
        public pluginService: AddonService) {
        super(addonService,routeParams,router,route,translate,dataVisualizationService,pluginService);
    }

    async ngOnInit(): Promise<void> {
        if (!this.configuration || Object.keys(this.configuration).length == 0) {
            this.loadDefaultConfiguration();
        }
        this.pluginService.fillChartsOptions(this.chartsOptions,'Benchmark chart').then(res => {
            this.charts = res;
            if (!this.configuration.chart) {
                // set the first chart to be default
                const firstChart = res[0];
                this.configuration.chart = firstChart.Key;
                this.configuration.chartCache = firstChart.ScriptURI;
            }
            super.ngOnInit();
        })
        this.getQueryOptions().then( benchmarkQueries => {
            benchmarkQueries.forEach(q => this.benchmarkQueryOptions.push({key: q.Key, value: q.Name}));
        })
        const secondQueryID = this.configuration?.secondQuery;
        if (secondQueryID) {
            this.pluginService.getDataQueryByKey(secondQueryID).then(secondQueryData => {
                if(secondQueryData[0]) {
                    this.selectedBenchmarkQuery = secondQueryID;
                    this.benchmarkInputVars = secondQueryData[0].Variables;
                }
            })
        }
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
    }

    async getQueryOptions(){
        return this.pluginService.getAllQueries();
    }

    async secondQueryChanged(e) {
        this.selectedBenchmarkQuery = e;
        this._configuration.secondQuery = e;
        this.benchmarkInputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
        this.configuration.benchmarkVariablesData = {}
        for(let v of this.benchmarkInputVars) {
            this.configuration.benchmarkVariablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
        }
        this.updateHostObject();
    }

    onVariablesDataChanged(data: any) {
        this.variablesDataChanged(data.event, data.name, data.field, false);
    }

    onBenchmarkVariablesDataChanged(data: any) {
        this.variablesDataChanged(data.event, data.name, data.field, true);
    }
}
