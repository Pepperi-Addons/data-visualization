import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { TranslateLoader, TranslateModule, TranslateStore } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';
import { ScorecardsComponent } from './scorecards.component';



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
    PepCustomizationService
    // Add here all used services.
]
})
export class ScorecardsModule { }
