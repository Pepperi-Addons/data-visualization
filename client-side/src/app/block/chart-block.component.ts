import { TranslateService } from '@ngx-translate/core';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import 'systemjs'
import 'systemjs-babel'

@Component({
    selector: 'chart-block',
    templateUrl: './chart-block.component.html',
    styleUrls: ['./chart-block.component.scss']
})
export class DataVisualizationComponent implements OnInit {
    _hostObject;
    existing: any;
    isLibraryAlreadyLoaded = {};
    @Input('hostObject')
    get hostObject() {
        return this._hostObject;
    }
    set hostObject(value) {
        this._hostObject = value;
        this.drawChart(this._hostObject.configuration);

    }
    //lockObject = false;
    @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
    chartInstance: any;
    @ViewChild("previewArea") divView: ElementRef;

    oldDefine: any;

    constructor(private translate: TranslateService) { }

    ngOnInit(): void {
        // When finish load raise block-loaded.
        this.hostEvents.emit({ action: 'block-loaded' });
    }

    ngOnChanges(e: any): void {
        //console.log(this.hostObject.configuration);
    }

    async lockWindowDefine(block): Promise<void> {
        if (!window['define-lock']) {
            console.log("locking the window define")

            window['define-lock'] = true;
            await block();
            window['define-lock'] = false;
            console.log("unlocking the window define")
        }
        else {
            console.log("window define is locked")

            return new Promise((resolve) => {
                setTimeout(async () => {
                    await this.lockWindowDefine(block)
                    resolve();
                }, 100);
            })
        }
    }

    ensureDefineIsSet() {
        return new Promise<void>((resolve) => {
            const intervalID = setInterval(() => {
                if (window['define']) {
                    clearInterval(intervalID)
                    resolve();
                }
            }, 1000);
        })
    }

    drawChart(configuration: any) {
        const seedData = {
            Groups: ["ActionDate"],
            Series: ["Series 1", "Series 2"],
            DataSet: [
                { "ActionDate": "01/01/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
                { "ActionDate": "01/02/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
                { "ActionDate": "01/03/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
                { "ActionDate": "01/04/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
                { "ActionDate": "01/05/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() },
                { "ActionDate": "01/06/2021", "Series 1": this.getRandomNumber(), "Series 2": this.getRandomNumber() }
            ]
        }

        try {
            debugger;
            System.import(configuration.chart.ScriptURI).then((res) => {
                const configuration = {
                    label: 'Sales'
                }


                this.loadSrcJSFiles(res.deps).then(() => {
                    this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                    this.chartInstance.data = seedData;
                    this.chartInstance.update();
                    //this.loaderService.hide();

                }).catch(err => {
                    console.log(err);
                    //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
                })
            }).catch(err => {
                console.log(err);

                //console.log(`error: ${err}, lock: ${this.lockObject}, window['define']: ${window['define']}`);
                //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
            });
        }
        catch (err) {

        }


        // this.lockWindowDefine(async () => {
        //     try {
        //         debugger;
        //         await System.import(configuration.selectedChart.ScriptURI).then(async (res) => {
        //             const configuration = {
        //                 label: 'Sales'
        //             }


        //             await this.loadSrcJSFiles(res.deps).then(() => {
        //                 this.chartInstance = new res.default(this.divView.nativeElement, configuration);
        //                 this.chartInstance.data = seedData;
        //                 this.chartInstance.update();
        //                 //this.loaderService.hide();

        //             }).catch(err => {
        //                 //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
        //             })
        //         }).catch(err => {
        //             //console.log(`error: ${err}, lock: ${this.lockObject}, window['define']: ${window['define']}`);
        //             //this.handleErrorDialog(this.translate.instant("FailedExecuteFile"));
        //         });
        //     }
        //     catch(err) {

        //     }

        // })

    }

    getRandomNumber() {
        return Math.floor(Math.random() * 100);
    }

    loadSrcJSFiles(imports) {

        let promises = [];

        imports.forEach(src => {
            promises.push(new Promise<void>((resolve) => {
                debugger
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
                        this.isLibraryAlreadyLoaded[src]=true;
                        //this.lockObject = false;
                        resolve()
                    };
                    node.onerror = (script) => {
                        // this.handleErrorDialog(this.translate.instant("FailedLoadLibrary", {
                        //   library: script['target'].id
                        // }));
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
}
