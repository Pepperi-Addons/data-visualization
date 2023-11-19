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

    async executeQuery(queryID, body = {}) {
        if(!queryID || queryID=='None') return undefined;
		this.setTimeZoneOffsetOnBody(body);
        return this.papiClient.post(`/data_queries/${queryID}/execute`, body);

    }

    async getDataQueryByKey(Key: string) {
        return this.papiClient.get(`/data_queries?where=Key='${Key}'`);
    }

    async getAllQueries(){
        return this.papiClient.get(`/data_queries?fields=Key,Name&page_size=-1`);
    }

    async getCharts() {
        return this.papiClient.get(`/charts`);
    }

    async getChartsByType(chartType) {
        return this.papiClient.get(`/charts?where=Type='${chartType}'`);
    }

    async fillChartsOptions(chartsOptions, type) {
        const charts = await this.getChartsByType(type)
        const sortedCharts = charts.sort((a, b) => (a.Name > b.Name) ? 1 : ((b.Name > a.Name) ? -1 : 0));
        sortedCharts.forEach(chart => {
            chartsOptions.push({ key: chart.Key, value: chart.Name });
        });
        return sortedCharts;
    }

    variableDatasEqual(varDatas1, varDatas2) {
        for (const varName in varDatas1) {
            if(!varDatas2[varName].value) return true
            if (varDatas1[varName].value == varDatas2[varName].value) continue;
            return false;
        }
        return true;
    }

	setTimeZoneOffsetOnBody(body) {
		body["TimeZoneOffset"] = (new Date().getTimezoneOffset()) * (-1); // offset in minutes
	}
}
