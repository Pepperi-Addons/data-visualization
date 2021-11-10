import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService, PepFileService } from '@pepperi-addons/ngx-lib';

import { DataVisualizationComponent } from './chart-block.component';

import { config } from '../addon.config';

@NgModule({
    declarations: [DataVisualizationComponent],
    imports: [
        CommonModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) => 
                    PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService, config.AddonUUID),
                deps: [HttpClient, PepFileService, PepAddonService],
            }, isolate: false
        }),
    ],
    exports: [DataVisualizationComponent],
    providers: [
        TranslateStore,
        // Add here all used services.
    ]
})
export class DataVisualizationModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }
}
