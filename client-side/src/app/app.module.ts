import { Component, DoBootstrap, Injector, NgModule, Type } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { createCustomElement } from '@angular/elements';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { SeriesEditorModule } from './series-editor';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';

import { ChartComponent, ChartModule } from './chart';
import { ChartEditorComponent, ChartEditorModule } from './chart-editor';

import { ScorecardsComponent, ScorecardsModule } from './scorecards';
import { ScorecardsEditorComponent, ScorecardsEditorModule } from './scorecards-editor';

import { TableComponent, TableModule } from './table';
import { TableEditorComponent, TableEditorModule } from './table-editor';

import { BenchmarkChartComponent, BenchmarkChartModule } from './benchmark-chart';
import { BenchmarkChartEditorComponent, BenchmarkChartEditorModule } from './benchmark-chart-editor';

import { config } from './addon.config';

@Component({
    selector: 'app-empty-route',
    template: '<div>Route is not exist.</div>',
})
export class EmptyRouteComponent {}

const routes: Routes = [
    { path: '**', component: EmptyRouteComponent }
];

@NgModule({
    declarations: [
        AppComponent,
        
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        ChartModule,
        ChartEditorModule,
        ScorecardsModule,
        ScorecardsEditorModule,
        TableModule,
        TableEditorModule,
        BenchmarkChartModule,
        BenchmarkChartEditorModule,
        SeriesEditorModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
                deps: [PepAddonService]
            }
        }),
        RouterModule.forRoot(routes),
    ],
    providers: [
        TranslateStore,
    ],
    bootstrap: [
        // AppComponent
    ]
})
export class AppModule implements DoBootstrap {
    constructor(
        private injector: Injector,
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }

    private defineCustomElement(elementName: string, component: Type<any>) {
        if (!customElements.get(elementName)) {  
            customElements.define(elementName, createCustomElement(component, {injector: this.injector}));
        }
    }

    ngDoBootstrap() {
        this.defineCustomElement(`chart-element-${config.AddonUUID}`, ChartComponent);
        this.defineCustomElement(`chart-editor-element-${config.AddonUUID}`, ChartEditorComponent);

        this.defineCustomElement(`scorecards-element-${config.AddonUUID}`, ScorecardsComponent);
        this.defineCustomElement(`scorecards-editor-element-${config.AddonUUID}`, ScorecardsEditorComponent);
        
        this.defineCustomElement(`table-element-${config.AddonUUID}`, TableComponent);
        this.defineCustomElement(`table-editor-element-${config.AddonUUID}`, TableEditorComponent);
        
        this.defineCustomElement(`benchmark-chart-element-${config.AddonUUID}`, BenchmarkChartComponent);
        this.defineCustomElement(`benchmark-chart-editor-element-${config.AddonUUID}`, BenchmarkChartEditorComponent);
    }

}
