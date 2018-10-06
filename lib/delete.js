var attr = require('dynamodb-data-types').AttributeValue;
var dynamoGet = require('./get');
var getIndices = require('./common').getIndices;
var getPrimaryIndex = require('./common').getPrimaryIndex;
var checkQueryForPrimaryIndices = require('./common').checkQueryForPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildDeleteQuery = require('./common').buildDeleteQuery;
var queryDynamoDelete = require('./common').queryDynamoDelete;
var formatResponseObject = require('./common').formatResponseObject;

var deleteFunction = async function(dynamo, tableName, query){
    try{
        var eventQuery = query;

        var indices = await getIndices(dynamo, tableName);

        await checkQueryForPrimaryIndices(indices, eventQuery);

        var deleteQuery = await buildDeleteQuery(tableName, indices, eventQuery);

        var results = await queryDynamoDelete(dynamo, deleteQuery);

        return Promise.resolve(true);

    }
    catch(e){
        if(e.message == 'The conditional request failed'){
            return Promise.reject({err: 'The Primary Key you entered does not exist'});
        }
        return Promise.reject(e);
    }
}

module.exports = deleteFunction;
