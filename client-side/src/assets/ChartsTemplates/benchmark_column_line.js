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
 * In this file we will use a chart from apexcharts
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
        const conf = this.getConfiguration();

        // create a chart element on the canvas with the configuration
        this.chart = new ApexCharts(canvas, conf);
        this.chart.render();
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		// if there is no benchmark data, then create empty object
		if (this.data.BenchmarkQueries.length==0) {
			this.data.BenchmarkQueries = [{
				Name: '',
				Groups: [],
				Series: []
			}]
		}
		
        const groups = this.data.DataQueries.map((data) => data.Groups).flat();
        const series = this.data.DataQueries.map((data) => data.Series).flat();
		const benchmarkGroups = this.data.BenchmarkQueries.map((data) => data.Groups).flat();
		const benchmarkSeries = this.data.BenchmarkQueries.map((data) => data.Series).flat();
        
        const uniqueGroups = groups.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });
        const uniqueSeries = series.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });
		const uniqueBenchmarkGroups = benchmarkGroups.filter(function (elem, index, self) {
			return index === self.indexOf(elem);
		});
		const uniqueBenchmarkSeries = benchmarkSeries.filter(function (elem, index, self) {
			return index === self.indexOf(elem);
		});
		
        const dataSet = this.data.DataSet;
		const benchmarkSet = this.data.BenchmarkSet;

        let ser = [];
		let actualSer = [];
		let benchmarkSer = [];
        // the data has multiple group by DataSet -> show them in the y-axis
        if (uniqueGroups.length > 0) {
            actualSer = uniqueSeries.map(seriesName => {
                return {
					"type": "bar",
                    "name": seriesName,
                    "data": uniqueGroups.map(groupName => {
                        return [
                            dataSet.map(ds => {
                                return {
                                    "x": ds[groupName],
                                    "y": ds[seriesName] || 0
                                }
                            })
                        ]
                    }).flat(2)
                }
            });
			// add the benchmark group series
			benchmarkSer = uniqueBenchmarkSeries.map(seriesName => {
				return {
					"type": "line",
					"name": seriesName,
					"data": uniqueGroups.map(groupName => {
						return [
							dataSet.map(ds => {
								let compData = benchmarkSet.find(comp => ((uniqueBenchmarkGroups.length == 0 || comp[groupName] === ds[groupName]) && (uniqueBenchmarkSeries.length == 1 || comp[seriesName])))
								let compY = 0;
								if (compData) {
									compY = uniqueBenchmarkSeries.length == 1 ? compData[uniqueBenchmarkSeries[0]] : compData[seriesName];
								}
								return {
									"x": ds[groupName],
									"y": compY
								}
							})
						]
					}).flat(2)
				}
			});
			ser = actualSer.concat(benchmarkSer);
        } else {
           	// the data has no group by -> show the Series in the y-axis
			const flattened = uniqueSeries.map(seriesName => dataSet[0][seriesName]);
			actualSer = [{
				"type": "bar",
				"data": flattened
			}];
			// add the benchmark group series
			// check that the benchmark is not per group
			if (uniqueBenchmarkGroups.length == 0 && benchmarkSet.length > 0) {
				benchmarkSer = [{
					"type": "line",
					"data": uniqueSeries.map(seriesName => (uniqueBenchmarkSeries.length == 1 ? benchmarkSet[0][uniqueBenchmarkSeries[0]] : benchmarkSet[0][seriesName]) || 0)
				}];
			}
			ser = actualSer.concat(benchmarkSer);
			
            this.chart.updateOptions({
                labels: uniqueSeries
            });
            // set the colors to be distributed
            this.chart.updateOptions({
                plotOptions: {
                    bar: {
            //            distributed: true
                    }
                }
            });
            // hide the legend (since the series name is on the x axis)
            this.chart.updateOptions({
                legend: {
                    show: false
                }
            });
        }

		// hide the data labels if there are too many labels
		const showLabels = ser.length * ser[0].data.length < 30;
		this.chart.updateOptions({
			dataLabels: {
				enabled: showLabels
			}
		});
		
        // update the chart data
        this.chart.updateSeries(ser);
		
		// calculate the optimal column width (using f(x) = c / (1 + a*exp(-x*b)) -> LOGISTIC GROWTH MODEL)
		// 20: minimum should be close to 20 (when only one item)
		// 20+60: maximum should be close 80
		// 10 and 2: the a and b from the function
		const seriesLength = ser.reduce((sum, curr) => sum + (curr.data.length ||0),0);
		const optimalPercent = 20 + (60 / (1 + 10*Math.exp(-seriesLength /2)));
        this.chart.updateOptions({
            plotOptions: {
				bar: {
					columnWidth: optimalPercent + "%"
				}
			}
        });
		
		// update the initial message to be seen if there is no data
		this.chart.updateOptions({
            noData: {
                text: 'No data'
            }
        });
    }

    /**
     * This function returns an html which will be created in the embedder.
     */
    getHTML() {
        return `<div id="canvas" style="height: 100%;"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration() {
		const colors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		const fontFamily = $('.font-family-body').css("font-family") || '"Segoe UI", "Helvetica Neue", sans-serif';
        return {
            chart: {
                type: 'line',
                height: "100%",
                width: "100%",
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily
            },
			colors: colors,
			fill: {
				type: "solid",
				opacity: 1
			},
            plotOptions: {
                bar: {
                    horizontal: false,
                    dataLabels: {
                        position: 'top',
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
			xaxis:{
				hideOverlappingLabels:true
			},
			yaxis:{
				labels: {
					formatter: function (value) {
						let val = value;
						if (val >= 10 ** 6) {
							val = Math.trunc(val / 1000000) + ' M';
						} else if (val >= 10 ** 3) {
							val = Math.trunc(val / 1000) + ' K';
						} 
						return val;
					}
				}
			},
            dataLabels: {
				formatter: function (value, opt) {
					let val = value;
					if (val >= 10 ** 6) {
						val = Math.trunc(val / 100000)/10 + ' M';
						//val = (val / 1000000).toFixed(1) + ' M';
					} else if (val >= 10 ** 3) {
						val = Math.trunc(val / 100)/10 + ' K';
						//val = (val / 1000).toFixed(1) + ' K';
					} else if (val >= 1) {
						val = Math.trunc(val*10)/10;
						//val = Math.floor(val);
					} else if (val == null) {
						val = '';
					}
					return val;
				},
                style: {
            //        colors: ['#000000']
                },
                offsetY: -10,
				enabledOnSeries: [0]
            },
			tooltip: {
				y: {
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
						let val = value;
						if (val >= 10 ** 3) {
							val = Math.trunc(val);
						} 
						return val.toLocaleString();
					}
				}
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
