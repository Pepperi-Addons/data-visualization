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
        this.charts = await this.pluginService.fillChartsOptions(this.configuration,this.chartsOptions,'Benchmark chart')
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

    async getQueryOptions(){
        return await this.pluginService.getAllQueries();
    }

    async secondQueryChanged(e) {
        this.selectedBenchmarkQuery = e;
        this._configuration.secondQuery = { Key: e };
        this.updateHostObject();
    }


}
