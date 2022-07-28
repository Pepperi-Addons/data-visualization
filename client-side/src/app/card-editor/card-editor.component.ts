import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IScorecards } from 'src/app/card.model';
import { MatDialogRef } from '@angular/material/dialog';
import { AddonService } from 'src/services/addon.service';
import { ActivatedRoute } from '@angular/router';

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

    // private _pageParameters: any = {};
    // @Input()
    // set pageParameters(value: any) {
    //     this._pageParameters = value;
    // }

    @Input() isDraggable = false;
    @Input() showActions = true;

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    @Output() removeClick: EventEmitter<any> = new EventEmitter();
    @Output() editClick: EventEmitter<any> = new EventEmitter();

    dialogRef: MatDialogRef<any>;
    public title: string;
    selectedDesign = ''
    selectedQuery;
    selectedBenchmarkQuery = 'None';
    queryOptions = [];
    benchmarkQueryOptions = [];
    inputVars;
    benchmarkInputVars;

    constructor(
        public routeParams: ActivatedRoute,
        private translate: TranslateService,
        public pluginService: AddonService
        ) {
            this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
    }

    async ngOnInit(): Promise<void> {
        this.title = this.configuration?.cards[this.id].titleContent;
        this.getQueryOptions().then(queries => {
            queries.forEach(q => {
                this.queryOptions.push({key: q.Key, value: q.Name})
                this.benchmarkQueryOptions.push({key: q.Key, value: q.Name})
            });
        })
        const queryID = this.configuration?.cards[this.id].query?.Key;
        if (queryID) {
            this.pluginService.getDataQueryByKey(queryID).then(queryData => {
                if (queryData[0]) {
                  this.selectedQuery = queryID;
                  this.inputVars = queryData[0].Variables;
                }
              })
        }
        const secondQueryID = this.configuration?.cards[this.id].secondQuery?.Key;
        if (secondQueryID) {
            this.pluginService.getDataQueryByKey(secondQueryID).then(secondQueryData => {
                if(secondQueryData[0]) {
                    this.selectedBenchmarkQuery = secondQueryID;
                    this.benchmarkInputVars = secondQueryData[0].Variables;
                }
            })
        }
        const chartID = this.configuration?.cards[this.id].chart?.Key;
        if (chartID) {
            this.selectedDesign = chartID;
        }
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

    onHostEvents(event: any) {
        if(event?.url) {
            this.configuration.cards[this.id]['imageURL'] = event.url;
            this.updateHostObject();
        }
    }

    async queryChanged(e) {
        this.selectedQuery = e;
        this.configuration.cards[this.id].query = { Key: e };
        this.inputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
        this.configuration.cards[this.id].variablesData = {}
        for(let v of this.inputVars) {
            this.configuration.cards[this.id].variablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
        }
        this.updateHostObject();
    }

    async secondQueryChanged(e) {
        this.selectedBenchmarkQuery = e;
        this.configuration.cards[this.id].secondQuery = { Key: e };
        this.benchmarkInputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
        this.configuration.cards[this.id].benchmarkVariablesData = {}
        for(let v of this.benchmarkInputVars) {
            this.configuration.cards[this.id].benchmarkVariablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
        }
        this.updateHostObject();
    }

    designChanged(e){
        this.selectedDesign = e;
        const selectedChart = this.charts.filter(c => c.Key == e)[0];
        this.configuration.cards[this.id].chart = {Key: selectedChart.Key, ScriptURI: selectedChart.ScriptURI};
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
          } else {
            this.configuration.cards[this.id].variablesData[varName].value = e
          }
        }
        else {
          if(field=='source') {
            this.configuration.cards[this.id].benchmarkVariablesData[varName].source = e
            this.configuration.cards[this.id].benchmarkVariablesData[varName].value = null
          } else {
            this.configuration.cards[this.id].benchmarkVariablesData[varName].value = e
          }
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
