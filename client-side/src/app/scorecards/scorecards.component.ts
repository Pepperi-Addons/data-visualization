import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';

@Component({
  selector: 'app-scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.css']
})
export class ScorecardsComponent implements OnInit {

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  _hostObject;
  existing: any;
  chartID;
  isLibraryAlreadyLoaded = {};
  @Input('hostObject')
  get hostObject() {
    return this._hostObject;
  }
  set hostObject(value) {
    this._hostObject = value;
    if (value.configuration?.query.Key && value.configuration?.query?.Series && value.configuration?.query?.Series.length > 0) {
      this.drawScorecards(this._hostObject.configuration);
    }
    else {
      this.deleteScorecards();
    }

  }

  @ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
  oldDefine: any;

  constructor(private translate: TranslateService, private addonService: PepAddonService) { }

  ngOnInit(): void {
    // When finish load raise block-loaded.
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  ngOnChanges(e: any): void {
  }

  drawScorecards(configuration) {
    this.executeQuery(configuration.query.Key).then((data) => {
      try {
        const series = data.DataQueries.map((data) => data.Series).reduce((x, value) => x.concat(value), []);
        const dataset = Object.assign.apply(Object, data.DataSet);
        let content = `<div style="display: flex;flex-direction: column;gap: 2rem;">
        <div style="margin:1rem;display: flex;gap: 2rem;">`;
        for (let i = 0; i < series.length; i++) {
          content += `<div style="padding: 2rem 2.5rem;
          background: rgb(255, 255, 255);
          box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.05),
                0px 8px 16px 0px rgba(0, 0, 0, 0.04),
                0px 12px 24px 0px rgba(0, 0, 0, 0.04);
          border-radius: 8px;">
        <p style="text-align: center; margin: 10px 0px" class="color-dimmed">
          ${series[i]}
        </p>
        <p style="text-align: center; margin: 10px 0px" class="bold" >  
          ${dataset[series[i]]}
        </p>
      </div>`;
        };
        content += `</div></div>`;
        this.divView.nativeElement.innerHTML = content;
      }
      catch (err) {
        this.divView.nativeElement.innerHTML = `Failed to draw scorecards:  , error: ${err}`;
      }
    }).catch((err) => {
      this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query.Key} , error: ${err}`;
    })
  }

  getRandomNumber() {
    return Math.floor(Math.random() * 100);
  }

  async executeQuery(queryID) {
    const params = {
      key: queryID
    };
    return this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', 'execute', null, { params: params }).toPromise();
  }

  deleteScorecards() {
    if (this.divView) {
      this.divView.nativeElement.innerHTML = "";
    }
  }
}
