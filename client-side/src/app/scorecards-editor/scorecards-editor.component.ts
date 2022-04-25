import { TranslateService } from '@ngx-translate/core';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from '../../services/addon.service';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { BlockHelperService } from '../block-helper/block-helper.service';

@Component({
  selector: 'app-scorecards-editor',
  templateUrl: './scorecards-editor.component.html',
  styleUrls: ['./scorecards-editor.component.scss']
})
export class ScorecardsEditorComponent extends BlockHelperService implements OnInit {

  constructor(protected addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    protected translate: TranslateService,
    protected dataVisualizationService: DataVisualizationService,
    public pluginService: AddonService) {
    super(addonService,routeParams,router,route,translate,dataVisualizationService,pluginService);
  }

  protected getDefaultHostObject(): ScorecardsConfiguration {
    return new ScorecardsConfiguration();
  }

  async getQueryOptions(){
    debugger
    return (await this.pluginService.getAllQueries()).filter(query => (!query.BreakBy && !query.GroupBy));
  }

}
