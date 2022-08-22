import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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

export class ChartEditorComponent implements OnInit {    
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
        // super(addonService,routeParams,router,route,translate,dataVisualizationService,pluginService);
    }

    private loadDefaultConfiguration() {
        this.blockHelperService.configuration = this.getDefaultHostObject();
        this.blockHelperService.updateHostObject(this.hostEvents);
    }

    async ngOnInit(): Promise<void> {

        if (!this.blockHelperService.configuration || Object.keys(this.blockHelperService.configuration).length == 0) {
            this.loadDefaultConfiguration();
        };

        this.pluginService.fillChartsOptions(this.blockHelperService.chartsOptions,'Chart').then(res => {           
            this.blockHelperService.charts = res;
            if (!this.blockHelperService.configuration.chart) {
                // set the first chart to be default
                const firstChart = res[0];
                this.blockHelperService.configuration.chart = firstChart.Key;
                this.blockHelperService.configuration.chartCache = firstChart.ScriptURI;
            }

            this.blockHelperService.initData(this.hostEvents, this.getQueryOptions);
            
        })
    }

    protected getDefaultHostObject(): ChartConfiguration {
      return new ChartConfiguration();
    }

    async getQueryOptions(){
        return await this.pluginService.getAllQueries();
    }

    onVariablesDataChanged(data: any) {
        this.blockHelperService.variablesDataChanged(data.event, data.name, data.field, false, this.hostEvents);
    }
}
