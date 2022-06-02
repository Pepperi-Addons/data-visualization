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
      const currCard = value.configuration?.scorecardsConfig?.editSlideIndex;
      const cardsDiv = this.divView.nativeElement.querySelector('#cards')
      if (currCard >= 0 && cardsDiv && value?.configuration?.cards[currCard].query?.Key && value?.configuration?.cards[currCard].chart?.Key) {
        let currDiv = this.divView.nativeElement.querySelector('#card'+currCard)
        if(!currDiv) {
          cardsDiv.innerHTML += this.getScorecardsHTML("card"+currCard);
          currDiv = this.divView.nativeElement.querySelector('#card'+currCard)
        }
        if(this.drawRequired(currCard,value)) {
          this.drawScorecard(value.configuration?.cards[currCard],currCard,currDiv);
        }
      }
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
    this.divView.nativeElement.innerHTML = `<div style="display: flex;flex-direction: column;gap: 2rem;">
                  <div id='cards' style="display: flex;gap: 2rem; flex-wrap: wrap"></div></div>`;
    for(const i in this.configuration?.cards) {
      if (this.configuration?.cards[i].query?.Key) {
        const cardsDiv = this.divView.nativeElement.querySelector('#cards')
        cardsDiv.innerHTML += this.getScorecardsHTML("card"+i);
        const currDiv = this.divView.nativeElement.querySelector('#card'+i)
        await this.drawScorecard(this.configuration?.cards[i],i,currDiv);
      }
    }
    this.hostEvents.emit({ action: 'block-loaded' });
  }

  async drawScorecard(card: ICardEditor, i, currDiv) {
    await this.pluginService.executeQuery(card.query.Key).then(async (data) => {
      await this.pluginService.executeQuery(card.secondQuery?.Key).then(async (benchmarkData) => {
        await System.import(card.chart.ScriptURI).then(async (res) => {
          const configuration = {
              label: 'Sales'
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

  private getScorecardsHTML(cardId) {
    const boxShadow = this.configuration?.scorecardsConfig.useDropShadow === true ? this.dataVisualizationService.getCardShadow(this.configuration?.scorecardsConfig.dropShadow?.intensity / 100, this.configuration?.scorecardsConfig.dropShadow?.type) : 'unset';
    return `<div id=`+cardId+` style="background: rgb(255, 255, 255);
          border: ${this.dataVisualizationService.getChartBorder(this.configuration?.scorecardsConfig.useBorder, this.configuration?.scorecardsConfig.border)};
          box-shadow: ${boxShadow};
          border-radius: 0.5rem;">
      </div>`;
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
