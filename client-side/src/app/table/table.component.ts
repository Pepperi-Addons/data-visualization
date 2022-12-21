import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepLoaderService } from '@pepperi-addons/ngx-lib';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { AddonService } from '../../services/addon.service';
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
  private _configuration: ChartConfiguration;
  get configuration(): ChartConfiguration {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    console.log("AccountUUID from page = " + this.parameters?.AccountUUID)
    if (value.configuration?.query) {
      if (this.drawRequired(value) || this.parameters?.AccountUUID != value.pageParameters?.AccountUUID) {
        this.parameters = value.pageParameters;
        this.drawChart(value.configuration);
      }
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

  drawChart(configuration: any) {
    this.loaderService.show();
    // sending variable names and values as body
    let values = this.dataVisualizationService.buildVariableValues(configuration.variablesData, this.parameters);
    const body = { VariableValues: values } ?? {};
    this.pluginService
      .executeQuery(configuration.query, body)
      .then((data) => {
        System.import(configuration.chartCache)
          .then((res) => {
            const configuration = {
              label: "Sales",
            };
            this.dataVisualizationService.loadSrcJSFiles(res.deps)
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
                this.loaderService.hide();
              });
          })
          .catch((err) => {
            this.divView.nativeElement.innerHTML = `Failed to load chart file: ${configuration.chartCache}, error: ${err}`;
            this.loaderService.hide();
          });
      })
      .catch((err) => {
        this.divView.nativeElement.innerHTML = `Failed to execute query: ${configuration.query} , error: ${err}`;
        this.loaderService.hide();
      });
  }

  drawRequired(value) {
    return (
      this.configuration?.query != value.configuration.query ||
      !this.pluginService.variableDatasEqual(
        this.configuration?.variablesData,
        value.configuration.variablesData
      )
    );
  }

}
