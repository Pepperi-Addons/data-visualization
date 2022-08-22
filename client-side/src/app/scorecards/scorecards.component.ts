import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from 'src/services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ICardEditor, IScorecards } from '../card.model';
import 'systemjs'
import 'systemjs-babel'

@Component({
  selector: 'scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.scss']
})
export class ScorecardsComponent implements OnInit {

  @Input('hostObject')
  set hostObject(value) {
      this.parameters = value.pageParameters;
      console.log("AccountUUID from page = " + this.parameters?.AccountUUID);
      this._configuration = value?.configuration;
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
  private _configuration: IScorecards;
  get configuration(): IScorecards {
    return this._configuration;
  }
  queryResult:any;
  chartInstances = [];
  isLibraryAlreadyLoaded = {};
  oldDefine: any;
  parameters;

  async ngOnInit() {
  }

}
