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
        };
        await this.fillChartsOptions();
        super.ngOnInit();
        (await this.getQueryOptions()).forEach(q => this.benchmarkQueryOptions.push({key: q.Key, value: q.Name}));
        const secondQueryID = this.configuration?.secondQuery?.Key;
        if (secondQueryID) {
          this.selectedBenchmarkQuery = secondQueryID;
        }
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
    }

    private fillChartsOptions() {
        return this.pluginService.getChartsByType('Benchmark chart').then((charts) => {
            this.charts = charts.sort((a, b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
            if (!this.configuration.chart) {
                // set the first chart to be default
                const firstChart = this.charts[0];
                this._configuration.chart = {Key: firstChart.Key, ScriptURI: firstChart.ScriptURI};
            }
            charts.forEach(chart => {
                this.chartsOptions.push({ key: chart.Key, value: chart.Name });
            });
        });
    }

    onValueChanged(type, event) {
        switch (type) {
            case 'Chart':
                if (event) {
                    const selectedChart = this.charts.filter(c => c.Key == event)[0];
                    this._configuration.chart = {Key: selectedChart.Key, ScriptURI: selectedChart.ScriptURI};
                }
                else {
                    this._configuration.chart = null;
                }
                this._configuration.executeQuery = true;
                break;

            case 'Label':
                this._configuration.label = event;
                this._configuration.executeQuery = false;
                break;

            case 'useLabel':
                this._configuration.useLabel=event;
                if(!event)
                    this._configuration.label="";
                break;

            case 'Height':
                if(event == ""){
                    this._configuration.height = 22; //default value
                }
                else
                    this._configuration.height = event;

                this._configuration.executeQuery = true;
                break;
        }
        this.updateHostObject();
    }

    async getQueryOptions(){
        return await this.pluginService.getAllQueries();
    }

    async secondQueryChanged(e) {
        this.selectedBenchmarkQuery = e;
        this._configuration.secondQuery = { Key: e };
        this._configuration.executeQuery = true;
        this.updateHostObject();
    }


}
