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
  drawCounter: number = 0;

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild("previewArea") divView: ElementRef;
  private _configuration: IScorecards;
  get configuration(): IScorecards {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    console.log("AccountUUID from page = " + value.pageParameters?.AccountUUID);
    if (value.configuration?.cards?.length > 0 && !value.configuration?.cards.some(c => !c.query)) {
      if (this.drawRequired(value) || this.dataVisualizationService.pageParametersChanged(this.parameters, value.pageParameters)) {
        this.parameters = value.pageParameters;
        this.drawTable(value.configuration);
      }
    }
    else if(value.configuration?.cards?.length == 0) {
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

  async drawTable(configuration: any) {
    this.loaderService.show();

	this.drawCounter++;
	const currentDrawCounter = this.drawCounter;

    const chartFileBuffer = await fetch(configuration.scorecardsConfig.chartCache, {headers: {"Access-Control-Allow-Origin": "*"}});
	const chartTextFile = await chartFileBuffer.text();
    this.dataVisualizationService.importTextAsModule(chartTextFile).then((res) => {
      const conf = {label: "Sales"};
      this.dataVisualizationService.loadSrcJSFiles(res.deps).then(() => {
        this.chartInstance = new res.default(this.divView.nativeElement, conf);
        this.pluginService.executeAllCards(configuration.cards, this.parameters).then((data: any[]) => {
			// here we relay on the fact that execute responses are returned in the same order as the given queries
			if(currentDrawCounter == this.drawCounter) {
				this.chartInstance.data = data;
				this.chartInstance.update();
				window.dispatchEvent(new Event("resize"));
			}
			else {
				console.log("drawCounter changed, not updating chart");
			}
			this.loaderService.hide();
        })
        .catch((err) => {
		  const errorMessage = this.dataVisualizationService.extractFaultstringFromError(err) ?? err;
          this.divView.nativeElement.innerHTML = `Failed to execute cards: ${JSON.stringify(configuration.cards)}, error: ${errorMessage}`;
          this.loaderService.hide();
        });
      })
      .catch((err) => {
		const errorMessage = this.dataVisualizationService.extractFaultstringFromError(err) ?? err;
        this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${errorMessage}`;
        this.loaderService.hide();
      });
    })
    .catch((err) => {
	  const errorMessage = this.dataVisualizationService.extractFaultstringFromError(err) ?? err;
      this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.scorecardsConfig.chartCache}, error: ${errorMessage}`;
      this.loaderService.hide();
    });
  }

  drawRequired(value): boolean {
    let isRequired = false;
    if(this.configuration?.scorecardsConfig.chart != value.configuration.scorecardsConfig.chart ||
      (this.configuration?.cards && this.configuration?.cards.length != value.configuration?.cards.length)) {
      isRequired = true;
    }
    else {
      for(let i=0; i < this.configuration?.cards.length; i++) {
        if(this.isDiff(this.configuration?.cards[i],value.configuration?.cards[i])) {
          isRequired = true;
          break;
        }
      }
    }
    return isRequired;
  }

  isDiff(card1, card2) {
    return (card1.query != card2.query || 
      !this.pluginService.variableDatasEqual(card1.variablesData,card2.variablesData));
  }

  deleteChart() {
    if (this.divView) this.divView.nativeElement.innerHTML = "";
  }

}
