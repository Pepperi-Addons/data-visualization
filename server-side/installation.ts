
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { PapiClient, Relation } from '@pepperi-addons/papi-sdk'
import { DATA_QUREIES_TABLE_NAME } from './models';
import MyService from './my.service';

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
    const res = await runMigration(client);
    return res;
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    // If there is any change run migration code here
    // const res = await runMigration(client);
    // return {success:true,resultObject:{res}}
    
    return {success:true,resultObject:{}}
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return {success:true,resultObject:{}}
}

async function runMigration(client){
    try {
        const blockName = 'DataVisualization';

        const pageComponentRelation: Relation = {
            RelationName: "PageBlock",
            Name: blockName, // TODO: change to block name
            Description: `${blockName} block`, // TODO: change to block description
            Type: "NgComponent",
            SubType: "NG11",
            AddonUUID: client.AddonUUID,
            AddonRelativeURL: 'data_visualization', 
            ComponentName: `${blockName}Component`, 
            ModuleName: `${blockName}Module`, // TODO: Change to block module name
            EditorComponentName: `${blockName}EditorComponent`, // TODO: Change to block editor component name
            EditorModuleName: `${blockName}EditorModule` // TODO: Change to block editor module name
        };

        const service = new MyService(client);
        const result = await service.upsertRelation(pageComponentRelation);
        return { success:true, resultObject: result };
    } catch(err) {
        return { success: false, resultObject: err };
    }
}