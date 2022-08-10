import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { BlockHelperService } from '../block-helper/block-helper.service';

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
        if (!this.configuration || Object.keys(this.configuration).length == 0) {
            this.loadDefaultConfiguration();
        };
        this.pluginService.fillChartsOptions(this.chartsOptions,'Chart').then(res => {           
            this.charts = res;
            if (!this.configuration.chart) {
                // set the first chart to be default
                const firstChart = res[0];
                this.configuration.chart = {Key: firstChart.Key, ScriptURI: firstChart.ScriptURI};
            }
            super.ngOnInit();
        })
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
    }

    async getQueryOptions(){
        return await this.pluginService.getAllQueries();
    }

    onVariablesDataChanged(data: any) {
        this.variablesDataChanged(data.event, data.name, data.field, false);
    }
}
