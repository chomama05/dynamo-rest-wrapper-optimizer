var attr = require('dynamodb-data-types').AttributeValue;
var dynamoGet = require('./get');
var getIndices = require('./common').getIndices;
var getPrimaryIndex = require('./common').getPrimaryIndex;
var checkQueryForPrimaryIndices = require('./common').checkQueryForPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildDeleteQuery = require('./common').buildDeleteQuery;
var queryDynamoDelete = require('./common').queryDynamoDelete;
var formatResponseObject = require('./common').formatResponseObject;

var deleteFunction = function(dynamo, tableName, query){
    var eventQuery = query;
    return new Promise(async function(resolve, reject){

        var indices = await getIndices(dynamo, tableName);

        try{
            await checkQueryForPrimaryIndices(indices, eventQuery);

            var deleteQuery = await buildDeleteQuery(tableName, indices, eventQuery);

            var results = await queryDynamoDelete(dynamo, deleteQuery);

            return resolve({err: null, result: true});

        }
        catch(e){
            if(e.message == 'The conditional request failed'){
                return resolve({err: 'The Primary Key you entered does not exist'});
            }
            return resolve({err: e});
        }
    })
}

module.exports = deleteFunction;
