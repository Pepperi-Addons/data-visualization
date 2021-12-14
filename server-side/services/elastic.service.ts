import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client, Request } from '@pepperi-addons/debug-server';
import config from '../../addon.config.json'
import { AggregatedField, AggregatedParam, BreakBy, DataQuery, DataTypes, DATA_QUREIES_TABLE_NAME, GroupBy, Interval, Intervals, Serie } from '../models/data-query';
import { validate } from 'jsonschema';
import esb, { Aggregation, Query } from 'elastic-builder';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from 'jwt-decode';
import { DataQueryResponse, SeriesData } from '../models/data-query-response';
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

    if (!query.Series || query.Series.length == 0) {
      return new DataQueryResponse();
    }

    // handle aggregation by series
    let aggregationsList: { [key: string]: Aggregation[] } = this.buildSeriesAggregationList(query.Series);;

    // build one query with all series (each aggregation have query and aggs)
    let queryAggregation: any = this.buildAllSeriesAggregation(aggregationsList, query);

    elasticRequestBody.aggs(queryAggregation);

    const body = elasticRequestBody.toJSON();
    console.log(`lambdaBody: ${JSON.stringify(body)}`);

    // const lambdaResponse = await callElasticSearchLambda(endpoint, method, JSON.stringify(body), null, true);
    // console.log(`lambdaResponse: ${JSON.stringify(lambdaResponse)}`);

    // if (!lambdaResponse.success) {
    //   console.log(`Failed to execute data query ID: ${query.Key}, lambdaBody: ${JSON.stringify(body)}`)
    //   throw new Error(`Failed to execute data query ID: ${query.Key}`);
    // }
    const lambdaResponse = {
      resultObject: null
    };

    let response: DataQueryResponse = this.buildResponseFromElasticResults(lambdaResponse.resultObject, query);

    return response;
  }

  private buildAllSeriesAggregation(aggregationsList: { [key: string]: esb.Aggregation[]; }, query: DataQuery) {
    let queryAggregation: any = [];

    Object.keys(aggregationsList).forEach((seriesName) => {

      // build nested aggregations from array of aggregations for each series
      let seriesAggregation: esb.Aggregation = this.buildNestedAggregations(aggregationsList[seriesName]);
      const series = query.Series.filter(x => x.Name === seriesName)[0];

      // handle filter per series - merge resource filter per series and the filter object to one filter with 'AND' operation ("must" in DSL)
      let resourceFilter: Query = esb.termQuery('ElasticSearchType', series.Resource);

      if (series.Filter && Object.keys(series.Filter).length > 0) {
        const serializedQuery: Query = toKibanaQuery(series.Filter);
        resourceFilter = esb.boolQuery().must([resourceFilter, serializedQuery]);
      }

      const filterAggregation = esb.filterAggregation(seriesName, resourceFilter).agg(seriesAggregation);
      queryAggregation.push(filterAggregation);
    });

    return queryAggregation;
  }

  private buildSeriesAggregationList(series) {

    let aggregationsList: { [key: string]: Aggregation[] } = {};

    for (const serie of series) {
      let aggregations: Aggregation[] = [];

      // First level - handle group by of each series
      if (serie.GroupBy && serie.GroupBy) {
        serie.GroupBy.forEach(groupBy => {
          if (groupBy.FieldID) {
            aggregations.push(this.buildAggregationQuery(groupBy, aggregations));
          }
        });
      }

      // Second level handle break by - if no break by - create dummy break by becuase we works on buckets
      if (serie.BreakBy && serie.BreakBy.FieldID) {
        aggregations.push(this.buildAggregationQuery(serie.BreakBy, aggregations));
      }
      else {
        aggregations.push(this.buildDummyBreakBy());
      }

      // Third level - handle aggregated fields
      for (let i = 0; i < serie.AggregatedFields.length; i++) {
        const aggregatedField = serie.AggregatedFields[i];
        let agg;

        let lastIndex = serie.AggregatedFields.length - 1;

        const aggName = this.buildAggragationFieldString(aggregatedField);

        // if its script aggregation - we need more than one aggregation so we build the script aggs with its params
        if (aggregatedField.Aggregator === 'Script' && aggregatedField.Script) {
          let bucketPath = {};
          let scriptAggs: Aggregation[] = [];
          serie.AggregatedParams?.forEach(aggregatedParam => {
            bucketPath[aggregatedParam.Name] = aggregatedParam.Name;
            scriptAggs.push(this.getAggregator(aggregatedParam, aggregatedParam.Name));
          });

          scriptAggs.push(esb.bucketScriptAggregation(aggName).bucketsPath(bucketPath).script(aggregatedField.Script));

          // If its the last aggregated fields we need bucket sort aggregation in the last level
          if (i === lastIndex && serie.Top && serie.Top?.Max) {
            const bucketSortAgg = this.buildBucketSortAggregation(aggName, serie);
            scriptAggs.push(bucketSortAgg);
          }
          aggregations[aggregations.length - 1].aggs(scriptAggs);

        } else {

          agg = this.getAggregator(aggregatedField, aggName);

          if (i === lastIndex && serie.Top && serie.Top?.Max) {
            const bucketSortAgg = this.buildBucketSortAggregation(aggName, serie);
            let aggs = [agg, bucketSortAgg];
            aggregations[aggregations.length - 1].aggs(aggs);

          } else {
            aggregations.push(agg);
          }

        }
        aggregationsList[serie.Name] = aggregations;

      }
    }
    return aggregationsList;
  }

  buildDummyBreakBy(): esb.Aggregation {
    let query: Aggregation = esb.termsAggregation('DummyBreakBy').script(esb.script('inline', "'DummyBreakBy'")).minDocCount(0);
    return query;
  }

  private buildBucketSortAggregation(aggName, serie) {
    const order = serie.Top.Ascending === true ? 'asc' : 'desc';
    return esb.bucketSortAggregation('sort').sort([esb.sort(aggName, order)]).size(serie.Top.Max)
  }

  private buildResponseFromElasticResults(lambdaResponse, query: DataQuery) {

    lambdaResponse = {
      "aggregations": {
        "Series 1": {
          "doc_count": 1982,
          "Account.Name": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 145,
            "buckets": [
              {
                "key": "A Paris Food",
                "doc_count": 684,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 27,
                      "QuantitiesTotal_Sum": {
                        "value": 8.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 125,
                      "QuantitiesTotal_Sum": {
                        "value": 172.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 143,
                      "QuantitiesTotal_Sum": {
                        "value": 567.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 130,
                      "QuantitiesTotal_Sum": {
                        "value": 4688.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 259,
                      "QuantitiesTotal_Sum": {
                        "value": 2301.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "A store1",
                "doc_count": 315,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 42,
                      "QuantitiesTotal_Sum": {
                        "value": 10083.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 143,
                      "QuantitiesTotal_Sum": {
                        "value": 299.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 30,
                      "QuantitiesTotal_Sum": {
                        "value": 67.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 35,
                      "QuantitiesTotal_Sum": {
                        "value": 23178.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 65,
                      "QuantitiesTotal_Sum": {
                        "value": 1347.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "acount of myAccount type",
                "doc_count": 201,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 13,
                      "QuantitiesTotal_Sum": {
                        "value": 0.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 44,
                      "QuantitiesTotal_Sum": {
                        "value": 91.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 62,
                      "QuantitiesTotal_Sum": {
                        "value": 257.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 30,
                      "QuantitiesTotal_Sum": {
                        "value": 231.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 52,
                      "QuantitiesTotal_Sum": {
                        "value": 257.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Account2",
                "doc_count": 188,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 3,
                      "QuantitiesTotal_Sum": {
                        "value": 0.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 44,
                      "QuantitiesTotal_Sum": {
                        "value": 156.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 62,
                      "QuantitiesTotal_Sum": {
                        "value": 14763.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 79,
                      "QuantitiesTotal_Sum": {
                        "value": 2384.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Before every one else Australia Sydney",
                "doc_count": 187,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 2,
                      "QuantitiesTotal_Sum": {
                        "value": 0.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 26,
                      "QuantitiesTotal_Sum": {
                        "value": 64.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 45,
                      "QuantitiesTotal_Sum": {
                        "value": 216.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 64,
                      "QuantitiesTotal_Sum": {
                        "value": 540.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 50,
                      "QuantitiesTotal_Sum": {
                        "value": 4599.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Before every one else Australia Sydney New",
                "doc_count": 77,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 2,
                      "QuantitiesTotal_Sum": {
                        "value": 0.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 12,
                      "QuantitiesTotal_Sum": {
                        "value": 27.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 26,
                      "QuantitiesTotal_Sum": {
                        "value": 193.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 25,
                      "QuantitiesTotal_Sum": {
                        "value": 121.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 12,
                      "QuantitiesTotal_Sum": {
                        "value": 262.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Cat n Dog New",
                "doc_count": 57,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 5,
                      "QuantitiesTotal_Sum": {
                        "value": 2.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 32,
                      "QuantitiesTotal_Sum": {
                        "value": 112.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 14,
                      "QuantitiesTotal_Sum": {
                        "value": 27.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 6,
                      "QuantitiesTotal_Sum": {
                        "value": 31.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Born to be COOL Australia Melbourne",
                "doc_count": 54,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2017",
                      "key": 1483228800000,
                      "doc_count": 2,
                      "QuantitiesTotal_Sum": {
                        "value": 0.0
                      }
                    },
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 5,
                      "QuantitiesTotal_Sum": {
                        "value": 13.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 20,
                      "QuantitiesTotal_Sum": {
                        "value": 49.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 19,
                      "QuantitiesTotal_Sum": {
                        "value": 70.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 8,
                      "QuantitiesTotal_Sum": {
                        "value": 171.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Born to be COOL Australia Melbourne New",
                "doc_count": 46,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 3,
                      "QuantitiesTotal_Sum": {
                        "value": 17.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 24,
                      "QuantitiesTotal_Sum": {
                        "value": 554.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 14,
                      "QuantitiesTotal_Sum": {
                        "value": 110.0
                      }
                    },
                    {
                      "key_as_string": "2021",
                      "key": 1609459200000,
                      "doc_count": 5,
                      "QuantitiesTotal_Sum": {
                        "value": 3.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Central park Toys New",
                "doc_count": 28,
                "ActionDateTime": {
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 5,
                      "QuantitiesTotal_Sum": {
                        "value": 77.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 15,
                      "QuantitiesTotal_Sum": {
                        "value": 51.0
                      }
                    },
                    {
                      "key_as_string": "2020",
                      "key": 1577836800000,
                      "doc_count": 8,
                      "QuantitiesTotal_Sum": {
                        "value": 31.0
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        "Series 2": {
          "doc_count": 1982,
          "Account.Name": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 145,
            "buckets": [
              {
                "key": "A Paris Food",
                "doc_count": 684,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 684,
                      "_Count": {
                        "value": 684
                      }
                    }
                  ]
                }
              },
              {
                "key": "A store1",
                "doc_count": 315,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 315,
                      "_Count": {
                        "value": 315
                      }
                    }
                  ]
                }
              },
              {
                "key": "acount of myAccount type",
                "doc_count": 201,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 201,
                      "_Count": {
                        "value": 201
                      }
                    }
                  ]
                }
              },
              {
                "key": "Account2",
                "doc_count": 188,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 188,
                      "_Count": {
                        "value": 188
                      }
                    }
                  ]
                }
              },
              {
                "key": "Before every one else Australia Sydney",
                "doc_count": 187,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 187,
                      "_Count": {
                        "value": 187
                      }
                    }
                  ]
                }
              },
              {
                "key": "Before every one else Australia Sydney New",
                "doc_count": 77,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 77,
                      "_Count": {
                        "value": 77
                      }
                    }
                  ]
                }
              },
              {
                "key": "Cat n Dog New",
                "doc_count": 57,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 57,
                      "_Count": {
                        "value": 57
                      }
                    }
                  ]
                }
              },
              {
                "key": "Born to be COOL Australia Melbourne",
                "doc_count": 54,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 54,
                      "_Count": {
                        "value": 54
                      }
                    }
                  ]
                }
              },
              {
                "key": "Born to be COOL Australia Melbourne New",
                "doc_count": 46,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 46,
                      "_Count": {
                        "value": 46
                      }
                    }
                  ]
                }
              },
              {
                "key": "Central park Toys New",
                "doc_count": 28,
                "DummyBreakBy": {
                  "doc_count_error_upper_bound": 0,
                  "sum_other_doc_count": 0,
                  "buckets": [
                    {
                      "key": "DummyBreakBy",
                      "doc_count": 28,
                      "_Count": {
                        "value": 28
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }

    let response: DataQueryResponse = new DataQueryResponse();

    query.Series.forEach(series => {

      let seriesData = new SeriesData(series.Name);

      const seriesAggregation = lambdaResponse.aggregations[series.Name];

      if (series.GroupBy && series.GroupBy[0].FieldID) {

        series.GroupBy.forEach(groupBy => {
          let groupByString = groupBy.FieldID;

          if (groupBy.Alias) {
            groupByString = groupBy.Alias;
          }

          seriesData.Groups.push(groupByString);
          seriesAggregation[groupBy.FieldID].buckets.forEach(groupBybuckets => {

            const groupByValue = this.getKeyAggregationName(groupBybuckets).toString();
            let dataSet = <Map<string, any>>{};

            // If there are multiple Query Series, they should all have the same groups and then their series will be joined
            // So. if there data set with the same key & value - update it
            // for more details serach: Data aggregation resource PRD - 4.	Multiple Query Series
            const existingDataSet = response.DataSet.filter(dataSet => groupByString in dataSet && dataSet[groupByString] === groupByValue);
            if (existingDataSet.length > 0) {
              dataSet = existingDataSet[0];
            }
            else {
              dataSet[groupByString] = groupByValue;
              response.DataSet.push(dataSet);
            }
            this.handleBreakBy(series, groupBybuckets, response, dataSet, seriesData);
            response.DataSet.push(dataSet);
          });
        });
      }
      else {
        let dataSet = <Map<string, any>>{};
        // if there is no group by - merge the data set with the first 
        if (response.DataSet.length > 0) {
          dataSet = response.DataSet[0];
        } else {
          response.DataSet.push(dataSet);
        }
        this.handleBreakBy(series, seriesAggregation, response, dataSet, seriesData);
      }
      response.DataQueries.push(seriesData);
    });

    return response;
  }

  private handleBreakBy(series: Serie, groupBybuckets: any, response: DataQueryResponse, dataSet, seriesData: SeriesData) {
    if (series.BreakBy && series.BreakBy.FieldID) {
      this.handleAggregatorsFieldsWithBreakBy(groupBybuckets[series.BreakBy.FieldID], series, dataSet, seriesData);
    }
    else {
      this.handleAggregatorsFieldsWithBreakBy(groupBybuckets['DummyBreakBy'], series, dataSet, seriesData);
    }
  }

  private handleAggregatorsFieldsWithBreakBy(breakBy: any, series: Serie, dataSet: Map<string, any>, seriesData) {
    breakBy.buckets.forEach(bucket => {
      let seriesName;
      seriesName = this.getKeyAggregationName(bucket);
      if (seriesName === 'DummyBreakBy') {
        seriesName = series.Name;
      }
      if (series.Label) {
        seriesName = this.buildDataSetKeyString(seriesName, series.Label);
      }
      if (seriesData.Series.indexOf(seriesName) == -1) {
        seriesData.Series.push(seriesName);
      }
      this.handleAggregatedFields(seriesName, bucket, series.AggregatedFields, dataSet);

    });
  }

  private handleAggregatedFields(seriesName, seriesAggregation, aggregatedFields, dataSet: Map<string, any>) {
    aggregatedFields.forEach((aggregatedField) => {

      const keyString = this.buildAggragationFieldString(aggregatedField);
      let val;
      if (seriesAggregation[keyString]?.value) {
        val = seriesAggregation[keyString].value;

      } else {
        val = seriesAggregation.doc_count;

      }
      dataSet[seriesName] = val;
    })
  }

  private getKeyAggregationName(bucket: any) {
    // in case of histogram aggregation we want the key as data and not timestamp
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
    return pattern.replace('${label}', keyName);
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
      case 'Count':
        agg = esb.valueCountAggregation(aggName, '_id');
        break;
      case 'Average':
        agg = esb.avgAggregation(aggName, aggregatedField.FieldID);
        break;

    }
    return agg;
  }

  private async getUserDefinedQuery(request: Request) {

    const queryKey = request.query.key;

    if (!queryKey) {
      throw new Error(`Missing request parameters: key`);
    }

    const adal = this.papiClient.addons.data.uuid(config.AddonUUID).table(DATA_QUREIES_TABLE_NAME);
    const query = await adal.key(queryKey).get();

    if (!query) {
      throw new Error(`Invalid request parameters: key`);
    }
    return <DataQuery>query;
  }
}

export default ElasticService;