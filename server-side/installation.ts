
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { charts } from './meta-data';
import { PapiClient, Relation } from '@pepperi-addons/papi-sdk'
import { DATA_QUREIES_TABLE_NAME } from './models';
import MyService from './my.service';
import { v4 as uuid } from 'uuid';

export async function install(client: Client, request: Request): Promise<any> {
    const papiClient = new PapiClient({
        baseURL: client.BaseURL,
        token: client.OAuthAccessToken,
        addonUUID: client.AddonUUID,
        addonSecretKey: client.AddonSecretKey
    });

    await papiClient.addons.data.schemes.post({
        Name: DATA_QUREIES_TABLE_NAME,
        Type: 'data',
        Fields: {
            Resource: { Type: 'String' },
            Type:{Type: 'String'},    
        }
    });

    const res = await setPageBlockRelations(client);

    const res2 = await setUsageMonitorRelation(client);

    const res3 = await upsertCharts(client,request, new MyService(client), charts);

    let resultObject = {
        pageBlockRelation:res,
        usageMonitorRelation:res2,
        upsertCharts:res3
    };

    let status = res.success && res2.success && res3.success

    return {success:status,resultObject:resultObject}
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    try{
        const service = new MyService(client)
        var defCharts = await service.getCharts(charts.map(x => x.Name))
        for(var dc of defCharts){
            dc["Hidden"] = true;
            await service.upsertChart(dc);
        }
        return { success: true, resultObject: {} }
    }
    catch(err){
        console.log('Failed to uninstall DV addon', err);
        return handleException(err);

    }
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    const res = await setPageBlockRelations(client);
    const res2 = await setUsageMonitorRelation(client);

    // If there is any change run migration code here
    return res2;
    
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

async function setPageBlockRelations(client){
    try {
        let blockName = 'Chart';

        const pageComponentRelation: Relation = {
            RelationName: "PageBlock",
            Name: blockName, 
            Description: `Chart`, 
            Type: "NgComponent",
            SubType: "NG14",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'chart', 
            ComponentName: `${blockName}Component`, 
            ModuleName: `${blockName}Module`, 
            EditorComponentName: `${blockName}EditorComponent`, 
            EditorModuleName: `${blockName}EditorModule`
        };
        blockName = 'Scorecards';
     
        const scorecardsComponentRelation: Relation = {
            RelationName: "PageBlock",
            Name: blockName,
            Description: `Scorecards`, 
            Type: "NgComponent",
            SubType: "NG14",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'scorecards', 
            ComponentName: `${blockName}Component`, 
            ModuleName: `${blockName}Module`, 
            EditorComponentName: `${blockName}EditorComponent`, 
            EditorModuleName: `${blockName}EditorModule`
        };

        blockName = 'Table';
     
        const tableComponentRelation: Relation = {
            RelationName: "PageBlock",
            Name: blockName, 
            Description: `Table`,
            Type: "NgComponent",
            SubType: "NG14",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'table', 
            ComponentName: `${blockName}Component`, 
            ModuleName: `${blockName}Module`, 
            EditorComponentName: `${blockName}EditorComponent`, 
            EditorModuleName: `${blockName}EditorModule`
        };

        blockName = 'BenchmarkChart';
     
        const benchmarkChartComponentRelation: Relation = {
            RelationName: "PageBlock",
            Name: blockName, 
            Description: `BenchmarkChart`,
            Type: "NgComponent",
            SubType: "NG14",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'benchmark_chart', 
            ComponentName: `${blockName}Component`, 
            ModuleName: `${blockName}Module`, 
            EditorComponentName: `${blockName}EditorComponent`, 
            EditorModuleName: `${blockName}EditorModule`
        };


        const service = new MyService(client);
        await service.upsertRelation(pageComponentRelation);
        await service.upsertRelation(scorecardsComponentRelation);
        await service.upsertRelation(tableComponentRelation);
        await service.upsertRelation(benchmarkChartComponentRelation);

        return { success:true, resultObject: null };
    } catch(err) {
        return { success: false, resultObject: err };
    }
}


async function setUsageMonitorRelation(client){
    try {

        const usageMonitorRelation: Relation = {
            RelationName: "UsageMonitor",
            Name: "", 
            Description: `Data index and queries usage data`, 
            Type: "AddonAPI",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'monitor/usage_data'
        };
       
        const service = new MyService(client);
       var res =  await service.upsertRelation(usageMonitorRelation);

        return { success:true, resultObject: null };
    } catch(err) {
        return { success: false, resultObject: err };
    }
}

async function upsertCharts(client: Client, request: Request, service: MyService, charts) {
    try {
        for (let chart of charts) {
            chart.Key = uuid();
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
        console.log('Failed to upsert charts templates files',err)
        throw new Error('Failed to upsert charts templates files');

    }
}

function handleException(err) {
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