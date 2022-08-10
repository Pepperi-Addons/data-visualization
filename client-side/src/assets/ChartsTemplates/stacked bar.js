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
        const conf = this.getConfiguration(canvas);
		
        // create a chart element on the canvas with the configuration
        this.chart = new ApexCharts(canvas, conf);
        this.chart.render();
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
        const groups = this.data.DataQueries.map((data) => data.Groups).flat();
        const series = this.data.DataQueries.map((data) => data.Series).flat();

        const uniqueGroups = groups.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const uniqueSeries = series.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const dataSet = this.data.DataSet;

        let ser = [];
        // the data has multiple group by DataSet -> show them in the y-axis
        if (uniqueGroups.length > 0) {
            ser = uniqueSeries.map(seriesName => {
                return {
                    "name": seriesName,
                    "data": uniqueGroups.map(groupName => {
                        return [
                            dataSet.map(ds => {
                                return {
                                    "x": ds[groupName],
                                    "y": ds[seriesName] || null
                                }
                            })
                        ]
                    }).flat(2)
                }
            });
        } else {
            // the data has no group by -> show the Series in the y-axis
            const flattened = uniqueSeries.map(seriesName => dataSet[0][seriesName]);
            ser = [{
                    "data": flattened
                }
            ];
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
		const showLabels = ser[0].data.length < 30;
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
		const seriesLength = ser.reduce((sum, curr) => Math.max(sum, (curr.data.length ||0)),0);
		const optimalPercent = 20 + (60 / (1 + 10*Math.exp(-seriesLength /2)));
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
        return `<div id="canvas" style="height: 100%"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration(canvas) {
		const colors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		const fontFamily = getComputedStyle(canvas).fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
		// set the height to the canvas height (or to min value for hidden canvas) (setting the chart height to 100% throws errors in the console log)
		const height = canvas.clientHeight>0 ?  canvas.clientHeight : '352';
		
        return {
            chart: {
                type: 'bar',
                height: height,
                width: "100%",
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily,
                stacked: true
            },
			colors: colors,
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        //position: 'top',
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
