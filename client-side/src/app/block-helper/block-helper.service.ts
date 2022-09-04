import { EventEmitter, Injectable, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { PepAddonService } from "@pepperi-addons/ngx-lib";
import { PepButton } from "@pepperi-addons/ngx-lib/button";
import { PageConfiguration } from "@pepperi-addons/papi-sdk";
import { AddonService } from "src/services/addon.service";
import { DataVisualizationService } from "src/services/data-visualization.service";
import { Serie } from "../../../../server-side/models/data-query";
import { Overlay } from "../models/overlay ";
import { config } from '../addon.config';

@Injectable()
export class BlockHelperService {
  public configuration: any;
  private defaultPageConfiguration: PageConfiguration = { "Parameters": [] };
  private _pageConfiguration: PageConfiguration = this.defaultPageConfiguration;
  pageParametersOptions = [];
  
  label = false;
  activeTabIndex = 0;
  charts: any;
  blockLoaded = false;
  currentSeries: Serie;
  chartsOptions: { key: string, value: string }[] = [];
  seriesButtons: Array<Array<PepButton>> = [];
  DropShadowStyle: Array<PepButton> = [];
  PepSizes: Array<PepButton> = [];
  queryOptions = [];
  benchmarkQueryOptions = [];
  inputVars;
  benchmarkInputVars;

  constructor(
    protected translate: TranslateService,
    protected dataVisualizationService: DataVisualizationService,
    public pluginService: AddonService) {
    this.pluginService.addonUUID = config.AddonUUID;
  }

  initData(hostEvents: EventEmitter<any>) {
      this.PepSizes = [
          { key: 'sm', value: this.translate.instant('SM') },
          { key: 'md', value: this.translate.instant('MD') },
          { key: 'lg', value: this.translate.instant('LG') },
          { key: 'xl', value: this.translate.instant('XL') }
      ];
      this.DropShadowStyle = [
          { key: 'Soft', value: this.translate.instant('Soft') },
          { key: 'Regular', value: this.translate.instant('Regular') }
      ];
      
      this.pluginService.getAllQueries().then(queries => {
        const sorted_queries = queries.sort((a, b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
        sorted_queries.forEach(q => {
          this.queryOptions.push({key: q.Key, value: q.Name});
          this.benchmarkQueryOptions.push({key: q.Key, value: q.Name})
        })

        const queryID = this.configuration?.query;
        if (queryID) {
          this.pluginService.getDataQueryByKey(queryID).then(queryData => {
            if (queryData[0]) {
              this.inputVars = queryData[0].Variables;
            }
          })
        }

        const secondQueryID = this.configuration?.secondQuery;
        if (secondQueryID) {
            this.pluginService.getDataQueryByKey(secondQueryID).then(secondQueryData => {
                if(secondQueryData[0]) {
                    this.benchmarkInputVars = secondQueryData[0].Variables;
                }
            })
        }
        this.blockLoaded = true;
        this.updatePageConfigurationObject(hostEvents);
        this.updateHostObject(hostEvents);
      })
  }

  onEditClick() {
  }

  updateHostObject(hostEvents: EventEmitter<any>) {
    hostEvents.emit({
        action: 'set-configuration',
        configuration: this.configuration,
    });
  }

  tabClick(event) {
  }

  onFieldChange(key, event, hostEvents: EventEmitter<any>) {
    const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value : event;

    if (key.indexOf('.') > -1) {
        let keyObj = key.split('.');
        this.configuration[keyObj[0]][keyObj[1]] = value;
    }
    else {
        this.configuration[key] = value;
    }
    this.updateHostObject(hostEvents);
  }

  getSliderBackground(color) {
    if (!color) return;
    let alignTo = 'right';

    let col: Overlay = new Overlay();

    col.color = color;
    col.opacity = '100';

    let gradStr = this.dataVisualizationService.getRGBAcolor(col, 0) + ' , ' + this.dataVisualizationService.getRGBAcolor(col);

    return 'linear-gradient(to ' + alignTo + ', ' + gradStr + ')';
  }

  async queryChanged(e, hostEvents: EventEmitter<any>) {
    this.configuration.query = e;
    this.inputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
    this.configuration.variablesData = {}
    for(let v of this.inputVars) {
      this.configuration.variablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
    }
    this.updateHostObject(hostEvents);
  }

  async secondQueryChanged(e, hostEvents: EventEmitter<any>) {
    this.configuration.secondQuery = e;
    this.benchmarkInputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
    this.configuration.benchmarkVariablesData = {}
    for(let v of this.benchmarkInputVars) {
        this.configuration.benchmarkVariablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
    }
    this.updateHostObject(hostEvents);
}

  onValueChanged(type, event, hostEvents: EventEmitter<any>) {
    switch (type) {
        case 'Chart':
            if (event) {
                const selectedChart = this.charts.filter(c => c.Key == event)[0];
                this.configuration.chart = selectedChart.Key;
                this.configuration.chartCache = selectedChart.ScriptURI;
            }
            else {
                this.configuration.chart = null;
                this.configuration.chartCache = null;
            }
            break;

        case 'Label':
            this.configuration.label = event;
            break;

        case 'useLabel':
            this.configuration.useLabel=event;
            if(!event)
                this.configuration.label="";
            break;

        case 'Height':
            if(event == ""){
                this.configuration.height = 22; //default value
            }
            else
                this.configuration.height = event;

            break;
    }
    this.updateHostObject(hostEvents);
  }

  variablesDataChanged(e, varName, field, isBenchmark, hostEvents: EventEmitter<any>) {
    if(!isBenchmark) {
      if(field=='source') {
        this.configuration.variablesData[varName].source = e
        this.configuration.variablesData[varName].value = null
        if(e == 'Default')
          this.configuration.variablesData[varName].value = this.inputVars.filter(v => v.Name == varName)[0].DefaultValue
      } else {
        this.configuration.variablesData[varName].value = e
      }
    }
    else {
      if(field=='source') {
        this.configuration.benchmarkVariablesData[varName].source = e
        this.configuration.benchmarkVariablesData[varName].value = null
        if(e == 'Default') 
          this.configuration.benchmarkVariablesData[varName].value = this.inputVars.filter(v => v.Name == varName)[0].DefaultValue
      } else {
        this.configuration.benchmarkVariablesData[varName].value = e
      }
    }
    this.updateHostObject(hostEvents);
  }

  onVariablesDataChanged(data: any, hostEvents: EventEmitter<any>) {
    this.variablesDataChanged(data.event, data.name, data.field, false, hostEvents);
  }

  onBenchmarkVariablesDataChanged(data: any, hostEvents: EventEmitter<any>) {
      this.variablesDataChanged(data.event, data.name, data.field, true, hostEvents);
  }

  private updatePageConfigurationObject(hostEvents: EventEmitter<any>) {
    this._pageConfiguration = this.defaultPageConfiguration;
    //defining the page parameters we want to consume
    //currently the only page parameter consumed is AccountUUID
    this._pageConfiguration.Parameters.push({
        Key: 'AccountUUID',
        Type: 'String',
        Consume: true,
        Produce: false
    });
    hostEvents.emit({
        action: 'set-page-configuration',
        pageConfiguration: this._pageConfiguration
    });
  }

}