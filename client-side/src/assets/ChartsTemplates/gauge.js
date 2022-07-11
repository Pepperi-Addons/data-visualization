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
        const conf = this.getConfiguration(configuration);

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
			
			let value = 0;
			let valueMsg = '';
			
			if (this.data.BenchmarkSet && this.data.BenchmarkSet.length > 0) {
				// calculate the totals of the second query
				let series2 = this.data.BenchmarkQueries[0].Series[0];
				let total2 = this.data.BenchmarkSet[0][series2];
				if (total2>0) {
					value = Math.trunc(100*total1/total2*10)/10;
					let val = total1;
					if (val >= 10 ** 3) {
						val = Math.trunc(val);
					} 
					valueMsg = val.toLocaleString();
				}
			} else {
				// no second query - use the 1st series as the percentage value
				value = total1;
				valueMsg = total1.toLocaleString() + '%';
			}

			// update the subtitle text with the value
			this.chart.updateOptions({
				subtitle: {
					text: valueMsg
				}
			});
			
			// update the chart data
			this.chart.updateSeries([value]);
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
        return `<div id="canvas" style="height: 11rem;"></div>`;
    }

    /**
     * This function returns a chart configuration object.
     */
    getConfiguration(configuration) {
		const colors = ['#83B30C', '#FF9800', '#FE5000', '#1766A6', '#333333', '#0CB3A9', '#FFD100', '#FF5281', '#3A22F2', '#666666'];
		const fontFamilyBody = $('.font-family-body').css("font-family") || "Inter-Regular";
		const title = configuration.Title || '';
        return {
            chart: {
                type: 'radialBar',
                height: 240,
                //width: 300,
				sparkline: {
					enabled: true
				},
				fontFamily: fontFamilyBody
            },
			plotOptions: {
				radialBar: {
					startAngle: -90,
					endAngle: 90,
					dataLabels: {
						show: false
					},
					hollow: {
						margin: 0,
						size: '50%'
					},
					track: {
						background: '#83B30C29',
						startAngle: -90,
						endAngle: 90,
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
					fontFamily: fontFamilyBody
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
					fontFamily: fontFamilyBody
				}
			},
			stroke: {
				lineCap: "round",
			},
			grid: {
				padding: {
					top: 50
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
