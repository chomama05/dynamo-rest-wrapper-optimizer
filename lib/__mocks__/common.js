
exports.getIndices = () => Promise.resolve();
exports.buildGetQuery = () => Promise.resolve({type: 'query', primary: true, query: {"firstName":"John"}});
exports.queryDynamoGet = () => Promise.resolve({data: {"firstName": {"S":"John"}}});
exports.formatResponseObject = () => {return {data: {"firstName":"John"}}};
