import { AddonDataScheme, Relation } from '@pepperi-addons/papi-sdk'
import {Chart} from './models/chart'
import config from '../addon.config.json';

export const charts: Chart[] = [
    {
        Name: "Line",
        Description: "Default line",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Column",
        Description: "Default column",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Pie",
        Description: "Default pie",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Bar",
        Description: "Default bar",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Stacked column",
        Description: "Default stacked column",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Stacked bar",
        Description: "Default stacked bar",
        ScriptURI: '',
        Type: 'Chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark bar",
        Description: "Default benchmark bar with markers",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark column",
        Description: "Default benchmark column with markers",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark column line",
        Description: "Default benchmark column and line",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark column percentage",
        Description: "Default benchmark column with percentage values",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark bar percentage",
        Description: "Default benchmark bar with percentage values",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Value with area",
        Description: "Default value with area",
        ScriptURI: '',
        Type: 'Series scorecard',
        Hidden: false,
        System: true
    },
    {
        Name: "Value with columns",
        Description: "Default value with columns",
        ScriptURI: '',
        Type: 'Series scorecard',
        Hidden: false,
        System: true
    },
    {
        Name: "Progress bar",
        Description: "Default progress bar",
        ScriptURI: '',
        Type: 'Value scorecard',
        Hidden: false,
        System: true
    },
    {
        Name: "Value",
        Description: "Default value",
        ScriptURI: '',
        Type: 'Value scorecard',
        Hidden: false,
        System: true
    },
    {
        Name: "Value and change",
        Description: "Default value and change",
        ScriptURI: '',
        Type: 'Value scorecard',
        Hidden: false,
        System: true
    },
    {
        Name: "Table",
        Description: "Default table",
        ScriptURI: '',
        Type: 'Table chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Benchmark two axis",
        Description: "Default benchmark column and line with two axis",
        ScriptURI: '',
        Type: 'Benchmark chart',
        Hidden: false,
        System: true
    },
    {
        Name: "Value with progress bar",
        Description: "Default value with progress bar",
        ScriptURI: '',
        Type: 'Value scorecard',
        Hidden: false,
        System: true
    },
]

export const chartBlockScheme: AddonDataScheme = {
    Name: "Chart",
    Type: 'data',
    Fields: {
        query: {
            Type: "Resource",
            Resource: "DataQueries",
            AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
        }
    },
}

export const benchmarkChartBlockScheme: AddonDataScheme = {
    Name: "BenchmarkChart",
    Type: 'data',
    Fields: {
        query: {
            Type: "Resource",
            Resource: "DataQueries",
            AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
        },
        secondQuery: {
            Type: "Resource",
            Resource: "DataQueries",
            AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
        }
    },
}

export const tableBlockScheme: AddonDataScheme = {
    Name: "Table",
    Type: 'data',
    Fields: {
        query: {
            Type: "Resource",
            Resource: "DataQueries",
            AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
        }
    },
}

export const scorecardsBlockScheme: AddonDataScheme = {
    Name: "Scorecards",
    Type: 'data',
    Fields: {
        cards: {
            Type: "Array",
            Items: {
                Type: "Object",
                Fields: {
                    query: {
                        Type: "Resource",
                        Resource: "DataQueries",
                        AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
                    },
                    secondQuery: {
                        Type: "Resource",
                        Resource: "DataQueries",
                        AddonUUID: "c7544a9d-7908-40f9-9814-78dc9c03ae77"
                    }
                }
            }
        }
    },
}

export const DimxChartImportRelation: Relation = {
    AddonUUID: config.AddonUUID,
    Name: 'Chart',
    RelationName: 'DataImportResource',
    Type: 'AddonAPI',
    Description: 'relation for importing chart blocks',
    FixRelativeURL: '/api/fix_imported_data',
    AddonRelativeURL: ''
}

export const DimxBenchmarkChartImportRelation: Relation = {
    AddonUUID: config.AddonUUID,
    Name: 'BenchmarkChart',
    RelationName: 'DataImportResource',
    Type: 'AddonAPI',
    Description: 'relation for importing benchmark chart blocks',
    FixRelativeURL: '/api/fix_imported_data',
    AddonRelativeURL: ''
}

export const DimxScorecardsImportRelation: Relation = {
    AddonUUID: config.AddonUUID,
    Name: 'Scorecards',
    RelationName: 'DataImportResource',
    Type: 'AddonAPI',
    Description: 'relation for importing scorecards blocks',
    FixRelativeURL: '/api/fix_imported_scorecards_data',
    AddonRelativeURL: ''
}

