import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { BlockHelperService } from '../block-helper/block-helper.service';
import internal from 'stream';

@Component({
    selector: 'chart-editor',
    templateUrl: './chart-editor.component.html',
    styleUrls: ['./chart-editor.component.scss']
})

export class ChartEditorComponent extends BlockHelperService implements OnInit {

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
        if (!this.configuration) {
            this.loadDefaultConfiguration();
        };
        await this.fillChartsOptions();
        super.ngOnInit();
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
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
            case 'Height':
                this._configuration.height = event;
                this.configuration.executeQuery = true;

        }
        this.updateHostObject();
    }

    // need to be moved to block helper
    onEventCheckboxChanged(key, event){
        switch(key){
            case "Label":
                this.configuration.useLabel=event;
                if(!event){
                    this.configuration.label="";
                }
        }
    }
}
