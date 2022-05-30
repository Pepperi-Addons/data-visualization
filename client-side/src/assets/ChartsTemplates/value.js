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
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
		let title = 'No data';
		let valueMsg = '';
		let color = '#000000';
		
		if (this.data.DataSet && this.data.DataSet.length > 0) {
			// set the card title
			title = this.data.DataQueries[0].Name;
			
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
					color = '#00FF00';
				} else if (change < 0) {
					color = '#FF0000';
				}
			} else {
				// single query - show the value
				if (total1 >= 10 ** 3) {
					valueMsg = Math.trunc(total1).toString();
				} else {
					valueMsg = total1.toString();
				}
			}
		}
		
		// update the card
		this.canvas.innerHTML = 
		    `<div style="height: 100%;">
				<p style="text-align: center; margin: 10px 0px" class="color-dimmed title-sm ellipsis">` + title + `</p>
				<p style="text-align: center; margin: 10px 0px; color: ` + color + `" class="bold title-xl ellipsis">` + valueMsg + `</p>
			</div>`;
    }
}

// defines the dependencies required for the chart
export const deps = [];
