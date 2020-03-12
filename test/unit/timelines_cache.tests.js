/* eslint-disable max-lines, no-magic-numbers, max-statements, no-extra-parens */

const assert = require("assert");
const simple = require("simple-mock");

const cache = require('../../src/redis-cache/api');
const oauthTokenProvider = require("../../src/redis-otp/api");
const {SECONDS} = require("../../src/constants");
const config = require("../../src/config");
const timelines = require("../../src/timelines");
const formatter = require("../../src/timelines/data_formatter");
const twitter = require("../../src/twitter");

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
    simple.mock(oauthTokenProvider, "getCredentials").resolveWith({});
    simple.mock(twitter, "getUserTimeline").resolveWith(sampleTweets);
  });

  afterEach(() => {
    simple.restore();
  });

  it("should not get cached tweets if there is no lastUpdated flag", () => {
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
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: new Date().getTime() - config.cacheExpirationInMillis - 1
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

  it("should get cached tweets if expiration has not passed", () => {
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: false,
      lastUpdated: new Date().getTime()
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

  it("should return tweets if the loading flag is set and there are cached tweets", () => {
    simple.mock(cache, "getStatusFor").resolveWith({
      loading: true,
      loadingStarted: new Date().getTime(),
      lastUpdated: new Date().getTime()
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

});
