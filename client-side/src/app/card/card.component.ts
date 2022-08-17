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

    chartInstance: any;
    isLibraryAlreadyLoaded = {};
    oldDefine: any;
    boxShadow: any;

    constructor (private translate: TranslateService,
        private pluginService: AddonService,
        public dataVisualizationService: DataVisualizationService,
        public loaderService: PepLoaderService
    ) { }
         

    ngOnInit(): void {
        this.boxShadow = this.scorecardsConfig?.useDropShadow === true ? this.dataVisualizationService.getCardShadow(this.scorecardsConfig?.dropShadow?.intensity / 100, this.scorecardsConfig?.dropShadow?.type) : 'unset';
        if (this.card?.chart?.Key && this.card?.query?.Key)
            this.drawScorecard(this.card)
    }

    async drawScorecard(card: ICardEditor) {
      this.loaderService.show();
      // sending variable names and values as body
      let values = this.dataVisualizationService.buildVariableValues(card.variablesData, this.parameters);
      let benchmarkValues = this.dataVisualizationService.buildVariableValues(card.benchmarkVariablesData, this.parameters);
      const body = { VariableValues: values } ?? {};
      const benchmarkBody = { VariableValues: benchmarkValues } ?? {};
        await this.pluginService.executeQuery(card.query.Key, body).then(async (data) => {
          await this.pluginService.executeQuery(card.secondQuery?.Key, benchmarkBody).then(async (benchmarkData) => {
            await System.import(card.chart.ScriptURI).then(async (res) => {
              const configuration = {
                  Title: card.title
              }
              await this.dataVisualizationService.loadSrcJSFiles(res.deps).then(() => {
                  this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                  this.chartInstance.data = data;
                  this.chartInstance.data["BenchmarkQueries"] = []
                  this.chartInstance.data["BenchmarkSet"] = []
                  if(benchmarkData) {
                      this.chartInstance.data["BenchmarkQueries"] = benchmarkData["DataQueries"]
                      this.chartInstance.data["BenchmarkSet"] = benchmarkData["DataSet"]
                  }
                  this.chartInstance.update();
                  window.dispatchEvent(new Event('resize'));
                  this.loaderService.hide();
              }).catch(err => {
                this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
              })
            }).catch(err => {
                this.divView.nativeElement.innerHTML = `Failed to load chart file: ${card.chart?.ScriptURI}, error: ${err}`;
            });
          }).catch((err) => {
            this.divView.nativeElement.innerHTML = `Failed to execute query: ${card.query?.Key} , error: ${err}`;;
          })
        })
      }

}
