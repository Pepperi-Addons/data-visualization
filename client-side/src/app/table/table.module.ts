import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { TranslateLoader, TranslateModule, TranslateStore } from '@ngx-translate/core';
import { PepAddonService, PepCustomizationService, PepLoaderService } from '@pepperi-addons/ngx-lib';
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
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
                deps: [PepAddonService]
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
