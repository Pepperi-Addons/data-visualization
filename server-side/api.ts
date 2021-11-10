import QueryService from './services/query.service'
import { Client, Request } from '@pepperi-addons/debug-server'

export async function queries(client: Client, request: Request) {
    const service = new QueryService(client)
    if (request.method == 'POST') {
        return await service.upsert(client, request);
    }
    else if (request.method == 'GET') {
        return await service.find(request.query);
    }
};



