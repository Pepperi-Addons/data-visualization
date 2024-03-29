import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableEditorComponent } from '.';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService, PepHttpService, PepNgxLibModule } from '@pepperi-addons/ngx-lib';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { PepGroupButtonsModule } from '@pepperi-addons/ngx-lib/group-buttons';
import { PepTextareaModule } from '@pepperi-addons/ngx-lib/textarea';
import { MatTabsModule } from '@angular/material/tabs';
import { config } from '../addon.config';
import { AddonService } from '../../services/addon.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepIconRegistry, pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { PepCheckboxModule } from '@pepperi-addons/ngx-lib/checkbox';
import { PepSliderModule } from '@pepperi-addons/ngx-lib/slider';
import { ChartEditorModule } from '../chart-editor';
import { PepColorModule } from '@pepperi-addons/ngx-lib/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { QuerySelectModule } from '../common/query-select/query-select.module';
import { PepGroupButtonsSettingsModule } from '@pepperi-addons/ngx-composite-lib/group-buttons-settings';
import { CardEditorModule } from '../card-editor/card-editor.module';
import { DragDropModule } from '@angular/cdk/drag-drop';


const pepIcons = [
  pepIconSystemBin,
];
@NgModule({
  declarations: [TableEditorComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    PepNgxLibModule,
    PepSelectModule,
    PepTextboxModule,
    PepCheckboxModule,
    PepButtonModule,
    PepTopBarModule,
    PepTextareaModule,
    PepSliderModule,
    PepColorModule,
    PepGroupButtonsModule,
    PepGroupButtonsSettingsModule,
    MatTabsModule,
    ChartEditorModule,
    QuerySelectModule,
    DragDropModule,
    CardEditorModule,
    TranslateModule.forChild({
      loader: {
          provide: TranslateLoader,
          useFactory: (addonService: PepAddonService) => 
              PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
          deps: [PepAddonService]
      }, isolate: false
  }),
  ],
  exports: [TableEditorComponent],
  providers: [
    TranslateStore,
    AddonService,
    PepAddonService,
    PepCustomizationService,
    PepDialogService,
    TranslateService,
    HttpClient,
    PepFileService,
    DataVisualizationService,
    PepHttpService,
  ]
})
export class TableEditorModule {
  constructor(
    translate: TranslateService,
    private pepIconRegistry: PepIconRegistry,
    private pepAddonService: PepAddonService

  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
    this.pepIconRegistry.registerIcons(pepIcons);

  }
}
