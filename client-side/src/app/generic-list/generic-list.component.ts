import { Component, OnInit, AfterViewInit, ViewChild, Input, Output, EventEmitter, AfterViewChecked, ChangeDetectorRef } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { PepScreenSizeType, PepDataConvertorService, PepLayoutService, PepGuid, PepRowData, ObjectsDataRow } from "@pepperi-addons/ngx-lib";
import { IPepFormFieldClickEvent } from "@pepperi-addons/ngx-lib/form";
import { PepListComponent, PepListViewType } from "@pepperi-addons/ngx-lib/list";
import { PepMenuItem, IPepMenuItemClickEvent } from "@pepperi-addons/ngx-lib/menu";
import { DataView } from "@pepperi-addons/papi-sdk";
import { min } from "moment";
import { BaseFormDataViewField, DataViewFieldTypes } from "papi-sdk-web";
import { Observable } from "rxjs";


export interface GenericListDataSource {
  //getList(): Observable<any[]> ;
  getDataView(): Observable<DataView>;
}

@Component({
  templateUrl: './generic-list.component.html',
  styleUrls: ['./generic-list.component.scss'],
  selector: 'generic-list'
})
export class GenericListComponent implements OnInit, AfterViewInit, AfterViewChecked {//, AfterViewInit {
  @ViewChild(PepListComponent) customList: PepListComponent;

  private _listData: any[];
  private _dataSource: any;

  @Input()
  set listData(value) {
    this._listData = value;
    this.reload();
  }
  get listData() {
    return this._listData;
  }
  listHeight
  dataView: DataView;

  @Input('getSelectActions') getSelectActions: (selectedObjects: ObjectsDataRow[]) => Promise<{
    title: string;
    handler: (obj: any) => Promise<void>;
  }[]>;

  @Input()
  set dataSource(value) {
    this._dataSource = value;
    this.reload();
  }
  get dataSource(){
    return this._dataSource;
  }
  dataObjects: any[] = []

  searchString: string = '';
  @Input() viewType: PepListViewType = "table";
  @Input() supportSorting: boolean = false;

  @Input()
  title: string = ''

  @Input()
  inline: boolean = false;

  @Input()
  showSearch: boolean = false;

  @Input()
  allowSelection: boolean = true;

  @Input()
  allowMultipleSelection: boolean = false;

  @Output() onAddClicked = new EventEmitter<void>();

  menuHandlers: { [key: string]: (obj: any) => Promise<void> }
  menuActions: Array<PepMenuItem>;
  PepScreenSizeType = PepScreenSizeType;
  screenSize: PepScreenSizeType;

  constructor(
    private dataConvertorService: PepDataConvertorService,
    private layoutService: PepLayoutService,
    // private httpService: PepHttpService,
    private translate: TranslateService,
    private detectChanges: ChangeDetectorRef
  ) {
    this.layoutService.onResize$.pipe().subscribe((size) => {
      this.screenSize = size;
    });
  }

  ngOnInit() {
  }


  ngAfterViewInit(): void {
    this.reload();
  }

  ngAfterViewChecked(): void {
    this.detectChanges.detectChanges();
  }

  getMenuObjects() {

    let uuids = this.customList.getIsAllSelectedForActions() ?
      this.customList.items.map(obj => obj.UID) :
      this.customList.getSelectedItemsData().rows;

    const objects = uuids.map(uuid => this.getObject(uuid))
    if (objects === undefined) {
      debugger;
      throw new Error("undefined objects");
    }
    return objects;
  }

  getObject(uuid: string) {
    return this.customList.getItemDataByID(uuid);
  }

  onMenuItemClicked(action: IPepMenuItemClickEvent): void {
    this.menuHandlers[action.source.key](this.getMenuObjects());
  }

  onSearchChanged($event) {
    this.searchString = $event.value
    this.reload();
  }
  async reload() {
    if (this.customList && this.dataSource) {
      // this.dataObjects = await this.dataSource.getList({
      //   searchString: this.searchString
      // });
      // this.dataSource
      //   .getList()
      //   .subscribe((data) => this.dataObjects = data);
      this.dataObjects = this.listData;

      this.dataSource.getDataView().subscribe((view) => this.dataView = view);
      const tableData = this.dataObjects.map(x => this.convertToPepRowData(x, this.dataView));
      const rows = this.dataConvertorService.convertListData(tableData);

      const uiControl = this.dataConvertorService.getUiControl(tableData[0]);
      this.listHeight = this.getListHeight();
      this.customList.initListData(uiControl, rows.length, rows);
      // this.loadMenuItems();
    }
  }

  convertToPepRowData(object: any, dataView: DataView) {
    const row = new PepRowData();
    row.Fields = [];
    for (let i = 0; i < dataView.Fields.length; i++) {
      let field = dataView.Fields[i] as BaseFormDataViewField;// as GridDataViewField; as GridDataViewField;
      row.Fields.push({
        ApiName: field.FieldID,
        Title: this.translate.instant(field.Title),
        XAlignment: 1,
        FormattedValue: object[field.FieldID]?.toString() || '',
        Value: object[field.FieldID]?.toString() || '',
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

  private getListHeight() {
    const minHeight = 4;
    const num = Math.min(4 * this.listData.length, 25);
    return num < minHeight ? `${minHeight}rem` : `${num + minHeight}rem`;
  }
}
