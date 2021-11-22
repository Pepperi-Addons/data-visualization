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

        const aggName = this.buildAggragationFieldString(aggregatedField);
        if (aggregatedField.Aggregator === 'Script' && aggregatedField.Script) {
          let bucketPath = {};
          let scriptAggs: Aggregation[] = [];
          serie.AggregatedParams?.forEach(aggregatedParam => {
            bucketPath[aggregatedParam.Name] = aggregatedParam.Name;
            scriptAggs.push(this.getAggregator(aggregatedParam, aggregatedParam.Name))
          });

          scriptAggs.push(esb.bucketScriptAggregation(aggName).bucketsPath(bucketPath).script(aggregatedField.Script));
          aggregations[aggregations.length - 1].aggs(scriptAggs)
          //agg = scriptAggs;

        } else {

          agg = this.getAggregator(aggregatedField, aggName);
          aggregations.push(agg);
        }

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
        "test": {
          "doc_count": 16431539,
          "Transaction.ModificationDateTime": {
            "meta": {
              "GroupBy": "Transaction.ModificationDateTime"
            },
            "buckets": [
              {
                "key_as_string": "03",
                "key": 1519862400000,
                "doc_count": 117734,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 54,
                  "sum_other_doc_count": 1789,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 93754,
                      "totalsum": {
                        "value": 1.7318684691687346E8
                      },
                      "myCount": {
                        "value": 850
                      },
                      "Script": {
                        "value": 203749.23166690994
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 16910,
                      "totalsum": {
                        "value": 1.6762178934171677E7
                      },
                      "myCount": {
                        "value": 714
                      },
                      "Script": {
                        "value": 23476.441084274058
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 2697,
                      "totalsum": {
                        "value": 4047728.991170883
                      },
                      "myCount": {
                        "value": 73
                      },
                      "Script": {
                        "value": 55448.34234480662
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 1391,
                      "totalsum": {
                        "value": 1666942.3144168854
                      },
                      "myCount": {
                        "value": 97
                      },
                      "Script": {
                        "value": 17184.972313576138
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 448,
                      "totalsum": {
                        "value": 809163.1153976917
                      },
                      "myCount": {
                        "value": 79
                      },
                      "Script": {
                        "value": 10242.57108098344
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 166,
                      "totalsum": {
                        "value": 247483.29962730408
                      },
                      "myCount": {
                        "value": 85
                      },
                      "Script": {
                        "value": 2911.5682309094595
                      }
                    },
                    {
                      "key": "Laura Darrington Design",
                      "doc_count": 157,
                      "totalsum": {
                        "value": 243309.36102294922
                      },
                      "myCount": {
                        "value": 56
                      },
                      "Script": {
                        "value": 4344.8100182669505
                      }
                    },
                    {
                      "key": "Susan O'Hanlon",
                      "doc_count": 148,
                      "totalsum": {
                        "value": 241855.73028564453
                      },
                      "myCount": {
                        "value": 47
                      },
                      "Script": {
                        "value": 5145.866601822224
                      }
                    },
                    {
                      "key": "Laura Sherratt Designs",
                      "doc_count": 138,
                      "totalsum": {
                        "value": 222988.83071899414
                      },
                      "myCount": {
                        "value": 56
                      },
                      "Script": {
                        "value": 3981.943405696324
                      }
                    },
                    {
                      "key": "Talking Pictures",
                      "doc_count": 136,
                      "totalsum": {
                        "value": 38787.09003353119
                      },
                      "myCount": {
                        "value": 33
                      },
                      "Script": {
                        "value": 1175.3663646524603
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "04",
                "key": 1522540800000,
                "doc_count": 496693,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 420,
                  "sum_other_doc_count": 13918,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 405011,
                      "totalsum": {
                        "value": 1.069812706547502E9
                      },
                      "myCount": {
                        "value": 2590
                      },
                      "Script": {
                        "value": 413055.09905308957
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 52712,
                      "totalsum": {
                        "value": 6.613662005686796E7
                      },
                      "myCount": {
                        "value": 1895
                      },
                      "Script": {
                        "value": 34900.59105903322
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 10283,
                      "totalsum": {
                        "value": 1.9723121319796085E7
                      },
                      "myCount": {
                        "value": 665
                      },
                      "Script": {
                        "value": 29658.82905232494
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 5232,
                      "totalsum": {
                        "value": 1.0230718896526337E7
                      },
                      "myCount": {
                        "value": 311
                      },
                      "Script": {
                        "value": 32896.20223963452
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 2273,
                      "totalsum": {
                        "value": 2618807.390537739
                      },
                      "myCount": {
                        "value": 356
                      },
                      "Script": {
                        "value": 7356.200535218368
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 1990,
                      "totalsum": {
                        "value": 3842790.701883316
                      },
                      "myCount": {
                        "value": 553
                      },
                      "Script": {
                        "value": 6948.988611000572
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1607,
                      "totalsum": {
                        "value": 2687216.9663791656
                      },
                      "myCount": {
                        "value": 585
                      },
                      "Script": {
                        "value": 4593.5332758618215
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1401,
                      "totalsum": {
                        "value": 2718496.1893577576
                      },
                      "myCount": {
                        "value": 584
                      },
                      "Script": {
                        "value": 4654.959228352324
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 1379,
                      "totalsum": {
                        "value": 3047589.7352428436
                      },
                      "myCount": {
                        "value": 403
                      },
                      "Script": {
                        "value": 7562.257407550481
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 887,
                      "totalsum": {
                        "value": 798500.8928794861
                      },
                      "myCount": {
                        "value": 255
                      },
                      "Script": {
                        "value": 3131.3760505077885
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "05",
                "key": 1525132800000,
                "doc_count": 719121,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 81,
                  "sum_other_doc_count": 3087,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 698156,
                      "totalsum": {
                        "value": 1.8730569674404154E9
                      },
                      "myCount": {
                        "value": 3852
                      },
                      "Script": {
                        "value": 486255.70286615146
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 12211,
                      "totalsum": {
                        "value": 1.5265615621745348E7
                      },
                      "myCount": {
                        "value": 568
                      },
                      "Script": {
                        "value": 26876.083841100964
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 1933,
                      "totalsum": {
                        "value": 1997404.1884326935
                      },
                      "myCount": {
                        "value": 169
                      },
                      "Script": {
                        "value": 11818.959694868008
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 1133,
                      "totalsum": {
                        "value": 1447339.2880249023
                      },
                      "myCount": {
                        "value": 58
                      },
                      "Script": {
                        "value": 24954.125655601765
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 654,
                      "totalsum": {
                        "value": 373192.8883161545
                      },
                      "myCount": {
                        "value": 267
                      },
                      "Script": {
                        "value": 1397.7261734687434
                      }
                    },
                    {
                      "key": "Caroline Gardner Publishing",
                      "doc_count": 533,
                      "totalsum": {
                        "value": 286943.2007713318
                      },
                      "myCount": {
                        "value": 167
                      },
                      "Script": {
                        "value": 1718.2227591097712
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 488,
                      "totalsum": {
                        "value": 533330.6511898041
                      },
                      "myCount": {
                        "value": 149
                      },
                      "Script": {
                        "value": 3579.400343555732
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 351,
                      "totalsum": {
                        "value": 1162583.8225975037
                      },
                      "myCount": {
                        "value": 35
                      },
                      "Script": {
                        "value": 33216.68064564296
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 315,
                      "totalsum": {
                        "value": 324793.2179546356
                      },
                      "myCount": {
                        "value": 164
                      },
                      "Script": {
                        "value": 1980.4464509429001
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 260,
                      "totalsum": {
                        "value": 336068.3725891113
                      },
                      "myCount": {
                        "value": 54
                      },
                      "Script": {
                        "value": 6223.48838127984
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "06",
                "key": 1527811200000,
                "doc_count": 931323,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 744,
                  "sum_other_doc_count": 26494,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 676912,
                      "totalsum": {
                        "value": 3.1211316393238993E9
                      },
                      "myCount": {
                        "value": 3921
                      },
                      "Script": {
                        "value": 796003.9886059422
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 149031,
                      "totalsum": {
                        "value": 3.6329251201975906E8
                      },
                      "myCount": {
                        "value": 3472
                      },
                      "Script": {
                        "value": 104634.94009785687
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 32778,
                      "totalsum": {
                        "value": 1.518528057939148E8
                      },
                      "myCount": {
                        "value": 815
                      },
                      "Script": {
                        "value": 186322.46109682796
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 16247,
                      "totalsum": {
                        "value": 4.0105939984573364E7
                      },
                      "myCount": {
                        "value": 429
                      },
                      "Script": {
                        "value": 93487.0395910801
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 7532,
                      "totalsum": {
                        "value": 8839414.39755869
                      },
                      "myCount": {
                        "value": 386
                      },
                      "Script": {
                        "value": 22900.037299374842
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 7163,
                      "totalsum": {
                        "value": 3.6395440489435196E7
                      },
                      "myCount": {
                        "value": 770
                      },
                      "Script": {
                        "value": 47266.80583043532
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 5073,
                      "totalsum": {
                        "value": 2.5359101975143433E7
                      },
                      "myCount": {
                        "value": 647
                      },
                      "Script": {
                        "value": 39194.902589093406
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 3657,
                      "totalsum": {
                        "value": 1.6229295380811691E7
                      },
                      "myCount": {
                        "value": 839
                      },
                      "Script": {
                        "value": 19343.617855556247
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 3319,
                      "totalsum": {
                        "value": 1.3442600098350525E7
                      },
                      "myCount": {
                        "value": 837
                      },
                      "Script": {
                        "value": 16060.4541198931
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 3117,
                      "totalsum": {
                        "value": 1.2085627913707733E7
                      },
                      "myCount": {
                        "value": 898
                      },
                      "Script": {
                        "value": 13458.382977402822
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "07",
                "key": 1530403200000,
                "doc_count": 923672,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 426,
                  "sum_other_doc_count": 23154,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 697154,
                      "totalsum": {
                        "value": 1.464032463521615E9
                      },
                      "myCount": {
                        "value": 4066
                      },
                      "Script": {
                        "value": 360067.01021190727
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 130904,
                      "totalsum": {
                        "value": 3.525835988988092E8
                      },
                      "myCount": {
                        "value": 2759
                      },
                      "Script": {
                        "value": 127793.98292816571
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 35962,
                      "totalsum": {
                        "value": 1.3970700515757847E8
                      },
                      "myCount": {
                        "value": 1049
                      },
                      "Script": {
                        "value": 133181.12979750094
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 9180,
                      "totalsum": {
                        "value": 1.2495497951011658E7
                      },
                      "myCount": {
                        "value": 260
                      },
                      "Script": {
                        "value": 48059.60750389099
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 8457,
                      "totalsum": {
                        "value": 3.144270960344696E7
                      },
                      "myCount": {
                        "value": 889
                      },
                      "Script": {
                        "value": 35368.62722547464
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 5488,
                      "totalsum": {
                        "value": 2.1684460616081238E7
                      },
                      "myCount": {
                        "value": 784
                      },
                      "Script": {
                        "value": 27658.750785817905
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 3854,
                      "totalsum": {
                        "value": 1.4247203679344177E7
                      },
                      "myCount": {
                        "value": 892
                      },
                      "Script": {
                        "value": 15972.201434242352
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 3348,
                      "totalsum": {
                        "value": 1.2275958413552284E7
                      },
                      "myCount": {
                        "value": 809
                      },
                      "Script": {
                        "value": 15174.237841226557
                      }
                    },
                    {
                      "key": "Gemma",
                      "doc_count": 3151,
                      "totalsum": {
                        "value": 1.3189618197639465E7
                      },
                      "myCount": {
                        "value": 613
                      },
                      "Script": {
                        "value": 21516.50603203828
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 3020,
                      "totalsum": {
                        "value": 1.0653769616725922E7
                      },
                      "myCount": {
                        "value": 896
                      },
                      "Script": {
                        "value": 11890.36787581018
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "08",
                "key": 1533081600000,
                "doc_count": 657101,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 75,
                  "sum_other_doc_count": 2807,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 620639,
                      "totalsum": {
                        "value": 1.1705303904762297E9
                      },
                      "myCount": {
                        "value": 3949
                      },
                      "Script": {
                        "value": 296411.84868985304
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 25837,
                      "totalsum": {
                        "value": 3.645821793388462E7
                      },
                      "myCount": {
                        "value": 854
                      },
                      "Script": {
                        "value": 42691.12170244101
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 4202,
                      "totalsum": {
                        "value": 7769976.48667717
                      },
                      "myCount": {
                        "value": 257
                      },
                      "Script": {
                        "value": 30233.37154349093
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 840,
                      "totalsum": {
                        "value": 1525118.454714775
                      },
                      "myCount": {
                        "value": 87
                      },
                      "Script": {
                        "value": 17530.0971806296
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 799,
                      "totalsum": {
                        "value": 1411812.8026647568
                      },
                      "myCount": {
                        "value": 186
                      },
                      "Script": {
                        "value": 7590.391412176112
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 475,
                      "totalsum": {
                        "value": 740658.7479829788
                      },
                      "myCount": {
                        "value": 207
                      },
                      "Script": {
                        "value": 3578.0615844588347
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 434,
                      "totalsum": {
                        "value": 753942.6629390717
                      },
                      "myCount": {
                        "value": 184
                      },
                      "Script": {
                        "value": 4097.514472494955
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 425,
                      "totalsum": {
                        "value": 888404.7399253845
                      },
                      "myCount": {
                        "value": 112
                      },
                      "Script": {
                        "value": 7932.185177905219
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 340,
                      "totalsum": {
                        "value": 578644.8503990173
                      },
                      "myCount": {
                        "value": 140
                      },
                      "Script": {
                        "value": 4133.177502850124
                      }
                    },
                    {
                      "key": "Gemma",
                      "doc_count": 303,
                      "totalsum": {
                        "value": 628473.0986251831
                      },
                      "myCount": {
                        "value": 102
                      },
                      "Script": {
                        "value": 6161.50096691356
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "09",
                "key": 1535760000000,
                "doc_count": 1018210,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 320,
                  "sum_other_doc_count": 11171,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 559631,
                      "totalsum": {
                        "value": 1.7867078927432508E9
                      },
                      "myCount": {
                        "value": 3688
                      },
                      "Script": {
                        "value": 484465.26375901594
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 421068,
                      "totalsum": {
                        "value": 5.1085300709691536E8
                      },
                      "myCount": {
                        "value": 5370
                      },
                      "Script": {
                        "value": 95130.91379830826
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 15919,
                      "totalsum": {
                        "value": 3.9567039969854355E7
                      },
                      "myCount": {
                        "value": 611
                      },
                      "Script": {
                        "value": 64757.8395578631
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 2555,
                      "totalsum": {
                        "value": 5763427.656814575
                      },
                      "myCount": {
                        "value": 467
                      },
                      "Script": {
                        "value": 12341.386845427356
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 1791,
                      "totalsum": {
                        "value": 5153696.0521698
                      },
                      "myCount": {
                        "value": 284
                      },
                      "Script": {
                        "value": 18146.81708510493
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1635,
                      "totalsum": {
                        "value": 3778791.082889557
                      },
                      "myCount": {
                        "value": 661
                      },
                      "Script": {
                        "value": 5716.779247941841
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 1536,
                      "totalsum": {
                        "value": 2745335.321308136
                      },
                      "myCount": {
                        "value": 610
                      },
                      "Script": {
                        "value": 4500.549707062518
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1116,
                      "totalsum": {
                        "value": 2578035.9629096985
                      },
                      "myCount": {
                        "value": 395
                      },
                      "Script": {
                        "value": 6526.673323822021
                      }
                    },
                    {
                      "key": "Caroline Gardner Publishing",
                      "doc_count": 897,
                      "totalsum": {
                        "value": 467758.33990478516
                      },
                      "myCount": {
                        "value": 470
                      },
                      "Script": {
                        "value": 995.2305104357131
                      }
                    },
                    {
                      "key": "Paper Rose",
                      "doc_count": 891,
                      "totalsum": {
                        "value": 2596665.932067871
                      },
                      "myCount": {
                        "value": 259
                      },
                      "Script": {
                        "value": 10025.73718945124
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "10",
                "key": 1538352000000,
                "doc_count": 973416,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 136,
                  "sum_other_doc_count": 8092,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 662810,
                      "totalsum": {
                        "value": 1.5591184727296343E9
                      },
                      "myCount": {
                        "value": 4378
                      },
                      "Script": {
                        "value": 356125.736119149
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 159656,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 109209,
                      "totalsum": {
                        "value": 1.5491902959786022E8
                      },
                      "myCount": {
                        "value": 2187
                      },
                      "Script": {
                        "value": 70836.31897478749
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 21342,
                      "totalsum": {
                        "value": 5.816191079769707E7
                      },
                      "myCount": {
                        "value": 681
                      },
                      "Script": {
                        "value": 85406.62378516456
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 3602,
                      "totalsum": {
                        "value": 8921634.717132568
                      },
                      "myCount": {
                        "value": 510
                      },
                      "Script": {
                        "value": 17493.40140614229
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 2382,
                      "totalsum": {
                        "value": 7488508.337860107
                      },
                      "myCount": {
                        "value": 378
                      },
                      "Script": {
                        "value": 19810.868618677534
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1975,
                      "totalsum": {
                        "value": 4973415.870965958
                      },
                      "myCount": {
                        "value": 700
                      },
                      "Script": {
                        "value": 7104.879815665654
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1817,
                      "totalsum": {
                        "value": 4645132.314222336
                      },
                      "myCount": {
                        "value": 504
                      },
                      "Script": {
                        "value": 9216.532369488761
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 1256,
                      "totalsum": {
                        "value": 3416974.9483146667
                      },
                      "myCount": {
                        "value": 467
                      },
                      "Script": {
                        "value": 7316.862844356888
                      }
                    },
                    {
                      "key": "Paper Rose",
                      "doc_count": 1168,
                      "totalsum": {
                        "value": 3671395.5266304016
                      },
                      "myCount": {
                        "value": 294
                      },
                      "Script": {
                        "value": 12487.739886497964
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "11",
                "key": 1541030400000,
                "doc_count": 659023,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 40,
                  "sum_other_doc_count": 1698,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 504333,
                      "totalsum": {
                        "value": 7.028150167473059E8
                      },
                      "myCount": {
                        "value": 3960
                      },
                      "Script": {
                        "value": 177478.539582653
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 116129,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 31861,
                      "totalsum": {
                        "value": 5.6220418209965706E7
                      },
                      "myCount": {
                        "value": 1021
                      },
                      "Script": {
                        "value": 55064.0726836099
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 2129,
                      "totalsum": {
                        "value": 3080725.670742035
                      },
                      "myCount": {
                        "value": 127
                      },
                      "Script": {
                        "value": 24257.682446787676
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 723,
                      "totalsum": {
                        "value": 823013.4113082886
                      },
                      "myCount": {
                        "value": 31
                      },
                      "Script": {
                        "value": 26548.819719622214
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 526,
                      "totalsum": {
                        "value": 829235.6257591248
                      },
                      "myCount": {
                        "value": 99
                      },
                      "Script": {
                        "value": 8376.11743191035
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 520,
                      "totalsum": {
                        "value": 1089455.613708496
                      },
                      "myCount": {
                        "value": 47
                      },
                      "Script": {
                        "value": 23179.906674648853
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 290,
                      "totalsum": {
                        "value": 384463.8596572876
                      },
                      "myCount": {
                        "value": 112
                      },
                      "Script": {
                        "value": 3432.7130326543534
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 242,
                      "totalsum": {
                        "value": 289513.32957077026
                      },
                      "myCount": {
                        "value": 133
                      },
                      "Script": {
                        "value": 2176.791951659927
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 168,
                      "totalsum": {
                        "value": 235386.04014587402
                      },
                      "myCount": {
                        "value": 90
                      },
                      "Script": {
                        "value": 2615.400446065267
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "12",
                "key": 1543622400000,
                "doc_count": 589782,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 24,
                  "sum_other_doc_count": 930,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 459979,
                      "totalsum": {
                        "value": 8.384111403984108E8
                      },
                      "myCount": {
                        "value": 3562
                      },
                      "Script": {
                        "value": 235376.51330668468
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 94954,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 28587,
                      "totalsum": {
                        "value": 2.5714109802767754E7
                      },
                      "myCount": {
                        "value": 882
                      },
                      "Script": {
                        "value": 29154.31950427183
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 2844,
                      "totalsum": {
                        "value": 4517264.057630539
                      },
                      "myCount": {
                        "value": 98
                      },
                      "Script": {
                        "value": 46094.53120031162
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 920,
                      "totalsum": {
                        "value": 1043728.5076293945
                      },
                      "myCount": {
                        "value": 31
                      },
                      "Script": {
                        "value": 33668.66153643208
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 468,
                      "totalsum": {
                        "value": 562094.0441741943
                      },
                      "myCount": {
                        "value": 39
                      },
                      "Script": {
                        "value": 14412.667799338316
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 401,
                      "totalsum": {
                        "value": 548614.1612243652
                      },
                      "myCount": {
                        "value": 105
                      },
                      "Script": {
                        "value": 5224.896773565383
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 291,
                      "totalsum": {
                        "value": 444730.7501220703
                      },
                      "myCount": {
                        "value": 107
                      },
                      "Script": {
                        "value": 4156.362150673554
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 269,
                      "totalsum": {
                        "value": 418519.298576355
                      },
                      "myCount": {
                        "value": 91
                      },
                      "Script": {
                        "value": 4599.113171168736
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 123,
                      "totalsum": {
                        "value": 120410.40010070801
                      },
                      "myCount": {
                        "value": 29
                      },
                      "Script": {
                        "value": 4152.08276209338
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "01",
                "key": 1546300800000,
                "doc_count": 824827,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 214,
                  "sum_other_doc_count": 12325,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 519594,
                      "totalsum": {
                        "value": 7.371324470807419E8
                      },
                      "myCount": {
                        "value": 3585
                      },
                      "Script": {
                        "value": 205615.74535027667
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 130452,
                      "totalsum": {
                        "value": 1.5139954725908017E8
                      },
                      "myCount": {
                        "value": 3496
                      },
                      "Script": {
                        "value": 43306.50665305497
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 122451,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 12712,
                      "totalsum": {
                        "value": 2.1994343167633057E7
                      },
                      "myCount": {
                        "value": 354
                      },
                      "Script": {
                        "value": 62130.91290291824
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 12298,
                      "totalsum": {
                        "value": 3.2450452605527878E7
                      },
                      "myCount": {
                        "value": 399
                      },
                      "Script": {
                        "value": 81329.45515169894
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 6679,
                      "totalsum": {
                        "value": 9856497.149141312
                      },
                      "myCount": {
                        "value": 507
                      },
                      "Script": {
                        "value": 19440.822779371425
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 2270,
                      "totalsum": {
                        "value": 4705316.710435867
                      },
                      "myCount": {
                        "value": 568
                      },
                      "Script": {
                        "value": 8284.008293020894
                      }
                    },
                    {
                      "key": "Woodmansterne",
                      "doc_count": 2168,
                      "totalsum": {
                        "value": 4200823.03616333
                      },
                      "myCount": {
                        "value": 344
                      },
                      "Script": {
                        "value": 12211.69487256782
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 2071,
                      "totalsum": {
                        "value": 5647884.513334274
                      },
                      "myCount": {
                        "value": 547
                      },
                      "Script": {
                        "value": 10325.200207192458
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 1807,
                      "totalsum": {
                        "value": 3376778.005443573
                      },
                      "myCount": {
                        "value": 356
                      },
                      "Script": {
                        "value": 9485.331475965093
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "02",
                "key": 1548979200000,
                "doc_count": 727880,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 167,
                  "sum_other_doc_count": 7397,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 466562,
                      "totalsum": {
                        "value": 8.046687499127092E8
                      },
                      "myCount": {
                        "value": 3364
                      },
                      "Script": {
                        "value": 239199.98511079347
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 126970,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 100099,
                      "totalsum": {
                        "value": 5.1447948780206084E7
                      },
                      "myCount": {
                        "value": 3228
                      },
                      "Script": {
                        "value": 15938.026264004364
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 12902,
                      "totalsum": {
                        "value": 1.6595756348501205E7
                      },
                      "myCount": {
                        "value": 381
                      },
                      "Script": {
                        "value": 43558.41561286405
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 6813,
                      "totalsum": {
                        "value": 6773547.350036621
                      },
                      "myCount": {
                        "value": 218
                      },
                      "Script": {
                        "value": 31071.318119434043
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 2721,
                      "totalsum": {
                        "value": 2591829.9282445908
                      },
                      "myCount": {
                        "value": 312
                      },
                      "Script": {
                        "value": 8307.14720591215
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1355,
                      "totalsum": {
                        "value": 1888066.873638153
                      },
                      "myCount": {
                        "value": 446
                      },
                      "Script": {
                        "value": 4233.333797394962
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1085,
                      "totalsum": {
                        "value": 1492291.203666687
                      },
                      "myCount": {
                        "value": 427
                      },
                      "Script": {
                        "value": 3494.8271748634356
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 1058,
                      "totalsum": {
                        "value": 1301614.271528244
                      },
                      "myCount": {
                        "value": 423
                      },
                      "Script": {
                        "value": 3077.102296757078
                      }
                    },
                    {
                      "key": "Susan O'Hanlon",
                      "doc_count": 918,
                      "totalsum": {
                        "value": 907076.8000030518
                      },
                      "myCount": {
                        "value": 188
                      },
                      "Script": {
                        "value": 4824.876595760914
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "03",
                "key": 1551398400000,
                "doc_count": 898320,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 199,
                  "sum_other_doc_count": 7527,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 476439,
                      "totalsum": {
                        "value": 7.714737995854368E8
                      },
                      "myCount": {
                        "value": 3408
                      },
                      "Script": {
                        "value": 226371.4200661493
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 248568,
                      "totalsum": {
                        "value": 5.626188530089897E8
                      },
                      "myCount": {
                        "value": 4310
                      },
                      "Script": {
                        "value": 130538.01693944076
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 148394,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 8058,
                      "totalsum": {
                        "value": 4.0860823864385605E7
                      },
                      "myCount": {
                        "value": 196
                      },
                      "Script": {
                        "value": 208473.59114482452
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 4774,
                      "totalsum": {
                        "value": 5187356.901977539
                      },
                      "myCount": {
                        "value": 138
                      },
                      "Script": {
                        "value": 37589.54276795318
                      }
                    },
                    {
                      "key": "Hallmark Value",
                      "doc_count": 915,
                      "totalsum": {
                        "value": 2132727.876110077
                      },
                      "myCount": {
                        "value": 222
                      },
                      "Script": {
                        "value": 9606.882324820166
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 914,
                      "totalsum": {
                        "value": 5235668.933387756
                      },
                      "myCount": {
                        "value": 200
                      },
                      "Script": {
                        "value": 26178.34466693878
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 817,
                      "totalsum": {
                        "value": 3940803.5635261536
                      },
                      "myCount": {
                        "value": 199
                      },
                      "Script": {
                        "value": 19803.032982543486
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 759,
                      "totalsum": {
                        "value": 1275692.229976654
                      },
                      "myCount": {
                        "value": 68
                      },
                      "Script": {
                        "value": 18760.179852597852
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 682,
                      "totalsum": {
                        "value": 3771809.261701584
                      },
                      "myCount": {
                        "value": 174
                      },
                      "Script": {
                        "value": 21677.064722422896
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "04",
                "key": 1554076800000,
                "doc_count": 886235,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 375,
                  "sum_other_doc_count": 14599,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 601910,
                      "totalsum": {
                        "value": 9.434552502903404E8
                      },
                      "myCount": {
                        "value": 3502
                      },
                      "Script": {
                        "value": 269404.69739872654
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 155495,
                      "totalsum": {
                        "value": 1.1902861132121778E8
                      },
                      "myCount": {
                        "value": 4372
                      },
                      "Script": {
                        "value": 27225.2084449263
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 76976,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 18453,
                      "totalsum": {
                        "value": 4.002195925341225E7
                      },
                      "myCount": {
                        "value": 763
                      },
                      "Script": {
                        "value": 52453.419729242785
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 10713,
                      "totalsum": {
                        "value": 1.3664235457334518E7
                      },
                      "myCount": {
                        "value": 493
                      },
                      "Script": {
                        "value": 27716.501941855007
                      }
                    },
                    {
                      "key": "Woodmansterne",
                      "doc_count": 2073,
                      "totalsum": {
                        "value": 2149530.505569458
                      },
                      "myCount": {
                        "value": 448
                      },
                      "Script": {
                        "value": 4798.0591642175405
                      }
                    },
                    {
                      "key": "Susan O'Hanlon",
                      "doc_count": 1653,
                      "totalsum": {
                        "value": 1842771.563697815
                      },
                      "myCount": {
                        "value": 439
                      },
                      "Script": {
                        "value": 4197.657320496161
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1399,
                      "totalsum": {
                        "value": 2475285.961500764
                      },
                      "myCount": {
                        "value": 719
                      },
                      "Script": {
                        "value": 3442.6786668995323
                      }
                    },
                    {
                      "key": "Emotional Rescue",
                      "doc_count": 1391,
                      "totalsum": {
                        "value": 3159322.5044822693
                      },
                      "myCount": {
                        "value": 458
                      },
                      "Script": {
                        "value": 6898.084070921986
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 1373,
                      "totalsum": {
                        "value": 1347730.3047389984
                      },
                      "myCount": {
                        "value": 427
                      },
                      "Script": {
                        "value": 3156.277060278685
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "05",
                "key": 1556668800000,
                "doc_count": 781504,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 158,
                  "sum_other_doc_count": 5904,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 606107,
                      "totalsum": {
                        "value": 8.4222856632162E8
                      },
                      "myCount": {
                        "value": 3430
                      },
                      "Script": {
                        "value": 245547.68697423322
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 116262,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 45019,
                      "totalsum": {
                        "value": 5.162725824137771E7
                      },
                      "myCount": {
                        "value": 1554
                      },
                      "Script": {
                        "value": 33222.17390050046
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 2501,
                      "totalsum": {
                        "value": 1.1858157519582748E7
                      },
                      "myCount": {
                        "value": 151
                      },
                      "Script": {
                        "value": 78530.844500548
                      }
                    },
                    {
                      "key": "Woodmansterne",
                      "doc_count": 1183,
                      "totalsum": {
                        "value": 824583.4749107361
                      },
                      "myCount": {
                        "value": 219
                      },
                      "Script": {
                        "value": 3765.2213466243657
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 1139,
                      "totalsum": {
                        "value": 1757102.0599861145
                      },
                      "myCount": {
                        "value": 168
                      },
                      "Script": {
                        "value": 10458.940833250681
                      }
                    },
                    {
                      "key": "Waitrose",
                      "doc_count": 1083,
                      "totalsum": {
                        "value": 843547.057132721
                      },
                      "myCount": {
                        "value": 182
                      },
                      "Script": {
                        "value": 4634.873940289675
                      }
                    },
                    {
                      "key": "Janie Wilson Ltd",
                      "doc_count": 812,
                      "totalsum": {
                        "value": 520622.75719451904
                      },
                      "myCount": {
                        "value": 183
                      },
                      "Script": {
                        "value": 2844.933099423601
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 717,
                      "totalsum": {
                        "value": 1596912.2721595764
                      },
                      "myCount": {
                        "value": 292
                      },
                      "Script": {
                        "value": 5468.877644382111
                      }
                    },
                    {
                      "key": "Susan O'Hanlon",
                      "doc_count": 583,
                      "totalsum": {
                        "value": 418654.0279006958
                      },
                      "myCount": {
                        "value": 170
                      },
                      "Script": {
                        "value": 2462.670752357034
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "06",
                "key": 1559347200000,
                "doc_count": 960646,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 412,
                  "sum_other_doc_count": 22276,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 531733,
                      "totalsum": {
                        "value": 1.035413940947587E9
                      },
                      "myCount": {
                        "value": 3084
                      },
                      "Script": {
                        "value": 335737.33493760927
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 218864,
                      "totalsum": {
                        "value": 6.930178201160359E8
                      },
                      "myCount": {
                        "value": 3699
                      },
                      "Script": {
                        "value": 187352.74942309703
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 99439,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 58136,
                      "totalsum": {
                        "value": 3.3289434065352917E8
                      },
                      "myCount": {
                        "value": 702
                      },
                      "Script": {
                        "value": 474208.46246941475
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 6445,
                      "totalsum": {
                        "value": 3.2306991475839615E7
                      },
                      "myCount": {
                        "value": 817
                      },
                      "Script": {
                        "value": 39543.44121889794
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 5809,
                      "totalsum": {
                        "value": 3.140808464967537E7
                      },
                      "myCount": {
                        "value": 813
                      },
                      "Script": {
                        "value": 38632.33044240513
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 4604,
                      "totalsum": {
                        "value": 3941617.0087213516
                      },
                      "myCount": {
                        "value": 356
                      },
                      "Script": {
                        "value": 11071.957889666717
                      }
                    },
                    {
                      "key": "Emotional Rescue",
                      "doc_count": 4579,
                      "totalsum": {
                        "value": 2.190715058058262E7
                      },
                      "myCount": {
                        "value": 804
                      },
                      "Script": {
                        "value": 27247.699727092808
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 4311,
                      "totalsum": {
                        "value": 2.19567262344265E7
                      },
                      "myCount": {
                        "value": 653
                      },
                      "Script": {
                        "value": 33624.38933296554
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 4304,
                      "totalsum": {
                        "value": 2.232221816581154E7
                      },
                      "myCount": {
                        "value": 841
                      },
                      "Script": {
                        "value": 26542.471065174243
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "07",
                "key": 1561939200000,
                "doc_count": 1144187,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 320,
                  "sum_other_doc_count": 26288,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 610077,
                      "totalsum": {
                        "value": 1.57529604904459E8
                      },
                      "myCount": {
                        "value": 878
                      },
                      "Script": {
                        "value": 179418.68440143394
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 289901,
                      "totalsum": {
                        "value": 1.74261974593544E9
                      },
                      "myCount": {
                        "value": 3809
                      },
                      "Script": {
                        "value": 457500.5896391284
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 86234,
                      "totalsum": {
                        "value": 7.519136064864613E8
                      },
                      "myCount": {
                        "value": 1183
                      },
                      "Script": {
                        "value": 635598.9911128159
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 83630,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 10148,
                      "totalsum": {
                        "value": 8.327845904252934E7
                      },
                      "myCount": {
                        "value": 1234
                      },
                      "Script": {
                        "value": 67486.59565845165
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 9488,
                      "totalsum": {
                        "value": 7.863554657165194E7
                      },
                      "myCount": {
                        "value": 1176
                      },
                      "Script": {
                        "value": 66866.96137045232
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 7772,
                      "totalsum": {
                        "value": 4.425950279939461E7
                      },
                      "myCount": {
                        "value": 378
                      },
                      "Script": {
                        "value": 117088.63174443018
                      }
                    },
                    {
                      "key": "Emotional Rescue",
                      "doc_count": 7368,
                      "totalsum": {
                        "value": 5.386228972919083E7
                      },
                      "myCount": {
                        "value": 1167
                      },
                      "Script": {
                        "value": 46154.48991361682
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 6798,
                      "totalsum": {
                        "value": 5.450146221885502E7
                      },
                      "myCount": {
                        "value": 1021
                      },
                      "Script": {
                        "value": 53380.47230054361
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 6482,
                      "totalsum": {
                        "value": 5.627077054436076E7
                      },
                      "myCount": {
                        "value": 1231
                      },
                      "Script": {
                        "value": 45711.430174135465
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "08",
                "key": 1564617600000,
                "doc_count": 718467,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 130,
                  "sum_other_doc_count": 6958,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 499007,
                      "totalsum": {
                        "value": 6139007.425445557
                      },
                      "myCount": {
                        "value": 70
                      },
                      "Script": {
                        "value": 87700.10607779367
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 124410,
                      "totalsum": {
                        "value": 9.714729595935253E8
                      },
                      "myCount": {
                        "value": 1493
                      },
                      "Script": {
                        "value": 650685.1705247993
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 68868,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 10030,
                      "totalsum": {
                        "value": 1.3398388973311377E8
                      },
                      "myCount": {
                        "value": 323
                      },
                      "Script": {
                        "value": 414810.8041272872
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 2132,
                      "totalsum": {
                        "value": 1.7340590897384644E7
                      },
                      "myCount": {
                        "value": 284
                      },
                      "Script": {
                        "value": 61058.418652762826
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 1752,
                      "totalsum": {
                        "value": 2.017440958790779E7
                      },
                      "myCount": {
                        "value": 278
                      },
                      "Script": {
                        "value": 72569.81866153881
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1528,
                      "totalsum": {
                        "value": 1.5760601508430481E7
                      },
                      "myCount": {
                        "value": 304
                      },
                      "Script": {
                        "value": 51844.08390931079
                      }
                    },
                    {
                      "key": "Gemma",
                      "doc_count": 1347,
                      "totalsum": {
                        "value": 1.7573849062253952E7
                      },
                      "myCount": {
                        "value": 256
                      },
                      "Script": {
                        "value": 68647.8478994295
                      }
                    },
                    {
                      "key": "Emotional Rescue",
                      "doc_count": 1203,
                      "totalsum": {
                        "value": 1.2790732940994263E7
                      },
                      "myCount": {
                        "value": 249
                      },
                      "Script": {
                        "value": 51368.40538551913
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 1160,
                      "totalsum": {
                        "value": 1.1532898021593094E7
                      },
                      "myCount": {
                        "value": 257
                      },
                      "Script": {
                        "value": 44875.089578183244
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "09",
                "key": 1567296000000,
                "doc_count": 805268,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 123,
                  "sum_other_doc_count": 16825,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 327370,
                      "totalsum": {
                        "value": 34758.899631500244
                      },
                      "myCount": {
                        "value": 8
                      },
                      "Script": {
                        "value": 4344.8624539375305
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 312085,
                      "totalsum": {
                        "value": 1.5616617903614862E9
                      },
                      "myCount": {
                        "value": 3750
                      },
                      "Script": {
                        "value": 416443.14409639634
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 80649,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 26496,
                      "totalsum": {
                        "value": 2.1978239109468126E8
                      },
                      "myCount": {
                        "value": 1214
                      },
                      "Script": {
                        "value": 181039.86086876545
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 20441,
                      "totalsum": {
                        "value": 2.3414330485464096E7
                      },
                      "myCount": {
                        "value": 1134
                      },
                      "Script": {
                        "value": 20647.557747322837
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 5263,
                      "totalsum": {
                        "value": 4.057068572764969E7
                      },
                      "myCount": {
                        "value": 1491
                      },
                      "Script": {
                        "value": 27210.386135244593
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 4349,
                      "totalsum": {
                        "value": 2.8079602168941498E7
                      },
                      "myCount": {
                        "value": 1651
                      },
                      "Script": {
                        "value": 17007.633052054207
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 3866,
                      "totalsum": {
                        "value": 2.2860036326221466E7
                      },
                      "myCount": {
                        "value": 1523
                      },
                      "Script": {
                        "value": 15009.872834025913
                      }
                    },
                    {
                      "key": "Emotional Rescue",
                      "doc_count": 3729,
                      "totalsum": {
                        "value": 2.513494300048828E7
                      },
                      "myCount": {
                        "value": 1468
                      },
                      "Script": {
                        "value": 17121.895776899375
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 3509,
                      "totalsum": {
                        "value": 2.559887920506859E7
                      },
                      "myCount": {
                        "value": 1321
                      },
                      "Script": {
                        "value": 19378.409693466
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "10",
                "key": 1569888000000,
                "doc_count": 810466,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 35,
                  "sum_other_doc_count": 5991,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 404765,
                      "totalsum": {
                        "value": 2709.0
                      },
                      "myCount": {
                        "value": 2
                      },
                      "Script": {
                        "value": 1354.5
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 256484,
                      "totalsum": {
                        "value": 3.659371202206125E8
                      },
                      "myCount": {
                        "value": 4385
                      },
                      "Script": {
                        "value": 83452.02285532783
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 119006,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 12601,
                      "totalsum": {
                        "value": 1.3020700227909088E7
                      },
                      "myCount": {
                        "value": 749
                      },
                      "Script": {
                        "value": 17384.112453817208
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 4511,
                      "totalsum": {
                        "value": 1.8732760238544464E7
                      },
                      "myCount": {
                        "value": 182
                      },
                      "Script": {
                        "value": 102927.25405793662
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 1753,
                      "totalsum": {
                        "value": 1783612.8238105774
                      },
                      "myCount": {
                        "value": 628
                      },
                      "Script": {
                        "value": 2840.147808615569
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 1341,
                      "totalsum": {
                        "value": 3010698.2605056763
                      },
                      "myCount": {
                        "value": 569
                      },
                      "Script": {
                        "value": 5291.209596670784
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 1310,
                      "totalsum": {
                        "value": 2209677.8555221558
                      },
                      "myCount": {
                        "value": 595
                      },
                      "Script": {
                        "value": 3713.7442949952197
                      }
                    },
                    {
                      "key": "Quitting Hollywood",
                      "doc_count": 1246,
                      "totalsum": {
                        "value": 3888205.5950737
                      },
                      "myCount": {
                        "value": 447
                      },
                      "Script": {
                        "value": 8698.446521417673
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 1244,
                      "totalsum": {
                        "value": 2352869.1809444427
                      },
                      "myCount": {
                        "value": 579
                      },
                      "Script": {
                        "value": 4063.677341872958
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "11",
                "key": 1572566400000,
                "doc_count": 473369,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 16,
                  "sum_other_doc_count": 1557,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 213509,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 1
                      },
                      "Script": {
                        "value": 0.0
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 133970,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 119206,
                      "totalsum": {
                        "value": 1.1333537146841371E8
                      },
                      "myCount": {
                        "value": 3114
                      },
                      "Script": {
                        "value": 36395.430786260025
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 2285,
                      "totalsum": {
                        "value": 2162029.317372799
                      },
                      "myCount": {
                        "value": 286
                      },
                      "Script": {
                        "value": 7559.54306773706
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 1142,
                      "totalsum": {
                        "value": 4301059.502067566
                      },
                      "myCount": {
                        "value": 90
                      },
                      "Script": {
                        "value": 47789.55002297295
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 330,
                      "totalsum": {
                        "value": 290220.6802330017
                      },
                      "myCount": {
                        "value": 143
                      },
                      "Script": {
                        "value": 2029.5152463846273
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 309,
                      "totalsum": {
                        "value": 642073.6132659912
                      },
                      "myCount": {
                        "value": 137
                      },
                      "Script": {
                        "value": 4686.668709970739
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 277,
                      "totalsum": {
                        "value": 338105.9920654297
                      },
                      "myCount": {
                        "value": 142
                      },
                      "Script": {
                        "value": 2381.028113136829
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 273,
                      "totalsum": {
                        "value": 378755.6009902954
                      },
                      "myCount": {
                        "value": 150
                      },
                      "Script": {
                        "value": 2525.037339935303
                      }
                    },
                    {
                      "key": "Danillo",
                      "doc_count": 262,
                      "totalsum": {
                        "value": 705114.173412323
                      },
                      "myCount": {
                        "value": 109
                      },
                      "Script": {
                        "value": 6468.937370755257
                      }
                    }
                  ]
                }
              },
              {
                "key_as_string": "12",
                "key": 1575158400000,
                "doc_count": 314295,
                "Item.MainCategory": {
                  "meta": {
                    "BreakBy": "Item.MainCategory"
                  },
                  "doc_count_error_upper_bound": 2,
                  "sum_other_doc_count": 198,
                  "buckets": [
                    {
                      "key": "Pocket",
                      "doc_count": 120732,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 1
                      },
                      "Script": {
                        "value": 0.0
                      }
                    },
                    {
                      "key": "Box",
                      "doc_count": 96975,
                      "totalsum": {
                        "value": 0.0
                      },
                      "myCount": {
                        "value": 0
                      },
                      "Script": {
                        "value": null
                      }
                    },
                    {
                      "key": "Hallmark",
                      "doc_count": 95233,
                      "totalsum": {
                        "value": 5.4161665695130825E7
                      },
                      "myCount": {
                        "value": 1821
                      },
                      "Script": {
                        "value": 29742.814769429337
                      }
                    },
                    {
                      "key": "Tesco",
                      "doc_count": 346,
                      "totalsum": {
                        "value": 280605.7167663574
                      },
                      "myCount": {
                        "value": 38
                      },
                      "Script": {
                        "value": 7384.360967535722
                      }
                    },
                    {
                      "key": "Morrisons",
                      "doc_count": 213,
                      "totalsum": {
                        "value": 166856.72060775757
                      },
                      "myCount": {
                        "value": 59
                      },
                      "Script": {
                        "value": 2828.0800103009756
                      }
                    },
                    {
                      "key": "Hallmark Value",
                      "doc_count": 109,
                      "totalsum": {
                        "value": 57678.430335998535
                      },
                      "myCount": {
                        "value": 72
                      },
                      "Script": {
                        "value": 801.0893102222019
                      }
                    },
                    {
                      "key": "Carte Blanche Greetings",
                      "doc_count": 74,
                      "totalsum": {
                        "value": 58517.78957366943
                      },
                      "myCount": {
                        "value": 30
                      },
                      "Script": {
                        "value": 1950.5929857889812
                      }
                    },
                    {
                      "key": "Tailormade",
                      "doc_count": 51,
                      "totalsum": {
                        "value": 34449.75961303711
                      },
                      "myCount": {
                        "value": 25
                      },
                      "Script": {
                        "value": 1377.9903845214844
                      }
                    },
                    {
                      "key": "Pigment",
                      "doc_count": 47,
                      "totalsum": {
                        "value": 46122.13973236084
                      },
                      "myCount": {
                        "value": 23
                      },
                      "Script": {
                        "value": 2005.3104231461234
                      }
                    },
                    {
                      "key": "Me To You",
                      "doc_count": 42,
                      "totalsum": {
                        "value": 48537.97969055176
                      },
                      "myCount": {
                        "value": 21
                      },
                      "Script": {
                        "value": 2311.3323662167504
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
              if (response.Series.indexOf(seriesName) == -1) {
                response.Series.push(seriesName);
              }
              series.AggregatedFields.forEach((aggregatedField) => {
                const keyString = this.buildAggragationFieldString(aggregatedField);
                const dataSetKeyString = this.buildDataSetKeyString(seriesName, series.Label);
                dataSet[dataSetKeyString] = bucket[keyString].value;
              })

            });
            response.DataSet.push(dataSet)
          });
        });

      }
      else if (series.BreakBy?.FieldID) {
        resourceAggs[series.BreakBy.FieldID].buckets.forEach(bucket => {
          const seriesName = this.getKeyAggregationName(bucket);
          response.Series.push(seriesName);

          this.handleAggregatedFields(seriesName,series.Label, bucket, series.AggregatedFields, response);
          // series.AggregatedFields.forEach((aggregatedField) => {

          //   const keyString = this.buildAggragationFieldString(aggregatedField);
          //   response.Series.push(seriesName);
          //   response.DataSet.push({ [seriesName]: bucket[keyString].value });
          // })
        });

      } else {
        response.Series.push(series.Name);

        this.handleAggregatedFields(series.Name, series.Label, resourceAggs, series.AggregatedFields, response);
        // series.AggregatedFields.forEach((aggregatedField) => {

        //   const keyString = this.buildAggragationFieldString(aggregatedField);

        //   response.Series.push(series.Name);
        //   response.DataSet.push({ [series.Name]: resourceAggs[keyString].value });
        // })
      }

    });

    return response;
  }
  private handleAggregatedFields(seriesName, seriesLabel, seriesAggregation, aggregatedFields, response) {
    aggregatedFields.forEach((aggregatedField) => {

      const keyString = this.buildAggragationFieldString(aggregatedField);
      const dataSetKeyString = this.buildDataSetKeyString(seriesName,seriesLabel);
      response.DataSet.push({ [dataSetKeyString]: seriesAggregation[keyString].value });
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
    //return key.split('.').join("");
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
    if (aggregatedField.Aggregator === 'Script') {
      return `${aggregatedField.Aggregator}`
    } else {
      return `${aggregatedField.FieldID}_${aggregatedField.Aggregator}`
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