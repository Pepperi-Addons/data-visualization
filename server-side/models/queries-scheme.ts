export const QueriesScheme =
{
    "type": "object",
    "properties": {
        "Type": {
            "type": "string",
            "enum": ["Single", "Series", "MultiSeries"]
        },
        "Series": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "properties": {
                    "AggregatedFields": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "FieldID": {
                                    "type": "string",
                                    "minLength": 2
                                },
                                "Alias": {
                                    "type": "string"
                                },
                                "Script": {
                                    "type": "string"
                                },
                                "Aggregator": {
                                    "type": "string",
                                    "enum": ["Sum", "Count", "Average", "Script"]
                                }
                            },
                            "if": {
                                "properties": {
                                    "Aggregator": { "const": "Script" }
                                },
                                
                            },
                            "then": { "required": ["Script"] },
                            "else": { "required": ["FieldID"] },
                            "additionalProperties": false,
                            "required": [
                                "Aggregator"
                            ]
                        }
                    },
                    "AggregatedParams": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "FieldID": {
                                    "type": "string",
                                    "minLength": 2
                                },
                                "Name": {
                                    "type": "string"
                                },
                                "Aggregator": {
                                    "type": "string",
                                    "enum": ["Sum", "Count", "Average"]
                                }
                            },
                            "additionalProperties": false,
                            "required": [
                                "FieldID",
                                "Aggregator",
                                "Name"
                            ]
                        }
                    },
                    "Resource": {
                        "type": "string",
                        "enum": ["all_activities", "transaction_lines"]
                    },
                    "Label": {
                        "type": "string",
                        "minLength":1,
                        "default": "${label}"
                    },
                    "BreakBy": {
                        "type": "object",
                        "properties": {
                            "FieldID": {
                                "type": "string",
                                "minLength": 2
                            },
                            "Interval": {
                                "type": "integer"
                            },
                            "IntervalUnit": {
                                "type": "string",
                                "enum": ["Days", "Weeks", "Months", "Years"]
                            },
                            "Top": {
                                "type": "object",
                                "properties": {
                                    "FieldID": {
                                        "type": "string",
                                        "minLength": 2
                                    },
                                    "Max": {
                                        "type": "integer",
                                        "maximum": 100
                                    },
                                    "Ascending": {
                                        "type": "boolean"
                                    }
                                },
                                "additionalProperties": false
                            }
                        },
                        "additionalProperties": false,
                        "required": [
                            "FieldID"
                        ]
                    },
                    "GroupBy": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "FieldID": {
                                    "type": "string",
                                    "minLength": 2
                                },
                                "Interval": {
                                    "type": "integer"
                                },
                                "IntervalUnit": {
                                    "type": "string",
                                    "enum": ["Days", "Weeks", "Months", "Years"]
                                },
                                "Top": {
                                    "type": "object",
                                    "properties": {
                                        "FieldID": {
                                            "type": "string",
                                            "minLength": 2
                                        },
                                        "Max": {
                                            "type": "integer",
                                            "maximum": 100
                                        },
                                        "Ascending": {
                                            "type": "Ascending"
                                        }
                                    },
                                    "additionalProperties": false
                                }
                            },
                            "additionalProperties": false
                        }
                    },
                    "Name": {
                        "type": "string",
                        "minLength": 2
                    },
                    "Scope": {
                        "type": "object",
                        "properties": {
                            "Account": {
                                "type": "string",
                                "enum": ["Assigned", "All"]
                            },
                            "User": {
                                "type": "string",
                                "enum": ["Current", "UnderMyRole", "All"]
                            }
                        },
                        "additionalProperties": false,
                    },
                    "DynamicFilterFields": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "Filter": {
                        "type": "object"
                    }
                },
                "additionalProperties": false,
                "required": [
                    "AggregatedFields",
                    "Resource",
                    "Name"
                ]
            }
        },
        "ModificationDateTime": {
            "type": "string"
        },
        "CreationDateTime": {
            "type": "string"
        },
        "Hidden": {
            "type": "boolean"
        },
        "Key": {
            "type": "string"
        },
        "Name": {
            "type": "string"
        },
        "Description": {
            "type": "string"
        },
    },
    "anyOf": [
        {
            "required": { "required": ["Key"] }
        },
        {
            "required": { "required": ["Series"] }
        }
    ],
    "additionalProperties": false

}

