/* eslint-disable max-lines, no-magic-numbers, max-statements, no-extra-parens */

const assert = require("assert");
const simple = require("simple-mock");

const cache = require('../../src/redis-cache/api');
const oauthTokenProvider = require("../../src/redis-otp/api");
const config = require("../../src/config");
const constants = require("../../src/constants");
const timelines = require("../../src/timelines");
const formatter = require("../../src/timelines/data_formatter");
const twitter = require("../../src/twitter");
const utils = require("../../src/utils");
const mockData = require("../../src/timelines/mock-data");

const sample30Tweets = require("./samples/tweets-30").data;
const sampleTweets = require("./samples/tweets-timeline").data;
const mockDataTweets = mockData.tweets();

const sampleTweetsFormatted = formatter.getTimelineFormatted(sampleTweets);

const {
  BAD_REQUEST_ERROR, CONFLICT_ERROR, CONFLICT_ERROR_MESSAGE, FORBIDDEN_ERROR,
  NOT_FOUND_ERROR, SERVER_ERROR, SECONDS
} = constants;

const maxExpiration = (config.cacheExpirationInMillis / SECONDS) + 1;

describe("Timelines", () => {
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
    simple.mock(cache, "saveTweets").resolveWith();
    simple.mock(oauthTokenProvider, "getCredentials").resolveWith({});

    simple.mock(console, "warn");
  });

  afterEach(() => {
    simple.restore();
  });

  describe("handleDemoTweetsRequest", () => {
    it("should return mock data", () => {
      timelines.handleDemoTweetsRequest(res);

      assert(res.json.called);
      assert.deepEqual(res.json.lastCall.args[0], {
        tweets: mockDataTweets
      });

      assert(!res.status.called);
      assert(!res.send.called);
    });
  });

  describe("handleGetTweetsRequest / validation", () => {
    it("should reject if company id was not provided", () => {
      req.query.companyId = '';

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Company id was not provided");
      });
    });

    it("should reject if username was not provided", () => {
      req.query.username = '';

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Username was not provided");
      });
    });

    it("should reject if an invalid count is provided", () => {
      req.query.count = 'pato10';

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "'count' is not a valid integer value: pato10");
      });
    });

    it("should reject if a high count is provided", () => {
      req.query.count = '101';

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "'count' is out of range: 101");
      });
    });

    it("should reject if a zero count is provided", () => {
      req.query.count = '0';

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "'count' is out of range: 0");
      });
    });
  });

  describe("handleGetTweetsRequest / credentials", () => {
    it("should reject if credentials do not exist", () => {
      simple.mock(oauthTokenProvider, "getCredentials").rejectWith(new Error("No credentials for"));

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], FORBIDDEN_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "No credentials for");
      });
    });
  });

  describe("handleGetTweetsRequest / concurrent requests", () => {
    it("should reject if the loading flag is set", () => {
      simple.mock(cache, "getStatusFor").resolveWith({
        loading: true,
        loadingStarted: utils.currentTimestamp()
      });

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], CONFLICT_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], CONFLICT_ERROR_MESSAGE);

        assert(!cache.saveStatus.called);
      });
    });

    it("should return tweets if loading is turned on but it has expired", () => {
      req.query.count = "3";

      simple.mock(twitter, "getUserTimeline").resolveWith({
        data: sampleTweets,
        quota: {}
      });
      simple.mock(cache, "getUserQuotaFor").resolveWith();
      simple.mock(cache, "saveUserQuota").resolveWith();
      simple.mock(cache, "getStatusFor").resolveWith({
        loading: true,
        loadingStarted: utils.currentTimestamp() - config.loadingFlagTimeoutInMillis - 1
      });

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);
        assert.deepEqual(res.json.lastCall.args[0], {
          tweets: sampleTweetsFormatted,
          cached: false
        });

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

    it("should return tweets if loading is turned on but loadingStarted is not defined", () => {
      req.query.count = "3";

      simple.mock(twitter, "getUserTimeline").resolveWith({
        data: sampleTweets,
        quota: {}
      });
      simple.mock(cache, "getUserQuotaFor").resolveWith();
      simple.mock(cache, "saveUserQuota").resolveWith();
      simple.mock(cache, "getStatusFor").resolveWith({
        loading: true
      });

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);
        assert.deepEqual(res.json.lastCall.args[0], {
          tweets: sampleTweetsFormatted,
          cached: false
        });

        assert(!res.status.called);
        assert(!res.send.called);

        assert.equal(cache.saveStatus.callCount, 3);

        // Started loading
        assert.equal(cache.saveStatus.calls[0].args[0], "risevision");
        assert(cache.saveStatus.calls[0].args[1].loading);
        assert(cache.saveStatus.calls[0].args[1].loadingStarted);
        assert(!cache.saveStatus.calls[0].args[1].lastUpdated);
        assert(!cache.saveStatus.calls[0].args[1].lastTweetId);
        assert(!cache.saveStatus.calls[0].args[1].invalidUsername);

        // Status updated
        assert.equal(cache.saveStatus.calls[1].args[0], "risevision");
        assert(cache.saveStatus.calls[1].args[1].loading);
        assert(cache.saveStatus.calls[1].args[1].loadingStarted);
        assert(cache.saveStatus.calls[1].args[1].lastUpdated);
        assert.equal(cache.saveStatus.calls[1].args[1].lastTweetId, "1");
        assert(!cache.saveStatus.calls[1].args[1].invalidUsername);

        // Stopped loading
        assert.equal(cache.saveStatus.calls[2].args[0], "risevision");
        assert(!cache.saveStatus.calls[2].args[1].loading);
        assert(!cache.saveStatus.calls[2].args[1].loadingStarted);
        assert(cache.saveStatus.calls[2].args[1].lastUpdated);
        assert.equal(cache.saveStatus.calls[2].args[1].lastTweetId, "1");
        assert(!cache.saveStatus.calls[2].args[1].invalidUsername);
      });
    });
  });

  describe("handleGetTweetsRequest / Twitter API", () => {
    beforeEach(() => {
      simple.mock(cache, "getUserQuotaFor").resolveWith();
      simple.mock(cache, "saveUserQuota").resolveWith();
    });

    describe("reject", () => {
      it("should reject if Twitter API call fails", () => {
        simple.mock(twitter, "getUserTimeline").rejectWith({error: new Error("Network error."), quota: {}});

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(!res.json.called);

          assert(res.status.called);
          assert.equal(res.status.lastCall.args[0], SERVER_ERROR);

          assert(res.send.called);
          assert.equal(res.send.lastCall.args[0], "Network error.");

          assert.equal(cache.saveStatus.callCount, 2);

          // Started loading
          assert.equal(cache.saveStatus.calls[0].args[0], "risevision");
          assert(cache.saveStatus.calls[0].args[1].loading);
          assert(cache.saveStatus.calls[0].args[1].loadingStarted);

          // Stopped loading
          assert.equal(cache.saveStatus.calls[1].args[0], "risevision");
          assert(!cache.saveStatus.calls[1].args[1].loading);
          assert(!cache.saveStatus.calls[1].args[1].loadingStarted);
        });
      });

      it("should send forbidden error if Twitter API returns invalid token", () => {
        const error = new Error("Invalid or expired token.");
        error.code = constants.TWITTER_API_INVALID_OR_EXPIRED_TOKEN;

        simple.mock(twitter, "getUserTimeline").rejectWith({error, quota: {}});

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(!res.json.called);

          assert(res.status.called);
          assert.equal(res.status.lastCall.args[0], FORBIDDEN_ERROR);

          assert(res.send.called);
          assert.equal(res.send.lastCall.args[0], "Invalid or expired token.");

          assert.equal(cache.saveStatus.callCount, 2);

          // Started loading
          assert.equal(cache.saveStatus.calls[0].args[0], "risevision");
          assert(cache.saveStatus.calls[0].args[1].loading);
          assert(cache.saveStatus.calls[0].args[1].loadingStarted);

          // Stopped loading
          assert.equal(cache.saveStatus.calls[1].args[0], "risevision");
          assert(!cache.saveStatus.calls[1].args[1].loading);
          assert(!cache.saveStatus.calls[1].args[1].loadingStarted);
        });
      });
    });

    it("should send not found error if username is not valid", () => {
      const error = new Error();
      error.code = constants.TWITTER_API_RESOURCE_NOT_FOUND_CODE;

      simple.mock(twitter, "getUserTimeline").rejectWith({error, quota: {}});

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], NOT_FOUND_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Username not found: 'risevision'");

        assert.equal(cache.saveStatus.callCount, 3);

        // Started loading
        assert.equal(cache.saveStatus.calls[0].args[0], "risevision");
        assert(cache.saveStatus.calls[0].args[1].loading);
        assert(cache.saveStatus.calls[0].args[1].loadingStarted);
        assert(!cache.saveStatus.calls[0].args[1].invalidUsername);
        assert(!cache.saveStatus.calls[0].args[1].lastUpdated);

        // Stopped loading
        assert.equal(cache.saveStatus.calls[1].args[0], "risevision");
        assert(!cache.saveStatus.calls[1].args[1].loading);
        assert(!cache.saveStatus.calls[1].args[1].loadingStarted);
        assert(!cache.saveStatus.calls[1].args[1].invalidUsername);
        assert(!cache.saveStatus.calls[1].args[1].lastUpdated);

        // Username invalid set
        assert.equal(cache.saveStatus.calls[2].args[0], "risevision");
        assert(!cache.saveStatus.calls[2].args[1].loading);
        assert(!cache.saveStatus.calls[2].args[1].loadingStarted);
        assert(cache.saveStatus.calls[2].args[1].invalidUsername);
        assert(cache.saveStatus.calls[2].args[1].lastUpdated);
      });
    });

    describe("resolve", () => {
      beforeEach(() => {
        simple.mock(twitter, "getUserTimeline").resolveWith({
          data: sampleTweets,
          quota: {}
        });
      });

      it("should return tweets if Twitter API call is successful", () => {
        req.query.count = "3";

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(res.json.called);
          assert.deepEqual(res.json.lastCall.args[0], {
            tweets: sampleTweetsFormatted,
            cached: false
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

      it("should return tweets even if there's no username status stored", () => {
        req.query.count = "3";

        simple.mock(cache, "getStatusFor").resolveWith(null);

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(res.json.called);
          assert.deepEqual(res.json.lastCall.args[0], {
            tweets: sampleTweetsFormatted,
            cached: false
          });

          assert(!res.status.called);
          assert(!res.send.called);

          assert(twitter.getUserTimeline.called);
          assert.equal(twitter.getUserTimeline.lastCall.args[1].username, "risevision");
        });
      });

      it("should transform username to lowercase", () => {
        req.query.count = "3";
        req.query.username = "UPPERCASE";

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(res.json.called);

          assert(twitter.getUserTimeline.called);
          assert.equal(twitter.getUserTimeline.lastCall.args[1].username, "uppercase");

          assert(!res.status.called);
          assert(!res.send.called);

          assert.equal(cache.saveStatus.calls[0].args[0], "uppercase");
          assert.equal(cache.saveStatus.calls[1].args[0], "uppercase");
        });
      });
    });
  });

  describe("handleGetTweetsRequest / Limit output", () => {
    beforeEach(() => {
      simple.mock(cache, "getUserQuotaFor").resolveWith();
      simple.mock(cache, "saveUserQuota").resolveWith();

      simple.mock(twitter, "getUserTimeline").resolveWith({
        data: sample30Tweets,
        quota: {}
      });
    });

    it("should return 25 tweets by default", () => {
      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);

        const data = res.json.lastCall.args[0];
        assert(data);
        assert(data.tweets);
        assert.equal(25, data.tweets.length);

        assert(!res.status.called);
        assert(!res.send.called);
      });
    });

    it("should limit number of tweets based on count param", () => {
      req.query.count = "15";

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);

        const data = res.json.lastCall.args[0];
        assert(data);
        assert(data.tweets);
        assert.equal(15, data.tweets.length);

        assert(!res.status.called);
        assert(!res.send.called);
      });
    });
  });

  describe("handleGetTweetsEncryptedRequest / validation", () => {
    it("should reject if presentation id was not provided", () => {
      req.query.presentationId = '';

      return timelines.handleGetTweetsEncryptedRequest(req, res)
        .then(() => {
          assert(!res.json.called);

          assert(res.status.called);
          assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

          assert(res.send.called);
          assert.equal(res.send.lastCall.args[0], "Presentation id was not provided");
        });
    });

    it("should reject if componentId was not provided", () => {
      req.query.presentationId = 'test';
      req.query.componentId = '';

      return timelines.handleGetTweetsEncryptedRequest(req, res)
        .then(() => {
          assert(!res.json.called);

          assert(res.status.called);
          assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

          assert(res.send.called);
          assert.equal(res.send.lastCall.args[0], "Component id was not provided");
        });
    });

    it("should reject if username was not provided", () => {
      req.query.presentationId = 'test';
      req.query.componentId = 'test';
      req.query.username = '';

      return timelines.handleGetTweetsEncryptedRequest(req, res)
        .then(() => {
          assert(!res.json.called);

          assert(res.status.called);
          assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);

          assert(res.send.called);
          assert.equal(res.send.lastCall.args[0], "Username was not provided");
        });
    });
  });

});
