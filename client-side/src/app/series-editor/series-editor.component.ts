import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { AccountTypes, Aggregators, DateOperation, Intervals, OrderType, ResourceTypes, Serie, SERIES_LABEL_DEFAULT_VALUE, UserTypes } from '../../../../server-side/models/data-query';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-series-editor',
  templateUrl: './series-editor.component.html',
  styleUrls: ['./series-editor.component.scss']
})
export class SeriesEditorComponent implements OnInit {
  chartInstance: any;
  currentSeries: Serie;
  filterExampleJSON = '';
  resourceOptions: Array<PepButton> = [];
  aggregationsOptions: Array<PepButton> = [];
  aggregationsFieldsOptions: Array<PepButton> = [];
  intervalOptions: Array<PepButton> = [];
  formatOptions: Array<PepButton> = [];
  orderOptions: Array<PepButton> = [];
  userFilterFieldOptions: Array<PepButton> = [];
  userFilterOptions: Array<PepButton> = [];
  accountFilterFieldOptions: Array<PepButton> = [];
  accountFilterOptions: Array<PepButton> = [];
  periodOptions: Array<PepButton> = [];
  isLoaded = false;
  limitNumber = false;
  useCategories = false;
  useDynamicSeries = false;
  useDynamicFilter = false;
  formatOptionsMap = {
    'yyyy': 'Year',
    'yyyy MMM': 'YearMonth',
    'MMM': 'Month',
    'MMM dd': 'MonthDay',
    'yyyy MMM dd': 'YearMonthDay'
  }
  mode: string = 'Add';
  series: Serie = {
    Key: uuid(),
    Name: '',
    Resource: 'all_activities',
    Label: SERIES_LABEL_DEFAULT_VALUE,
    Top: {
      Max: 0,
      Ascending: false,
    },
    AggregatedFields: [
      {
        Aggregator: 'Sum',
        FieldID: '',
        Alias: '',
        Script: ''
      }
    ],
    AggregatedParams: [{
      FieldID: '',
      Aggregator: 'Sum',
      Name: ''
    }],
    BreakBy: {
      FieldID: '',
      Interval: 'None',
      Format: ''

    },
    Filter: {},
    Scope: {
      User: 'AllUsers',
      UserFilterField: '',
      Account: 'AllAccounts',
      AccountFilterField: ""
    },
    DynamicFilterFields: [],
    GroupBy: [{
      FieldID: '',
      Interval: 'None',
      Format: ''
    }]

  }
  trnsactionLinesFields: any;
  allActivitiesFields: any;

  constructor(private addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    private translate: TranslateService,
    public pluginService: AddonService,
    @Inject(MAT_DIALOG_DATA) public incoming: any) {
    if (incoming && incoming.currentSeries) {
      this.mode = 'Update';
      this.series = incoming.currentSeries;
      this.useCategories = this.series.GroupBy[0].FieldID ? true : false;
      this.useDynamicSeries = this.series.BreakBy.FieldID ? true : false;
      this.useDynamicFilter = this.series.DynamicFilterFields.length > 0;
      this.limitNumber = this.series.Top && this.series.Top.Max > 0;
    }
    this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngOnInit(): void {
    //this.initCurrentSeries();
    this.getDataIndexFields().then(() => {
      this.fillAggregatedFieldsType();
      this.isLoaded = true;

    })
    this.filterExampleJSON = JSON.stringify({
      "Operation": "AND",
      "LeftNode": {
        "ApiName": "Item.ExternalID",
        "FieldType": "String",
        "Operation": "IsNotEqual",
        "Values": [
          "25473982"
        ]
      },
      "RightNode": {
        "ApiName": "Item.MainCategory",
        "FieldType": "String",
        "Operation": "IsNotEqual",
        "Values": [
          "Hallmark"
        ]
      }
    }, null, 2);

    Aggregators.forEach(aggregator => {
      this.aggregationsOptions.push({ key: aggregator, value: this.translate.instant(aggregator) });
    });

    Intervals.forEach(intervalUnit => {
      this.intervalOptions.push({ key: intervalUnit, value: intervalUnit });
    });

    ResourceTypes.forEach(resourceType => {
      this.resourceOptions.push({ key: resourceType, value: resourceType });
    });

    UserTypes.forEach(userType => {
      this.userFilterOptions.push({ key: userType, value: this.translate.instant(userType) });
    });

    AccountTypes.forEach(accountType => {
      this.accountFilterOptions.push({ key: accountType, value: this.translate.instant(accountType) });
    });

    DateOperation.forEach(dateOperation => {
      this.periodOptions.push({ key: dateOperation, value: dateOperation });
    });

    OrderType.forEach(order => {
      this.orderOptions.push({ key: order, value: order });
    });
    Object.keys(this.formatOptionsMap).forEach((formatKey) => {
      this.formatOptions.push({ key: formatKey, value: this.translate.instant(this.formatOptionsMap[formatKey]) })
    })

  }

  private fillAggregatedFieldsType() {
    switch (this.series.Resource) {
      case 'transaction_lines':
        this.fillAggregatorField(this.trnsactionLinesFields);
        break;
      case 'all_activities':
        this.fillAggregatorField(this.allActivitiesFields);
        break;
    }
  }


  private fillAggregatorField(fields) {
    fields.forEach(field => {
      this.aggregationsFieldsOptions.push({ key: field, value: field });
      if (field.startsWith('Account')) {
        this.accountFilterFieldOptions.push({ key: field, value: field });
      }
      if (field.startsWith('Agent')) {
        this.userFilterFieldOptions.push({ key: field, value: field });
      }
    });
  }

  getResource(resource) {
    return this.resourceOptions.filter(x => x.value == resource);
  }

  getDataIndexFields() {
    return this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'all_activities_fields').toPromise().then((allActivitiesFields) => {
      return this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'transaction_lines_fields').toPromise().then((trnsactionLinesFields) => {
        this.allActivitiesFields = allActivitiesFields.Fields;
        this.trnsactionLinesFields = trnsactionLinesFields.Fields;
      });
    });
  }

  onEventCheckboxChanged(eventType, event) {
    switch (eventType) {
      case 'Categories':
        this.useCategories = event;
        break;
      case 'DynamicSeries':
        this.useDynamicSeries = event;
        break;
      case 'LimitNumberResults':
        this.limitNumber = event;
        break;
      case 'DynamicFilter':
        this.useDynamicFilter = event;
        break;
    }
  }

  onValueChanged(element, $event) {
  }

  getScript() {
    return this.series.AggregatedFields.filter(af => af.Script)[0]?.Script;
  }

  getAggregatorField(aggregatorType) {
    switch (aggregatorType) {
      case 'GroupBy':
        if (this.series.GroupBy && this.series.GroupBy[0]?.FieldID) {
          return this.aggregationsFieldsOptions.filter(x => x.value === this.series.GroupBy[0].FieldID)[0].key;
        }
        break;
      case 'BreakBy':
        if (this.series.BreakBy?.FieldID) {
          return this.aggregationsFieldsOptions.filter(x => x.value === this.series.BreakBy.FieldID)[0].key;
        }
        break;
    }
  }

  onChartSelected(event: IPepFieldValueChangeEvent) {
    console.log(event);
    if (event) {
      //this.importChartFileAndExecute(event);
    }
  }

  onSave(e) {
  }

  onTypeChange(e) {

  }

  onAggregatorSelected(aggregator) {
    switch (aggregator) {
      case 'Script':
        break;
    }
  }
  onResourceChange(event) {
    this.fillAggregatedFieldsType();
  }

  deleteDynamicFilterFields(index) {
    this.series.DynamicFilterFields.splice(index);
  }

  deleteAggregatedParam(index) {
    this.series.AggregatedParams.splice(index);
  }

  addAggregatedParam() {
    this.series.AggregatedParams.push({ Name: '', Aggregator: '', FieldID: '' });

  }

  addDynamicFilterFields() {
    this.series.DynamicFilterFields.push('');

  }
}
