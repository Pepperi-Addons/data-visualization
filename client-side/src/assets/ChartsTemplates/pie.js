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
		
		// add a resize observer, to change the chart width upon hiding parent div
		const ro = new ResizeObserver(entries => {
			// set the height to a fixed size upon div invisibility(otherwise there is an error) and to 100% upon visibility
			this.chart.updateOptions({
				chart: {
					width: entries[0].contentRect.width==0 ? '300' : '100%'
				}
			});
		});
		ro.observe(canvas);
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
        
        const uniqueGroups = this.data.DataQueries.map((data) => data.Groups).flat().filter((elem,index,self) => self.indexOf(elem) === index);
        const uniqueSeries = this.data.DataQueries.map((data) => data.Series).flat().filter((elem,index,self) => self.indexOf(elem) === index);
        const dataSet = this.data.DataSet;
		const numberFormatter = this.data.NumberFormatter ? this.data.NumberFormatter : {};
		const compactNumberFormatter = { ...numberFormatter,'notation':'compact'};
		
        // for pie - using the first data record
        const ser = uniqueSeries.map(seriesName => dataSet[0][seriesName] || 0);

		let optionsToSet = {
			labels: uniqueSeries,		// set the labels
			tooltip: {
				y: {
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {		// sets the formatter
						return (value == null) ? '' : value.toLocaleString(undefined, numberFormatter);
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
                type: 'pie',
				height: height,
				width: '100%',
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily
            },
			colors: seriesColors,
            legend: {
                position: 'bottom',
                horizontalAlign: 'left',
                onItemClick: {
                    toggleDataSeries: true
                }
            },
            dataLabels: {
				style: {
                    colors: dataLabelsColors
                },
				dropShadow: {
					enabled: false
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
