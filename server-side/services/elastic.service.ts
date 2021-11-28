import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client, Request } from '@pepperi-addons/debug-server';
import config from '../../addon.config.json'
import { AggregatedField, AggregatedParam, BreakBy, DataQuery, DataTypes, DATA_QUREIES_TABLE_NAME, GroupBy, Interval, Intervals, Serie } from '../models/data-query';
import { validate } from 'jsonschema';
import esb, { Aggregation, Query } from 'elastic-builder';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from 'jwt-decode';
import { DataQueryResponse } from '../models/data-query-response';
import { QueryExecutionScheme } from '../models/query-execution-scheme';
import { toApiQueryString, toKibanaQuery } from '@pepperi-addons/pepperi-filters';
class ElasticService {

  papiClient: PapiClient;

  constructor(private client: Client) {
    this.papiClient = new PapiClient({
      baseURL: client.BaseURL,
      token: client.OAuthAccessToken,
      addonUUID: client.AddonUUID,
      addonSecretKey: client.AddonSecretKey
    });
  }
  MaxAggregationSize = 100;

  //"None","Day", "Week", "Month", "Quarter", "Year"]
  intervalUnitFormat: { [key in Interval]: string } = {
    Day: 'dd',
    Week: 'MM-dd',
    Month: 'MM',
    Quarter: 'MM-yyyy',
    Year: 'yyyy',
    None: ''
  }

  async executeUserDefinedQuery(client: Client, request: Request) {

    const validation = validate(request.body, QueryExecutionScheme);

    if (!validation.valid) {
      throw new Error(validation.toString());
    }

    const query: DataQuery = await this.getUserDefinedQuery(request);
    const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    let endpoint = `${distributorUUID}/_search`;
    const method = 'POST';

    let elasticRequestBody = new esb.RequestBodySearch().size(0);

    // concat the dynamic filter with the type filter
    // const test: JSONFilter =
    // {
    //     Operation: 'AND',
    //     LeftNode: {
    //         ApiName: 'ElasticSearchType',
    //         FieldType: 'String',
    //         Operation: 'IsEqual',
    //         Values: [query.Resource],
    //     },
    //     RightNode: request.body.Filter,
    // }
    //console.log(JSON.stringify(toKibanaQuery(undefined).toJSON()));
    //toApiQueryString(undefined);
    //elasticRequestBody.query(toKibanaQuery(request.body.Filter));
    let aggregationsList: { [key: string]: Aggregation[] } = {};

    // handle aggregation by series
    for (const serie of query.Series) {
      let aggregations: Aggregation[] = [];

      // handle group by
      if (serie.GroupBy && serie.GroupBy) {
        serie.GroupBy.forEach(groupBy => {
          if (groupBy.FieldID) {
            aggregations.push(this.buildAggregationQuery(groupBy, aggregations));
          }
        });
      }
      // handle aggregation by break by
      if (serie.BreakBy && serie.BreakBy.FieldID) {
        aggregations.push(this.buildAggregationQuery(serie.BreakBy, aggregations));
      }
      else {
        aggregations.push(this.buildDummyBreakBy());

      }
      for (let i = 0; i < serie.AggregatedFields.length; i++) {
        const aggregatedField = serie.AggregatedFields[i];

        let agg;
        let lastIndex = serie.AggregatedFields.length - 1;
        const aggName = this.buildAggragationFieldString(aggregatedField);
        if (aggregatedField.Aggregator === 'Script' && aggregatedField.Script) {
          let bucketPath = {};
          let scriptAggs: Aggregation[] = [];
          serie.AggregatedParams?.forEach(aggregatedParam => {
            bucketPath[aggregatedParam.Name] = aggregatedParam.Name;
            scriptAggs.push(this.getAggregator(aggregatedParam, aggregatedParam.Name))
          });

          scriptAggs.push(esb.bucketScriptAggregation(aggName).bucketsPath(bucketPath).script(aggregatedField.Script));
          if (i === lastIndex && serie.Top && serie.Top?.Max) {
            const bucketSortAgg = this.buildBucketSortAggregation(aggName, serie);
            scriptAggs.push(bucketSortAgg);
          }

          aggregations[aggregations.length - 1].aggs(scriptAggs)

        }
        else if (aggregatedField.Aggregator == 'Count') {

        } else {

          agg = this.getAggregator(aggregatedField, aggName);
          if (i === lastIndex && serie.Top && serie.Top?.Max) {
            const bucketSortAgg = this.buildBucketSortAggregation(aggName, serie);
            let aggs = [agg, bucketSortAgg];
            
            aggregations[aggregations.length - 1].aggs(aggs)
          }
         
        }

        aggregationsList[serie.Name] = aggregations;

      }
    }
    let seriesAggregation: any = [];
    Object.keys(aggregationsList).forEach((seriesName) => {
      // build nested aggregations from array of aggregations
      let aggs: esb.Aggregation = this.buildNestedAggregations(aggregationsList[seriesName]);
      const series = query.Series.filter(x => x.Name === seriesName)[0];
      //aggs.aggs([test]);
      // elastic dont allow Duplicate field for e.g 'transaction_lines' but it can be 2 series with same resource so the name to the aggs is '{resource}:{Name} (The series names is unique)
      let resourceFilter: Query = esb.termQuery('ElasticSearchType', series.Resource);
      if (series.Filter && Object.keys(series.Filter).length > 0) {
        const serializedQuery:Query = toKibanaQuery(series.Filter);
        resourceFilter = esb.boolQuery().must([resourceFilter, serializedQuery]);
      }
      const filterAggregation = esb.filterAggregation(seriesName, resourceFilter).agg(aggs);
      seriesAggregation.push(filterAggregation);
    });
    elasticRequestBody.aggs(seriesAggregation);

    const body = elasticRequestBody.toJSON();
    console.log(`lambdaBody: ${JSON.stringify(body)}`);

    const lambdaResponse = await callElasticSearchLambda(endpoint, method, JSON.stringify(body), null, true);
    console.log(`lambdaResponse: ${JSON.stringify(lambdaResponse)}`);

    if (!lambdaResponse.success) {
      console.log(`Failed to execute data query ID: ${query.Key}, lambdaBody: ${JSON.stringify(body)}`)
      throw new Error(`Failed to execute data query ID: ${query.Key}`);
    }
    // const lambdaResponse = {
    //   resultObject: null
    // };
    let response: DataQueryResponse = this.buildResponseFromElasticResults2(lambdaResponse.resultObject, query);

    return response;
  }

  buildDummyBreakBy(): esb.Aggregation {

    let query: Aggregation = esb.termsAggregation('DummyBreakBy').script(esb.script('inline',"'test'"));
    return query;
  }

  private getAggUniqueName(serie: Serie) {
    return `${serie.Resource}:${serie.Name}`;
  }

  private buildBucketSortAggregation(aggName, serie) {
    const order = serie.Top.Ascending ? 'asc' : 'desc';
    return esb.bucketSortAggregation('sort').sort([esb.sort(aggName, order)]).size(serie.Top.Max)
  }
  private buildResponseFromElasticResults2(lambdaResponse, query: DataQuery) {

    // lambdaResponse = {
    //   "aggregations" : {
    //     "test filter" : {
    //       "doc_count" : 131,
    //       "Transaction.ActionDateTime" : {
    //         "buckets" : [
    //           {
    //             "key_as_string" : "2017 Feb",
    //             "key" : 1485907200000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "test",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Mar",
    //             "key" : 1488326400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Apr",
    //             "key" : 1491004800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 May",
    //             "key" : 1493596800000,
    //             "doc_count" : 3,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "Hadar",
    //                   "doc_count" : 2
    //                 },
    //                 {
    //                   "key" : "test",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Jun",
    //             "key" : 1496275200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Jul",
    //             "key" : 1498867200000,
    //             "doc_count" : 11,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 8
    //                 },
    //                 {
    //                   "key" : "Hadar",
    //                   "doc_count" : 3
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Aug",
    //             "key" : 1501545600000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Sep",
    //             "key" : 1504224000000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Oct",
    //             "key" : 1506816000000,
    //             "doc_count" : 2,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 1
    //                 },
    //                 {
    //                   "key" : "test",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Nov",
    //             "key" : 1509494400000,
    //             "doc_count" : 32,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "",
    //                   "doc_count" : 29
    //                 },
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 1
    //                 },
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 1
    //                 },
    //                 {
    //                   "key" : "test",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2017 Dec",
    //             "key" : 1512086400000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Jan",
    //             "key" : 1514764800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Feb",
    //             "key" : 1517443200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Mar",
    //             "key" : 1519862400000,
    //             "doc_count" : 46,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 26
    //                 },
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 19
    //                 },
    //                 {
    //                   "key" : "",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Apr",
    //             "key" : 1522540800000,
    //             "doc_count" : 3,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 3
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 May",
    //             "key" : 1525132800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Jun",
    //             "key" : 1527811200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Jul",
    //             "key" : 1530403200000,
    //             "doc_count" : 21,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "",
    //                   "doc_count" : 16
    //                 },
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 4
    //                 },
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Aug",
    //             "key" : 1533081600000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Sep",
    //             "key" : 1535760000000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Oct",
    //             "key" : 1538352000000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Nov",
    //             "key" : 1541030400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2018 Dec",
    //             "key" : 1543622400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Jan",
    //             "key" : 1546300800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Feb",
    //             "key" : 1548979200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Mar",
    //             "key" : 1551398400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Apr",
    //             "key" : 1554076800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 May",
    //             "key" : 1556668800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Jun",
    //             "key" : 1559347200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Jul",
    //             "key" : 1561939200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Aug",
    //             "key" : 1564617600000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Sep",
    //             "key" : 1567296000000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Oct",
    //             "key" : 1569888000000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Nov",
    //             "key" : 1572566400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2019 Dec",
    //             "key" : 1575158400000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Jan",
    //             "key" : 1577836800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Feb",
    //             "key" : 1580515200000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Mar",
    //             "key" : 1583020800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Apr",
    //             "key" : 1585699200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 May",
    //             "key" : 1588291200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Jun",
    //             "key" : 1590969600000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Jul",
    //             "key" : 1593561600000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Aug",
    //             "key" : 1596240000000,
    //             "doc_count" : 3,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 2
    //                 },
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Sep",
    //             "key" : 1598918400000,
    //             "doc_count" : 1,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 1
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Oct",
    //             "key" : 1601510400000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Nov",
    //             "key" : 1604188800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2020 Dec",
    //             "key" : 1606780800000,
    //             "doc_count" : 2,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "123",
    //                   "doc_count" : 2
    //                 }
    //               ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 Jan",
    //             "key" : 1609459200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 Feb",
    //             "key" : 1612137600000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 Mar",
    //             "key" : 1614556800000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 Apr",
    //             "key" : 1617235200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 May",
    //             "key" : 1619827200000,
    //             "doc_count" : 0,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [ ]
    //             }
    //           },
    //           {
    //             "key_as_string" : "2021 Jun",
    //             "key" : 1622505600000,
    //             "doc_count" : 2,
    //             "Transaction.Account.ExternalID" : {
    //               "doc_count_error_upper_bound" : 0,
    //               "sum_other_doc_count" : 0,
    //               "buckets" : [
    //                 {
    //                   "key" : "MQB1",
    //                   "doc_count" : 2
    //                 }
    //               ]
    //             }
    //           }
    //         ]
    //       }
    //     }
    //   }
    // }

    let response: DataQueryResponse = new DataQueryResponse();
    query.Series.forEach(series => {
      const resourceAggs = lambdaResponse.aggregations[series.Name];
      if (series.GroupBy && series.GroupBy[0].FieldID) {
        series.GroupBy.forEach(groupBy => {
          response.Groups.push(this.cutDotNotation(groupBy.FieldID));
          resourceAggs[groupBy.FieldID].buckets.forEach(bucketsGroupBy => {
            const dataSet = {};
            const seriesName = this.getKeyAggregationName(bucketsGroupBy); // hallmark
            dataSet[this.cutDotNotation(groupBy.FieldID)] = seriesName;
            if (series.BreakBy && series.BreakBy.FieldID) {

              this.handleAggregatorsFieldsWithBreakBy(bucketsGroupBy[series.BreakBy.FieldID], series, response, dataSet);
            }
            else {
              this.handleAggregatorsFieldsWithBreakBy(bucketsGroupBy['DummyBreakBy'], series, response, dataSet);

              //this.handleAggregatedFieldNoBreakBy(series, response, dataSet, bucketsGroupBy);
            }
            response.DataSet.push(dataSet)
          });
        });

      }
      else if (series.BreakBy?.FieldID) {
        let dataSet = {};

        this.handleAggregatorsFieldsWithBreakBy(resourceAggs[series.BreakBy.FieldID], series, response, dataSet);

        response.DataSet.push(dataSet);

      } else {
        const dataSet = {};
        this.handleAggregatorsFieldsWithBreakBy(resourceAggs['DummyBreakBy'], series, response, dataSet);
        response.DataSet.push(dataSet);

      }

    });

    return response;
  }

  private handleAggregatorsFieldsWithBreakBy(breakBy: any, series: Serie, response: DataQueryResponse, dataSet: {}) {
    breakBy.buckets.forEach(bucket => {
      const seriesName = this.getKeyAggregationName(bucket);
      if (response.Series.indexOf(seriesName) == -1) {
        response.Series.push(seriesName);
      }
      this.handleAggregatedFields(seriesName, series.Label, bucket, series.AggregatedFields, dataSet);

    });
  }

  private handleAggregatedFieldNoBreakBy(series: Serie, response: DataQueryResponse, dataSet: {}, resourceAggs: any) {
    series.AggregatedFields.forEach((aggregatedField) => {

      const keyString = this.buildAggragationFieldString(aggregatedField);
      if (response.Series.indexOf(aggregatedField.Aggregator) == -1) {
        response.Series.push(aggregatedField.Aggregator);
      }
      dataSet[aggregatedField.Aggregator] = resourceAggs[keyString].value;

    });
  }


  private handleAggregatedFields(seriesName, seriesLabel, seriesAggregation, aggregatedFields, dataSet) {
    aggregatedFields.forEach((aggregatedField) => {

      const keyString = this.buildAggragationFieldString(aggregatedField);
      const dataSetKeyString = this.buildDataSetKeyString(seriesName, seriesLabel);
      let val;
      if (seriesAggregation[keyString]?.value){
        val = seriesAggregation[keyString].value;

      }else{
        val = seriesAggregation.doc_count;

      }
      dataSet[dataSetKeyString] = val;
    })
  }


  private extractTermAggregation(bucket: any, keyString: string, query: DataQuery, response: DataQueryResponse) {
    let dataSet = {};
    const keyName = this.getKeyAggregationName(bucket);
    dataSet[keyString] = keyName;
    query.Series.forEach(series => {
      if (series.BreakBy) {
        bucket[series.BreakBy.FieldID].buckets.forEach(serieBucket => {
          this.handleAggregationFields(series, serieBucket, response, dataSet);
        });
      } else {
        this.handleAggregationFields(series, bucket, response, dataSet);
      }
      response.DataSet.push(dataSet);
    });
  }

  private handleAggregationFields(series: Serie, serieBucket: any, response: DataQueryResponse, dataSet: {}) {
    series.AggregatedFields.forEach(aggregationField => {

      const keyName = this.getKeyAggregationName(serieBucket);;
      const keyString = this.cutDotNotation(keyName);

      // if the series already exists in series - dont add it
      if (response.Series.indexOf(keyString) == -1) {
        response.Series.push(keyString);
      }
      const aggName = this.buildAggragationFieldString(aggregationField);
      dataSet[keyString] = serieBucket[aggName].value;
    });
  }

  private cutDotNotation(key: string) {
    return key.replace('.', '');
  }

  private getKeyAggregationName(bucket: any) {
    // in cate of histogram aggregation we want the key as data and not timestamp
    return bucket['key_as_string'] ? bucket['key_as_string'] : bucket.key;
  }

  private buildNestedAggregations(aggregations: esb.Aggregation[]) {
    let aggs: any = null;
    for (let i = aggregations.length - 1; i >= 0; i--) {
      if (i === aggregations.length - 1) {
        aggs = aggregations[i];
      } else {
        aggs = aggregations[i].agg(aggs);
      }
    }
    return aggs;
  }

  // build sggregation - if the type field is date time build dateHistogramAggregation else termsAggregation
  // sourceAggs determine if its group by or break by so we can distinguish between them in the results
  private buildAggregationQuery(groupBy: GroupBy, sggregations: esb.Aggregation[]) {

    // Maximum size of each aggregation is 100
    //const topAggs = groupBy.Top?.Max ? groupBy.Top.Max : this.MaxAggregationSize;

    // there is a There is a difference between data histogram aggregation and terms aggregation. 
    // data histogram aggregation has no size.
    // This aggregation is already selective in the sense that the number of buckets is manageable through the interval 
    // so it is necessary to do nested aggregation to get size buckets
    //const isDateHistogramAggregation = groupBy.IntervalUnit && groupBy.Interval;
    let query: Aggregation;
    if (groupBy.Interval && groupBy.Interval != "None" && groupBy.Format) {
      //const calenderInterval = `${groupBy.Interval}${this.intervalUnitMap[groupBy.IntervalUnit!]}`;
      query = esb.dateHistogramAggregation(groupBy.FieldID, groupBy.FieldID).calendarInterval(groupBy.Interval.toLocaleLowerCase()).format(groupBy.Format);
    } else {
      query = esb.termsAggregation(groupBy.FieldID, `${groupBy.FieldID}`);
    }
    //Handle the sorting
    //query.order('_key', groupBy.Top?.Ascending ? 'asc' : 'desc');

    // nested aggregation to get size buckets
    // if (isDateHistogramAggregation) {
    //   query.aggs([esb.bucketSortAggregation('Top').size(topAggs)])
    // }

    return query;
  }

  private buildAggragationFieldString(aggregatedField: AggregatedField): string {
    if (aggregatedField.Aggregator === 'Script') {
      return `${aggregatedField.Aggregator}`
    } else {
      return `${aggregatedField.FieldID.replace('.', '')}_${aggregatedField.Aggregator}`
    }
  }

  buildDataSetKeyString(keyName: string, pattern: string) {
    const key = pattern.replace('${label}', keyName);
    return this.cutDotNotation(key);
  }

  private getAggregator(aggregatedField: AggregatedField, aggName: string) {
    let agg;
    switch (aggregatedField.Aggregator) {
      case 'Sum':
        agg = esb.sumAggregation(aggName, aggregatedField.FieldID);
        break;
      case 'CountDistinct':
        agg = esb.cardinalityAggregation(aggName, aggregatedField.FieldID);
        break;
      case 'Average':
        agg = esb.avgAggregation(aggName, aggregatedField.FieldID);
        break;

    }
    return agg;
  }

  private async getUserDefinedQuery(request: Request) {

    const queryKey = request.body.QueryId;

    if (!queryKey) {
      throw new Error(`Missing request parameters: query_id`);
    }

    const adal = this.papiClient.addons.data.uuid(config.AddonUUID).table(DATA_QUREIES_TABLE_NAME);
    const query = await adal.key(queryKey).get();

    if (!query) {
      throw new Error(`Invalid request parameters: query_id`);
    }
    return <DataQuery>query;
  }
}

export default ElasticService;