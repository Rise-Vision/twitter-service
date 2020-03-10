/* eslint-disable no-magic-numbers, init-declarations */

const assert = require("assert");
const simple = require("simple-mock");
const headers = require("../../src/middleware/headers");

describe("redis-cache/api", ()=>{
  const req = {
    headers: {
      origin: "http://localhost"
    }
  };

  let next, res;

  beforeEach(()=>{
    res = {
      header: simple.stub()
    };

    next = simple.stub();
  });

  afterEach(()=>{
    simple.restore();
  });

  describe("setHeaders", ()=>{
    it("should set CORS and HSTS headers", ()=>{
      headers.setHeaders(req, res, next);

      assert.equal(res.header.callCount, 4);

      assert.deepEqual(res.header.calls[0].args, ["Access-Control-Allow-Origin", "http://localhost"]);
      assert.deepEqual(res.header.calls[1].args, ["Access-Control-Allow-Credentials", true]);
      assert.deepEqual(res.header.calls[2].args, ["Access-Control-Allow-Headers", "X-Requested-With"]);
      assert.deepEqual(res.header.calls[3].args, ["Strict-Transport-Security", "max-age=31536000"]);

      assert(next.called);
    });
  });
});
