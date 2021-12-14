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
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepIconRegistry, pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';
import { PepCheckboxModule } from '@pepperi-addons/ngx-lib/checkbox';
import { PepSliderModule } from '@pepperi-addons/ngx-lib/slider';
import { ChartEditorModule } from '../chart-editor';
import { PepColorModule } from '@pepperi-addons/ngx-lib/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';


const pepIcons = [
  pepIconSystemBin,
];
@NgModule({
  declarations: [ScorecardsEditorComponent],
  imports: [
    PepSelectModule,
    PepTextboxModule,
    PepCheckboxModule,
    PepButtonModule,
    PepTopBarModule,
    CommonModule,
    PepTextareaModule,
    PepSliderModule,
    PepColorModule,
    PepGroupButtonsModule,
    MatTabsModule,
    ChartEditorModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) =>
          PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService, config.AddonUUID),
        deps: [HttpClient, PepFileService, PepAddonService],
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
