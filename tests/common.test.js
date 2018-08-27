var mockDynamo = {
    describeTable: jest.fn((tableName) => {
        if(!tableName){
            return Promise.reject();
        }
        return Promise.resolve();
    })
}

const {
    getIndices
} = require('../lib/common');

test('getIndices is a function', () => {
    return expect(typeof getIndices).toEqual('function');
});
