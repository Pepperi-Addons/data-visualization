import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { DataVisualizationModule } from './block/chart-block.module';

@NgModule({
    imports: [
        BrowserModule,
        DataVisualizationModule,
    ],
    declarations: [
        AppComponent,
    ],
    providers: [],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule { }
