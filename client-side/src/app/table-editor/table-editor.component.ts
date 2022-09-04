import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { BlockHelperService } from '../block-helper/block-helper.service';
import { config } from '../addon.config';

@Component({
  selector: 'app-list-editor',
  templateUrl: './table-editor.component.html',
  styleUrls: ['./table-editor.component.scss']
})
export class TableEditorComponent implements OnInit {

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
    protected blockHelperService: BlockHelperService
  ) {
      this.pluginService.addonUUID = config.AddonUUID;
      this.blockHelperService = new BlockHelperService(translate,dataVisualizationService,pluginService);
  }

  async ngOnInit(): Promise<void> {
    this.blockHelperService.initData(this.hostEvents);
  }

  private loadDefaultConfiguration() {
    this.blockHelperService.configuration = this.getDefaultHostObject();
    this.blockHelperService.updateHostObject(this.hostEvents);
  }

  // using the same configuration as scorecards
  protected getDefaultHostObject(): ScorecardsConfiguration {
    return new ScorecardsConfiguration();
  }
}
