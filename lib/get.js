var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var getAttributeType = require('./common').getAttributeType;
var buildGetQuery = require('./common').buildGetQuery;
var queryDynamoGet = require('./common').queryDynamoGet;
var formatResponseObject = require('./common').formatResponseObject;

var get = function(dynamo, tableName, query, limit, offsetKey){
    var eventQuery = query;
    return new Promise(async function(resolve, reject){

        var indices = await getIndices(dynamo, tableName);

        var {type, primary, query} = await buildGetQuery(tableName, indices, eventQuery, limit, offsetKey);

        try{
            var results = await queryDynamoGet(dynamo, type, query, limit);
            return resolve({err: null, result: formatResponseObject(results, primary)});
        }
        catch(e){
            return resolve({err: e});
        }
    })
}

module.exports = get;
