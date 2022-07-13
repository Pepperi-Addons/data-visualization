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
import { CardModule } from '../card/card.module';



@NgModule({
  declarations: [ScorecardsComponent],
  imports: [
    CommonModule,
    CardModule,
    PepTopBarModule,
    TranslateModule.forChild({
      loader: {
          provide: TranslateLoader,
          useFactory: (addonService: PepAddonService) => 
              PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
          deps: [PepAddonService]
      }, isolate: false
  }),
  ],
  exports: [ScorecardsComponent],
  providers: [
    TranslateStore,
    AddonService,
    PepCustomizationService,
    PepDialogService,
    TranslateService,
    DataVisualizationService,
    {
      provide: MatDialog,
      useValue: {}
    },
    // Add here all used services.
  ]
})
export class ScorecardsModule { }
