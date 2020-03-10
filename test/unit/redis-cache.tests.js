/* eslint-disable no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const api = require("../../src/redis-cache/api");
const redis = require("redis-promise");

const sample30Tweets = require("./samples/tweets-30").data;
const sample30TweetsTexts = sample30Tweets.map(JSON.stringify);

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

  describe("getTweetsFor", ()=>{
    it("should get tweets", ()=>{
      simple.mock(redis, "getListRange").resolveWith(sample30TweetsTexts);

      return api.getTweetsFor('risevision', 30).then(tweets => {
        assert(tweets);
        assert.equal(tweets.length, 30);

        assert.equal(redis.getListRange.callCount, 1);
        assert.deepEqual(redis.getListRange.lastCall.args, [
          "risevision:tweets",
          0,
          29
        ]);
      });
    });

    it("should get empty array if there are no saved tweets", ()=>{
      simple.mock(redis, "getListRange").resolveWith(null);

      return api.getTweetsFor('risevision', 10).then(tweets => {
        assert(tweets);
        assert.equal(tweets.length, 0);

        assert.equal(redis.getListRange.callCount, 1);
        assert.deepEqual(redis.getListRange.lastCall.args, [
          "risevision:tweets",
          0,
          9
        ]);
      });
    });
  });

  describe("saveTweets", ()=>{
    beforeEach(()=>{
      simple.mock(redis, "pushLeft").resolveWith();
      simple.mock(redis, "trimLeft").resolveWith();
    });

    it("should save tweets", ()=>{
      return api.saveTweets('risevision', sample30Tweets).then(() => {
        assert.equal(redis.pushLeft.callCount, 1);
        assert.equal(redis.pushLeft.lastCall.args[0], "risevision:tweets");
        assert.deepEqual(redis.pushLeft.lastCall.args[1], sample30TweetsTexts);

        assert.equal(redis.trimLeft.callCount, 1);
        assert.deepEqual(redis.trimLeft.lastCall.args, [
          "risevision:tweets",
          0,
          99
        ]);
      });
    });

    it("should not save empty tweets", ()=>{
      return api.saveTweets('risevision', []).then(() => {
        assert.equal(redis.pushLeft.callCount, 0);
        assert.equal(redis.trimLeft.callCount, 0);
      });
    });

    it("should not save null tweets", ()=>{
      return api.saveTweets('risevision', null).then(() => {
        assert.equal(redis.pushLeft.callCount, 0);
        assert.equal(redis.trimLeft.callCount, 0);
      });
    });
  });

});
