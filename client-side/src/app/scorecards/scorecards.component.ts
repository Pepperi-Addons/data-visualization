import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { config } from '../addon.config';
import { Color } from '../models/color';
import { Overlay } from '../models/overlay ';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';

@Component({
  selector: 'app-scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.css']
})
export class ScorecardsComponent implements OnInit {

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

  existing: any;
  chartID;
  isLibraryAlreadyLoaded = {};
  private _configuration: ScorecardsConfiguration;
  get configuration(): ScorecardsConfiguration {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    this._configuration = value?.configuration;
    if (value.configuration?.query?.Key && value.configuration?.query?.Series && value.configuration?.query?.Series.length > 0) {
      this.drawScorecards(this.configuration);
    }
    else {
      this.deleteScorecards();
    }

  }

  @ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
  oldDefine: any;

  constructor(private translate: TranslateService,
    private addonService: PepAddonService,
    private dataVisualizationService: DataVisualizationService) { }

  ngOnInit(): void {
    // When finish load raise block-loaded.
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  ngOnChanges(e: any): void {
  }

  drawScorecards(configuration) {
    this.executeQuery(configuration.query.Key).then((data) => {
      try {
        const seriesNames = data.DataQueries.map((data) => data.Name);
        const series = data.DataQueries.map((data) => data.Series).reduce((x, value) => x.concat(value), []);
        const dataset = Object.assign.apply(Object, data.DataSet);
        let content = `<div style="display: flex;flex-direction: column;gap: 2rem;">
        <div style="margin:1rem;display: flex;gap: 2rem;">`;
        for (let i = 0; i < series.length; i++) {
          content += this.getScorecardsHTML(series[i], dataset[series[i]]);
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

  private getScorecardsHTML(name: string, value: any) {
    const boxShadow = this.configuration?.useDropShadow === true ? this.dataVisualizationService.getCardShadow(this.configuration?.dropShadow?.intensity / 100, this.configuration?.dropShadow?.type) : 'unset';
    return `<div style="padding: 2rem 2.5rem;
          background: rgb(255, 255, 255);
          border: ${this.dataVisualizationService.getChartBorder(this.configuration?.useBorder, this.configuration?.border)};
          box-shadow: ${boxShadow};
          border-radius: 8px;">
        <p style="text-align: center; margin: 10px 0px" class="color-dimmed title-${this.configuration.titleSize} ellipsis">
          ${name}
        </p>
        <p style="text-align: center; margin: 10px 0px" class="bold title-${this.configuration.valueSize} ellipsis" >  
          ${value}
        </p>
      </div>`;
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
