import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { PepLoaderService } from '@pepperi-addons/ngx-lib';
import { ICardEditor, IScorecardsEditor } from '../card.model';
import { AddonService } from 'src/services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';

@Component({
    selector: 'gallery-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss']
})

export class CardComponent implements OnInit {

    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild("previewArea") divView: ElementRef;

    @Input() scorecardsConfig: IScorecardsEditor;
    @Input() card : ICardEditor;
    @Input() parameters;
	@Input() executeResponse: any[];
	@Input() executeFinished: boolean;

    chartInstance: any;
    isLibraryAlreadyLoaded = {};
    oldDefine: any;
    boxShadow: any;
	drawCounter: number = 0;

    constructor (private translate: TranslateService,
        private pluginService: AddonService,
        public dataVisualizationService: DataVisualizationService,
        public loaderService: PepLoaderService
    ) { }
         

    async ngOnInit(): Promise<void> {
        this.boxShadow = this.scorecardsConfig?.useDropShadow === true ? this.dataVisualizationService.getCardShadow(this.scorecardsConfig?.dropShadow?.intensity / 100, this.scorecardsConfig?.dropShadow?.type) : 'unset';
        if (this.card?.chart && this.card?.query && this.executeFinished) {
            await this.drawScorecard(this.card)
		}
    }

    async drawScorecard(card: ICardEditor) {
      this.loaderService.show();
	  
	  this.drawCounter++;
	  const currentDrawCounter = this.drawCounter;

      const chartFileBuffer = await fetch(card.chartCache, {headers: {"Access-Control-Allow-Origin": "*"}});
	  const chartTextFile = await chartFileBuffer.text();
      this.dataVisualizationService.importTextAsModule(chartTextFile).then(async (res) => {
        const conf = {Title: card.title};
        await this.dataVisualizationService.loadSrcJSFiles(res.deps).then(async () => {
            this.chartInstance = new res.default(this.divView.nativeElement, conf);
			if(currentDrawCounter == this.drawCounter) {
				this.chartInstance.data = this.executeResponse[0];
				this.chartInstance.data["Benchmark"] = (this.executeResponse.length > 1) ? this.executeResponse[1] : undefined;
				this.chartInstance.update();
				window.dispatchEvent(new Event('resize'));
			}
			else {
				console.log("drawCounter changed, not updating chart");
			}
			this.loaderService.hide();
        }).catch(err => {
          this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
          this.loaderService.hide();
        })
      }).catch(err => {
          this.divView.nativeElement.innerHTML = `Failed to load chart file: ${card.chartCache}, error: ${err}`;
          this.loaderService.hide();
      });
    }

}
