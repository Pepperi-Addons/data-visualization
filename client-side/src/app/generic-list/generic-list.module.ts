import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from './generic-list.component';
import { PepListModule } from '@pepperi-addons/ngx-lib/list';
import { PepMenuModule } from '@pepperi-addons/ngx-lib/menu';
import { PepTopBarModule } from '@pepperi-addons/ngx-lib/top-bar';
import { PepSearchModule } from '@pepperi-addons/ngx-lib/search';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PepAddonService, PepDataConvertorService, PepFileService, PepLayoutService } from '@pepperi-addons/ngx-lib';
import { config } from '../addon.config';



@NgModule({
  declarations: [GenericListComponent],
  imports: [
    CommonModule,
    PepListModule,
    PepMenuModule,
    PepTopBarModule,
    PepSearchModule,
    TranslateModule.forChild({
      loader: {
          provide: TranslateLoader,
          useFactory: (addonService: PepAddonService) => 
              PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
          deps: [PepAddonService]
      }, isolate: false
  }),


  ],
  exports:[GenericListComponent],
  providers:[
    TranslateStore,
    PepLayoutService,
    TranslateService,
    PepDataConvertorService
  ]
})
export class GenericListModule { 
  constructor(
    translate: TranslateService,
    private pepAddonService: PepAddonService) {
      this.pepAddonService.setDefaultTranslateLang(translate);
  }
}
