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
		this.configuration = configuration;
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
		
		// define the styles
		const style = getComputedStyle(this.canvas);
		const colorWeakh = style.getPropertyValue('--pep-color-weak-h') || "0";
		const colorWeaks = style.getPropertyValue('--pep-color-weak-s') || "0%";
		const colorPrimaryh = style.getPropertyValue('--pep-color-system-primary-h') || "0";
		const colorPrimarys = style.getPropertyValue('--pep-color-system-primary-s') || "0%";
		const colorPrimaryl = style.getPropertyValue('--pep-color-system-primary-l') || "10%";
		const fontFamily = style.fontFamily || '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
		const tableStyle = `font-family: ${fontFamily}; font-size:14px; width:100%; border:solid 1px #ddd; margin:10px 0px;  border-collapse: collapse;`;
		const headerStyle = `padding:0.5rem; border:solid 1px #ddd; font-weight: 600; background-color: hsl(${colorWeakh},${colorWeaks},88%); border-color: hsla(${colorPrimaryh},${colorPrimarys},${colorPrimaryl},0.24);`;
		const cellStyle = `padding:0.5rem; border:solid 1px; border-color: hsla(${colorPrimaryh},${colorPrimarys},${colorPrimaryl},.24)`;

		// check if the data is an array
		if (!Array.isArray(this.data)) {
			//if the data is a single object, use it.
			if (this.data !== null && typeof (this.data) === 'object') {
				this.data = [this.data];
			} else {
				this.data = [];
			}
		}
  
        const uniqueGroups = this.data.map((x) => x.DataQueries.map((data) => data.Groups).flat()).flat().filter((elem,index,self) => self.indexOf(elem) === index);
        const uniqueSeries = this.data.map((x) => x.DataQueries.map((data) => data.Series).flat()).flat().filter((elem,index,self) => self.indexOf(elem) === index);
		const hasMultipleRecords = uniqueGroups.length > 0;
		// map of the formatter per each series
		const seriesFormatter = {};
		this.data.forEach(obj => {
			const series = obj.DataQueries.map(query => query.Series).flat();
			series.forEach(s => {
				seriesFormatter[s] = obj.NumberFormatter || {};
			});
		});
	
		// build the value formatter for the series considering the query number formatter
		const valueFormatter = function (value, series) {
			const numberFormatter = seriesFormatter[series] ? seriesFormatter[series] : {};
			const compactNumberFormatter = {'notation':'compact', ...numberFormatter};
			return (isNaN(value)) ? value : (Math.trunc(value*100)/100).toLocaleString(undefined, numberFormatter);
		}
		
        // Create a table.
		const table = document.createElement("table");
		table.setAttribute('style', tableStyle);
		
        // the data has multiple group by DataSet -> show them as rows
        if (hasMultipleRecords) {
			
			let header = table.createTHead();
			let col = uniqueGroups.concat(uniqueSeries);
			// Create table header row using the extracted headers above.
			let row = header.insertRow(-1);
			for (let i = 0; i < col.length; i++) {
				let cell = row.insertCell(-1);
				cell.setAttribute('style', headerStyle);
				cell.innerHTML = col[i];
			}

			// create merge data set
			let dataSets = this.data.map((x) => x.DataSet).flat();
			let key = uniqueGroups[0];					
			let dataSet = [];
			dataSets.forEach(el => {
				if(!this[el[key]]) {
					this[el[key]] = {};
					dataSet.push(this[el[key]]);
				}
				this[el[key]] = Object.assign(this[el[key]], el);
			});

			// add json data to the table as rows.
			let body = table.createTBody();
			for (let i = 0; i < dataSet.length; i++) {
				row = body.insertRow(-1);
				for (let j = 0; j < col.length; j++) {
					let cell = row.insertCell(-1);
					cell.setAttribute('style', cellStyle);
					let val = dataSet[i][col[j]] || 0;
					cell.innerHTML = valueFormatter(val, col[j]);
				}
			}
		
        } else {
            // the data has no group by -> show the Series as rows
			
			// create merge data set
			let dataSets = this.data.map((x) => x.DataSet).flat();
			let dataSet = dataSets.reduce(function(acc, x) {
				for (let key in x) acc[key] = x[key];
					return acc;
			}, {});
			
			// add json data to the table as rows.
			for (let i = 0; i < uniqueSeries.length; i++) {
				let row = table.insertRow(-1);
				let cell = row.insertCell(-1);
				cell.setAttribute('style', cellStyle);
				cell.innerHTML = uniqueSeries[i];
				cell = row.insertCell(-1);
				cell.setAttribute('style', cellStyle);
				let val = dataSet[uniqueSeries[i]];
				cell.innerHTML = valueFormatter(val, uniqueSeries[i]);
			}
        }
		
		// add the table to the div
		this.canvas.innerHTML = "";
		this.canvas.appendChild(table);
	}
}

// defines the dependencies required for the chart
export const deps = [];
