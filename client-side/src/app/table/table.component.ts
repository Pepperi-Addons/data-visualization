import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepLoaderService } from '@pepperi-addons/ngx-lib';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { AddonService } from '../../services/addon.service';
import { IScorecards, IScorecardsEditor } from '../card.model';
import { GenericListDataSource } from '../generic-list/generic-list.component';
import { ChartConfiguration } from '../models/chart-configuration';

@Component({
  selector: 'table-scorecards',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent implements OnInit {

  dataObjects: any[] = []
  dataSet;
  listDataSource: GenericListDataSource;
  parameters;
  chartInstance: any;


  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild("previewArea") divView: ElementRef;
  private _configuration: IScorecards;
  get configuration(): IScorecards {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    console.log("AccountUUID from page = " + this.parameters?.AccountUUID);
    if (value.configuration?.cards.length > 0 && !value.configuration?.cards.some(c => !c.query)) {
      if (this.drawRequired(value) || this.parameters?.AccountUUID != value.pageParameters?.AccountUUID) {
        this.parameters = value.pageParameters;
        this.drawTable(value.configuration);
      }
    }
    else if(value.configuration?.cards.length == 0) {
      this.deleteChart();
    }
    this.parameters = value.pageParameters;
    this._configuration = value?.configuration;
  }

  constructor(private translate: TranslateService,
    private pluginService: AddonService,
    public loaderService: PepLoaderService,
    public dataVisualizationService: DataVisualizationService) {
  }

  ngOnInit(): void {
  }

  drawTable(configuration: any) {
    this.loaderService.show();
    this.executeAllQueries(configuration.cards).then((data) => {
      System.import(configuration.scorecardsConfig.chartCache).then((res) => {
        const configuration = {label: "Sales"};
        this.dataVisualizationService.loadSrcJSFiles(res.deps).then(() => {
          this.chartInstance = new res.default(this.divView.nativeElement, configuration);
          this.chartInstance.data = data;
          this.chartInstance.update();
          window.dispatchEvent(new Event("resize"));
          this.loaderService.hide();
        }).catch((err) => {
          this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
          this.loaderService.hide();
        });
      }).catch((err) => {
        this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.scorecardsConfig.chartCache}, error: ${err}`;
        this.loaderService.hide();
      });
    }).catch((err) => {
      this.divView.nativeElement.innerHTML = `Failed to execute cards: ${JSON.stringify(configuration.scorecardsConfig.cards)}, error: ${err}`;
      this.loaderService.hide();
    });
  }

  drawRequired(value) {
    if(this.configuration?.scorecardsConfig.chart != value.configuration.scorecardsConfig.chart)
      return true;
    if(this.configuration?.cards && this.configuration?.cards.length != value.configuration?.cards.length)
      return true;
    for(let i=0; i < this.configuration?.cards.length; i++) {
      if(this.isDiff(this.configuration?.cards[i],value.configuration?.cards[i]))
        return true;
    }
    return false;
  }

  isDiff(card1, card2) {
    return (card1.query != card2.query || 
      !this.pluginService.variableDatasEqual(card1.variablesData,card2.variablesData));
  }

  async executeAllQueries(cards): Promise<any> {
    return Promise.all(cards.map(card => {
      const values = this.dataVisualizationService.buildVariableValues(card.variablesData, this.parameters);
      return this.pluginService.executeQuery(card.query, { VariableValues: values })
    }));
  }

  deleteChart() {
    if (this.divView) this.divView.nativeElement.innerHTML = "";
  }

}
