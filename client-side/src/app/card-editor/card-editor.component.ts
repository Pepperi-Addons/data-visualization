import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScorecards } from 'src/app/card.model';
import { MatDialogRef } from '@angular/material/dialog';
import { AddonService } from 'src/services/addon.service';
import { ActivatedRoute } from '@angular/router';
import { config } from '../addon.config';
import { DataVisualizationService } from 'src/services/data-visualization.service';

@Component({
    selector: 'card-editor',
    templateUrl: './card-editor.component.html',
    styleUrls: ['./card-editor.component.scss']
})
export class CardEditorComponent implements OnInit {

    @Input() configuration: IScorecards;
    @Input() id: string;
    @Input() charts: any;
    @Input() chartsOptions: { key: string, value: string }[];
    @Input() pageParametersOptions;
    @Input() isScorecard: boolean;
    @Input() isDraggable = false;
    @Input() showActions = true;

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    @Output() removeClick: EventEmitter<any> = new EventEmitter();
    @Output() editClick: EventEmitter<any> = new EventEmitter();

    dialogRef: MatDialogRef<any>;
    public title: string;
    queryOptions = [];
    benchmarkQueryOptions = [];
    inputVars;
    benchmarkInputVars;
    blockLoaded = false;

    constructor(
        public routeParams: ActivatedRoute,
        public pluginService: AddonService,
        protected translate: TranslateService,
        protected dataVisualizationService: DataVisualizationService,
    ) {
        this.pluginService.addonUUID = config.AddonUUID;
    }

    async ngOnInit(): Promise<void> {
        this.title = this.configuration?.cards[this.id].titleContent;
        this.getQueryOptions().then(queries => {
            const sorted_queries = queries.sort((a, b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
            sorted_queries.forEach(q => {
                this.queryOptions.push({key: q.Key, value: q.Name})
                this.benchmarkQueryOptions.push({key: q.Key, value: q.Name})
            });
        })
        const queryID = this.configuration?.cards[this.id].query;
        if (queryID) {
            this.pluginService.getDataQueryByKey(queryID).then(queryData => {
                if (queryData[0]) {
                  this.inputVars = queryData[0].Variables;
                }
              })
        }
        const secondQueryID = this.configuration?.cards[this.id].secondQuery;
        if (secondQueryID) {
            this.pluginService.getDataQueryByKey(secondQueryID).then(secondQueryData => {
                if(secondQueryData[0]) {
                    this.benchmarkInputVars = secondQueryData[0].Variables;
                }
            })
        }

        const chartID = this.configuration?.cards[this.id].chart;
        if (!chartID) {
            // set the first chart to be default
            const firstChart = this.charts[0];
            this.configuration.cards[this.id].chart = firstChart.Key;
            this.configuration.cards[this.id].chartCache = firstChart.ScriptURI;
        }
        this.blockLoaded = true
        this.updateHostObject();
    }

    onRemoveClick() {
        this.removeClick.emit({id: this.id});
    }

    onEditClick() {
        this.editClick.emit({id: this.id});
    }

    onCardFieldChange(key, event){
        const value = key.indexOf('image') > -1 && key.indexOf('src') > -1 ? event.fileStr :  event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value :  event;
  
        if(key.indexOf('.') > -1) {
            let keyObj = key.split('.');
            this.configuration.cards[this.id][keyObj[0]][keyObj[1]] = value;
        }
        else {
            this.configuration.cards[this.id][key] = value;
        }
        this.updateHostObject();
    }

    private updateHostObject() {
        this.hostEvents.emit({
            action: 'set-configuration',
            configuration: this.configuration,
        });
    }

    onSlideshowFieldChange(key, event) {
        if(event && event.source && event.source.key){
            this.configuration.scorecardsConfig[key] = event.source.key;
        }
        else{
            this.configuration.scorecardsConfig[key] = event;
        }
        this.updateHostObject();
    }

    async queryChanged(e) {
        this.configuration.cards[this.id].query = e;
        this.inputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
        this.configuration.cards[this.id].variablesData = {}
        for(let v of this.inputVars) {
            this.configuration.cards[this.id].variablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
        }
        this.updateHostObject();
    }

    async secondQueryChanged(e) {
        this.configuration.cards[this.id].secondQuery = e;
        this.benchmarkInputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
        this.configuration.cards[this.id].benchmarkVariablesData = {}
        for(let v of this.benchmarkInputVars) {
            this.configuration.cards[this.id].benchmarkVariablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
        }
        this.updateHostObject();
    }

    designChanged(e){
        const selectedChart = this.charts.filter(c => c.Key == e)[0];
        this.configuration.cards[this.id].chart = selectedChart.Key;
        this.configuration.cards[this.id].chartCache = selectedChart.ScriptURI;
        this.updateHostObject();
    }

    async getQueryOptions(){
        return await this.pluginService.getAllQueries();
    }

    variablesDataChanged(e, varName, field, isBenchmark) {
        if(!isBenchmark) {
          if(field=='source') {
            this.configuration.cards[this.id].variablesData[varName].source = e
            this.configuration.cards[this.id].variablesData[varName].value = null
            if(e == 'Default')
            this.configuration.cards[this.id].variablesData[varName].value = this.getDefaultValue(varName);
          } else {
            this.configuration.cards[this.id].variablesData[varName].value = e
          }
        }
        else {
          if(field=='source') {
            this.configuration.cards[this.id].benchmarkVariablesData[varName].source = e
            this.configuration.cards[this.id].benchmarkVariablesData[varName].value = null
            if(e == 'Default') 
            this.configuration.cards[this.id].benchmarkVariablesData[varName].value = this.getDefaultValue(varName);
          } else {
            this.configuration.cards[this.id].benchmarkVariablesData[varName].value = e
          }
        }
        this.updateHostObject();
    }

    getDefaultValue(varName) {
        return this.inputVars.filter(v => v.Name == varName)[0].DefaultValue;
    }

    onVariablesDataChanged(data: any) {
        this.variablesDataChanged(data.event, data.name, data.field, false);
    }

    onBenchmarkVariablesDataChanged(data: any) {
        this.variablesDataChanged(data.event, data.name, data.field, true);
    }
}
