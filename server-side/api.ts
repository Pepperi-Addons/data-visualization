import { Client, Request } from '@pepperi-addons/debug-server'
import QueryService from './services/query.service'
import ClientService from './services/client.service';

export async function queries(client: Client, request: Request) {
    const service = new QueryService(client)
    if (request.method == 'POST') {
        return await service.upsert(client, request);
    }
    else if (request.method == 'GET') {
        return await service.find(request.query);
    }
};

export async function ui_data(client: Client, request: Request) {
    const service = new ClientService(client)
    if (request.method == 'GET') {
        return await service.getUIData(request.query);
    }
    else{
        throw new Error('Bad request');
    }
} 



