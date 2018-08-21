var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var checkQueryForPrimaryIndices = require('./common').checkQueryForPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildPutQuery = require('./common').buildPutQuery;
var queryDynamoPut = require('./common').queryDynamoPut;
var formatResponseObject = require('./common').formatResponseObject;

var put = function(dynamo, tableName, query){
    var eventQuery = query;
    return new Promise(async function(resolve, reject){

        var indices = await getIndices(dynamo, tableName);

        try{
            await checkQueryForPrimaryIndices(indices, eventQuery);

            var query = await buildPutQuery(tableName, indices, eventQuery);

            var result = await queryDynamoPut(dynamo, query);

            return resolve({err: null, result: formatResponseObject({data: [result]}, true)});
        }
        catch(e){
            if(e.message == 'The conditional request failed'){
                return resolve({err: 'The Primary Key you entered does not exist'});
            }
            return resolve({err: e});
        }
    })
}

module.exports = put;
