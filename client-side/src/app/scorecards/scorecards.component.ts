import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IScorecards } from '../card.model';

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
  gapInRem: string;

  async ngOnInit() {
  }

}
