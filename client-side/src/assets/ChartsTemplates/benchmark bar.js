/**
 * @typedef Configuration A configuration object supplied to the chart by the embedder
 * @type {object}
 * @property {string} label The label of the chart
 */

/**
 * @typedef ChartData A data object supplied to the chart by the embedder containing the chart data
 * @type {object}
 * @property {string[]} Series The chart data Groups
 * @property {string[]} Groups The chart data Series
 * @property {object[]} DataSet The chart data DataSet
 */

/**
 * This is the class the embedder will use to render the chart
 * In this file, a chart from apexcharts is used
 */
export default class MyChart {

    /**
     * The chart constructor.
     *
     * @param {HTMLElement} element The embedder supplies this HTMLElement which can be used to render UI
     * @param {Configuration} configuration a JSON object that holds the chart specific configuration
     */
    constructor(element, configuration) {
        /**
         * The embedder of this chart will insert the chart data to this property
         * @type {ChartData}
         */

        this.data = {};

        // first we create a div on the HTML element
        element.innerHTML = this.getHTML();

        // retrieve the canvas element from the element
        const canvas = element.querySelector('#canvas');

        // retrieve the chart configuration
        const conf = this.getConfiguration(canvas, configuration);

		// add style to the chart to solve an issue of chart is not resized in the page builder when switching to mobile view
		let style = document.createElement('style');
		style.innerHTML = '.apexcharts-canvas {width: 100% !important; min-width: 100px; min-height: 100px;}';
		document.head.appendChild(style);

        // create a chart element on the canvas with the configuration
        this.chart = new ApexCharts(canvas, conf);
        this.chart.render();
		
		const ro = new ResizeObserver(entries => {
			if (entries[0].contentRect.width==0) {
				this.chart.updateOptions({chart: {width: 100}});
			}
			if (entries[0].contentRect.height==0) {
				this.chart.updateOptions({chart: {height:100}});
			}
		});
		ro.observe(canvas);
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		// if there is no benchmark data, then create empty object
		if (!this.data.Benchmark)
			this.data.Benchmark = {}
		if (!this.data.Benchmark.DataQueries || this.data.Benchmark.DataQueries.length==0) {
			this.data.Benchmark.DataQueries = [{
				Name: '',
				Groups: [],
				Series: []
			}];
		}

        const uniqueGroups = this.data.DataQueries.map((data) => data.Groups).flat().filter((elem,index,self) => self.indexOf(elem) === index);
        const uniqueSeries = this.data.DataQueries.map((data) => data.Series).flat().filter((elem,index,self) => self.indexOf(elem) === index);
		const dataSet = this.data.DataSet;
		const benchmarkName = this.data.Benchmark.DataQueries[0].Name;
		const benchmarkGroups = this.data.Benchmark.DataQueries.map((data) => data.Groups).flat();
		const uniqueBenchmarkSeries = this.data.Benchmark.DataQueries.map((data) => data.Series).flat().filter((elem,index,self) => self.indexOf(elem) === index);
		const benchmarkSet = this.data.Benchmark.DataSet || [];
		const hasMultipleRecords = uniqueGroups.length > 0;
		const hasBenchmarkGroups = benchmarkGroups.length > 0;
		const numberFormatter = this.data.NumberFormatter ? this.data.NumberFormatter : {};
		const compactNumberFormatter = {'notation':'compact', ...numberFormatter};
		const positiveColor = '#83B30C';
		const negativeColor = '#CC0000';
		
		const benchmarkObj = {
			"name": benchmarkName,
			"strokeWidth": 5,
			"strokeColor": "#775DD0"
		}
		
        let ser = [];
        // the data has multiple group by DataSet -> show them in the y-axis
        if (hasMultipleRecords) {
            ser = uniqueSeries.map(seriesName => {
                return {
                    "name": seriesName,
                    "data": uniqueGroups.map(groupName => {
                        return [
                            dataSet.map(ds => {
                                let data = {
                                    "x": ds[groupName],
                                    "y": Math.trunc((ds[seriesName] || 0)*100)/100
                                };
								// join the benchmark data to the actuals
								if (benchmarkSet.length>0) {
									// if there are no groups in the benchmark groups then use the single record value always, otherwise find the value of the same group
									// if there is only one benchmark series then use it always, otherwise check if there is a value to the series
									let compData = benchmarkSet.find(comp => ((!hasBenchmarkGroups || comp[groupName] === ds[groupName]) && (uniqueBenchmarkSeries.length == 1 || comp[seriesName])))
									if (compData) {
										let goal = Object.assign({}, benchmarkObj);
										goal.value = uniqueBenchmarkSeries.length == 1 ? compData[uniqueBenchmarkSeries[0]] : compData[seriesName];
										if (goal.value) {
											data["goals"] = [goal];
										}
									}
								}
								return data;
                            })
                        ]
                    }).flat(2)
                }
            });
        } else {
			// the data has no group by -> show the Series in the y-axis
			ser = [{
				"data": uniqueSeries.map(seriesName => {
					let data = {
						"x": seriesName,
						"y": Math.trunc(dataSet[0][seriesName]*100)/100 || null
					};
					// join the benchmark data to the actuals
					if (benchmarkSet.length>0) {
						// check that the benchmark is not per group. if there is only one benchmark series then use it always.
						if ((!hasBenchmarkGroups) && (benchmarkSet.length > 0) && (uniqueBenchmarkSeries.length == 1 || benchmarkSet[0][seriesName])) {
							let goal = Object.assign({}, benchmarkObj);
							goal.value = uniqueBenchmarkSeries.length == 1 ? benchmarkSet[0][uniqueBenchmarkSeries[0]] : benchmarkSet[0][seriesName];
							if (goal.value) {
								data["goals"] = [goal];
							}
						}
					}
					return data;
				})
			}];
		}

		if (ser.length == 1) {
			ser = ser.map(function(obj) {
				for (var el of obj.data) {
					if (el && el["goals"] && el["goals"][0]) {
						if (el["goals"][0]["value"] && el["goals"][0]["value"]>el["y"]) {
							el["fillColor"] = negativeColor;
						} else {
							el["fillColor"] = positiveColor;
						}
					} else {
						el["fillColor"] = positiveColor;
					}
				}
				return obj;
			});
		}
		
		// calculate the optimal bar height (using f(x) = c / (1 + a*exp(-x*b)) -> LOGISTIC GROWTH MODEL)
		// 20: minimum should be close to 20 (when only one item)
		// 20+60: maximum should be close 80
		// 10 and 2: the a and b from the function
		const seriesLength = ser.reduce((sum, curr) => sum + (curr.data.length ||0),0);
		const optimalPercent = 20 + (60 / (1 + 10*Math.exp(-seriesLength /2)));
		
		let optionsToSet = {
			plotOptions: {
				bar: {
					distributed: !hasMultipleRecords,	// set the colors to be distributed
					barHeight: optimalPercent + "%"	// set the bar height
				}
			},
			legend: {
				show: hasMultipleRecords	// hide the legend (since the series name is on the x axis)
			},
			dataLabels: {
				enabled: ser.length > 0 && ser.length * ser[0].data.length < 30,	// hide the data labels if there are too many labels
				formatter: function (value, opt) {		// sets the formatter
					return (value == null) ? '' : value.toLocaleString(undefined, compactNumberFormatter);
				}
			},
			xaxis: {
				labels: {
					formatter: function (value, opt) {		// sets the formatter
						return (value == null) ? '' : value.toLocaleString(undefined, compactNumberFormatter);
					}
				}
			},
			tooltip: {
				y: {
					title: {
						formatter: seriesName => hasMultipleRecords ? seriesName+':' : null
					},
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {		// sets the formatter
						return (value == null) ? '' : value.toLocaleString(undefined, numberFormatter);
					}
				}
			},
			noData: {
				text: 'No data'		// update the initial message to be seen if there is no data
			}
		};
		
		// update the chart options
		this.chart.updateOptions(optionsToSet);
		
        // update the chart data
        this.chart.updateSeries(ser);
    }

    /**
     * This function returns an html which will be created in the embedder.
     */
    getHTML() {
        return `<div id="canvas" style="height: 100%"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration(canvas, configuration) {
		const defaultColors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		const defaultDataLabelsColors = ['#000000'];
		const seriesColors = (configuration.SeriesColors && configuration.SeriesColors !== '') ? configuration.SeriesColors : defaultColors;
		const dataLabelsColors = (configuration.DataLabelsColors && configuration.DataLabelsColors !== '') ? configuration.DataLabelsColors : defaultDataLabelsColors;
		const fontFamily = getComputedStyle(canvas).fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
		// set the height to the canvas height (or to min value for hidden canvas) (setting the chart height to 100% throws errors in the console log)
		const height = canvas.clientHeight>0 ?  canvas.clientHeight : '352';
		
        return {
            chart: {
                type: 'bar',
                height: height,
                width: '100%',
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily
            },
			colors: seriesColors,
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        position: 'center',
                    },
                    borderRadius: 4
                }
            },
            legend: {
                horizontalAlign: 'left',
                onItemClick: {
                    toggleDataSeries: true
                },
                labels: {
                    useSeriesColors: true
                }
            },
            grid: {
                xaxis: {
                    lines: {
                        show: true
                    }
                },
                yaxis: {
                    lines: {
    				show: false
                    }
                }
            },
			yaxis:{
				hideOverlappingLabels:true
			},
            dataLabels: {
				style: {
                    colors: dataLabelsColors
                }
			},
			tooltip: {
				shared: true,
				intersect: false
			},
			noData: {
                text: 'Loading...'
            },
            series: []
        };
    }
}

// defines the dependencies required for the chart
export const deps = [
    'https://cdn.jsdelivr.net/npm/apexcharts'
];
