# dynamo-rest-wrapper-optimizer
## Dynamo REST Wrapper & Optimizer
This module attempts to simplify the interaction between a NodeJS application and DynamoDB using a RESTful protocol.

The need for this package came from the lack of libraries out there to simply create a REST API.

It exposes the common functions _GET_, _POST_, _PUT_ & _DELETE_

It is simple in design, as it does not do any validation, leaving it up to the implementation.

_Side Note_: This was created to be used in combination with other AWS Services. (API Gateway & Lambda Functions)

_**Limitation_: This module only supports Dynamo tables that use a HASH Key only. HASH-RANGE Keys are not supported.

## Requirements
`Node 7.6` & Higher

## Installation
```bash
npm install dynamo-rest-wrapper-optimizer
```
## Usage
__async/await__
```javascript
const AWS = require('aws-sdk');
const dynamoRestHelper = require('dynamo-rest-wrapper-optimizer');
const dynamoConnection = new AWS.DynamoDB();

var myTableName = "MyTableName";
var myQuery = {"firstName":"John"};
var queryLimit = 1;
//var offsetKey = "{{OFFSETKEY_HERE}}"

var {err, result} = await dynamoRestHelper.get(dynamoConnection, myTableName, myQuery, queryLimit, offsetKey);
```


## Quick Examples
### GET
__Non-Primary Key Query__
_Returns Array of results_
```javascript
var {err, result} = await dynamoRestHelper.get(dynamoConnection, "Users", {"firstName":"John"}, 2);

if(err){
    //Something went wrong...
    console.log(err);
}
console.log(result);
/*
Will output:
{
    "data":[
        {"firstName":"John","lastName":"Doe","age": 59,"email":"john_doe@gmail.com","userId":"abb7bd05-aaaf-49e7-b5a7-e2953342f17d"},
        {"firstName":"John","lastName":"Smith","age": 21,"email":"john_smith@hotmail.com","userId":"756d1605-5686-4ac0-af23-c03d41acd3d6"}
    ],
    "LastEvaluatedKey":"eyJleHBlcmltZW50SWQiOnsiUyI6ImFiYjdiZDA1LWFhYWYtNDllNy1iNWE3LWUyOTUzMzQyZjE3ZCJ9fQ=="
}
*/
```
__Primary Key Query__
_Returns Single result_
```javascript
var {err, result} = await dynamoRestHelper.get(dynamoConnection, "Users", {"userId":"abb7bd05-aaaf-49e7-b5a7-e2953342f17d"});

if(err){
    //Something went wrong...
    console.log(err);
}
console.log(result);
/*
Will output:
{
    "data":{"firstName":"John","lastName":"Doe","age": 59,"email":"john_doe@gmail.com","userId":"abb7bd05-aaaf-49e7-b5a7-e2953342f17d"}
}
*/
```

### POST
__Insert New Record__
_Returns Single result_

__SideNote__: Specifying Primary key is not necessary. A UUID4 will be generated
```javascript
var {err, result} = await dynamoRestHelper.post(dynamoConnection, "Users", {"firstName":"Eric", "lastName":"Smith", "age":15});

if(err){
    //Something went wrong...
    console.log(err);
}
console.log(result);
/*
Will output:
{
    "data":{"userId":"ae52de04-e897-425d-beaa-078d72a4ecf5","firstName":"Eric", "lastName":"Smith", "age":15}
}
*/
```

### PUT
__Updates an Existing Record__
_Returns Single result_

__SideNote__: Specifying Primary key is required. If not, will throw error
```javascript
var {err, result} = await dynamoRestHelper.put(dynamoConnection, "Users", {"userId":"ae52de04-e897-425d-beaa-078d72a4ecf5", "age": 16});

if(err){
    //Something went wrong...
    console.log(err);
}
console.log(result);
/*
Will output:
{
    "data":{"userId":"ae52de04-e897-425d-beaa-078d72a4ecf5","firstName":"Eric", "lastName":"Smith", "age":16}
}
*/
```

### DELETE
__Delete an Existing Record__
_Returns 'true' if successful_

__SideNote__: Specifying Primary key is required. If not, will throw error (Will also throw error if a non-existant key is specified)
```javascript
var {err, result} = await dynamoRestHelper.delete(dynamoConnection, "Users", {"userId":"ae52de04-e897-425d-beaa-078d72a4ecf5"});

if(err){
    //Something went wrong...
    console.log(err);
}
console.log(result);
/*
Will output:
true
*/
```
