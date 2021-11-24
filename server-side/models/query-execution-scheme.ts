export const QueryExecutionScheme =
{
    "type": "object",
    "properties": {
        "Filter": {
            "type": "object",
        },
        "QueryId": {
            "type": "string"
        }
    },
    "required": [
        "QueryId",
    ],
    "additionalProperties": false
}