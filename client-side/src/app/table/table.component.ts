import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService, PepDataConvertorService, PepLoaderService, PepRowData } from '@pepperi-addons/ngx-lib';
import { PepListComponent } from '@pepperi-addons/ngx-lib/list';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { AddonService } from '../../services/addon.service';
import { DataView, GridDataViewField, DataViewFieldTypes } from '@pepperi-addons/papi-sdk/dist/entities/data-view';
import { GenericListDataSource } from '../generic-list/generic-list.component';
import { CardsGridDataView } from '@pepperi-addons/papi-sdk';
import { of } from 'rxjs';
import { BaseConfiguration } from '../models/base-configuration';

@Component({
  selector: 'table-scorecards',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {

  @ViewChild(PepListComponent) customList: PepListComponent;
  dataObjects: any[] = []
  dataSet;
  listDataSource: GenericListDataSource;
  parameters;

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  private _configuration: BaseConfiguration;
  get configuration(): BaseConfiguration {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    this.parameters = value.parameters;
    console.log("AccountUUID from page = " + this.parameters?.AccountUUID)
    if (value.configuration?.query?.Key) {
      if(this.drawRequired(value))
        this.drawList(value.configuration);
    }
    this._configuration = value?.configuration;
  }

  constructor(private translate: TranslateService,
    private addonService: PepAddonService,
    private pluginService: AddonService,
    private dataConvertorService: PepDataConvertorService,
    public loaderService: PepLoaderService,
    public dataVisualizationService: DataVisualizationService) {
  }

  ngOnInit(): void {
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  private getListDataSource(fields): GenericListDataSource {
    let tableFields = [];
    fields.forEach(field => {
      tableFields.push({
        FieldID: field,
        Type: 'TextBox',
        Title: field,
        Mandatory: false,
        ReadOnly: true,
        Style: {
          Alignment: {
            Horizontal: "Left",
            Vertical: "Center",
          },
        }
      })
    });
    return {
      getDataView: () => {
        const cardView: CardsGridDataView = {
          Type: 'CardsGrid',
          Fields: tableFields,
          Columns: [
            {
              Width: 0
            },
            {
              Width: 0
            }
          ]
        }
        return of(cardView);
      }
    };
  }

  drawList(configuration) {
    this.loaderService.show();
    this.dataSet = [];
    // sending variable names and values as body
    let values = {}
    for(const varName in configuration.variablesData) {
      const varData = configuration.variablesData[varName];
      if(varData.source == 'Variable') {
          values[varName] = (this.parameters && this.parameters[varData.value]) ? this.parameters[varData.value] : '0';
      } else {
          values[varName] = varData.value;
      }
    }
    const body = {"VariableValues" : values} ?? {}
    this.pluginService.executeQuery(configuration.query.Key, body).then((data) => {
      try {
        // flat the series & groups
        const series = data.DataQueries.map((data) => data.Series).reduce((x, value) => x.concat(value), []);
        const groups = data.DataQueries.map((data) => data.Groups).reduce((x, value) => x.concat(value), []);

        const distinctSeries = this.getDistinct(series);
        const distinctgroups = this.getDistinct(groups);

        data.DataSet.forEach(dataSet => {
          this.dataSet.push(dataSet);
        });
        this.dataSet = this.dataSet.slice();
        this.listDataSource = this.getListDataSource([...distinctgroups,...distinctSeries ]);
        this.loaderService.hide();
      }
      catch (err) {
        console.log(err);
      }
    }).catch((err) => {
      console.log(err);
    })
  }

  getDistinct(arr) {
    return arr.filter(function (elem, index, self) {
      return index === self.indexOf(elem);
    });
  }

  convertToPepRowData(object: any, dataView: DataView) {
    const row = new PepRowData();
    row.Fields = [];
    for (let i = 0; i < dataView.Fields.length; i++) {
      let field = dataView.Fields[i] as GridDataViewField;
      row.Fields.push({
        ApiName: field.FieldID,
        Title: this.translate.instant(field.Title),
        XAlignment: 1,
        FormattedValue: object[field.FieldID] || '',
        Value: object[field.FieldID] || '',
        ColumnWidth: dataView['Columns'][i]?.Width ? dataView['Columns'][i]?.Width : 10,
        AdditionalValue: '',
        OptionalValues: [],
        FieldType: DataViewFieldTypes[field.Type],
        ReadOnly: field.ReadOnly,
        Enabled: !field.ReadOnly
      })
    }


    return row;
  }

  deleteList() {
    // if (this.divView) {
    //   this.divView.nativeElement.innerHTML = "";
    // }
  }

  drawRequired(value) {
    return (
      this.configuration?.query?.Key != value.configuration.query?.Key ||
      !this.pluginService.variableDatasEqual(
        this.configuration?.variablesData,
        value.configuration.variablesData
      )
    );
  }

}
