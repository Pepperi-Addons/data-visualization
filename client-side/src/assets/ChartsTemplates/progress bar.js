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
			this.data.Benchmark = {};
		if (!this.data.Benchmark.DataQueries || this.data.Benchmark.DataQueries.length==0) {
			this.data.Benchmark.DataQueries = [{
				Name: '',
				Groups: [],
				Series: []
			}];
		}
 
		const dataSet = this.data.DataSet;
		const benchmarkName = this.data.Benchmark.DataQueries[0].Name;
		const benchmarkSet = this.data.Benchmark.DataSet || [];
		const numberFormatter = this.data.NumberFormatter ? this.data.NumberFormatter : {};
		const compactNumberFormatter = {'notation':'compact', ...numberFormatter};

		let ser = [];
		let valueMsg = '';
		if (this.data.DataQueries && this.data.DataQueries[0].Series[0]) {
			// calculate the totals of the first query
			let series1 = this.data.DataQueries[0].Series[0];
			let total1 = dataSet[0][series1];
			total1 = Math.trunc((total1 || 0)*100)/100;
			
			let data = { 'x': "" };
			if (this.data.Benchmark.DataQueries && this.data.Benchmark.DataQueries[0].Series[0]) {
				// calculate the totals of the second query
				let series2 = this.data.Benchmark.DataQueries[0].Series[0];
				let total2 = benchmarkSet[0][series2];
				if (total2>0) {
					total2 = Math.trunc((total2 || 0)*100)/100;
					let percentage = Math.trunc(100*total1/total2*10)/10;
					data['y'] = percentage>100 ? 100 : percentage;
					data["origin"] = total1;
					data["percentage"] = percentage;
					// add the benchmark as goal so it will be seen in the tooltip
					let goal = {
						"name": benchmarkName,
						"strokeHeight": 0,
						"strokeColor": "#775DD0",
						"value": total2
					}
					data["goals"] = [goal];
					valueMsg = percentage +'%';
				} else {
					valueMsg = total1.toLocaleString(undefined, numberFormatter);
				}
			} else {
				// no second query - use the 1st series as the percentage value
				data['y'] = total1>100 ? 100 : total1;
				data["origin"] = total1;
				valueMsg = total1 + '%';
			}
			
			// build the series data
			ser = [{
				name:series1,
				data:[data]
			}];
		}
		
		let optionsToSet = {
			subtitle: {
				text: valueMsg		// update the subtitle text with the value
			},
			tooltip: {
				y: {
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
						let val = value;
						// real series value
						if (series) {
							// comparison value - show the value and percentage
							if (w.config.series[seriesIndex].data[dataPointIndex].goals) {
								let origin = w.config.series[seriesIndex].data[dataPointIndex].origin;
								let percentage = w.config.series[seriesIndex].data[dataPointIndex].percentage;
								val = origin.toLocaleString(undefined, numberFormatter) + ' (' + Math.trunc(percentage*10)/10 + '%)';
							} else {
								// no comparison value - show the value as percentage
								val = Math.trunc(val*100)/100 + '%';
							}
						} else {
							//goal value
							val = val.toLocaleString(undefined, numberFormatter);
						}
						return val;
					}	
				}
			},
			noData: {
				text: 'No data'		// update the initial message to be seen if there is no data
			}
		}
		
		// update the chart options
		this.chart.updateOptions(optionsToSet);
		
        // update the chart data
        this.chart.updateSeries(ser);
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
		const defaultColors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		//const defaultDataLabelsColors = ['#000000'];
		const seriesColors = (configuration.SeriesColors && configuration.SeriesColors !== '') ? configuration.SeriesColors : defaultColors;
		//const dataLabelsColors = (configuration.DataLabelsColors && configuration.DataLabelsColors !== '') ? configuration.DataLabelsColors : defaultDataLabelsColors;
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
						backgroundBarColors: seriesColors,
						backgroundBarOpacity: 0.16,
						backgroundBarRadius: 4
					}
				}
			},
			colors: seriesColors,
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
				enabled: true
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
