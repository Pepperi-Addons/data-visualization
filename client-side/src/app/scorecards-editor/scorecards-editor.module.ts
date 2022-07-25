import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScorecardsEditorComponent } from '.';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService, PepHttpService } from '@pepperi-addons/ngx-lib';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { PepGroupButtonsModule } from '@pepperi-addons/ngx-lib/group-buttons';
import { PepTextareaModule } from '@pepperi-addons/ngx-lib/textarea';
import { MatTabsModule } from '@angular/material/tabs';
import { config } from '../addon.config';
import { AddonService } from '../../services/addon.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { pepIconTextAlignCenter, pepIconTextAlignLeft, pepIconTextAlignRight, pepIconArrowBackRight, pepIconArrowBackLeft, pepIconArrowBack, pepIconArrowLeftAlt,pepIconArrowDown, pepIconArrowUp, pepIconNumberPlus, PepIconRegistry, pepIconSystemBin, pepIconSystemBolt, pepIconSystemClose, pepIconSystemEdit, pepIconSystemMove } from '@pepperi-addons/ngx-lib/icon';
import { PepCheckboxModule } from '@pepperi-addons/ngx-lib/checkbox';
import { PepSliderModule } from '@pepperi-addons/ngx-lib/slider';
import { PepColorModule } from '@pepperi-addons/ngx-lib/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { CardEditorModule } from '../card-editor/card-editor.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PepColorSettingsModule } from '@pepperi-addons/ngx-composite-lib/color-settings';
import { PepImageModule } from '@pepperi-addons/ngx-lib/image';
import { PepShadowSettingsModule } from '@pepperi-addons/ngx-composite-lib/shadow-settings';
import { PepNgxCompositeLibModule } from '@pepperi-addons/ngx-composite-lib/';
import { PepGroupButtonsSettingsModule } from '@pepperi-addons/ngx-composite-lib/group-buttons-settings';
import { PepPageLayoutModule } from '@pepperi-addons/ngx-lib/page-layout';


const pepIcons = [
  pepIconTextAlignCenter,
    pepIconTextAlignLeft,
    pepIconTextAlignRight,
    pepIconArrowBackRight,
    pepIconArrowBackLeft,
    pepIconArrowBack,
    pepIconSystemClose,
    pepIconNumberPlus,
    pepIconSystemBolt,
    pepIconSystemEdit,
    pepIconSystemMove,
    pepIconSystemBin,
    pepIconArrowLeftAlt,
    pepIconArrowDown,
    pepIconArrowUp
];
@NgModule({
  declarations: [ScorecardsEditorComponent],
  imports: [
    PepButtonModule,
        PepSliderModule,
        CardEditorModule,
        PepTextboxModule,
        PepSelectModule,
        PepCheckboxModule,
        PepPageLayoutModule,
        PepGroupButtonsModule,
        MatTabsModule,
        PepColorModule,
        PepImageModule,
        PepTextareaModule,
        CommonModule,
        DragDropModule,
        PepShadowSettingsModule,
        PepColorSettingsModule,
        PepGroupButtonsSettingsModule,
        PepNgxCompositeLibModule,

        TranslateModule.forChild({
          loader: {
              provide: TranslateLoader,
              useFactory: (addonService: PepAddonService) =>
                  PepAddonService.createMultiTranslateLoader(addonService, ['ngx-lib','ngx-composite-lib'], config.AddonUUID),
              deps: [PepAddonService],
          }, isolate: false
      }),
  ],
  exports: [ScorecardsEditorComponent],
  providers: [
    TranslateStore,
    AddonService,
    PepAddonService,
    PepCustomizationService,
    PepDialogService,
    TranslateService,
    HttpClient,
    PepFileService,
    PepHttpService,
    DataVisualizationService
  ]
})
export class ScorecardsEditorModule {
  constructor(
    translate: TranslateService,
    private pepIconRegistry: PepIconRegistry,
    private pepAddonService: PepAddonService

  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
    this.pepIconRegistry.registerIcons(pepIcons);

  }
}
