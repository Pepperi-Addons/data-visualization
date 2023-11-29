import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Color } from '../models/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ChartConfiguration } from '../models/chart-configuration';
import { AddonService } from 'src/services/addon.service';
import { PepLoaderService } from '@pepperi-addons/ngx-lib';

@Component({
  selector: "chart",
  templateUrl: "./chart.component.html",
  styleUrls: ["./chart.component.scss"],
})
export class ChartComponent implements OnInit {
  @Input("hostObject")
  set hostObject(value) {
    console.log("AccountUUID from page = " + value.pageParameters?.AccountUUID)
    if (value.configuration?.chart && value.configuration?.query) {
      if (this.drawRequired(value) || this.dataVisualizationService.pageParametersChanged(this.parameters, value.pageParameters)) {
        this.parameters = value.pageParameters;
        this.drawChart(value.configuration);
      }
    } else {
      this.deleteChart();
    }
    this.parameters = value.pageParameters;
    this._configuration = value?.configuration;
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild("previewArea") divView: ElementRef;
  private _configuration: ChartConfiguration;
  get configuration(): ChartConfiguration {
    return this._configuration;
  }
  chartInstance: any;
  isLibraryAlreadyLoaded = {};
  oldDefine: any;
  parameters;
  drawCounter: number = 0;

  constructor(
    private pluginService: AddonService,
    public dataVisualizationService: DataVisualizationService,
    public loaderService: PepLoaderService
  ) {}

  ngOnInit(): void {
  }

  ngOnChanges(e: any): void {}

  async drawChart(configuration: any) {
    this.loaderService.show();

	this.drawCounter++;
	const currentDrawCounter = this.drawCounter;

    // sending variable names and values as body
    let values = this.pluginService.buildVariableValues(configuration.variablesData, this.parameters);
    const body = { VariableValues: values } ?? {};
	const chartFileBuffer = await fetch(configuration.chartCache, {headers: {"Access-Control-Allow-Origin": "*"}});
	const chartTextFile = await chartFileBuffer.text();
    this.dataVisualizationService.importTextAsModule(chartTextFile).then((res) => {
      const conf = {
        label: "Sales",
      };
      this.dataVisualizationService.loadSrcJSFiles(res.deps).then(() => {
        this.chartInstance = new res.default(this.divView.nativeElement,conf);
        this.pluginService.executeQuery(configuration.query, body).then((data) => {
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
		  this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query} , error: ${errorMessage}`;
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
      this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.chartCache}, error: ${errorMessage}`;
      this.loaderService.hide();
    });      
  }

  getGalleryBorder() {
    if (this.configuration?.useBorder) {
      let col: Color = this.configuration?.border;
      return "1px solid " + this.dataVisualizationService.getRGBAcolor(col);
    } else {
      return "none";
    }
  }

  deleteChart() {
    if (this.divView) this.divView.nativeElement.innerHTML = "";
  }

  drawRequired(value): boolean {
    return (
      this.configuration?.query != value.configuration.query ||
      this.configuration?.chart != value.configuration.chart ||
      !this.pluginService.variableDatasEqual(
        this.configuration?.variablesData,
        value.configuration.variablesData
      )
    );
  }

  
}
