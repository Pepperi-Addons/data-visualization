import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import 'systemjs'
import 'systemjs-babel'
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
    if (value.configuration?.chart?.Key && value.configuration?.query?.Key) {
      if (this.drawRequired(value)) 
        this.drawChart(value.configuration);
    } else {
      this.deleteChart();
    }
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

  constructor(
    private pluginService: AddonService,
    public dataVisualizationService: DataVisualizationService,
    public loaderService: PepLoaderService
  ) {}

  ngOnInit(): void {
    this.hostEvents.emit({ action: "block-loaded" });
  }

  ngOnChanges(e: any): void {}

  drawChart(configuration: any) {
    this.loaderService.show();
    // sending variable names and values as body
    let values = {};
    for (const varName in configuration.variablesData) {
      values[varName] = (configuration.variablesData[varName].source == 'Variable') ? configuration.variablesData[varName].valueFromPage : configuration.variablesData[varName].value;
    }
    const body = { VariableValues: values } ?? {};
    this.pluginService
      .executeQuery(configuration.query.Key, body)
      .then((data) => {
        System.import(configuration.chart.ScriptURI)
          .then((res) => {
            const configuration = {
              label: "Sales",
            };
            this.loadSrcJSFiles(res.deps)
              .then(() => {
                this.chartInstance = new res.default(
                  this.divView.nativeElement,
                  configuration
                );
                this.chartInstance.data = data;
                this.chartInstance.update();
                window.dispatchEvent(new Event("resize"));
                this.loaderService.hide();
              })
              .catch((err) => {
                this.divView.nativeElement.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
              });
          })
          .catch((err) => {
            this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.chart.ScriptURI}, error: ${err}`;
          });
      })
      .catch((err) => {
        this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query.Key} , error: ${err}`;
      });
  }

  loadSrcJSFiles(imports) {
    let promises = [];

    imports.forEach((src) => {
      promises.push(
        new Promise<void>((resolve) => {
          this.isLibraryAlreadyLoaded[src] = false;
          if (!this.isLibraryAlreadyLoaded[src]) {
            let _oldDefine = window["define"];
            this.oldDefine = _oldDefine;
            //this.lockObject = true;
            window["define"] = null;

            const node = document.createElement("script");
            node.src = src;
            node.id = src;
            node.onload = (script) => {
              window["define"] = _oldDefine;
              this.isLibraryAlreadyLoaded[src] = true;
              console.log(`${src} loaded`);
              resolve();
            };
            node.onerror = (script) => {};
            document.getElementsByTagName("head")[0].appendChild(node);
          } else {
            resolve();
          }
        })
      );
    });
    return Promise.all(promises);
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

  drawRequired(value) {
    return (
      this.configuration?.query?.Key != value.configuration.query?.Key ||
      this.configuration?.chart?.Key != value.configuration.chart?.Key ||
      !this.pluginService.variableDatasEqual(
        this.configuration?.variablesData,
        value.configuration.variablesData
      )
    );
  }

  
}
