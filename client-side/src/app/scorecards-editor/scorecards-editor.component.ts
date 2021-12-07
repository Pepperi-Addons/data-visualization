import { TranslateService } from '@ngx-translate/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IPepFieldValueChangeEvent, PepAddonService } from '@pepperi-addons/ngx-lib';
import { IPepButtonClickEvent, PepButton } from '@pepperi-addons/ngx-lib/button';
import { pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { AddonService } from '../addon.service';
import { config } from '../addon.config';
import { DataQuery, Serie } from '../../../../server-side/models/data-query';
import { SeriesEditorComponent } from '../series-editor/series-editor.component';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { v4 as uuid } from 'uuid';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

@Component({
  selector: 'app-scorecards-editor',
  templateUrl: './scorecards-editor.component.html',
  styleUrls: ['./scorecards-editor.component.scss']
})
export class ScorecardsEditorComponent implements OnInit {

  private _hostObject: any
  @Input()
  set hostObject(value) {
    if (value && value.configuration) {
      this._configuration = value.configuration
    } else {
      if (this.blockLoaded) {
        this.updateHostObject();
      }
    }
  }
  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();

  label = false;
  _configuration = {
    chart: null,
    query: null,
    label: ''
  };

  get configuration() {
    return this._configuration;
  }
  enableLabel = false;
  activeTabIndex = 0;
  charts: any;
  dialogRef: MatDialogRef<any>;
  blockLoaded = false;
  currentSeries: Serie;
  queryResult: any;
  seriesButtons: Array<Array<PepButton>> = [];
  chartInstance: any;
  SlideDropShadowStyle: Array<PepButton> = [];

  constructor(private addonService: PepAddonService,
    public routeParams: ActivatedRoute,
    public router: Router,
    public route: ActivatedRoute,
    private translate: TranslateService,
    private dialogService: PepDialogService,
    public pluginService: AddonService) {
    this.pluginService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngOnInit(): void {

    this.SlideDropShadowStyle = [
      { key: 'Soft', value: this.translate.instant('Soft') },
      { key: 'Regular', value: this.translate.instant('Regular') }
    ];


    const queryID = this.configuration?.query?.Key;
    this.enableLabel = this.configuration?.label ? true : false;
    if (queryID) {
      this.getSeriesByKey(queryID).then((res) => {
        this._configuration.query = res[0];
        this.blockLoaded = true;
        this.buildSeriesButtons();
        this.updateHostObject();
        this.hostEvents.emit({ action: 'block-editor-loaded' });
      })
    } else {
      this.upsertDataQuery().then((res) => {
        this._configuration.query = res;
      });
      this.blockLoaded = true;
    }


  }

  upsertDataQuery() {
    const body = {
      Name: uuid()
    };
    return this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', body).toPromise()

  }
  getSeriesByKey(Key: string) {
    const params = { where: `Key='${Key}'` };
    return this.addonService.getAddonApiCall(config.AddonUUID, 'api', 'queries', { params: params }).toPromise()

  }

  onEditClick() {
  }


  private updateHostObject() {

    this.hostEvents.emit({
      action: 'set-configuration',
      configuration: this.configuration,
    });
  }

  onValueChanged(type, event) {
    switch (type) {
      case 'Label':
        this._configuration.label = event;
        break;
    }
    this.updateHostObject();

  }

  add() {
    this.showSeriesEditorDialog(null);
  }

  editSeries(event) {
    if (event) {
      this.currentSeries = this._configuration.query.Series.filter(s => s.Key === event.source.key)[0] as Serie
    }
    this.showSeriesEditorDialog(this.currentSeries);
  }
  tabClick(event) {

  }

  onEventCheckboxChanged(eventType, event) {
    if (eventType === 'Label') {
      this.enableLabel = event;
    }

  }

  showSeriesEditorDialog(series) {
    const actionButton: PepDialogActionButton = {
      title: "OK",
      className: "",
      callback: null,
    };
    const seriesCount = this._configuration.query?.Series?.length ? this._configuration.query?.Series?.length : 0

    const input = {
      currentSeries: series,
      parent: 'scorecards',
      seriesName: series?.Name ? series.Name : `Series ${seriesCount + 1}`
    }
    this.openDialog(this.translate.instant('EditQuery'), SeriesEditorComponent, actionButton, input, (seriesToAddOrUpdate) => {
      if (seriesToAddOrUpdate) {
        this.updateQuerySeries(seriesToAddOrUpdate);
        this.addonService.postAddonApiCall(
          config.AddonUUID,
          'api',
          'queries',
          this._configuration.query).toPromise().then((res) => {
            this._configuration.query = res;
            this.buildSeriesButtons();
            this.updateHostObject();
          })
      }

    });
  }

  private updateQuerySeries(seriesToAddOrUpdate: any) {
    const idx = this._configuration.query.Series?.findIndex(item => item.Key === seriesToAddOrUpdate.Key);
    if (idx > -1) {
      this._configuration.query.Series[idx] = seriesToAddOrUpdate;
    }
    else {
      if (!this._configuration.query.Series) {
        this._configuration.query.Series = [];
      }
      this._configuration.query.Series.push(seriesToAddOrUpdate);
    }
  }

  openDialog(title, content, buttons, input, callbackFunc = null): void {
    const config = this.dialogService.getDialogConfig(
      {
        disableClose: true,
        panelClass: 'pepperi-standalone'
      },
      'inline'
    );
    const data = new PepDialogData({
      title: title,
      content: content,
      actionButtons: buttons,
      actionsType: "custom",
      showHeader: true,
      showFooter: true,
      showClose: true
    })
    config.data = data;

    this.dialogRef = this.dialogService.openDialog(content, input, config);
    this.dialogRef.afterClosed().subscribe(res => {
      callbackFunc(res);
    });
  }

  deleteSeries(event) {
    console.log(event);
    const idx = this._configuration.query.Series.findIndex(item => item.Key === event.source.key);;
    if (idx > -1) {
      this._configuration.query.Series.splice(idx, 1);
    }

    this.addonService.postAddonApiCall(config.AddonUUID, 'api', 'queries', this._configuration.query).toPromise().then((res) => {
      this._configuration.query = res;
      this.buildSeriesButtons();
      this.updateHostObject();
    });
  }


  onSlideshowFieldChange(key, event) {


    this.updateHostObject();
  }

  private buildSeriesButtons() {
    this.seriesButtons = [];
    this._configuration.query?.Series?.forEach(serise => {
      this.seriesButtons.push([
        {
          key: serise.Key,
          value: serise.Name,
          callback: (event: IPepButtonClickEvent) => this.editSeries(event),
        },
        {
          key: serise.Key,
          classNames: 'caution',
          callback: (event: IPepButtonClickEvent) => this.deleteSeries(event),
          iconName: pepIconSystemBin.name,
        },
      ]);
    });
  }
}
