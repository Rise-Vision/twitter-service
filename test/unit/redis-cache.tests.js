const assert = require("assert");
const simple = require("simple-mock");
const api = require("../../src/redis-cache/api");
const redis = require("redis-promise");

describe("redis-cache/api", ()=>{

  beforeEach(()=>{
    simple.mock(redis, "setString").resolveWith();
  });

  afterEach(()=>{
    simple.restore();
  });

  describe("getStatusFor", ()=>{
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

  describe("saveStatus", ()=>{
    it("should save the status object", ()=>{
      const status = {
        loading: false
      };

      return api.saveStatus('risevision', status).then(() => {
        assert.equal(redis.setString.callCount, 1);
        assert.equal(redis.setString.lastCall.args[0], "risevision:status");

        const value = redis.setString.lastCall.args[1];
        assert.deepEqual(JSON.parse(value), status);
      });
    });
  });

});
