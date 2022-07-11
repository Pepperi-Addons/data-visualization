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

		const benchmarkObj = {
			"name": this.data.BenchmarkQueries[0].Name,
			"strokeHeight": 2,
			"strokeColor": "#775DD0"
		}
		
        let ser = [];
        // the data has multiple group by DataSet -> show them in the y-axis
        if (uniqueGroups.length > 0) {
            ser = uniqueSeries.map(seriesName => {
                return {
                    "name": seriesName,
                    "data": uniqueGroups.map(groupName => {
                        return [
                            dataSet.map(ds => {
                                let data = {
                                    "x": ds[groupName],
                                    "y": ds[seriesName] || null
                                };
								// join the benchmark data to the actuals
								// if there are no groups in the benchmark groups then use the single record value always, otherwise find the value of the same group
								// if there is only one benchmark series then use it always, otherwise check if there is a value to the series
								let compData = benchmarkSet.find(comp => ((uniqueBenchmarkGroups.length == 0 || comp[groupName] === ds[groupName]) && (uniqueBenchmarkSeries.length == 1 || comp[seriesName])))
								if (compData) {
									let goal = Object.assign({}, benchmarkObj);
									goal.value = uniqueBenchmarkSeries.length == 1 ? compData[uniqueBenchmarkSeries[0]] : compData[seriesName];
									data["goals"] = [goal];
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
				data: uniqueSeries.map(seriesName => {
					let data = {
						"x": seriesName,
						"y": dataSet[0][seriesName] || null
					};
					// join the benchmark data to the actuals
					// check that the benchmark is not per group. if there is only one benchmark series then use it always.
					if ((uniqueBenchmarkGroups.length == 0) && (benchmarkSet.length > 0) && (uniqueBenchmarkSeries.length == 1 || benchmarkSet[0][seriesName])) {
						let goal = Object.assign({}, benchmarkObj);
						goal.value = uniqueBenchmarkSeries.length == 1 ? benchmarkSet[0][uniqueBenchmarkSeries[0]] : benchmarkSet[0][seriesName];
						data["goals"] = [goal];
					}
					return data;
				})
			}];
			
            this.chart.updateOptions({
                labels: uniqueSeries
            });
            // set the colors to be distributed
            this.chart.updateOptions({
                plotOptions: {
                    bar: {
                        distributed: true
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

        // calculate the optimal bar height (using f(x) = c / (1 + a*exp(-x*b)) -> LOGISTIC GROWTH MODEL)
        // 20: minimum should be close to 20 (when only one item)
        // 20+60: maximum should be close 80
        // 10 and 2: the a and b from the function
        const seriesLength = ser.reduce((sum, curr) => sum + (curr.data.length || 0), 0);
        const optimalPercent = 20 + (60 / (1 + 10 * Math.exp(-seriesLength / 2)));
        this.chart.updateOptions({
            plotOptions: {
                bar: {
                    barHeight: optimalPercent + "%"
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
                type: 'bar',
                height: "100%",
                width: "100%",
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily
            },
			colors: colors,
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            plotOptions: {
                bar: {
                    horizontal: true,
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
			xaxis:{
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
                    //colors: ['#000000']
                }
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
