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


@Injectable()
export abstract class BlockHelperService implements OnInit {

  @Input()
  set hostObject(value) {
    if (value && value.configuration) {
      this._configuration = value.configuration
    } else {
      if (this.blockLoaded) {
        this.loadDefaultConfiguration();
      }
    }
    this.pageParametersOptions = []
    this.pageParametersOptions.push({key: "AccountUUID", value: "AccountUUID"})
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  protected _configuration: any;
  private defaultPageConfiguration: PageConfiguration = { "Parameters": [] };
  private _pageConfiguration: PageConfiguration = this.defaultPageConfiguration;
  pageParametersOptions = [];
  get configuration() {return this._configuration};
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
  selectedQuery: string = ''
  inputVars;


  constructor(protected addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    protected translate: TranslateService,
    protected dataVisualizationService: DataVisualizationService,
    public pluginService: AddonService) {
    this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  async ngOnInit()  {
    if (!this.configuration || Object.keys(this.configuration).length == 0) {
      this.loadDefaultConfiguration();
    };

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

    this.getQueryOptions().then(queries => {
      queries.forEach(q => this.queryOptions.push({key: q.Key, value: q.Name}));
      const queryID = this.configuration?.query?.Key;
      if (queryID) {
        this.pluginService.getDataQueryByKey(queryID).then(queryData => {
          if (queryData[0]) {
            this._configuration.query = { Key: queryID };
            this.selectedQuery = queryID;
            this.inputVars = queryData[0].Variables;
          }
        })
      }
      this.blockLoaded = true;
      this.updatePageConfigurationObject();
      this.updateHostObject();
      this.hostEvents.emit({ action: 'block-editor-loaded' });
    })
  }

  protected loadDefaultConfiguration() {
    this._configuration = this.getDefaultHostObject();
    this.updateHostObject();
  }

  // need to be overriden
  protected abstract getDefaultHostObject();

  onEditClick() {
  }

  updateHostObject() {
    this.hostEvents.emit({
        action: 'set-configuration',
        configuration: this.configuration,
    });
  }

  tabClick(event) {
  }

  onFieldChange(key, event) {
    const value = event && event.source && event.source.key ? event.source.key : event && event.source && event.source.value ? event.source.value : event;

    if (key.indexOf('.') > -1) {
        let keyObj = key.split('.');
        this._configuration[keyObj[0]][keyObj[1]] = value;
    }
    else {
        this._configuration[key] = value;
    }
    this.updateHostObject();
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

  async queryChanged(e) {
    this.selectedQuery = e;
    this._configuration.query = { Key: e };
    this.inputVars = (await this.pluginService.getDataQueryByKey(e))[0].Variables;
    this._configuration.variablesData = {}
    for(let v of this.inputVars) {
      this._configuration.variablesData[v.Name] = { source: 'Default', value: v.DefaultValue }
    }
    this.updateHostObject();
  }

  abstract getQueryOptions();

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
            break;

        case 'Label':
            this._configuration.label = event;
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

            break;
    }
    this.updateHostObject();
  }

  variablesDataChanged(e, varName, field, isBenchmark) {
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
    this.updateHostObject();
  }

  private updatePageConfigurationObject() {
    this._pageConfiguration = this.defaultPageConfiguration;
    this._pageConfiguration.Parameters.push({
        Key: 'AccountUUID',
        Type: 'String',
        Consume: true,
        Produce: false
    });
    this.hostEvents.emit({
        action: 'set-page-configuration',
        pageConfiguration: this._pageConfiguration
    });
  }
}