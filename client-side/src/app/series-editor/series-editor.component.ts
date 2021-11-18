import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { AccountTypes, Aggregators, DateOperation, IntervalUnits, OrderType, ResourceTypes, Serie, UserTypes } from '../../../../server-side/models/data-query';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-series-editor',
  templateUrl: './series-editor.component.html',
  styleUrls: ['./series-editor.component.scss']
})
export class SeriesEditorComponent implements OnInit {
  chartInstance: any;
  currentSeries: Serie;
  filterExampleJSON = '';
  scriptAggregationSelected = false;
  resourceOptions: Array<PepButton> = [];
  aggregationsOptions: Array<PepButton> = [];
  aggregationsFieldsOptions: Array<PepButton> = [];
  intervalOptions: Array<PepButton> = [];
  orderOptions: Array<PepButton> = [];
  userFilterFieldOptions: Array<PepButton> = [];
  userFilterOptions: Array<PepButton> = [];
  accountFilterFieldOptions: Array<PepButton> = [];
  accountFilterOptions: Array<PepButton> = [];
  periodOptions: Array<PepButton> = [];
  isLoaded = false;
  mode: string = 'Add';
  series: Serie = {
    Name: '',
    Label: '',
    AggregatedFields: [
      {
        Aggregator: 'None',
        FieldID: '',
        Alias: '',
        Script: 'params.mytotal / params.mycount'
      }
    ],
    AggregatedParams: [],
    BreakBy: {
      FieldID: '', IntervalUnit: 'None', Interval: null, Top: {
        FieldID: '',
        Ascending: null,
        Max: null
      }
    },
    Resource: 'None',
    GroupBy: [{
      FieldID: '',
      Interval: null,
      IntervalUnit: 'None',
      Top: null
    }],
    Interval: null,
    IntervalUnit: 'None'

  }

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
    }
    this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngOnInit(): void {
    //this.initCurrentSeries();
    this.getDataIndexFields().then((metaDataFields) => {
      this.isLoaded = true;
      metaDataFields.forEach(field => {
        this.aggregationsFieldsOptions.push({ key: field, value: field })
        if (field.startsWith('Account')) {
          this.accountFilterFieldOptions.push({ key: field, value: field });
        }
        if (field.startsWith('Agent')) {
          this.userFilterFieldOptions.push({ key: field, value: field });
        }
      });

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
      this.aggregationsOptions.push({ key: aggregator, value: aggregator });
    });

    IntervalUnits.forEach(intervalUnit => {
      this.intervalOptions.push({ key: intervalUnit, value: intervalUnit });
    });

    ResourceTypes.forEach(resourceType => {
      this.resourceOptions.push({ key: resourceType, value: resourceType });
    });

    UserTypes.forEach(userType => {
      this.userFilterOptions.push({ key: userType, value: userType });
    });

    AccountTypes.forEach(accountType => {
      this.accountFilterOptions.push({ key: accountType, value: accountType });
    });

    DateOperation.forEach(dateOperation => {
      this.periodOptions.push({ key: dateOperation, value: dateOperation });
    });

    OrderType.forEach(order => {
      this.periodOptions.push({ key: order, value: order });
    });

  }

  getResource(resource) {
    return this.resourceOptions.filter(x => x.value == resource);
  }

  getDataIndexFields() {
    return this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'all_activities_fields').toPromise().then((allActivitiesFields) => {
      return this.addonService.getAddonApiCall('10979a11-d7f4-41df-8993-f06bfd778304', 'data_index_meta_data', 'transaction_lines_fields').toPromise().then((trnsactionLinesFields) => {
        const allFields = allActivitiesFields.Fields.concat(trnsactionLinesFields.Fields);
        return allFields;
      });
    });
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
        this.scriptAggregationSelected = true;
        break;
    }
  }
}
