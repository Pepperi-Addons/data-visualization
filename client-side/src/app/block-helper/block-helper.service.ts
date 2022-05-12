import { EventEmitter, Injectable, Input, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { PepAddonService } from "@pepperi-addons/ngx-lib";
import { IPepButtonClickEvent, PepButton } from "@pepperi-addons/ngx-lib/button";
import { PepDialogActionButton } from "@pepperi-addons/ngx-lib/dialog";
import { pepIconSystemBin } from "@pepperi-addons/ngx-lib/icon";
import { AddonService } from "src/services/addon.service";
import { DataVisualizationService } from "src/services/data-visualization.service";
import { Serie } from "../../../../server-side/models/data-query";
import { BaseConfiguration } from "../models/base-configuration";
import { Overlay } from "../models/overlay ";
import { v4 as uuid } from 'uuid';
import { SeriesEditorComponent } from "../series-editor/series-editor.component";


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
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  protected _configuration: any;
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

    (await this.getQueryOptions()).forEach(q => this.queryOptions.push({key: q.Key, value: q.Name}));
    const queryID = this.configuration?.query?.Key;
    if (queryID) {
      this._configuration.query = { Key: queryID };
      this.selectedQuery = queryID;
    }
    this.blockLoaded = true;
    this._configuration.executeQuery = true;
    this.updateHostObject();
    this.hostEvents.emit({ action: 'block-editor-loaded' });
  }

  protected loadDefaultConfiguration() {
    this._configuration = this.getDefaultHostObject();
    this.updateHostObject();
  }

  // need to be overriden
  protected abstract getDefaultHostObject();

  onEditClick() {
  }

  protected updateHostObject() {
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
    this._configuration.executeQuery = false;
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
    this._configuration.executeQuery = true;
    this.updateHostObject();
  }

  abstract getQueryOptions();

}