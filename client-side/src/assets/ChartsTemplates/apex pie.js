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
        const groups = this.data.DataQueries.map((data) => data.Groups).flat();
        const series = this.data.DataQueries.map((data) => data.Series).flat();

        const uniqGroups = groups.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const uniqSeries = series.filter(function (elem, index, self) {
            return index === self.indexOf(elem);
        });

        const dataSet = this.data.DataSet;

        // for pie - using the first data record
        const ser = uniqSeries.map(seriesName => dataSet[0][seriesName] || 0);
        /*
        // the data has multiple group by DataSet -> show them in the y-axis
        if (uniqGroups.length > 0) {
        ser = uniqSeries.map(seriesName => {
        return {
        "name": seriesName,
        "data":	uniqGroups.map(groupName => {
        return [
        dataSet.map(ds => {
        return {"x":ds[groupName], "y":ds[seriesName] || 0}
        })
        ]
        }).flat(2)
        }
        });
        } else {
        // the data has no group by -> show the Series in the y-axis
        const flattened = uniqSeries.map(seriesName => dataSet[0][seriesName]);
        ser = [{"data":	flattened}];
        this.chart.updateOptions({labels: uniqSeries});
        // set the colors to be distributed
        this.chart.updateOptions({plotOptions: {bar:{ distributed: true}}});
        // hide the legend (since the series name is on the x axis)
        this.chart.updateOptions({legend:{show:false}});
        }
         */
		/*
		// hide the data labels if there are too many labels
		const showLabels = ser.length < 10
		this.chart.updateOptions({
			dataLabels: {
				enabled: showLabels
			}
		});
		*/
		
        // update the chart data
        this.chart.updateSeries(ser);
        this.chart.updateOptions({
            labels: uniqSeries
        });
		
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
                type: 'pie',
				height: "100%",
				width: "100%",
                toolbar: {
                    show: true
                },
				fontFamily: fontFamily
            },
			colors: colors,
            legend: {
                position: 'bottom',
                horizontalAlign: 'left',
                onItemClick: {
                    toggleDataSeries: true
                }
            },
            dataLabels: {
                style: {
                    //colors: ['#000000']
                },
				dropShadow: {
					enabled: false
				}
            },
			tooltip: {
				y: {
					formatter: function(value, { series, seriesIndex, dataPointIndex, w }) {
						let val = value;
						if (val >= 10 ** 3) {
							val = Math.trunc(val);
						} 
						return val.toLocaleString();
					}
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
