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
        this.data = {};
        element.innerHTML = this.getHTML(configuration.Title || '');
        this.canvas = element;
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		// if there is no benchmark data, then create empty object
		if (!this.data.Benchmark)
			this.data.Benchmark = {}
		if (!this.data.Benchmark.DataQueries || this.data.Benchmark.DataQueries.length==0) {
			this.data.Benchmark.DataQueries = [{
				Name: '',
				Groups: [],
				Series: []
			}]
		}
		
		const dataSet = this.data.DataSet;
		const benchmarkSet = this.data.Benchmark.DataSet || [];
		const numberFormatter = this.data.NumberFormatter ? this.data.NumberFormatter : {};
		const compactNumberFormatter = {'notation':'compact', ...numberFormatter};
		const positiveColor = '#83B30C';
		const negativeColor = '#CC0000';
		
		let valueMsg = '0';
		let valueTooltipMsg = '';
		let color = '#000000';
		
		if (this.data.DataQueries && this.data.DataQueries[0].Series[0]) {
			// calculate the totals of the first query
			let series1 = this.data.DataQueries[0].Series[0];
			let total1 = this.data.DataSet[0][series1];	// curr value
			valueTooltipMsg = series1 + ": "+ (Math.trunc(total1*100)/100).toLocaleString(undefined, numberFormatter);
			
			// find the change
			let change = 0;
			if (this.data.Benchmark.DataQueries && this.data.Benchmark.DataQueries[0].Series[0]) {
				// calculate the totals of the second query
				let series2 = this.data.Benchmark.DataQueries[0].Series[0];
				let total2 = 0;
				if (benchmarkSet[0] && benchmarkSet[0][series2]) {
					total2 = benchmarkSet[0][series2];
					valueTooltipMsg = valueTooltipMsg + "&#013;&#010;" + series2 + ": " + (Math.trunc(total2*100)/100).toLocaleString(undefined, numberFormatter);
				}
				change = Math.trunc(100*(total1-total2))/100;
			} else {
				// single query - show the value
				change = (Math.trunc(total1*100)/100);
			}	
			valueMsg = change.toString();
			if (change > 0) {
				valueMsg = '+' + valueMsg;
				color = '#83B30C';
			} else if (change < 0) {
				color = '#CC0000';
			}
		}

		// update the card
		const card = this.canvas.querySelector('#canvas');
		card.innerHTML = `
				<p title="` + valueTooltipMsg + `" style="text-align: center; padding: 0; color: ` + color + `; font-size: 2.5rem; font-weight: 700; line-height: 1.2;" class="font-family-title ellipsis">` + valueMsg + `</p>
			`;
    }
	
	/**
     * This function returns an html which will be created in the embedder.
     */
    getHTML(title) {
        return `<div style="height: 11rem; padding: 1.25rem 1.25rem 1.25rem 1.25rem">
				<p style="text-align: center; padding: 0; margin: 0 0 0.25rem 0; height:1.25rem;font-size: 0.875rem;" class="color-dimmed font-family-body ellipsis">` + title + `</p>
				<div id="canvas">
				<p style="text-align: center; font-size: 0.875rem; font-weight: 400; padding:3rem" class="font-family-body ellipsis">Loading...</p>
				</div>
				</div>`;
    }
}

// defines the dependencies required for the chart
export const deps = [];
