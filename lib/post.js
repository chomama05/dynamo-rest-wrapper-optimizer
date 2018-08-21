var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var checkQueryForNonPrimaryIndices = require('./common').checkQueryForNonPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildPostQuery = require('./common').buildPostQuery;
var queryDynamoPost = require('./common').queryDynamoPost;
var formatResponseObject = require('./common').formatResponseObject;

var post = function(dynamo, tableName, query){
    var eventQuery = query;
    return new Promise(async function(resolve, reject){

        var indices = await getIndices(dynamo, tableName);

        try{
            await checkQueryForNonPrimaryIndices(indices, eventQuery);

            eventQuery = generatePrimaryKeyIdIntoQuery(indices, eventQuery);

            var query = await buildPostQuery(tableName, indices, eventQuery);

            var results = await queryDynamoPost(dynamo, query);

            return resolve({err: null, result: formatResponseObject({data: [query.Item]}, true)});
        }
        catch(e){
            return resolve({err: e});
        }
    })
}

module.exports = post;
