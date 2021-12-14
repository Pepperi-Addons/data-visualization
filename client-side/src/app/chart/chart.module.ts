import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { ChartComponent } from './chart.component';

import { config } from '../addon.config';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialog } from '@angular/material/dialog';

@NgModule({
    declarations: [ChartComponent],
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
    exports: [ChartComponent],
    providers: [
        TranslateStore,
        PepCustomizationService,
        DataVisualizationService,
        PepDialogService,
        {
            provide: MatDialog,
            useValue: {}
        },
    ]
})
export class ChartModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }
}
