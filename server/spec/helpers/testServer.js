/* eslint-env jasmine */
/*eslint no-console: "off"*/

var child_process = require('child_process');
var fs = require('fs');

var db = require('../../models');
var { asyncTest } = require('./asyncTest');

function testServer({ seed, mode }) {
  var info = {};
  var before = async () => {
    info.server = child_process.fork(require.resolve('../../apps/serve.js'), [], {
      env: {
        NODE_ENV: 'testing',
        SEED_ON_START: seed ? 'true' : undefined
      }
    });
    var { port, dbPath } = await new Promise((ok, fail) => {
      info.server.once('message', ok);
      info.server.on('error', event => {
        console.log('Test server error:', event);
        fail();
      });
    });
    info.port = port;
    info.dbPath = dbPath;
    info.eventQueue = [];
    info.listenerQueue = [];
    info.server.on('message', event => {
      if (info.listenerQueue.length) {
        info.listenerQueue.shift()(event);
      } else {
        info.eventQueue.push(event);
      }
    });
  };
  var after = async () => {
    info.server.kill();
    await new Promise((ok, fail) => {
      info.server.on('exit', ok);
      info.server.on('error', fail);
    });
    await new Promise((ok, fail) => {
      fs.unlink(info.dbPath, (err) => {
        if (err) {
          fail(err);
        } else {
          ok();
        }
      });
    });
    info.dbPath = info.port = info.server = undefined;
  };
  var nextEvent = async () => {
    if (info.eventQueue.length) {
      return info.eventQueue.shift();
    } else {
      return await new Promise(ok => {
        info.listenerQueue.push(ok);
      });
    }
  };
  var url = path => {
    if (!info.port) {
      throw new Error('url: server not started yet');
    }
    return `http://localhost:${info.port}${path}`;
  };
  if (mode === 'each') {
    beforeEach(asyncTest(before), 60000);
    afterEach(asyncTest(after), 60000);
  } else { // all
    beforeAll(asyncTest(before), 60000);
    afterAll(asyncTest(after), 60000);
  }
  return {
    url,
    nextEvent,
    openDB: () => db.test.open(info.dbPath)
  };
}

module.exports = { testServer };
