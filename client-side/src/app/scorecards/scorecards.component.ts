import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IScorecards } from '../card.model';
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
      this.gapInRem = this.convertToRem(this.configuration?.scorecardsConfig.gap);
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

  convertToRem(gap) {
    switch(gap) {
    case 'none':
      return '0rem'
    case 'sm':
        return '2rem'
    case 'md':
        return '4rem'
    case 'lg':
        return '8rem'
    default:
        return '2rem'
    }
  }

}
