
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { benchmarkChartBlockScheme, chartBlockScheme, charts, DimxBenchmarkChartImportRelation, DimxChartImportRelation, DimxScorecardsImportRelation, scorecardsBlockScheme, tableBlockScheme } from './meta-data';
import { Relation } from '@pepperi-addons/papi-sdk'
import MyService from './my.service';
import semver from 'semver';
import { AsyncResultObject } from './models/result-object';

export async function install(client: Client, request: Request): Promise<AsyncResultObject> {

    const service = new MyService(client)

    const res = await set_page_block_and_dimx_relations(service);

    const res2 = await set_usage_monitor_relation(service);

    const res3 = await upsert_charts(client, request, service);

    const res4 = await create_block_schemes(service);

    const resultObject = {
        pageBlockRelation: res,
        usageMonitorRelation: res2,
        upsertCharts: res3,
		createBlockSchemes: res4
    };

    const status = res.success && res2.success && res3.success && res4.success;

    return {success: status, resultObject: resultObject}
}

export async function uninstall(client: Client, request: Request): Promise<AsyncResultObject> {
    try {
        const service = new MyService(client)
        const defCharts = await service.getCharts(charts.map(x => x.Name))
        for (const dc of defCharts){
            dc["Hidden"] = true;
            await service.upsertChart(dc);
        }
        return { success: true, resultObject: {} }
    }
    catch (err){
        console.log('Failed to uninstall DV addon', err);
        return handle_exception(err);

    }
}

export async function upgrade(client: Client, request: Request): Promise<AsyncResultObject> {
    if (request.body.FromVersion && semver.compare(request.body.FromVersion, '0.6.139') < 0)
	{
		throw new Error('Upgarding from versions earlier than 0.6.139 is not supported. Please uninstall the addon and install it again.');
	}
    const service = new MyService(client)
    const res = await set_page_block_and_dimx_relations(service);
    const res2 = await set_usage_monitor_relation(service);
    const res3 = await create_block_schemes(service);
    const res4 = await upsert_charts(client, request, service);

    // remove gauge chart if exists
    const gaugeChart = await service.getGaugeChart();
    if (gaugeChart.length > 0) {
        gaugeChart[0]["Hidden"] = true;
        await service.upsertChart(gaugeChart[0]);
    }

    const status = res.success && res2.success && res3.success && res4.success;
    const resultObject = {
        pageBlockRelation: res,
        usageMonitorRelation: res2,
        blockSchemes: res3,
        upsertCharts: res4
    };
	return { success: status, resultObject: resultObject }

}

export async function downgrade(client: Client, request: Request): Promise<AsyncResultObject> {
    return {success: true, resultObject: {}}
}

async function set_page_block_and_dimx_relations(service: MyService): Promise<AsyncResultObject> {
    try {

        const chartComponentRelation: Relation = service.buildPageBlockRelation('Chart');

        const scorecardsComponentRelation: Relation = service.buildPageBlockRelation('Scorecards');

        const tableComponentRelation: Relation = service.buildPageBlockRelation('Table');

        const benchmarkChartComponentRelation: Relation = service.buildPageBlockRelation('BenchmarkChart', 'benchmark_chart');

        await service.upsertRelation(chartComponentRelation);
        await service.upsertRelation(scorecardsComponentRelation);
        await service.upsertRelation(tableComponentRelation);
        await service.upsertRelation(benchmarkChartComponentRelation);
        await service.upsertRelation(DimxChartImportRelation);
        await service.upsertRelation(DimxBenchmarkChartImportRelation);
        await service.upsertRelation(DimxScorecardsImportRelation);


        return { success: true, resultObject: null };
    } catch (err) {
        return { success: false, resultObject: err };
    }
}


async function set_usage_monitor_relation(service: MyService): Promise<AsyncResultObject> {
    try {

        const usageMonitorRelation: Relation = {
            RelationName: "UsageMonitor",
            Name: "",
            Description: `Data index and queries usage data`,
            Type: "AddonAPI",
            AddonUUID: service.addonUUID,
            AddonRelativeURL: 'monitor/usage_data'
        };

       const res = await service.upsertRelation(usageMonitorRelation);

        return { success: true, resultObject: null };
    } catch (err) {
        return { success: false, resultObject: err };
    }
}

async function upsert_charts(client: Client, request: Request, service: MyService): Promise<AsyncResultObject> {
    try {
        for (const chart of charts) {
            chart.ScriptURI = `${client.AssetsBaseUrl}/assets/ChartsTemplates/${chart.Name.toLowerCase()}.js`
            console.log(`chart ScriptURI: ${chart.ScriptURI}`)
            await service.upsertChart(chart);

        }
        return {
            success: true,
            errorMessage: ""
        }
    }
    catch (err) {
        console.log('Failed to upsert charts templates files', err)
        throw new Error('Failed to upsert charts templates files');

    }
}

function handle_exception(err): AsyncResultObject {
    let errorMessage = 'Unknown Error Occured';
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    return {
        success: false,
        errorMessage: errorMessage,
        resultObject: {}
    };
}

async function create_block_schemes(service: MyService): Promise<AsyncResultObject> {
    try {
        await service.papiClient.addons.data.schemes.post(chartBlockScheme);
        await service.papiClient.addons.data.schemes.post(benchmarkChartBlockScheme);
        await service.papiClient.addons.data.schemes.post(tableBlockScheme);
        await service.papiClient.addons.data.schemes.post(scorecardsBlockScheme);
        return { success: true, resultObject: null };
    } catch (err) {
        return { success: false, resultObject: err };
    }
}
