import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PepAddonService, PepColorService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { ChartEditorComponent } from './chart-editor.component';
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
import { PepColorModule } from '@pepperi-addons/ngx-lib/color';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { SeriesEditorModule } from '../series-editor';
import { PepGroupButtonsSettingsModule } from '@pepperi-addons/ngx-composite-lib/group-buttons-settings';
import { FlexLayoutModule } from '@angular/flex-layout';

const pepIcons = [
    pepIconSystemBin,
];

@NgModule({
    declarations: [ChartEditorComponent],
    imports: [
        PepSelectModule,
        PepTextboxModule,
        PepCheckboxModule,
        PepButtonModule,
        PepTopBarModule,
        CommonModule,
        PepTextareaModule,
        PepSliderModule,
        PepGroupButtonsModule,
        PepGroupButtonsSettingsModule,
        MatTabsModule,
        PepColorModule,
        SeriesEditorModule,
        FlexLayoutModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
                deps: [PepAddonService]
            }, isolate: false
        }),
    ],
    exports: [ChartEditorComponent],
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
    ]
})
export class ChartEditorModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService,
        private pepperiIconRegistry: PepIconRegistry

    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
        this.pepperiIconRegistry.registerIcons(pepIcons);

    }
}
