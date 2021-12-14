import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';
import { ScorecardsComponent } from './scorecards.component';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { AddonService } from 'src/services/addon.service';
import { MatDialog } from '@angular/material/dialog';



@NgModule({
  declarations: [ScorecardsComponent],
  imports: [
    CommonModule,
    PepTopBarModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) =>
          PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService, config.AddonUUID),
        deps: [HttpClient, PepFileService, PepAddonService],
      }, isolate: false
    }),
  ],
  exports: [ScorecardsComponent],
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
    {
      provide: MatDialog,
      useValue: {}
    },
    // Add here all used services.
  ]
})
export class ScorecardsModule { }
