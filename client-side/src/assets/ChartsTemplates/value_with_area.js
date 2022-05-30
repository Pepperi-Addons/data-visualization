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
					"type": "area",
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
				"type": "area",
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
		
        // update the chart data
        this.chart.updateSeries(ser);
		
		if  (this.data.DataQueries.length>0) {
			// update the title text with the total of the first group and first series
			this.chart.updateOptions({
				title: {
					text: total
				},
				subtitle: {
					text: this.data.DataQueries[0].Name
				}
			});
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
        return `<div id="canvas" style="height: 100%;"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration() {
		const colors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#33C5FF'];
		const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--pep-font-family-body') + ', Helvetica, Arial, sans-serif';
        return {
            chart: {
                type: 'line',
                height: '100%',
                width: 200,
				fontFamily: fontFamily,
				sparkline: {
					enabled: true
				}
            },
			fill: {
				opacity: 0.3
			},
			colors: colors,
			title: {
				text: '',
				style: {
					fontSize: '24px',
				}
			},
			subtitle: {
				text: '',
				style: {
					fontSize: '14px',
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
