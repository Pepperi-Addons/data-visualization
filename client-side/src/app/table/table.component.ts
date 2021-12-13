import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ObjectsDataRow, PepAddonService, PepDataConvertorService, PepRowData } from '@pepperi-addons/ngx-lib';
import { PepListComponent } from '@pepperi-addons/ngx-lib/list';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { config } from '../addon.config';
import { AddonService } from '../addon.service';
import { Color } from '../models/color';
import { Overlay } from '../models/overlay ';
import { ScorecardsConfiguration } from '../models/scorecards-configuration';
import { DataView, GridDataViewField, DataViewFieldType, DataViewFieldTypes } from '@pepperi-addons/papi-sdk/dist/entities/data-view';
import { GenericListDataSource } from '../generic-list/generic-list.component';
import { pageFiltersDataView } from 'src/services/list-data-source.service';
import { CardsGridDataView, PageProduce } from '@pepperi-addons/papi-sdk';
import { from, of } from 'rxjs';

@Component({
  selector: 'table-scorecards',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {

  @ViewChild(PepListComponent) customList: PepListComponent;
  dataObjects: any[] = []
  pageProduce: PageProduce;
  dataSet;

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  existing: any;
  chartID;
  isLibraryAlreadyLoaded = {};
  private _configuration: ScorecardsConfiguration;
  get configuration(): ScorecardsConfiguration {
    return this._configuration;
  }

  @Input('hostObject')
  set hostObject(value) {
    this._configuration = value?.configuration;
    if (value.configuration?.query?.Key && value.configuration?.query?.Series && value.configuration?.query?.Series.length > 0) {
      this.drawList(this.configuration);
    }
    else {
      this.deleteList();
    }

  }

  oldDefine: any;
  listDataSource: GenericListDataSource;


  constructor(private translate: TranslateService,
    private addonService: PepAddonService,
    private pluginService: AddonService,
    private dataConvertorService: PepDataConvertorService,
    private dataVisualizationService: DataVisualizationService) {
    // this.dataSet.push({
    //   Resource: 'test1',
    //   Fields: "gdfg"
    // });
    // this.dataSet.push({
    //   Resource: 'test2',
    //   Fields: "dsgfd"
    // });
  }

  ngOnInit(): void {
    this.dataSet = [];
    this.dataSet.push({
      test1: 'test1',
      test2: "gdfg"
    });
    this.dataSet.push({
      test1: 'test2',
      test2: "dsgfd"
    });
    this.listDataSource = this.getListDataSource(["test1","test2"]);
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
    this.dataSet = [];
    this.executeQuery(configuration.query.Key).then((data) => {
      try {
        const series = data.DataQueries.map((data) => data.Series).reduce((x, value) => x.concat(value), []);
        const groups = data.DataQueries.map((data) => data.Groups).reduce((x, value) => x.concat(value), []);
        data.DataSet.forEach(dataSet => {
          this.dataSet.push(dataSet);
        });
        this.dataSet = this.dataSet.slice();
        this.listDataSource = this.getListDataSource([...groups,...series]);
      }
      catch (err) {
        console.log(err);
      }
    }).catch((err) => {
      console.log(err);
    })
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
        ColumnWidth: dataView['Columns'][i]?.Width? dataView['Columns'][i]?.Width : 10,
        AdditionalValue: '',
        OptionalValues: [],
        FieldType: DataViewFieldTypes[field.Type],
        ReadOnly: field.ReadOnly,
        Enabled: !field.ReadOnly
      })
    }


    return row;
  }

  getRandomNumber() {
    return Math.floor(Math.random() * 100);
  }

  async executeQuery(queryID) {
    const params = {
      key: queryID
    };
    return this.addonService.postAddonApiCall(config.AddonUUID, 'elastic', 'execute', null, { params: params }).toPromise();
  }

  deleteList() {
    // if (this.divView) {
    //   this.divView.nativeElement.innerHTML = "";
    // }
  }

}
