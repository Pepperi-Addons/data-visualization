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
		if (this.data.DataSet && this.data.DataSet.length > 0) {
			// set the card title
			let title = this.data.DataQueries[0].Name;
			
			// calculate the totals of the first query
			let series1 = this.data.DataQueries[0].Series[0];
			let total1 = this.data.DataSet[0][series1];
			
			let value = 0;
			
			if (this.data.BenchmarkSet && this.data.BenchmarkSet.length > 0) {
				// calculate the totals of the second query
				let series2 = this.data.BenchmarkQueries[0].Series[0];
				let total2 = this.data.BenchmarkSet[0][series2];
				if (total2>0) {
					value = Math.trunc(100*total1/total2*10)/10;
				}
			} else {
				// no second query - use the 1st series as the percentage value
				value = total1;
			}

			// update the chart data
			this.chart.updateSeries([{data:[value]}]);
			
			// update the title text with the value and name
			this.chart.updateOptions({
				title: {
					text: title
				},
				subtitle: {
					text: value.toString() + '%'
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
				type: 'bar',
                height: '70',
                width: 200,
				stacked: true,
				sparkline: {
					enabled: true
				},
				fontFamily: fontFamily
            },
			plotOptions: {
				bar: {
					horizontal: true,
					barHeight: '20%',
					colors: {
						backgroundBarColors: ["#40475D"]
					}
				}
			},
			colors: colors,
			title: {
				floating: true,
				offsetX: -10,
				offsetY: 5,
				text: '',
				style: {
					fontSize: '14px',
				}
			},
			subtitle: {
				text: '',
				floating: true,
				align: "right",
				offsetY: 0,
				style: {
					fontSize: '20px',
				}
			},
			fill: {
				type: 'gradient',
				gradient: {
					shade: 'light',
					shadeIntensity: 0.4,
					inverseColors: false,
					opacityFrom: 1,
					opacityTo: 1,
					stops: [0, 50, 53, 91]
				}
			},
			tooltip: {
				enabled: false
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
