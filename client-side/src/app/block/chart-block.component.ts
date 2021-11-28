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
        if (this._hostObject?.configuration) {

            this.drawChart(this._hostObject.configuration);
        }

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
            // "Groups": [
            //     "TransactionModificationDateTime"
            // ],
            // "Series": [
            //     "Pocket",
            //     "Hallmark",
            //     "Waitrose",
            //     "Morrisons",
            //     "Tesco",
            //     "Carte Blanche Greetings",
            //     "Laura Darrington Design",
            //     "Susan O'Hanlon",
            //     "Laura Sherratt Designs",
            //     "Talking Pictures",
            //     "Danillo",
            //     "Me To You",
            //     "Tailormade",
            //     "Janie Wilson Ltd",
            //     "Caroline Gardner Publishing",
            //     "Pigment",
            //     "Gemma",
            //     "Paper Rose",
            //     "Box",
            //     "Quitting Hollywood",
            //     "Woodmansterne",
            //     "Hallmark Value",
            //     "Emotional Rescue"
            // ],
            // "DataSet": [
            //     {
            //         "TransactionModificationDateTime": "03",
            //         "Pocket": 203749.23166690994,
            //         "Hallmark": 23476.441084274058,
            //         "Waitrose": 55448.34234480662,
            //         "Morrisons": 17184.972313576138,
            //         "Tesco": 10242.57108098344,
            //         "Carte Blanche Greetings": 2911.5682309094595,
            //         "Laura Darrington Design": 4344.8100182669505,
            //         "Susan O'Hanlon": 5145.866601822224,
            //         "Laura Sherratt Designs": 3981.943405696324,
            //         "Talking Pictures": 1175.3663646524603
            //     },
            //     {
            //         "TransactionModificationDateTime": "04",
            //         "Pocket": 413055.09905308957,
            //         "Hallmark": 34900.59105903322,
            //         "Tesco": 29658.82905232494,
            //         "Waitrose": 32896.20223963452,
            //         "Morrisons": 7356.200535218368,
            //         "Danillo": 6948.988611000572,
            //         "Carte Blanche Greetings": 4593.5332758618215,
            //         "Me To You": 4654.959228352324,
            //         "Tailormade": 7562.257407550481,
            //         "Janie Wilson Ltd": 3131.3760505077885
            //     },
            //     {
            //         "TransactionModificationDateTime": "05",
            //         "Pocket": 486255.70286615146,
            //         "Hallmark": 26876.083841100964,
            //         "Tesco": 11818.959694868008,
            //         "Waitrose": 24954.125655601765,
            //         "Carte Blanche Greetings": 1397.7261734687434,
            //         "Caroline Gardner Publishing": 1718.2227591097712,
            //         "Danillo": 3579.400343555732,
            //         "Morrisons": 33216.68064564296,
            //         "Pigment": 1980.4464509429001,
            //         "Janie Wilson Ltd": 6223.48838127984
            //     },
            //     {
            //         "TransactionModificationDateTime": "06",
            //         "Pocket": 796003.9886059422,
            //         "Hallmark": 104634.94009785687,
            //         "Tesco": 186322.46109682796,
            //         "Waitrose": 93487.0395910801,
            //         "Morrisons": 22900.037299374842,
            //         "Danillo": 47266.80583043532,
            //         "Tailormade": 39194.902589093406,
            //         "Carte Blanche Greetings": 19343.617855556247,
            //         "Me To You": 16060.4541198931,
            //         "Pigment": 13458.382977402822
            //     },
            //     {
            //         "TransactionModificationDateTime": "07",
            //         "Pocket": 360067.01021190727,
            //         "Hallmark": 127793.98292816571,
            //         "Tesco": 133181.12979750094,
            //         "Waitrose": 48059.60750389099,
            //         "Danillo": 35368.62722547464,
            //         "Tailormade": 27658.750785817905,
            //         "Carte Blanche Greetings": 15972.201434242352,
            //         "Me To You": 15174.237841226557,
            //         "Gemma": 21516.50603203828,
            //         "Pigment": 11890.36787581018
            //     },
            //     {
            //         "TransactionModificationDateTime": "08",
            //         "Pocket": 296411.84868985304,
            //         "Hallmark": 42691.12170244101,
            //         "Tesco": 30233.37154349093,
            //         "Morrisons": 17530.0971806296,
            //         "Danillo": 7590.391412176112,
            //         "Carte Blanche Greetings": 3578.0615844588347,
            //         "Me To You": 4097.514472494955,
            //         "Tailormade": 7932.185177905219,
            //         "Pigment": 4133.177502850124,
            //         "Gemma": 6161.50096691356
            //     },
            //     {
            //         "TransactionModificationDateTime": "09",
            //         "Pocket": 484465.26375901594,
            //         "Hallmark": 95130.91379830826,
            //         "Tesco": 64757.8395578631,
            //         "Danillo": 12341.386845427356,
            //         "Tailormade": 18146.81708510493,
            //         "Carte Blanche Greetings": 5716.779247941841,
            //         "Pigment": 4500.549707062518,
            //         "Me To You": 6526.673323822021,
            //         "Caroline Gardner Publishing": 995.2305104357131,
            //         "Paper Rose": 10025.73718945124
            //     },
            //     {
            //         "TransactionModificationDateTime": "10",
            //         "Pocket": 356125.736119149,
            //         "Box": null,
            //         "Hallmark": 70836.31897478749,
            //         "Tesco": 85406.62378516456,
            //         "Danillo": 17493.40140614229,
            //         "Tailormade": 19810.868618677534,
            //         "Carte Blanche Greetings": 7104.879815665654,
            //         "Me To You": 9216.532369488761,
            //         "Pigment": 7316.862844356888,
            //         "Paper Rose": 12487.739886497964
            //     },
            //     {
            //         "TransactionModificationDateTime": "11",
            //         "Pocket": 177478.539582653,
            //         "Box": null,
            //         "Hallmark": 55064.0726836099,
            //         "Tesco": 24257.682446787676,
            //         "Waitrose": 26548.819719622214,
            //         "Danillo": 8376.11743191035,
            //         "Morrisons": 23179.906674648853,
            //         "Me To You": 3432.7130326543534,
            //         "Carte Blanche Greetings": 2176.791951659927,
            //         "Pigment": 2615.400446065267
            //     },
            //     {
            //         "TransactionModificationDateTime": "12",
            //         "Pocket": 235376.51330668468,
            //         "Box": null,
            //         "Hallmark": 29154.31950427183,
            //         "Morrisons": 46094.53120031162,
            //         "Waitrose": 33668.66153643208,
            //         "Tesco": 14412.667799338316,
            //         "Danillo": 5224.896773565383,
            //         "Me To You": 4156.362150673554,
            //         "Quitting Hollywood": 4599.113171168736,
            //         "Janie Wilson Ltd": 4152.08276209338
            //     },
            //     {
            //         "TransactionModificationDateTime": "01",
            //         "Pocket": 205615.74535027667,
            //         "Hallmark": 43306.50665305497,
            //         "Box": null,
            //         "Waitrose": 62130.91290291824,
            //         "Morrisons": 81329.45515169894,
            //         "Tesco": 19440.822779371425,
            //         "Danillo": 8284.008293020894,
            //         "Woodmansterne": 12211.69487256782,
            //         "Me To You": 10325.200207192458,
            //         "Janie Wilson Ltd": 9485.331475965093
            //     },
            //     {
            //         "TransactionModificationDateTime": "02",
            //         "Pocket": 239199.98511079347,
            //         "Box": null,
            //         "Hallmark": 15938.026264004364,
            //         "Morrisons": 43558.41561286405,
            //         "Waitrose": 31071.318119434043,
            //         "Tesco": 8307.14720591215,
            //         "Me To You": 4233.333797394962,
            //         "Carte Blanche Greetings": 3494.8271748634356,
            //         "Quitting Hollywood": 3077.102296757078,
            //         "Susan O'Hanlon": 4824.876595760914
            //     },
            //     {
            //         "TransactionModificationDateTime": "03",
            //         "Pocket": 226371.4200661493,
            //         "Hallmark": 130538.01693944076,
            //         "Box": null,
            //         "Morrisons": 208473.59114482452,
            //         "Waitrose": 37589.54276795318,
            //         "Hallmark Value": 9606.882324820166,
            //         "Quitting Hollywood": 26178.34466693878,
            //         "Me To You": 19803.032982543486,
            //         "Tesco": 18760.179852597852,
            //         "Danillo": 21677.064722422896
            //     },
            //     {
            //         "TransactionModificationDateTime": "04",
            //         "Pocket": 269404.69739872654,
            //         "Hallmark": 27225.2084449263,
            //         "Box": null,
            //         "Morrisons": 52453.419729242785,
            //         "Waitrose": 27716.501941855007,
            //         "Woodmansterne": 4798.0591642175405,
            //         "Susan O'Hanlon": 4197.657320496161,
            //         "Carte Blanche Greetings": 3442.6786668995323,
            //         "Emotional Rescue": 6898.084070921986,
            //         "Janie Wilson Ltd": 3156.277060278685
            //     },
            //     {
            //         "TransactionModificationDateTime": "05",
            //         "Pocket": 245547.68697423322,
            //         "Box": null,
            //         "Hallmark": 33222.17390050046,
            //         "Tesco": 78530.844500548,
            //         "Woodmansterne": 3765.2213466243657,
            //         "Morrisons": 10458.940833250681,
            //         "Waitrose": 4634.873940289675,
            //         "Janie Wilson Ltd": 2844.933099423601,
            //         "Me To You": 5468.877644382111,
            //         "Susan O'Hanlon": 2462.670752357034
            //     },
            //     {
            //         "TransactionModificationDateTime": "06",
            //         "Pocket": 335737.33493760927,
            //         "Hallmark": 187352.74942309703,
            //         "Box": null,
            //         "Tesco": 474208.46246941475,
            //         "Me To You": 39543.44121889794,
            //         "Danillo": 38632.33044240513,
            //         "Morrisons": 11071.957889666717,
            //         "Emotional Rescue": 27247.699727092808,
            //         "Tailormade": 33624.38933296554,
            //         "Carte Blanche Greetings": 26542.471065174243
            //     },
            //     {
            //         "TransactionModificationDateTime": "07",
            //         "Pocket": 179418.68440143394,
            //         "Hallmark": 457500.5896391284,
            //         "Tesco": 635598.9911128159,
            //         "Box": null,
            //         "Me To You": 67486.59565845165,
            //         "Danillo": 66866.96137045232,
            //         "Morrisons": 117088.63174443018,
            //         "Emotional Rescue": 46154.48991361682,
            //         "Tailormade": 53380.47230054361,
            //         "Carte Blanche Greetings": 45711.430174135465
            //     },
            //     {
            //         "TransactionModificationDateTime": "08",
            //         "Pocket": 87700.10607779367,
            //         "Hallmark": 650685.1705247993,
            //         "Box": null,
            //         "Morrisons": 414810.8041272872,
            //         "Pigment": 61058.418652762826,
            //         "Quitting Hollywood": 72569.81866153881,
            //         "Me To You": 51844.08390931079,
            //         "Gemma": 68647.8478994295,
            //         "Emotional Rescue": 51368.40538551913,
            //         "Danillo": 44875.089578183244
            //     },
            //     {
            //         "TransactionModificationDateTime": "09",
            //         "Pocket": 4344.8624539375305,
            //         "Hallmark": 416443.14409639634,
            //         "Box": null,
            //         "Morrisons": 181039.86086876545,
            //         "Tesco": 20647.557747322837,
            //         "Quitting Hollywood": 27210.386135244593,
            //         "Me To You": 17007.633052054207,
            //         "Pigment": 15009.872834025913,
            //         "Emotional Rescue": 17121.895776899375,
            //         "Danillo": 19378.409693466
            //     },
            //     {
            //         "TransactionModificationDateTime": "10",
            //         "Pocket": 1354.5,
            //         "Hallmark": 83452.02285532783,
            //         "Box": null,
            //         "Tesco": 17384.112453817208,
            //         "Morrisons": 102927.25405793662,
            //         "Tailormade": 2840.147808615569,
            //         "Me To You": 5291.209596670784,
            //         "Carte Blanche Greetings": 3713.7442949952197,
            //         "Quitting Hollywood": 8698.446521417673,
            //         "Pigment": 4063.677341872958
            //     },
            //     {
            //         "TransactionModificationDateTime": "11",
            //         "Pocket": 0,
            //         "Box": null,
            //         "Hallmark": 36395.430786260025,
            //         "Tesco": 7559.54306773706,
            //         "Morrisons": 47789.55002297295,
            //         "Tailormade": 2029.5152463846273,
            //         "Me To You": 4686.668709970739,
            //         "Carte Blanche Greetings": 2381.028113136829,
            //         "Pigment": 2525.037339935303,
            //         "Danillo": 6468.937370755257
            //     },
            //     {
            //         "TransactionModificationDateTime": "12",
            //         "Pocket": 0,
            //         "Box": null,
            //         "Hallmark": 29742.814769429337,
            //         "Tesco": 7384.360967535722,
            //         "Morrisons": 2828.0800103009756,
            //         "Hallmark Value": 801.0893102222019,
            //         "Carte Blanche Greetings": 1950.5929857889812,
            //         "Tailormade": 1377.9903845214844,
            //         "Pigment": 2005.3104231461234,
            //         "Me To You": 2311.3323662167504
            //     }
            // ]
        }

        try {
            debugger;
            System.import(configuration.chart.ScriptURI).then((res) => {
                const configuration = {
                    label: 'Sales'
                }


                this.loadSrcJSFiles(res.deps).then(() => {
                    this.chartInstance = new res.default(this.divView.nativeElement, configuration);
                    this.chartInstance.data = this.hostObject.configuration.data;
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
                        this.isLibraryAlreadyLoaded[src] = true;
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
