import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from 'src/services/addon.service';
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
  queryResult:any;
  private _configuration: ScorecardsConfiguration;
  get configuration(): ScorecardsConfiguration {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    this._configuration = value?.configuration;
    if (value.configuration?.query?.Key) {
      this.drawScorecards(this.configuration);
    }
    if(value.configuration)
      value.configuration.executeQuery=true;
  }

  @ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
  oldDefine: any;

  constructor(private translate: TranslateService,
    private addonService: PepAddonService,
    private dataVisualizationService: DataVisualizationService,
    private pluginService: AddonService) { }

  ngOnInit(): void {
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  ngOnChanges(e: any): void {
  }

  drawScorecards(configuration) {
    if(configuration?.executeQuery)
    {
      this.pluginService.executeQuery(configuration.query.Key).then((result) => {
        try {
          this.queryResult = result;
          this.setScorcardsUIElement();
        }
        catch (err) {
          this.divView.nativeElement.innerHTML = `Failed to draw scorecards:  , error: ${err}`;
        }
      }).catch((err) => {
        this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query.Key} , error: ${err}`;
      })
    }
    else
    {
      this.setScorcardsUIElement()
    }

  }

  private setScorcardsUIElement() {
    const series = this.queryResult.DataQueries.map((data) => data.Series).reduce((x, value) => x.concat(value), []);
          if (series.length > 0) {
            const dataset = Object.assign.apply(Object, this.queryResult.DataSet);
            let content = `<div style="display: flex;flex-direction: column;gap: 2rem;">
                  <div style="margin:1rem;display: flex;gap: 2rem;">`;
            for (let i = 0; i < series.length; i++) {
              content += this.getScorecardsHTML(series[i], dataset[series[i]]);
            };
            content += `</div></div>`;
            this.divView.nativeElement.innerHTML = content;          }
          else {
            this.divView.nativeElement.innerHTML = "";
          }
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

}
