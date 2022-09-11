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
        let configurationToFix = body.Object;
        const importedChart = await this.papiClient.get(`/charts?where=Key=${configurationToFix.chart}`);
        configurationToFix.chartCache = importedChart.ScriptURI;
        return configurationToFix;
    }

    async fixImportedScorecardsData(body) {
        let configurationToFix = body.Object;
        for(let cardIndex in configurationToFix.cards ) {
            const importedChart = await this.papiClient.get(`/charts?where=Key=${configurationToFix.cards[cardIndex].chart}`);
            configurationToFix.cards[cardIndex].chartCache = importedChart.ScriptURI;
        }
        return configurationToFix;
    }
}

export default MyService;