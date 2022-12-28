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
/*
this.data = [{
	"DataQueries":[{"Name":"Data1","Groups":["ActionDate"],"Series":["Series 1","Series 2"]},{"Name":"Data2","Groups":["ActionDate"],"Series":["Series 3"]}],
	"DataSet":[{"ActionDate":"Jan","Series 1":93,"Series 2":19,"Series 3":77},{"ActionDate":"Feb","Series 1":81,"Series 2":59,"Series 3":83},{"ActionDate":"Mar","Series 1":14,"Series 2":93,"Series 3":58},{"ActionDate":"Apr","Series 1":58,"Series 2":36,"Series 3":91},{"ActionDate":"May","Series 1":44,"Series 2":3,"Series 3":42},{"ActionDate":"Jun","Series 1":15,"Series 2":28,"Series 3":19}]
	},{
	"DataQueries":[{"Name":"Data1a","Groups":["ActionDate"],"Series":["Series 1a","Series 2a"]},{"Name":"Data2","Groups":["ActionDate"],"Series":["Series 3a"]}],
	"DataSet":[{"ActionDate":"Jan","Series 1a":93,"Series 2a":19,"Series 3a":77},{"ActionDate":"Feb","Series 1a":81,"Series 2a":59,"Series 3a":83},{"ActionDate":"Mar","Series 1a":14,"Series 2a":93,"Series 3a":58},{"ActionDate":"Apr","Series 1a":58,"Series 2a":36,"Series 3a":91}]
}];
*/	
        const groups = this.data.map((x) => x.DataQueries.map((data) => data.Groups).flat()).flat();
        const series = this.data.map((x) => x.DataQueries.map((data) => data.Series).flat()).flat();

        const uniqueGroups = groups.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const uniqueSeries = series.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

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

			// create merge data set
			var key = uniqueGroups[0];
			let arr1 = this.data[0].DataSet;
			let dataSet = [];
			for(let i=0; i<arr1.length; i++) {
				let line = {...arr1[i]};
				for (let j=1; j<this.data.length; j++) {
					let arrJ = this.data[j].DataSet;
					line = {...line,...(arrJ.find((itmInner) => itmInner[key] === line[key]))};
				}
				dataSet.push(line);
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
			
			// create merge data set
			let dataSet = this.data.map((x) => x.DataSet).flat();
			
			// add json data to the table as rows.
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
