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
        this.canvas = element;
    }

    /**
     * This function must be implemented by the chart
     * the embedder calls this function when there are changes to the chart data
     */
    update() {
        const groups = this.data.DataQueries.map((data) => data.Groups).flat();
        const series = this.data.DataQueries.map((data) => data.Series).flat();

        const uniqueGroups = groups.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const uniqueSeries = series.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const dataSet = this.data.DataSet;

        // Create a table.
		const table = document.createElement("table");
		
		const fontFamily = getComputedStyle(this.canvas).fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
		table.setAttribute('style', 'font-family:'+fontFamily+'; font-size:14px; width:100%; border:solid 1px #ddd; margin:10px 0px');
		
        // the data has multiple group by DataSet -> show them as rows
        if (uniqueGroups.length > 0) {
			
			let col = uniqueGroups.concat(uniqueSeries);
			// Create table header row using the extracted headers above.
			let tr = table.insertRow(-1);                   // table row.
			for (let i = 0; i < col.length; i++) {
				let th = document.createElement("th");      // table header.
				th.setAttribute('style', 'padding:4px 6px; border:solid 1px #ddd; background-color: #E0E0E0;');
				th.innerHTML = col[i];
				tr.appendChild(th);
			}

			// add json data to the table as rows.
			for (let i = 0; i < dataSet.length; i++) {
				tr = table.insertRow(-1);
				for (let j = 0; j < col.length; j++) {
					let tabCell = tr.insertCell(-1);
					tabCell.setAttribute('style', 'padding:4px 6px; border:solid 1px #ddd');
					let val = dataSet[i][col[j]] || 0;
					if (val >= 10 ** 6) {
						val = Math.trunc(val / 100000)/10 + ' M';
					} else if (val >= 10 ** 3) {
						val = Math.trunc(val / 100)/10 + ' K';
					} else if (val >= 1) {
						val = Math.trunc(val*10)/10;
					}
					tabCell.innerHTML = val;
				}
			}
		
        } else {
            // the data has no group by -> show the Series as rows
			for (let i = 0; i < uniqueSeries.length; i++) {
				let tr = table.insertRow(-1);
				let tabCell = tr.insertCell(-1);
				tabCell.setAttribute('style', 'padding:4px 6px; border:solid 1px #ddd');
				tabCell.innerHTML = uniqueSeries[i];
				tabCell = tr.insertCell(-1);
				tabCell.setAttribute('style', 'padding:4px 6px; border:solid 1px #ddd');
				let val = dataSet[0][uniqueSeries[i]];
				if (val >= 10 ** 6) {
					val = Math.trunc(val / 100000)/10 + ' M';
				} else if (val >= 10 ** 3) {
					val = Math.trunc(val / 100)/10 + ' K';
				} else if (val >= 1) {
					val = Math.trunc(val*10)/10;
				}
				tabCell.innerHTML = val;
			}
        }
		
		// add the table to the div
		this.canvas.innerHTML = "";
		this.canvas.appendChild(table);
	}
}

// defines the dependencies required for the chart
export const deps = [];
