import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { ChartModule } from './chart/chart.module';
import { SeriesEditorModule } from './series-editor';
import { ScorecardsModule } from './scorecards';

@NgModule({
    imports: [
        BrowserModule,
        ChartModule,
        SeriesEditorModule,
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
