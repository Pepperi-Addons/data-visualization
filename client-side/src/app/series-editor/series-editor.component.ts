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

  formFlags={
    useDynamicSeries:false,
    useCategories: false,
    useDynamicFilter:false,
    limitNumber: false
  }

  mode: string = 'Add';
  seriesEditorType: 'scorecards' | 'chart' = 'chart'
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
        Script: 'params.Var1'
      }
    ],
    AggregatedParams: [{
      FieldID: '',
      Aggregator: 'Sum',
      Name: 'Var1'
    }],
    BreakBy: {
      FieldID: '',
      Interval: 'Month',
      Format: 'yyyy MMM'

    },
    Filter: undefined,
    Scope: {
      User: 'AllUsers',
      UserFilterField: '',
      Account: 'AllAccounts',
      AccountFilterField: ""
    },
    DynamicFilterFields: [],
    GroupBy: [{
      FieldID: '',
      Interval: 'Month',
      Format: 'yyyy MMM',
      Alias: ''
    }]

  }

  formatOptionsMap = {
    'yyyy': 'Year',
    'yyyy MMM': 'YearMonth',
    'MMM': 'Month',
    'MMM dd': 'MonthDay',
    'yyyy MMM dd': 'YearMonthDay',
    'w':'Week',
    'w yyyy': 'WeekYear',
    'q':'Quarter',
    'q yyyy':'QuarterYear'
  }
  trnsactionLinesFields: any;
  allActivitiesFields: any;
  JSON: JSON;

  constructor(private addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    private translate: TranslateService,
    public pluginService: AddonService,
    @Inject(MAT_DIALOG_DATA) public incoming: any) {
    this.JSON = JSON;
    if (incoming?.currentSeries) {
      this.mode = 'Update';
      this.series = incoming.currentSeries;
      this.formFlags.useCategories = this.series.GroupBy[0].FieldID ? true : false;
      this.formFlags.useDynamicSeries = this.series.BreakBy.FieldID ? true : false;
      this.formFlags.useDynamicFilter = this.series.DynamicFilterFields.length > 0;
      this.formFlags.limitNumber = this.series.Top && this.series.Top.Max > 0;
    }
    if (incoming?.parent) {
      this.seriesEditorType = incoming.parent;
    }
    // set default name 
    if (incoming?.seriesName) {
      this.series.Name = incoming.seriesName;
    }
    this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngOnInit(): void {
    this.getDataIndexFields().then(() => {
      this.fillAggregatedFieldsType();
      this.isLoaded = true;

    })

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
    this.aggregationsFieldsOptions = [];
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
        this.allActivitiesFields = allActivitiesFields.Fields.sort((one, two) => (one > two ? 1 : -1));
        this.trnsactionLinesFields = trnsactionLinesFields.Fields.sort((one, two) => (one > two ? 1 : -1));
      });
    });
  }

  onEventCheckboxChanged(eventType, event) {
    switch (eventType) {
      case 'Categories':
        this.formFlags.useCategories = event;
        break;
      case 'DynamicSeries':
        this.formFlags.useDynamicSeries = event;
        break;
      case 'LimitNumberResults':
        this.formFlags.limitNumber = event;
        break;
      case 'DynamicFilter':
        this.formFlags.useDynamicFilter = event;
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
    if (!this.formFlags.useCategories) {
      this.series.GroupBy[0].FieldID = '';
      this.series.GroupBy[0].Alias = '';
    }
    if (!this.formFlags.useDynamicSeries) {
      this.series.BreakBy.FieldID = '';
    }
    if (!this.formFlags.limitNumber) {
      this.series.Top.Max = 0;
    }
    if (this.series.GroupBy && this.series.GroupBy[0]?.FieldID && this.series.GroupBy[0]?.FieldID.indexOf("Date") == -1){
      this.series.GroupBy[0].Interval = 'None';
      this.series.GroupBy[0].Format = '';

    }
    if (this.series.BreakBy && this.series.BreakBy?.FieldID.indexOf("Date") == -1){
      this.series.BreakBy.Interval = 'None';
      this.series.BreakBy.Format = '';
    }
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

  onTopMaxChanged(event) {
    this.series.Top.Max = Number(event);
  }

  onGroupByFieldSelected(event) {
    const parts = `.${event}`.split('.');
    var alias = parts[parts.length - 1];
    this.series.GroupBy[0].Alias = alias;

  }

  onFilterRuleChanged(event) {
    if (event) {

      this.series.Filter = JSON.parse(event)
    } else {
      this.series.Filter = null;
    }
  }

  onOrderChanged(event) {
    if (event === 'Ascending') {
      this.series.Top.Ascending = true;
    }
    else {
      this.series.Top.Ascending = false;
    }
  }
}
