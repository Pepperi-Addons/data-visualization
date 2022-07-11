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
        this.data = {};
        this.canvas = element;
		this.title = configuration.Title || '';
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		let valueMsg = 'No data';
		let color = '#000000';
		
		if (this.data.DataSet && this.data.DataSet.length > 0) {
			// calculate the totals of the first query
			let series1 = this.data.DataQueries[0].Series[0];
			let total1 = this.data.DataSet[0][series1];
			
			// find the change
			if (this.data.BenchmarkSet && this.data.BenchmarkSet.length > 0) {
				// calculate the totals of the second query
				let series2 = this.data.BenchmarkQueries[0].Series[0];
				let total2 = this.data.BenchmarkSet[0][series2];
				let change = 0;
				if (total2 == 0) {
					if (total1 > 0) {
						change = -100;
					}
				} else {
					change = Math.trunc(100*((total2-total1)/total2)*10)/10;	
				}
				valueMsg = change.toString() + '%';
				if (change > 0) {
					valueMsg = '+' + valueMsg;
					color = '#83B30C';
				} else if (change < 0) {
					color = '#CC0000';
				}
			} else {
				// single query - show the value
				if (total1 >= 10 ** 3) {
					valueMsg = Math.trunc(total1).toLocaleString();
				} else {
					valueMsg = total1.toLocaleString();
				}
			}
		}
		
		// update the card
		this.canvas.innerHTML = 
		    `<div style="height: 11rem; padding: 2.5rem 2rem 1.25rem 2rem">
				<p style="text-align: center; padding: 0; margin: 0 0 0.25rem 0; height:1.25rem;font-size: 0.875rem;" class="color-dimmed font-family-body ellipsis">` + this.title + `</p>
				<p style="text-align: center; padding: 0; color: ` + color + `; font-size: 2.5rem; font-weight: 700; line-height: 1.2;" class="font-family-title ellipsis">` + valueMsg + `</p>				
			</div>`;
    }
}

// defines the dependencies required for the chart
export const deps = [];
