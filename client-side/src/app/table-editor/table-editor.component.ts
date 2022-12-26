import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { BlockHelperService } from '../block-helper/block-helper.service';
import { config } from '../addon.config';
import { ChartConfiguration } from '../models/chart-configuration';
import { ICardEditor, IScorecards, IScorecardsEditor } from '../card.model';
import { PageConfiguration } from '@pepperi-addons/papi-sdk';
import { PepButton } from '@pepperi-addons/ngx-lib/button';

@Component({
  selector: 'app-list-editor',
  templateUrl: './table-editor.component.html',
  styleUrls: ['./table-editor.component.scss']
})
export class TableEditorComponent implements OnInit {

  @Input()
  set hostObject(value) {
    if (value && value.configuration && Object.keys(value.configuration).length) {
      if(!this._configuration) {
        this._configuration = value.configuration;
      }
      if(value.configurationSource && Object.keys(value.configuration).length > 0){
          this.configurationSource = value.configurationSource;
      }
    } else {
          if(this.blockLoaded){
              this.loadDefaultConfiguration();
          }
      }

    this.pageParameters = value?.pageParameters || {};
    this.pageParametersOptions = [];
    // Object.keys(this.pageParameters).forEach(paramKey => {
    // this.pageParametersOptions.push({key: paramKey, value: paramKey})
    // });
    this.pageParametersOptions.push({key: "AccountUUID", value: "AccountUUID"})
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  private _configuration: IScorecards;
  get configuration(): IScorecards {
      return this._configuration;
  }
  configurationSource;
  blockLoaded = false;
  activeTabIndex = 0;
  chartsOptions: { key: string, value: string }[] = [];
  charts;
  currentCardindex: number;
  private defaultPageConfiguration: PageConfiguration = { "Parameters": [] };
  private _pageConfiguration: PageConfiguration = this.defaultPageConfiguration;
  protected pageParameters: any;
  pageParametersOptions = [];
  public textColor: Array<PepButton> = [];
  public TextPositionStyling: Array<PepButton> = [];
  public GroupTitleAndDescription: Array<PepButton> = [];
  DropShadowStyle: Array<PepButton> = [];

  constructor(protected addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    protected translate: TranslateService,
    protected dvService: DataVisualizationService,
    public pluginService: AddonService,
    protected blockHelperService: BlockHelperService
  ) {
      this.pluginService.addonUUID = config.AddonUUID;
      this.blockHelperService = new BlockHelperService(translate,dvService,pluginService);
  }

  async ngOnInit(): Promise<void> {
    if (!this.configuration || Object.keys(this.configuration).length == 0) {
      this.loadDefaultConfiguration();
    }
    this.configuration.scorecardsConfig.editSlideIndex = -1;
    this.DropShadowStyle = this.dvService.getShadowStyles();
    
    if(!this.blockLoaded) {
      this.pluginService.fillChartsOptions(this.chartsOptions,'Table chart').then(res => {           
          this.charts = res;
          this.dvService.setDefaultChart(this.configuration.scorecardsConfig, res);
          this.updatePageConfigurationObject();
          this.updateHostObject();
          this.blockLoaded = true;
          this.hostEvents.emit({ action: 'block-editor-loaded' });
      })
    }
  }

  private loadDefaultConfiguration() {
    this._configuration = this.getDefaultHostObject();
        this.updateHostObject();
  }

  private getDefaultCard(): ICardEditor {
    let card = new ICardEditor();
    card.id = 0;
    card.title = "Query1"
    return card;
  }

  getDefaultHostObject(): IScorecards {
    return { scorecardsConfig: new IScorecardsEditor(), cards: [this.getDefaultCard()] };
  }

  onCardEditClick(event) {
      if(this.configuration?.scorecardsConfig?.editSlideIndex === event.id){ //close the editor
          this.configuration.scorecardsConfig.editSlideIndex = -1;
      }
      else{ 
          this.currentCardindex = this.configuration.scorecardsConfig.editSlideIndex = parseInt(event.id);
      }
  }

  updateHostObject() {
    this.hostEvents.emit({
        action: 'set-configuration',
        configuration: this.configuration
    });
  }

  public onHostObjectChange(event) {
    if(event && event.action) {
        if (event.action === 'set-configuration') {
            this._configuration = event.configuration;
            this.updateHostObject();

            // Update page configuration only if updatePageConfiguration
            if (event.updatePageConfiguration) {
                this.updatePageConfigurationObject();
            }
        }
    }
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
