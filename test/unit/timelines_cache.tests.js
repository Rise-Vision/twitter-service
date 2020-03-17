/* eslint-disable max-lines, no-magic-numbers, max-statements, no-extra-parens */

const assert = require("assert");
const simple = require("simple-mock");

const cache = require('../../src/redis-cache/api');
const oauthTokenProvider = require("../../src/redis-otp/api");
const {NOT_FOUND_ERROR, SECONDS} = require("../../src/constants");
const config = require("../../src/config");
const timelines = require("../../src/timelines");
const formatter = require("../../src/timelines/data_formatter");
const twitter = require("../../src/twitter");
const utils = require("../../src/utils");

const sampleTweets = require("./samples/tweets-timeline").data;
const sampleTweetsFormatted = formatter.getTimelineFormatted(sampleTweets);

const maxExpiration = (config.cacheExpirationInMillis / SECONDS) + 1;

describe("Timelines / handleGetTweetsRequest / Cache", () => {
  let req = null;
  let res = null;

  beforeEach(() => {
    req = {
      query: {
        companyId: "test",
        username: "risevision"
      }
    };
    res = {
      header: simple.stub(),
      status: simple.stub(),
      send: simple.stub(),
      json: simple.stub()
    }

    simple.mock(cache, "getStatusFor").resolveWith({loading: false});
    simple.mock(cache, "saveStatus").resolveWith();
    simple.mock(cache, "getTweetsFor").resolveWith(sampleTweetsFormatted);
    simple.mock(cache, "saveTweets").resolveWith();
    simple.mock(cache, "getUserQuotaFor").resolveWith();
    simple.mock(cache, "saveUserQuota").resolveWith();
    simple.mock(oauthTokenProvider, "getCredentials").resolveWith({});
    simple.mock(twitter, "getUserTimeline").resolveWith({
      data: sampleTweets,
      quota: {}
    });
  });

  afterEach(() => {
    simple.restore();
  });

  it("should not get cached tweets if there is no lastUpdated flag", () => {
    req.query.count = "3";

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: false
      });

      assert(twitter.getUserTimeline.called);
    });
  });

  it("should not get cached tweets if lastUpdated flag is very old", () => {
    req.query.count = "3";

    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: 1
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: false
      });

      assert(twitter.getUserTimeline.called);
    });
  });

  it("should not get cached tweets if expiration has passed", () => {
    req.query.count = "3";

    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: utils.currentTimestamp() - config.cacheExpirationInMillis - 1
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: false
      });

      assert(twitter.getUserTimeline.called);
    });
  });

  it("should clear invalidUsername flag when expiration has passed", () => {
    req.query.count = "3";

    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: utils.currentTimestamp() - config.cacheExpirationInMillis - 1,
      invalidUsername: true
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: false
      });

      assert(twitter.getUserTimeline.called);

      assert(!cache.saveStatus.lastCall.args[1].invalidUsername);
    });
  });

  it("should get cached tweets if expiration has not passed", () => {
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: utils.currentTimestamp()
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: true
      });

      assert(!twitter.getUserTimeline.called);

      assert.equal(res.header.callCount, 1);

      assert.equal(res.header.lastCall.args[0], "Cache-control");

      const header = res.header.lastCall.args[1];
      assert(header);

      const fragments = header.split("=");
      assert.equal(fragments[0], "private, max-age");

      const expiration = Number(fragments[1]);
      assert(expiration > 0);
      assert.equal(expiration, maxExpiration);
    });
  });

  it("should return error if expiration has not passed, but invalidUsername flat is on", () => {
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: utils.currentTimestamp(),
      invalidUsername: true
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(!res.json.called);

      assert(res.status.called);
      assert.equal(res.status.lastCall.args[0], NOT_FOUND_ERROR);

      assert(res.send.called);
      assert.equal(res.send.lastCall.args[0], "Username not found: 'risevision'");

      assert(!twitter.getUserTimeline.called);
    });
  });

  it("should return tweets if the loading flag is set and there are cached tweets", () => {
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: true,
      loadingStarted: utils.currentTimestamp(),
      lastUpdated: utils.currentTimestamp()
    });

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: true
      });

      assert(!twitter.getUserTimeline.called);

      assert.equal(res.header.callCount, 1);

      assert.equal(res.header.lastCall.args[0], "Cache-control");

      const header = res.header.lastCall.args[1];
      assert(header);

      const fragments = header.split("=");
      assert.equal(fragments[0], "private, max-age");

      const expiration = Number(fragments[1]);
      assert.equal(expiration, config.retryLoadInSeconds);
    });
  });

  it("should return cached tweets if the remotely returned tweet count is less than what it's requested", () => {
    req.query.count = "10";

    return timelines.handleGetTweetsRequest(req, res)
    .then(() => {
      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: sampleTweetsFormatted,
        cached: true
      });

      assert(twitter.getUserTimeline.called);
      assert.equal(twitter.getUserTimeline.lastCall.args[1].username, "risevision");

      assert.equal(res.header.callCount, 1);
      assert(!res.status.called);
      assert(!res.send.called);

      assert.equal(cache.saveStatus.callCount, 3);

      // Started loading
      assert.equal(cache.saveStatus.calls[0].args[0], "risevision");
      assert(cache.saveStatus.calls[0].args[1].loading);
      assert(cache.saveStatus.calls[0].args[1].loadingStarted);
      assert(!cache.saveStatus.calls[0].args[1].lastUpdated);
      assert(!cache.saveStatus.calls[0].args[1].lastTweetId);

      // Status updated
      assert.equal(cache.saveStatus.calls[1].args[0], "risevision");
      assert(cache.saveStatus.calls[1].args[1].loading);
      assert(cache.saveStatus.calls[1].args[1].loadingStarted);
      assert(cache.saveStatus.calls[1].args[1].lastUpdated);
      assert.equal(cache.saveStatus.calls[1].args[1].lastTweetId, "1");

      // Stopped loading
      assert.equal(cache.saveStatus.calls[2].args[0], "risevision");
      assert(!cache.saveStatus.calls[2].args[1].loading);
      assert(!cache.saveStatus.calls[2].args[1].loadingStarted);
      assert(cache.saveStatus.calls[2].args[1].lastUpdated);
      assert.equal(cache.saveStatus.calls[2].args[1].lastTweetId, "1");

      assert.equal(res.header.lastCall.args[0], "Cache-control");

      const header = res.header.lastCall.args[1];
      assert(header);

      const fragments = header.split("=");
      assert.equal(fragments[0], "private, max-age");

      const expiration = Number(fragments[1]);
      assert(expiration > 0);
      assert.equal(expiration, maxExpiration);
    });
  });

});
