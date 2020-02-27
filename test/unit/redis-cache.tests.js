const assert = require("assert");
const simple = require("simple-mock");
const api = require("../../src/redis-cache/api");
const redis = require("redis-promise");

describe("redis-cache/api", ()=>{

  afterEach(()=>{
    simple.restore();
  });

  it("should get the status object", ()=>{
    const storedStatus = {
      loading: false
    };

    simple.mock(redis, "getString").resolveWith(JSON.stringify(storedStatus));

    return api.getStatusFor('risevision').then(status => {
      assert.deepEqual(status, storedStatus);

      assert.equal(redis.getString.callCount, 1);
      assert.equal(redis.getString.lastCall.args[0], "risevision:status");
    });
  });

  it("should return null if there is no status stored", ()=>{
    simple.mock(redis, "getString").resolveWith(null);

    return api.getStatusFor('risevision').then(status => {
      assert(status === null);

      assert.equal(redis.getString.callCount, 1);
      assert.equal(redis.getString.lastCall.args[0], "risevision:status");
    });
  });

});
