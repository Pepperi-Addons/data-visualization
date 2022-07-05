import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { AddonService } from 'src/services/addon.service';
import { DataVisualizationService } from 'src/services/data-visualization.service';
import { ICardEditor, IScorecards } from '../card.model';
import 'systemjs'
import 'systemjs-babel'

@Component({
  selector: 'scorecards',
  templateUrl: './scorecards.component.html',
  styleUrls: ['./scorecards.component.scss']
})
export class ScorecardsComponent implements OnInit {

  @Input('hostObject')
  set hostObject(value) {
      this._configuration = value?.configuration;
}

  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('scorecardsPreviewArea', { static: true }) divView: ElementRef;
  private _configuration: IScorecards;
  get configuration(): IScorecards {
    return this._configuration;
  }
  queryResult:any;
  chartInstances = [];
  isLibraryAlreadyLoaded = {};
  oldDefine: any;

  constructor(private translate: TranslateService,
    private addonService: PepAddonService,
    private dataVisualizationService: DataVisualizationService,
    private pluginService: AddonService) { }

  async ngOnInit() {
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  async drawScorecard(card: ICardEditor, i, currDiv) {
    await this.pluginService.executeQuery(card.query.Key).then(async (data) => {
      await this.pluginService.executeQuery(card.secondQuery?.Key).then(async (benchmarkData) => {
        await System.import(card.chart.ScriptURI).then(async (res) => {
          const configuration = {
              Title: card.title
          }
          await this.loadSrcJSFiles(res.deps).then(() => {
              this.chartInstances[i] = new res.default(currDiv, configuration);
              this.chartInstances[i].data = data;
              this.chartInstances[i].data["BenchmarkQueries"] = []
              this.chartInstances[i].data["BenchmarkSet"] = []
              if(benchmarkData) {
                  this.chartInstances[i].data["BenchmarkQueries"] = benchmarkData["DataQueries"]
                  this.chartInstances[i].data["BenchmarkSet"] = benchmarkData["DataSet"]
              }
              this.chartInstances[i].update();
              window.dispatchEvent(new Event('resize'));
          }).catch(err => {
            currDiv.innerHTML = `Failed to load libraries chart: ${res.deps}, error: ${err}`;
          })
        }).catch(err => {
          currDiv.innerHTML = `Failed to load chart file: ${card.chart.ScriptURI}, error: ${err}`;
        });
      }).catch((err) => {
        currDiv.innerHTML = `Failed to execute query: ${card.query.Key} , error: ${err}`;;
      })
    })
  }

  getRandomNumber() {
    return Math.floor(Math.random() * 100);
  }

  loadSrcJSFiles(imports) {
    
    let promises = [];

    imports.forEach(src => {
        promises.push(new Promise<void>((resolve) => {
            this.isLibraryAlreadyLoaded[src] = false;
            if (!this.isLibraryAlreadyLoaded[src]) {
                let _oldDefine = window['define'];
                this.oldDefine = _oldDefine;
                //this.lockObject = true;
                window['define'] = null;

                const node = document.createElement('script');
                node.src = src;
                node.id = src;
                node.onload = (script) => {
                    window['define'] = _oldDefine;
                    this.isLibraryAlreadyLoaded[src] = true;
                    console.log(`${src} loaded`)
                    resolve()
                };
                node.onerror = (script) => {
                };
                document.getElementsByTagName('head')[0].appendChild(node);
            }
            else {
                resolve();
            }
        }));
    });
    return Promise.all(promises);
}

drawRequired(currCard,value) {
return this.configuration?.cards[currCard]?.query?.Key!=value.configuration?.cards[currCard].query?.Key ||
       this.configuration?.cards[currCard]?.chart?.Key!=value.configuration?.cards[currCard].chart?.Key ||
       this.configuration?.cards[currCard]?.secondQuery?.Key!=value.configuration?.cards[currCard]?.secondQuery?.Key;
}

}
