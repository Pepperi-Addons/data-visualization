import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { ChartModule } from './chart/chart.module';
import { SeriesEditorModule } from './series-editor';
import { ScorecardsModule } from './scorecards';
import { BenchmarkChartModule } from './benchmark-chart';

@NgModule({
    imports: [
        BrowserModule,
        ChartModule,
        BenchmarkChartModule,
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
