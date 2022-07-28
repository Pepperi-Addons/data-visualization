import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PepNgxLibModule } from '@pepperi-addons/ngx-lib';
import { PepSelectModule } from '@pepperi-addons/ngx-lib/select';
import { PepTextboxModule } from '@pepperi-addons/ngx-lib/textbox';
import { FlexLayoutModule } from '@angular/flex-layout';
import { QuerySelectComponent } from './query-select.component';

@NgModule({
    declarations: [QuerySelectComponent],
    imports: [
        CommonModule,
        HttpClientModule,
        TranslateModule.forChild(),
        PepNgxLibModule,
        PepSelectModule,
        PepTextboxModule,
        FlexLayoutModule
    ],
    exports: [QuerySelectComponent]    
})
export class QuerySelectModule {
    constructor() { }
}
