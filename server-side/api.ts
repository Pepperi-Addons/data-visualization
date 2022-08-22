import { Client, Request } from '@pepperi-addons/debug-server'
import MyService from './my.service';

export function fix_imported_data(client: Client, request: Request) {
    const service = new MyService(client)
    if (request.method == 'POST') {
        return service.fixImportedData(request.body);
    }
    else if (request.method == 'GET') {
        throw new Error(`Method ${request.method} not supported`);
    }
}

