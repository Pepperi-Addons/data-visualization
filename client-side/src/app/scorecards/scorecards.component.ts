import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ICardEditor, IScorecards } from '../card.model';
import { AddonService } from 'src/services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { PepLoaderService } from '@pepperi-addons/ngx-lib';

@Component({
  selector: 'scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.scss']
})
export class ScorecardsComponent implements OnInit {
	
	queryResult:any;
	chartInstances = [];
	isLibraryAlreadyLoaded = {};
	oldDefine: any;
	parameters;
	gapInRem: string;
	executeResponses: {[cardID : number]: any[]} = {};
	executeFinished: boolean = false;

	@Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
	@ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
	private _configuration: IScorecards;
	get configuration(): IScorecards {
	  return this._configuration;
	}

  @Input('hostObject')
  set hostObject(value) {
	console.log("AccountUUID from page = " + value.pageParameters?.AccountUUID);
    if (value.configuration?.cards?.length > 0 && !value.configuration?.cards.some(c => !c.query)) {
      if (this.drawRequired(value) || this.dataVisualizationService.pageParametersChanged(this.parameters, value.pageParameters)) {
		this.executeFinished = false;
        this.parameters = value.pageParameters;
        this.buildDataForCards(value.configuration).then(() => {
			console.log("executeResponses: " + JSON.stringify(this.executeResponses));
			this.parameters = value.pageParameters;
    		this._configuration = value?.configuration;
			this.executeFinished = true;
		});
      }
    }
    else if(value.configuration?.cards?.length == 0) {
      this.deleteChart();
    }
    this.parameters = value.pageParameters;
    this._configuration = value?.configuration;
  }

  constructor(
    private pluginService: AddonService,
    public dataVisualizationService: DataVisualizationService,
	public loaderService: PepLoaderService
	) {
  }

  async ngOnInit() {
  }

  async buildDataForCards(configuration: any) {
    this.loaderService.show();
	const executeResponses = await this.pluginService.executeAllCards(configuration.cards, this.parameters)
	configuration.cards.forEach((card: ICardEditor) => {
		this.executeResponses[card.id] = [];
		this.executeResponses[card.id].push(executeResponses.shift());
		if(card.secondQuery) {
			this.executeResponses[card.id.toString()].push(executeResponses.shift());
		}
	});
	this.loaderService.hide();
	return true;
  }

  drawRequired(value): boolean {
    let isRequired = false;
    if(value.configuration?.cards && this.configuration?.cards.length != value.configuration?.cards.length) {
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

  isDiff(card1: ICardEditor, card2: ICardEditor) {
    return (card1.query != card2.query ||
			card1.secondQuery != card2.secondQuery ||
			card1.chart != card2.chart ||
      !this.pluginService.variableDatasEqual(card1.variablesData,card2.variablesData));
  }

  deleteChart() {
    if (this.divView) this.divView.nativeElement.innerHTML = "";
  }

}
