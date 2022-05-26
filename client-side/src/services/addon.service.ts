import jwt from 'jwt-decode';
import { PapiClient } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';
import { PepDataConvertorService, PepHttpService, PepSessionService } from '@pepperi-addons/ngx-lib';


@Injectable({ providedIn: 'root' })
export class AddonService {

    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;
    queries: [] = [];
    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.session.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging: true
        })
    }

    constructor(
        public session: PepSessionService,
        public pepperiDataConverter: PepDataConvertorService,
        private pepHttp: PepHttpService) {
            const accessToken = this.session.getIdpToken();
            this.parsedToken = jwt(accessToken);
            this.papiBaseURL = this.parsedToken["pepperi.baseurl"]
    }
    ngOnInit() {
    }

    async get(endpoint: string): Promise<any> {
        return await this.papiClient.get(endpoint);
    }

    async post(endpoint: string, body: any): Promise<any> {
        return await this.papiClient.post(endpoint, body);
    }

    async executeQuery(queryID) {
        //return this.papiClient.post(`/data_queries/${queryID}/execute`, null)
        if(!queryID) return undefined
        return this.papiClient.addons.api.uuid("c7544a9d-7908-40f9-9814-78dc9c03ae77").file('elastic').func('execute').post({key: queryID},{})

    }

    async getDataQueryByKey(Key: string) {
        //return this.papiClient.get(`/data_queries?where=Key='${Key}'`);
        return this.papiClient.addons.api.uuid("c7544a9d-7908-40f9-9814-78dc9c03ae77").file('api').func('queries').get({where: `Key='${Key}'`})

    }

    async getAllQueries(){
        //return this.papiClient.get(`/data_queries`);
        return this.papiClient.addons.api.uuid("c7544a9d-7908-40f9-9814-78dc9c03ae77").file('api').func('queries').get()
    }

    async upsertDataQuery(body) {
        return this.papiClient.post(`/data_queries`, body);
    }

    async getCharts() {
        return this.papiClient.get(`/charts`);
    }

    async getChartsByType(chartType) {
        return this.papiClient.get(`/charts?where=Type='${chartType}'`);
    }
}
