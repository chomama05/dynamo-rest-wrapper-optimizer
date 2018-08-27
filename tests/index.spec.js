jest.mock('../lib/common.js');

const {
get,
post,
put
} = require('../index.js');
const deleteFunction = require('../index.js').delete;

test('get is a function', () => {
    expect(typeof get).toEqual('function');
});

test('get is a Promise', () => {
    var getInstance;
    expect(getInstance = get()).resolves.toMatchObject(expect.any(Object));
    expect(getInstance instanceof Promise).toBeTruthy();
});

test('post is a function', () => {
    expect(typeof post).toEqual('function');
});

test('post is a Promise', () => {
    var postInstance;
    expect(postInstance = post()).resolves.toMatchObject(expect.any(Object));
    expect(postInstance instanceof Promise).toBeTruthy();
});

test('put is a function', () => {
    expect(typeof put).toEqual('function');
});

test('put is a Promise', () => {
    var putInstance;
    expect(putInstance = put()).resolves.toMatchObject(expect.any(Object));
    expect(putInstance instanceof Promise).toBeTruthy();
});

test('delete is a function', () => {
    expect(typeof deleteFunction).toEqual('function');
});

test('delete is a Promise', () => {
    var deleteInstance;
    expect(deleteInstance = deleteFunction()).resolves.toMatchObject(expect.any(Object));
    expect(deleteInstance instanceof Promise).toBeTruthy();
});
