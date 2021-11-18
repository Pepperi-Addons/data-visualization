import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { DataVisualizationModule } from './block/chart-block.module';
import { SeriesEditorComponent } from './series-editor/series-editor.component';
import { SeriesEditorModule } from './series-editor';

@NgModule({
    imports: [
        BrowserModule,
        DataVisualizationModule,
        SeriesEditorModule
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
