var attr = require('dynamodb-data-types').AttributeValue;
var getIndices = require('./common').getIndices;
var checkQueryForPrimaryIndices = require('./common').checkQueryForPrimaryIndices;
var generatePrimaryKeyIdIntoQuery = require('./common').generatePrimaryKeyIdIntoQuery;
var buildPutQuery = require('./common').buildPutQuery;
var queryDynamoPut = require('./common').queryDynamoPut;
var formatResponseObject = require('./common').formatResponseObject;

var put = async function(dynamo, tableName, query){
    try{
        var eventQuery = query;
        var indices = await getIndices(dynamo, tableName);

        await checkQueryForPrimaryIndices(indices, eventQuery);

        var query = await buildPutQuery(tableName, indices, eventQuery);

        var result = await queryDynamoPut(dynamo, query);

        return Promise.resolve({data: formatResponseObject({data: [result]})['data'][0]});
    }
    catch(e){
        if(e.message == 'The conditional request failed'){
            return Promise.reject({err: 'The Primary Key you entered does not exist'});
        }
        return Promise.reject(e);
    }
}

module.exports = put;
