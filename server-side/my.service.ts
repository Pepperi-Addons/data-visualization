import { PapiClient, InstalledAddon } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';

class MyService {

    papiClient: PapiClient
    addonUUID: string = '';

    constructor(private client: Client) {
        this.addonUUID = client.AddonUUID
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    upsertRelation(relation): Promise<any> {
        return this.papiClient.addons.data.relations.upsert(relation);
    }

    upsertChart(chart) {
        return this.papiClient.post('/charts', chart);
    }

    getCharts(chartsNames) {
        var namesString = "("
        for(var name of chartsNames) {
            namesString+= `"`+name+`",`;
        }
        namesString = namesString.substring(0,namesString.length-1)
        namesString+= ")"
        return this.papiClient.get(`/charts?where=Name in ${namesString}`)
    }

    async fixImportedData(body) {
        console.log("@@@@ charts fix:" + JSON.stringify(body.Object) + "@@@@")
        let configurationToFix = body.Object;
        const existingCharts = await this.papiClient.get(`/charts?where=Key='${configurationToFix.chart}'`);
        console.log("@@@@" + JSON.stringify(existingCharts) + "@@@@")
        configurationToFix.chartCache = existingCharts.length > 0 ? existingCharts[0].ScriptURI : '';
        return configurationToFix;
    }

    async fixImportedScorecardsData(body) {
        console.log("@@@@ scorecard charts fix:" + JSON.stringify(body.Object) + "@@@@")
        let configurationToFix = body.Object;
        for(let cardIndex in configurationToFix.cards) {
            const existingCharts = await this.papiClient.get(`/charts?where=Key='${configurationToFix.cards[cardIndex].chart}'`);
            console.log("@@@@ scorecards existingCharts: " + JSON.stringify(existingCharts) + "@@@@")
            configurationToFix.cards[cardIndex].chartCache = existingCharts.length > 0 ? existingCharts[0].ScriptURI : '';
        }
        return configurationToFix;
    }
}

export default MyService;