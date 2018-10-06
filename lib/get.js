var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var getAttributeType = require('./common').getAttributeType;
var buildGetQuery = require('./common').buildGetQuery;
var queryDynamoGet = require('./common').queryDynamoGet;
var formatResponseObject = require('./common').formatResponseObject;

var get = async function(dynamo, tableName, query, limit, offsetKey){
    var eventQuery = query;
    try{
        var indices = await getIndices(dynamo, tableName);

        var {type, primary, query} = await buildGetQuery(tableName, indices, eventQuery, limit, offsetKey);

        var results = await queryDynamoGet(dynamo, type, query, limit);

        return Promise.resolve(formatResponseObject(results));
    }
    catch(e){
        return Promise.reject(e);
    }
}

module.exports = get;
