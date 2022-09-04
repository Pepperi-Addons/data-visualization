import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { BlockHelperService } from '../block-helper/block-helper.service';
import { config } from '../addon.config';

@Component({
    selector: 'benchmark-chart-editor',
    templateUrl: './benchmark-chart-editor.component.html',
    styleUrls: ['./benchmark-chart-editor.component.scss']
})

export class BenchmarkChartEditorComponent implements OnInit {

    benchmarkQueryOptions = [];
    benchmarkInputVars;

    @Input()
    set hostObject(value) {
        if (value && value.configuration) {
            this.blockHelperService.configuration = value.configuration
        } else {
            if (this.blockHelperService.blockLoaded) {
                this.loadDefaultConfiguration();
            }
        }
        this.blockHelperService.pageParametersOptions = []
        this.blockHelperService.pageParametersOptions.push({key: "AccountUUID", value: "AccountUUID"})
    }

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

    constructor(protected addonService: PepAddonService,
        public routeParams: ActivatedRoute,
        public router: Router,
        public route: ActivatedRoute,
        protected translate: TranslateService,
        protected dataVisualizationService: DataVisualizationService,
        public pluginService: AddonService,
        protected blockHelperService: BlockHelperService) {
            this.pluginService.addonUUID = config.AddonUUID;
            this.blockHelperService = new BlockHelperService(translate,dataVisualizationService,pluginService);
    }

    async ngOnInit(): Promise<void> {
        if (!this.blockHelperService.configuration || Object.keys(this.blockHelperService.configuration).length == 0) {
            this.loadDefaultConfiguration();
        }
        if(!this.blockHelperService.blockLoaded) {
            this.pluginService.fillChartsOptions(this.blockHelperService.chartsOptions,'Benchmark chart').then(res => {
                this.blockHelperService.charts = res;
                if (!this.blockHelperService.configuration.chart) {
                    // set the first chart to be default
                    const firstChart = res[0];
                    this.blockHelperService.configuration.chart = firstChart.Key;
                    this.blockHelperService.configuration.chartCache = firstChart.ScriptURI;
                }
                this.blockHelperService.initData(this.hostEvents);
            })
        }
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
    }

    // async getQueryOptions(){
    //     return this.pluginService.getAllQueries();
    // }

    private loadDefaultConfiguration() {
        this.blockHelperService.configuration = this.getDefaultHostObject();
        this.blockHelperService.updateHostObject(this.hostEvents);
    }
}
