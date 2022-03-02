import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { BaseConfiguration } from '../models/base-configuration';
import { BlockHelperService } from '../block-helper/block-helper.service';

@Component({
  selector: 'app-list-editor',
  templateUrl: './table-editor.component.html',
  styleUrls: ['./table-editor.component.scss']
})
export class TableEditorComponent extends BlockHelperService implements OnInit {

  constructor(protected addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    protected translate: TranslateService,
    protected dataVisualizationService: DataVisualizationService,
    public pluginService: AddonService) {
    super(addonService,routeParams,router,route,translate,dataVisualizationService,pluginService);
  }

  enableLabel = false;

  // why scorecards configuration? should it be BaseConfiguration?
  protected getDefaultHostObject(): ScorecardsConfiguration {
    return new ScorecardsConfiguration();
  }

  onValueChanged(type, event) {
  }

  onEventCheckboxChanged(eventType, event) {
    if (eventType === 'Label') {
      this.enableLabel = event;
    }
  }
}
