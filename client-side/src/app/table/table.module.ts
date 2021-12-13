import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { TranslateLoader, TranslateModule, TranslateStore } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PepAddonService, PepCustomizationService, PepFileService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';
import { TableComponent as TableComponent } from './table.component';
import { AddonService } from '../addon.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { MatDialog } from '@angular/material/dialog';
import { PepListModule } from '@pepperi-addons/ngx-lib/list';
import { GenericListModule } from '../generic-list/generic-list.module';
import { PepButtonModule } from '@pepperi-addons/ngx-lib/button';



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
        {
            provide: MatDialog,
            useValue: {}
        },
        TranslateStore,
        PepCustomizationService,
        PepDialogService,
        AddonService 
        // Add here all used services.
    ]
})
export class TableModule { }
