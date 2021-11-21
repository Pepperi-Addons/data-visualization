import { PapiClient, InstalledAddon } from '@pepperi-addons/papi-sdk'
import { Client, Request } from '@pepperi-addons/debug-server';
import { v4 as uuid } from 'uuid';
import config from '../../addon.config.json'
import { AggregatedField, AggregatedParam, DataQuery, DataTypes, DATA_QUREIES_TABLE_NAME, GroupBy, IntervalUnit, IntervalUnits, Serie } from '../models/data-query';
import { validate } from 'jsonschema';
import { QueriesScheme } from '../models/queries-scheme';
import esb, { Aggregation, DateHistogramAggregation, dateHistogramAggregation, dateRangeAggregation, maxBucketAggregation, Query, termQuery, TermsAggregation } from 'elastic-builder';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from 'jwt-decode';
import { DataQueryResponse } from '../models/data-query-response';
import { parse, toKibanaQuery, JSONBaseFilter, toApiQueryString, filter, FieldType, JSONFilter } from "@pepperi-addons/pepperi-filters";
import { QueryExecutionScheme } from '../models/query-execution-scheme';
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

  intervalUnitMap: { [key in IntervalUnit]: string } = {
    Days: 'd',
    Weeks: 'w',
    Months: 'M',
    Years: 'y',
    None: ''
  }

  intervalUnitFormat: { [key in IntervalUnit]: string } = {
    Days: 'dd',
    Weeks: 'MM-dd',
    Months: 'MM',
    Years: 'yyyy',
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

    //to remove
    endpoint = `9a559f05-c41e-49a8-8de4-3155952f465f/_search`
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

    //console.log(JSON.stringify(toKibanaQuery(request.body.Filter).toJSON()))

    //elasticRequestBody.query(toKibanaQuery(request.body.Filter));
    let aggregationsList: { [key: string]: Aggregation[] } = {};

    // handle aggregation by series
    for (const serie of query.Series) {
      let aggregations: Aggregation[] = [];

      // handle group by
      if (serie.GroupBy) {
        serie.GroupBy.forEach(groupBy => {
          aggregations.push(this.buildAggregationQuery(groupBy, aggregations, 'GroupBy'));
        });
      }
      // handle aggregation by break by
      if (serie.BreakBy) {
        aggregations.push(this.buildAggregationQuery(serie.BreakBy, aggregations, 'BreakBy'));
      }

      for (const aggregatedField of serie.AggregatedFields) {
        let agg;

        if (aggregatedField.Aggregator === 'Script' && aggregatedField.Script) {
          let scriptAggs: Aggregation[] = [];
          serie.AggregatedParams?.forEach(aggregatedParam => {
            scriptAggs.push(this.getAggregator(aggregatedParam))
          });

          scriptAggs.push(esb.bucketScriptAggregation('test').bucketsPath({
            "total": "totalsum",
            "count": "myCount"
          }).script(aggregatedField.Script));
          agg = esb.requestBodySearch().aggs(scriptAggs);

        } else {

          agg = this.getAggregator(aggregatedField);
        }

        aggregations.push(agg);
        //elasticRequestBody.agg(agg);
      }
      aggregationsList[serie.Name] = aggregations;
    }
    let te: any = [];
    Object.keys(aggregationsList).forEach((seriesName) => {
      // build nested aggregations from array of aggregations
      let aggs: esb.Aggregation = this.buildNestedAggregations(aggregationsList[seriesName]);
      const series = query.Series.filter(x => x.Name === seriesName)[0];
      //aggs.aggs([test]);
      // elastic dont allow Duplicate field for e.g 'transaction_lines' but it can be 2 series with same resource so the name to the aggs is '{resource}:{Name} (The series names is unique)
      const hadar = esb.filterAggregation(seriesName, esb.termQuery('ElasticSearchType', series.Resource)).agg(aggs);
      te.push(hadar);
    });
    elasticRequestBody.aggs(te);

    const body = elasticRequestBody.toJSON();
    console.log(`lambdaBody: ${JSON.stringify(body)}`);

    // const lambdaResponse = await callElasticSearchLambda(endpoint, method, JSON.stringify(body), null, true);
    // console.log(`lambdaResponse: ${JSON.stringify(lambdaResponse)}`);

    // if (!lambdaResponse.success) {
    //     console.log(`Failed to execute data query ID: ${query.Key}, lambdaBody: ${JSON.stringify(body)}`)
    //     throw new Error(`Failed to execute data query ID: ${query.Key}`);
    // }
    const lambdaResponse = {
      resultObject: null
    };
    let response: DataQueryResponse = this.buildResponseFromElasticResults2(lambdaResponse.resultObject, query);

    return response;
  }

  private getAggUniqueName(serie: Serie) {
    return `${serie.Resource}:${serie.Name}`;
  }

  private buildResponseFromElasticResults2(lambdaResponse, query: DataQuery) {

    lambdaResponse = {
      "aggregations": {
        "transaction lines sum UnitsQuantity per Months": {
          "doc_count": 16431539,
          "Item.MainCategory": {
            "meta": {
              "GroupBy": "Item.MainCategory"
            },
            "doc_count_error_upper_bound": 6645,
            "sum_other_doc_count": 262622,
            "buckets": [
              {
                "key": "Pocket",
                "doc_count": 10756184,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 5378821,
                      "UnitsQuantity_Sum": {
                        "value": 4.1341803E7
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 5377363,
                      "UnitsQuantity_Sum": {
                        "value": 2.6425553E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Hallmark",
                "doc_count": 3074146,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 978372,
                      "UnitsQuantity_Sum": {
                        "value": 4180953.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 2095774,
                      "UnitsQuantity_Sum": {
                        "value": 1.2127732E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Box",
                "doc_count": 1644329,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 417201,
                      "UnitsQuantity_Sum": {
                        "value": 1.2965525E7
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 1227128,
                      "UnitsQuantity_Sum": {
                        "value": 3.5572682E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Tesco",
                "doc_count": 319984,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 125464,
                      "UnitsQuantity_Sum": {
                        "value": 829635.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 194520,
                      "UnitsQuantity_Sum": {
                        "value": 982884.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Morrisons",
                "doc_count": 127394,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 19776,
                      "UnitsQuantity_Sum": {
                        "value": 170668.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 107618,
                      "UnitsQuantity_Sum": {
                        "value": 1486518.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Waitrose",
                "doc_count": 78446,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 36452,
                      "UnitsQuantity_Sum": {
                        "value": 420233.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 41994,
                      "UnitsQuantity_Sum": {
                        "value": 215629.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Danillo",
                "doc_count": 52262,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 26058,
                      "UnitsQuantity_Sum": {
                        "value": 137353.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 26204,
                      "UnitsQuantity_Sum": {
                        "value": 149810.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Me To You",
                "doc_count": 42540,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 12365,
                      "UnitsQuantity_Sum": {
                        "value": 66713.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 30175,
                      "UnitsQuantity_Sum": {
                        "value": 362776.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Tailormade",
                "doc_count": 36079,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 17010,
                      "UnitsQuantity_Sum": {
                        "value": 89371.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 19069,
                      "UnitsQuantity_Sum": {
                        "value": 93923.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Carte Blanche Greetings",
                "doc_count": 34516,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 14317,
                      "UnitsQuantity_Sum": {
                        "value": 72968.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 20199,
                      "UnitsQuantity_Sum": {
                        "value": 218149.0
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        "all_activities sum UnitsQuantity per Months": {
          "doc_count": 3333944,
          "Item.MainCategory": {
            "meta": {
              "GroupBy": "Item.MainCategory"
            },
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": []
          }
        }
      }
    }
    let response: DataQueryResponse = new DataQueryResponse();
    query.Series.forEach(series => {
      const resourceAggs = lambdaResponse.aggregations[series.Name];
      if (series.GroupBy) {

        series.GroupBy.forEach(groupBy => {
          response.Groups.push(groupBy.FieldID);
          resourceAggs[groupBy.FieldID].buckets.forEach(bucketsGroupBy => {
            const dataSet = {};
            const seriesName = this.getKeyAggregationName(bucketsGroupBy); // hallmark
            dataSet[groupBy.FieldID] = seriesName;

            bucketsGroupBy[series.BreakBy.FieldID].buckets.forEach(bucket => {
              const seriesName = this.getKeyAggregationName(bucket);
              response.Series.push(seriesName);

              //dataSet[]
              series.AggregatedFields.forEach((aggregatedField) => {

                const keyString = this.buildAggragationFieldString(aggregatedField);
                dataSet[seriesName] = bucket[keyString].value;
              })
              //this.handleAggregatedFields(seriesName, bucket, series.AggregatedFields, response);
              // response.Series.push(seriesName);
              // const keyString = this.buildAggragationFieldString(bucket);
              // response.DataSet.push({ [seriesName]: bucket[keyString].value });
              //this.handleAggregatedFields(seriesName, bucket, series.AggregatedFields, response);
              // series.AggregatedFields.forEach((aggregatedField) => {

              //   const keyString = this.buildAggragationFieldString(aggregatedField);
              //   response.Series.push(seriesName);
              //   response.DataSet.push({ [seriesName]: bucket[keyString].value });
              // })
            });
            response.DataSet.push(dataSet)
          });
        });

      }
      else if (series.BreakBy?.FieldID) {
        resourceAggs[series.BreakBy.FieldID].buckets.forEach(bucket => {
          const seriesName = this.getKeyAggregationName(bucket);
          response.Series.push(seriesName);

          this.handleAggregatedFields(seriesName, bucket, series.AggregatedFields, response);
          // series.AggregatedFields.forEach((aggregatedField) => {

          //   const keyString = this.buildAggragationFieldString(aggregatedField);
          //   response.Series.push(seriesName);
          //   response.DataSet.push({ [seriesName]: bucket[keyString].value });
          // })
        });

      } else {
        response.Series.push(series.Name);

        this.handleAggregatedFields(series.Name, resourceAggs, series.AggregatedFields, response);
        // series.AggregatedFields.forEach((aggregatedField) => {

        //   const keyString = this.buildAggragationFieldString(aggregatedField);

        //   response.Series.push(series.Name);
        //   response.DataSet.push({ [series.Name]: resourceAggs[keyString].value });
        // })
      }

    });

    return response;
  }
  private handleAggregatedFields(seriesName, seriesAggregation, aggregatedFields, response) {
    aggregatedFields.forEach((aggregatedField) => {

      const keyString = this.buildAggragationFieldString(aggregatedField);
      response.DataSet.push({ [seriesName]: seriesAggregation[keyString].value });
    })
  }
  private buildResponseFromElasticResults(lambdaResponse, query: DataQuery) {

    lambdaResponse = {
      "aggregations": {
        "transaction lines sum UnitsQuantity per Months": {
          "doc_count": 16431539,
          "Item.MainCategory": {
            "meta": {
              "GroupBy": "Item.MainCategory"
            },
            "doc_count_error_upper_bound": 6645,
            "sum_other_doc_count": 262622,
            "buckets": [
              {
                "key": "Pocket",
                "doc_count": 10756184,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 5378821,
                      "UnitsQuantity_Sum": {
                        "value": 4.1341803E7
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 5377363,
                      "UnitsQuantity_Sum": {
                        "value": 2.6425553E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Hallmark",
                "doc_count": 3074146,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 978372,
                      "UnitsQuantity_Sum": {
                        "value": 4180953.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 2095774,
                      "UnitsQuantity_Sum": {
                        "value": 1.2127732E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Box",
                "doc_count": 1644329,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 417201,
                      "UnitsQuantity_Sum": {
                        "value": 1.2965525E7
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 1227128,
                      "UnitsQuantity_Sum": {
                        "value": 3.5572682E7
                      }
                    }
                  ]
                }
              },
              {
                "key": "Tesco",
                "doc_count": 319984,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 125464,
                      "UnitsQuantity_Sum": {
                        "value": 829635.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 194520,
                      "UnitsQuantity_Sum": {
                        "value": 982884.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Morrisons",
                "doc_count": 127394,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 19776,
                      "UnitsQuantity_Sum": {
                        "value": 170668.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 107618,
                      "UnitsQuantity_Sum": {
                        "value": 1486518.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Waitrose",
                "doc_count": 78446,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 36452,
                      "UnitsQuantity_Sum": {
                        "value": 420233.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 41994,
                      "UnitsQuantity_Sum": {
                        "value": 215629.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Danillo",
                "doc_count": 52262,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 26058,
                      "UnitsQuantity_Sum": {
                        "value": 137353.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 26204,
                      "UnitsQuantity_Sum": {
                        "value": 149810.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Me To You",
                "doc_count": 42540,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 12365,
                      "UnitsQuantity_Sum": {
                        "value": 66713.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 30175,
                      "UnitsQuantity_Sum": {
                        "value": 362776.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Tailormade",
                "doc_count": 36079,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 17010,
                      "UnitsQuantity_Sum": {
                        "value": 89371.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 19069,
                      "UnitsQuantity_Sum": {
                        "value": 93923.0
                      }
                    }
                  ]
                }
              },
              {
                "key": "Carte Blanche Greetings",
                "doc_count": 34516,
                "Transaction.ActionDateTime": {
                  "meta": {
                    "BreakBy": "Transaction.ActionDateTime"
                  },
                  "buckets": [
                    {
                      "key_as_string": "2018",
                      "key": 1514764800000,
                      "doc_count": 14317,
                      "UnitsQuantity_Sum": {
                        "value": 72968.0
                      }
                    },
                    {
                      "key_as_string": "2019",
                      "key": 1546300800000,
                      "doc_count": 20199,
                      "UnitsQuantity_Sum": {
                        "value": 218149.0
                      }
                    }
                  ]
                }
              }
            ]
          }
        },
        "all_activities sum UnitsQuantity per Months": {
          "doc_count": 3333944,
          "Item.MainCategory": {
            "meta": {
              "GroupBy": "Item.MainCategory"
            },
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": []
          }
        }
      }
    }
    let response: DataQueryResponse = new DataQueryResponse();

    Object.keys(lambdaResponse.aggregations).forEach((key) => {
      // remove the dots since chart js doesnt support it
      const keyString = this.cutDotNotation(key);
      //response.Groups.push(keyString);
      if (lambdaResponse.aggregations[key].buckets) {
        lambdaResponse.aggregations[key].buckets.forEach(bucket => {
          this.extractTermAggregation(bucket, keyString, query, response);
        });
      }
      else {
        this.extractTermAggregation(lambdaResponse.aggregations[key], keyString, query, response);

      }


    });
    return response;
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
    return key.split('.').join("");
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
  private buildAggregationQuery(groupBy: GroupBy, sggregations: esb.Aggregation[], sourceAggs) {

    // Maximum size of each aggregation is 100
    const topAggs = groupBy.Top?.Max ? groupBy.Top.Max : this.MaxAggregationSize;

    // there is a There is a difference between data histogram aggregation and terms aggregation. 
    // data histogram aggregation has no size.
    // This aggregation is already selective in the sense that the number of buckets is manageable through the interval 
    // so it is necessary to do nested aggregation to get size buckets
    const isDateHistogramAggregation = groupBy.IntervalUnit && groupBy.Interval;
    let query: Aggregation;
    if (isDateHistogramAggregation) {
      const calenderInterval = `${groupBy.Interval}${this.intervalUnitMap[groupBy.IntervalUnit!]}`;
      query = esb.dateHistogramAggregation(groupBy.FieldID, groupBy.FieldID).calendarInterval(calenderInterval).format(this.intervalUnitFormat[groupBy.IntervalUnit!]);
    } else {
      query = esb.termsAggregation(groupBy.FieldID, `${groupBy.FieldID}.keyword`);
    }
    query.meta({ [sourceAggs]: groupBy.FieldID })
    //Handle the sorting
    //query.order('_key', groupBy.Top?.Ascending ? 'asc' : 'desc');

    // nested aggregation to get size buckets
    if (isDateHistogramAggregation) {
      query.aggs([esb.bucketSortAggregation('Top').size(topAggs)])
    }

    return query;
  }

  private buildAggragationFieldString(aggregatedField: AggregatedField): string {
    return `${aggregatedField.FieldID}_${aggregatedField.Aggregator}`
  }

  private getAggregator(aggregatedField: AggregatedField) {
    let agg;
    const aggName = this.buildAggragationFieldString(aggregatedField);
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