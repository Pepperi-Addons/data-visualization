import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { DataVisualizationEditorComponent } from './data-visualization-editor.component';
import { PepGroupButtonsModule } from '@pepperi-addons/ngx-lib/group-buttons';
import { PepTextareaModule } from '@pepperi-addons/ngx-lib/textarea';

import { config } from '../addon.config';
import { AddonService } from '../addon.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepIconRegistry, pepIconSystemBin } from '@pepperi-addons/ngx-lib/icon';

const pepIcons = [
    pepIconSystemBin,
];

@NgModule({
    declarations: [DataVisualizationEditorComponent],
    imports: [
        PepSelectModule,
        PepTextboxModule,
        PepButtonModule,
        PepTopBarModule,
        CommonModule,
        PepTextareaModule,
        PepGroupButtonsModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) => 
                    PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService,  ),
                deps: [HttpClient, PepFileService, PepAddonService],
            }, isolate: false
        }),
    ],
    exports: [DataVisualizationEditorComponent],
    providers: [
        TranslateStore,
        AddonService,
        PepAddonService,
        PepCustomizationService,
        PepDialogService 
        // Add here all used services.
    ]
})
export class DataVisualizationEditorModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService,
        private pepperiIconRegistry: PepIconRegistry

    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
        this.pepperiIconRegistry.registerIcons(pepIcons);

    }
}
