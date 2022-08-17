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
		// if there is no benchmark data, then create empty object
		if (!this.data.BenchmarkQueries || this.data.BenchmarkQueries.length==0) {
			this.data.BenchmarkQueries = [{
				Name: '',
				Groups: [],
				Series: []
			}]
		}
		if (!this.data.BenchmarkSet) {
			this.data.BenchmarkSet = [];
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

		let total = 0;
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
			// calculate the total
			for (let ds of dataSet) {
				total += ds[uniqueSeries[0]] || 0;
			}
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
			// calculate the total
			total = flattened.reduce((a, b) => a + b, 0);
			
            this.chart.updateOptions({
                labels: uniqueSeries
            });
        }
		
		// round the value 
		let valueMsg = '';
		if (total >= 10 ** 9) {
			valueMsg = (Math.trunc(total / 100000)/10).toLocaleString() + ' M';
		} else if (total >= 10 ** 6) {
			valueMsg = (Math.trunc(total / 100)/10).toLocaleString() + ' K';
		} else if (total >= 10 ** 3) {
			valueMsg = Math.trunc(total).toLocaleString();
		} else {
			valueMsg = total.toLocaleString();
		}
		
		// update the subtitle text with the total
		this.chart.updateOptions({
			subtitle: {
				text: valueMsg
			}
		});

        // update the chart data
        this.chart.updateSeries(ser);
				
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
        return `<div id="canvas" style="height: 11rem"></div>`;
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
                type: 'line',
                height: height,
                width: '100%',
				fontFamily: fontFamily,
				sparkline: {
					enabled: true
				}
            },
			stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
			plotOptions: {
				bar: {
					columnWidth: '80%',
					borderRadius: 4
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
					top: 70,
					bottom: 16,
					right: 16,
					left: 16
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