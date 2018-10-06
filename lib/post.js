var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var checkQueryForNonPrimaryIndices = require('./common').checkQueryForNonPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildPostQuery = require('./common').buildPostQuery;
var queryDynamoPost = require('./common').queryDynamoPost;
var formatResponseObject = require('./common').formatResponseObject;

var post = async function(dynamo, tableName, query){
    try{
        var eventQuery = query;
        var indices = await getIndices(dynamo, tableName);

        await checkQueryForNonPrimaryIndices(indices, eventQuery);

        eventQuery = generatePrimaryKeyIdIntoQuery(indices, eventQuery);

        var query = await buildPostQuery(tableName, indices, eventQuery);

        var results = await queryDynamoPost(dynamo, query);

        return Promise.resolve({data: formatResponseObject({data: [query.Item]})['data'][0]});
    }
    catch(e){
        return Promise.reject(e);
    }
}

module.exports = post;
