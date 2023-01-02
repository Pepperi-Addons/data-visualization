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

        // create a chart element on the canvas with the configuration
        this.chart = new ApexCharts(canvas, conf);
        this.chart.render();
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		if (this.data.DataSet && this.data.DataSet.length > 0) {
			// calculate the totals of the first query
			let series1 = this.data.DataQueries[0].Series[0];
			let total1 = this.data.DataSet[0][series1];
			total1 = Math.trunc((total1 || 0)*10)/10;
			
			let data = { 'x': "" };
			let valueMsg = '';
			if (this.data.BenchmarkSet && this.data.BenchmarkSet.length > 0) {
				// calculate the totals of the second query
				let series2 = this.data.BenchmarkQueries[0].Series[0];
				let total2 = this.data.BenchmarkSet[0][series2];
				if (total2>0) {
					total2 = Math.trunc((total2 || 0)*10)/10;
					data['y'] = Math.trunc(100*total1/total2*10)/10;
					data["origin"] = total1;
					// add the benchmark as goal so it will be seen in the tooltip
					let goal = {
						"name": this.data.BenchmarkQueries[0].Name,
						"strokeHeight": 0,
						"strokeColor": "#775DD0",
						"value": total2
					}
					data["goals"] = [goal];
					// round the value for the subtitle
					if (total1 >= 10 ** 9) {
						valueMsg = (Math.trunc(total1 / 100000)/10).toLocaleString() + ' M';
					} else if (total1 >= 10 ** 6) {
						valueMsg = (Math.trunc(total1 / 100)/10).toLocaleString() + ' K';
					} else if (total1 >= 10 ** 3) {
						valueMsg = Math.trunc(total1).toLocaleString();
					} else {
						valueMsg = total1.toLocaleString();
					}
				} else {
					valueMsg = total1.toLocaleString();
				}
			} else {
				// no second query - use the 1st series as the percentage value
				data['y'] = total1>100 ? 100 : total1;
				data["origin"] = total1;
				valueMsg = total1 + '%';
			}

			// update the subtitle text with the value
			this.chart.updateOptions({
				subtitle: {
					text: valueMsg
				}
			});
			
			// update the chart data
			this.chart.updateSeries([{
				name:series1,
				data:[data]
			}]);
		}		
		
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
        return `<div id="canvas" style="height: 11rem; margin: 0;"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration(canvas, configuration) {
		const colors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		const fontFamily = getComputedStyle(canvas).fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
		const title = configuration.Title || '';
		// set the height to the canvas height (or to min value for hidden canvas) (setting the chart height to 100% throws errors in the console log)
		const height = canvas.clientHeight>0 ?  canvas.clientHeight : '172';
		
        return {
            chart: {
				type: 'bar',
                height: height,
                width: '100%',
				stacked: true,
				sparkline: {
					enabled: true
				},
				fontFamily: fontFamily
            },
			plotOptions: {
				bar: {
					horizontal: true,
					barHeight: '100%',
					distributed: true,
					borderRadius: 4,
					colors: {
						backgroundBarColors: colors,
						backgroundBarOpacity: 0.16,
						backgroundBarRadius: 4
					}
				}
			},
			colors: colors,
			subtitle: {
				floating: true,
				text: '',
				align: 'center',
				//offsetX: 6,
				offsetY: 38,
				style: {
					fontSize: '28px',
					fontWeight: 'bold',
					fontFamily: fontFamily
				}
			},
			title: {
				floating: true,
				text: title,
				align: 'center',
				//offsetX: 6,
				offsetY: 16,
				style: {
					fontSize: '14px',
					fontWeight: 'normal',
					fontFamily: fontFamily
				}
			},
			grid: {
				padding: {
					top: 94,
					bottom: 32,
					left: 32,
					right: 32
				}
			},
			tooltip: {
				enabled: true,
				y: {
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
						let val = value;
						// real series value
						if (series) {
							// comparison value - show the value and percentage
							if (w.config.series[seriesIndex].data[dataPointIndex].goals) {
								let origin = w.config.series[seriesIndex].data[dataPointIndex].origin;
								if (origin >= 10 ** 3) {
									origin = Math.trunc(origin);
								} 
								val = origin.toLocaleString() + ' (' + Math.trunc(value*100)/100 + '%)';
							} else {
								// no comparison value - show the value as percentage
								val = Math.trunc(val*100)/100 + '%';
							}
						} else {
							//goal value
							if (val >= 10 ** 3) {
								val = Math.trunc(val);
							} 
							val = val.toLocaleString();
						}
						return val;
					}
				}
			},
			yaxis: {
				max: 100
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
