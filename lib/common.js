var uuid = require('uuid4');
var attr = require('dynamodb-data-types').AttributeValue;

/*
    Will return an array of Indices for a table
    (param1) - Object - The dynamo object to use to communicate with DynamoDB
    (param2) - String - The name of the Table
*/
var getIndices = function(dynamo, TABLE_NAME){
    return new Promise(function(resolve, reject){
        var indices = [];

        dynamo.describeTable({TableName: TABLE_NAME}, (err, data) => {
            if(err){
                return resolve(indices);//Non-blocking - Also means query won't be optimized.
            }

            //Primary Index
            indices.push({name: data.Table.KeySchema[0].AttributeName, type: getAttributeType(data.Table.AttributeDefinitions, data.Table.KeySchema[0].AttributeName), primaryIndex: true});

            //Secondary Indices
            if(data.Table.GlobalSecondaryIndexes){
                data.Table.GlobalSecondaryIndexes.map((index) => {
                    indices.push({
                        indexName: index.IndexName,
                        name: index.KeySchema[0].AttributeName,
                        type: getAttributeType(data.Table.AttributeDefinitions, index.KeySchema[0].AttributeName)
                    });
                })
            }

            return resolve(indices);
        })

    })
}

/*
    Will get the attribute type of an attribute
    (param1) - Array - Attribute Definitions [Can be obtained from dynamo.describeTable]
    (param2) - String - The Attribute you would like to fetch the type of
*/
var getAttributeType = function(attributeDefinitions, attributeName){
    return attributeDefinitions.filter((definition) => {
        return definition.AttributeName === attributeName;
    })[0].AttributeType;
}

/*
    Will Build (& Optimize) a DynamoDB query
    (param1) - String - The name of the table to Query
    (param2) - Array - An array of indices on the table (Can be an empty array)
    (param3) - Object - An object with the query attributes & values
    (param4) - Number - A limit of rows to fetch (Can be null)
    (param5) - Number - An Offset Key to start the query from
*/
var buildGetQuery = async function(TABLE_NAME, indices, eventQuery, limit, offsetKey){

    var type;
    var primary = false;
    var query = {TableName: TABLE_NAME}

    //If query is not empty
    if(eventQuery.constructor === Object && Object.keys(eventQuery).length !== 0){
        var index = await queryContainsIndex(indices, eventQuery);
        var expressionAttributeValues;
        if(index){
            type = 'query';
            var indexValueObject = {};
            query['Select'] = 'ALL_ATTRIBUTES';
            query['KeyConditionExpression'] = `${index.name} = :indexValue`;
            indexValueObject[index.type] = `${eventQuery[index.name]}`;
            expressionAttributeValues = {':indexValue': indexValueObject};

            if(index.indexName){
                query['IndexName'] = index.indexName;
                query['Select'] = 'ALL_PROJECTED_ATTRIBUTES';
            }

            if(index.primaryIndex){
                primary = true;
            }
        }

        var nonIndices = await returnNonIndexAttributes(indices, eventQuery);
        var formattedEventQuery = attr.wrap(nonIndices);

        var filterExpression = "";
        Object.keys(formattedEventQuery).map((attributeName) => {
            filterExpression += `#${attributeName} = :${attributeName}Value AND `;
        })
        filterExpression = filterExpression.replace(/ AND +$/, "");

        var expressionAttributeName = {};
        Object.keys(formattedEventQuery).map((attributeName) => {
            expressionAttributeName[`#${attributeName}`] = attributeName;
        })

        var expressionAttributeValues = expressionAttributeValues || {};
        Object.keys(formattedEventQuery).map((attributeName) => {
            expressionAttributeValues[`:${attributeName}Value`] = formattedEventQuery[attributeName];
        })

        if(filterExpression){
            query['FilterExpression'] = filterExpression;
        }

        if(Object.keys(expressionAttributeName).length !== 0){
            query['ExpressionAttributeNames'] = expressionAttributeName;
        }

        query['ExpressionAttributeValues'] = expressionAttributeValues;
    }

    type = type || 'scan';

    if(limit){
        query.Limit = limit;
    }

    if(offsetKey){
        try{
            query.ExclusiveStartKey = JSON.parse(Buffer.from(offsetKey, 'base64').toString('utf8'));
        }
        catch(e){}
    }
    return {type: type, primary: primary, query: query};
}

/*
    Will Build (& Optimize) a DynamoDB query
    (param1) - String - The name of the table to Query
    (param2) - Array - An array of indices on the table (Can be an empty array)
    (param3) - Object - An object with the query attributes & values
*/
var buildPostQuery = async (TABLE_NAME, indices, eventQuery) => {

    var primaryIndex = await getPrimaryIndex(indices);

    var query = {
        TableName: TABLE_NAME,
        Item: attr.wrap(eventQuery),
        ConditionExpression: 'attribute_not_exists(#h)',
        ExpressionAttributeNames: {'#h': primaryIndex.name}
    };

    return query;
}

/*
    Will Build (& Optimize) a DynamoDB query
    (param1) - String - The name of the table to Query
    (param2) - Array - An array of indices on the table (Can be an empty array)
    (param3) - Object - An object with the query attributes & values
*/
var buildPutQuery = async (TABLE_NAME, indices, eventQuery) => {

    var primaryIndex = await getPrimaryIndex(indices);
    var indexValueObject = {};
    indexValueObject[primaryIndex.name] = {};
    indexValueObject[primaryIndex.name][primaryIndex.type] = `${eventQuery[primaryIndex.name]}`;

    var query = {
        TableName: TABLE_NAME,
        Key: indexValueObject
    }

    //Build Expression
    var nonIndices = await returnNonPrimaryIndexAttributes(indices, eventQuery);
    var formattedEventQuery = attr.wrap(nonIndices);

    var updateExpression = "SET ";
    var expressionAttributeName = {};
    var expressionAttributeValues = {};
    Object.keys(formattedEventQuery).map((attributeName) => {
        updateExpression += `#${attributeName} = :${attributeName}Value, `;
        expressionAttributeName[`#${attributeName}`] = attributeName;
        expressionAttributeValues[`:${attributeName}Value`] = formattedEventQuery[attributeName];
    });
    updateExpression = updateExpression.replace(/, +$/, "");

    expressionAttributeName[`#h`] = primaryIndex.name;

    //Add to query
    query['UpdateExpression'] = updateExpression;
    query['ConditionExpression'] = 'attribute_exists(#h)';
    query['ExpressionAttributeNames'] = expressionAttributeName;
    query['ExpressionAttributeValues'] = expressionAttributeValues;
    query['ReturnValues'] = 'ALL_NEW';

    return query;
}

/*
    Will Build (& Optimize) a DynamoDB Delete query
    (param1) - String - The name of the table to Query
    (param2) - Array - An array of indices on the table
    (param3) - Object - An object with the query attributes (Must have Primary Key)
*/
var buildDeleteQuery = async (TABLE_NAME, indices, eventQuery) => {

    var primaryIndex = await getPrimaryIndex(indices);
    var indexValueObject = {};
    indexValueObject[primaryIndex.name] = {};
    indexValueObject[primaryIndex.name][primaryIndex.type] = `${eventQuery[primaryIndex.name]}`;

    var query = {
        TableName: TABLE_NAME,
        Key: indexValueObject
    }
    query['ConditionExpression'] = 'attribute_exists(#h)';
    query['ExpressionAttributeNames'] = {};
    query['ExpressionAttributeNames'][`#h`] = primaryIndex.name;

    return query;
}

/*
    Will determine if a query has an index (Used to optimize the query)
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var getPrimaryIndex = (indices) => {
    return new Promise((resolve, reject) => {

        indices.map((index) => {
            if(index.primaryIndex){
                return resolve(index);
            }
        })

    })
}

/*
    Will determine if a query has an index (Used to optimize the query)
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var queryContainsIndex = function(indices, query){
    return new Promise((resolve, reject) => {

        Object.keys(query).map((attributeName) => {
            indices.map((index) => {
                if(index.name === attributeName){
                    return resolve(index);
                }
            })
        })
        return resolve(false);

    })
}

/*
    Will return non-index attributes
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var returnNonIndexAttributes = function(indices, query){
    return new Promise((resolve, reject) => {
        var nonIndices = {};
        Object.keys(query).map((attributeName) => {
            var found = false;
            indices.map((index) => {
                if(index.name === attributeName){
                    found = true;
                }
            })

            if(!found){
                nonIndices[attributeName] = query[attributeName];
            }
        })
        return resolve(nonIndices);

    })
}

/*
    Will return non-Primary-index attributes
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var returnNonPrimaryIndexAttributes = function(indices, query){
    return new Promise((resolve, reject) => {
        var nonPrimaryIndices = {};
        Object.keys(query).map((attributeName) => {
            var found = false;
            indices.map((index) => {
                if(index.name === attributeName && index.primaryIndex){
                    found = true;
                }
            })

            if(!found){
                nonPrimaryIndices[attributeName] = query[attributeName];
            }
        })
        return resolve(nonPrimaryIndices);

    })
}

/*
    Will Check the query and see if it contains Indices (False if ANY are missing)
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var checkQueryForNonPrimaryIndices = function(indices, query){
    return new Promise((resolve, reject) => {

        indices.map((index) => {
            if(!index.primaryIndex){
                var found = false;
                Object.keys(query).map((attributeName) => {
                    if(index.name === attributeName){
                        found = true;
                    }
                });
                if(!found){
                    return reject(`Missing Required Field '${index.name}'`);
                }
            }
        })
        return resolve(true);

    })
}

/*
    Will Check the query and see if it contains Indices (False if ANY are missing)
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object with the dynamo-formatted query attributes & values
*/
var checkQueryForPrimaryIndices = function(indices, query){
    return new Promise((resolve, reject) => {

        indices.map((index) => {
            if(index.primaryIndex){
                var found = false;
                Object.keys(query).map((attributeName) => {
                    if(index.name === attributeName){
                        found = true;
                    }
                });
                if(!found){
                    return reject(`Missing Required Primary Index '${index.name}'`);
                }
            }
        })
        return resolve(true);

    })
}

/*
    Will generate a random UUID with V4 and return it
    (param1) - Array - An array containing the available indices
    (param2) - Object - An object from the event with the query
*/
var generatePrimaryKeyIdIntoQuery = (indices, query) => {

    indices.map((index) => {
        if(index.primaryIndex){
            query[index.name] = uuid();
        }
    })
    return query;
}

/*
    Will query DynamoDB to Read Data
    (param1) - Object - The DynamoDB Connection Object
    (param2) - string - (query || scan)
    (param3) - Object - An object with the dynamo-formatted query attributes & values
    (param4) - Number - A limit of rows to fetch (Can be null)
    (param5) - array - An array of Results. Used in recursion
    (param6) - Number - The Current count of elements returned. Used in recursion
*/
var queryDynamoGet = async function(dynamo, type, query, limit = 0, results = [], count = 0){
    return new Promise(async function(resolve, reject){

        dynamo[type](query, async (err, data) => {
            if(err){
                return reject(err);
            }

            // if(data.Items.length === 0){
            //     return resolve({data: []});
            // }

            count += data.Count;
            data.Items.map(item => {
                results.push(item);
            })

            if ((data.LastEvaluatedKey && limit != count) && data.Items.length !== 0) {
                if(query.Limit){
                    query.Limit = limit = count;
                }

                query.ExclusiveStartKey = data.LastEvaluatedKey;
                return await queryDynamo(dynamo, type, query, query.Limit, results, count);
            }

            //Nothing else to load
            var returnObject = {
                data: results
            }

            //Add LastEvaluatedKey if it exists
            if(data.LastEvaluatedKey && returnObject.data.length !== 0){
                returnObject.LastEvaluatedKey = Buffer.from(JSON.stringify(data.LastEvaluatedKey)).toString('base64')
            }

            return resolve(returnObject);
        })

    })
}

/*
    Will query DynamoDB to INSERT data
    (param1) - Object - The DynamoDB Connection Object
    (param3) - Object - An object with the dynamo-formatted query attributes & values
*/
var queryDynamoPost = (dynamo, query) => {
    return new Promise(async (resolve, reject) => {

        dynamo.putItem(query, function(err, data) {
            if(err){
                return reject(err);
            }

            return resolve(data);
        })

    })
}

/*
    Will query DynamoDB to UPDATE data
    (param1) - Object - The DynamoDB Connection Object
    (param3) - Object - An object with the dynamo-formatted query attributes & values
*/
var queryDynamoPut = (dynamo, query) => {
    return new Promise(async (resolve, reject) => {

        dynamo.updateItem(query, function(err, data) {
            if(err){
                return reject(err);
            }

            return resolve(data.Attributes);
        })

    })
}

/*
    Will query DynamoDB to DELETE data
    (param1) - Object - The DynamoDB Connection Object
    (param3) - Object - An object with the dynamo-formatted query attributes & values
*/
var queryDynamoDelete = (dynamo, query) => {
    return new Promise(async (resolve, reject) => {

        dynamo.deleteItem(query, function(err, data) {
            if(err){
                return reject(err);
            }

            return resolve(data);
        })

    })
}

/*
    Will format the response from DynamoDB into a flat array of object
    (param1) - string - (query || scan)
    (param2) - Object - An object with the dynamo-formatted query attributes & values
    (param3) - Number - A limit of rows to fetch (Can be null)
    (param4) - array - An array of Results. Used in recursion
    (param5) - Number - The Current count of elements returned. Used in recursion
*/
var formatResponseObject = function(responseObject, primary){
    var data = [];

    // if(primary){//Primary index should return 1 element
    //     return {data: attr.unwrap(responseObject.data[0])};
    // }

    responseObject.data.forEach(function(item){
        data.push(attr.unwrap(item));
    })

    responseObject['data'] = data;
    return responseObject;

}

exports.getIndices = getIndices;
exports.checkQueryForNonPrimaryIndices = checkQueryForNonPrimaryIndices;
exports.checkQueryForPrimaryIndices = checkQueryForPrimaryIndices;
exports.getAttributeType = getAttributeType;
exports.getPrimaryIndex = getPrimaryIndex;
exports.queryContainsIndex = queryContainsIndex;
exports.buildGetQuery = buildGetQuery;
exports.buildPostQuery = buildPostQuery;
exports.buildPutQuery = buildPutQuery;
exports.buildDeleteQuery = buildDeleteQuery;
exports.queryDynamoGet = queryDynamoGet;
exports.queryDynamoPost = queryDynamoPost;
exports.queryDynamoPut = queryDynamoPut;
exports.queryDynamoDelete = queryDynamoDelete;
exports.formatResponseObject = formatResponseObject;
exports.generatePrimaryKeyIdIntoQuery = generatePrimaryKeyIdIntoQuery;
