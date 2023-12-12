import { PapiClient, Relation } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { Chart } from './models/chart';

class MyService {

    papiClient: PapiClient
    addonUUID = '';

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

    async upsertRelation(relation: Relation): Promise<Relation> {
        return this.papiClient.addons.data.relations.upsert(relation);
    }

    async upsertChart(chart: Chart): Promise<Chart> {
        return this.papiClient.post('/charts', chart);
    }

    async getCharts(chartsNames: string[]): Promise<Chart[]> {
        let namesString = "";
        for (const name of chartsNames) {
            namesString += `"${name}",`;
        }
        namesString = namesString.slice(0, -1); // removing the last comma
        namesString = `(${namesString})`;
        return this.papiClient.get(`/charts?where=Name in ${namesString}`);
    }

    async getGaugeChart(): Promise<Chart[]> {
        return this.papiClient.get(`/charts?where=Name=Gauge`);
    }

    async fixImportedData(body: any): Promise<any> {
        console.log(`@@@@ charts fix:${ JSON.stringify(body.Object) }@@@@`)
        const configurationToFix = body.Object;
        const existingCharts = await this.papiClient.get(`/charts?where=Key='${configurationToFix.chart}'`);
        console.log(`@@@@${ JSON.stringify(existingCharts) }@@@@`)
        configurationToFix.chartCache = existingCharts.length > 0 ? existingCharts[0].ScriptURI : '';
        return configurationToFix;
    }

    async fixImportedScorecardsData(body: any): Promise<any> {
        console.log(`@@@@ scorecard charts fix:${ JSON.stringify(body.Object) }@@@@`)
        const configurationToFix = body.Object;
        for (const cardIndex in configurationToFix.cards) {
            const existingCharts = await this.papiClient.get(`/charts?where=Key='${configurationToFix.cards[cardIndex].chart}'`);
            console.log(`@@@@ scorecards existingCharts: ${ JSON.stringify(existingCharts) }@@@@`)
            configurationToFix.cards[cardIndex].chartCache = existingCharts.length > 0 ? existingCharts[0].ScriptURI : '';
        }
        return configurationToFix;
    }

	buildPageBlockRelation(blockName: string, nameForURL?: string): Relation {

		if (!nameForURL) {
			nameForURL = blockName.toLowerCase();
		}

		return {
            RelationName: "PageBlock",
            Name: blockName,
            Description: blockName,
            Type: "NgComponent",
            SubType: "NG14",
            AddonUUID: this.addonUUID,
            AddonRelativeURL: nameForURL,
            ComponentName: `${blockName}Component`,
            ModuleName: `${blockName}Module`,
            EditorComponentName: `${blockName}EditorComponent`,
            EditorModuleName: `${blockName}EditorModule`,
            ElementsModule: 'WebComponents',
            ElementName: `${nameForURL.replace('_', '-')}-element-${this.addonUUID}`,
            EditorElementName: `${nameForURL.replace('_', '-')}-editor-element-${this.addonUUID}`,
        };
	}
}

export default MyService;
