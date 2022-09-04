import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService, PepNgxLibModule } from '@pepperi-addons/ngx-lib';
import { ChartComponent } from './chart.component';
import { config } from '../addon.config';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { PepDialogModule } from '@pepperi-addons/ngx-lib/dialog';
import { BlockHelperService } from '../block-helper/block-helper.service';

@NgModule({
    declarations: [ChartComponent],
    imports: [
        CommonModule,
        HttpClientModule,
        PepNgxLibModule,
        PepTopBarModule,
        PepDialogModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
                deps: [PepAddonService]
            }, isolate: false
        }),
    ],
    exports: [ChartComponent],
    providers: [
        TranslateStore,
        DataVisualizationService,
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
