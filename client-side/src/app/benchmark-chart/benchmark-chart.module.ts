import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService, PepCustomizationService } from '@pepperi-addons/ngx-lib';
import { BenchmarkChartComponent } from './benchmark-chart.component';
import { config } from '../addon.config';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialog } from '@angular/material/dialog';

@NgModule({
    declarations: [BenchmarkChartComponent],
    imports: [
        CommonModule,
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
    exports: [BenchmarkChartComponent],
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
export class BenchmarkChartModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }
}
