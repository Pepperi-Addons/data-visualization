import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { TranslateLoader, TranslateModule, TranslateStore } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService, PepLoaderService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';
import { TableComponent as TableComponent } from './table.component';
import { AddonService } from '../../services/addon.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { PepListModule } from '@pepperi-addons/ngx-lib/list';
import { GenericListModule } from '../generic-list/generic-list.module';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';
import { DataVisualizationService } from 'src/services/data-visualization.service';



@NgModule({
    declarations: [TableComponent],
    imports: [
        CommonModule,
        PepTopBarModule,
        GenericListModule,
        PepListModule,
        PepButtonModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (http: HttpClient, fileService: PepFileService, addonService: PepAddonService) =>
                    PepAddonService.createDefaultMultiTranslateLoader(http, fileService, addonService, config.AddonUUID),
                deps: [HttpClient, PepFileService, PepAddonService],
            }, isolate: false
        }),
    ],
    exports: [TableComponent],
    providers: [
        TranslateStore,
        PepCustomizationService,
        PepDialogService,
        DataVisualizationService,
        AddonService,
        PepLoaderService
        // Add here all used services.
    ]
})
export class TableModule { }
