/* eslint-disable max-lines, no-magic-numbers, max-statements, no-extra-parens */

const assert = require("assert");
const simple = require("simple-mock");

const cache = require('../../src/redis-cache/api');
const oauthTokenProvider = require("../../src/redis-otp/api");
const constants = require("../../src/constants");
const timelines = require("../../src/timelines");
const twitter = require("../../src/twitter");

const sample30Tweets = require("./samples/tweets-30").data;

const {
  CONFLICT_ERROR, SECONDS
} = constants;

describe("Timelines / Quota", () => {
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

  describe("handleGetTweetsRequest", () => {
    let tlResponse = null;

    beforeEach(() => {
      tlResponse = {
        data: sample30Tweets,
        quota: {}
      };

      simple.mock(cache, "saveUserQuota").resolveWith();

      simple.mock(twitter, "getUserTimeline").resolveWith(tlResponse);
    });

    it("should resolve if quota information is not cached", () => {
      simple.mock(cache, "getUserQuotaFor").resolveWith(null);

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(cache.getUserQuotaFor.called);
        assert(res.json.called);
        assert(!res.status.called);
      });
    });

    it("should resolve if remaining quota is greater than 0", () => {
      simple.mock(cache, "getUserQuotaFor").resolveWith({remaining: 10});

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(cache.getUserQuotaFor.called);
        assert(res.json.called);
        assert(!res.status.called);
      });
    });

    it("should resolve if remaining quota is less than 0 but reset timestamp has passed", () => {
      simple.mock(cache, "getUserQuotaFor").resolveWith({remaining: 0, resetTs: (Date.now() / SECONDS) - 100});

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(cache.getUserQuotaFor.called);
        assert(res.json.called);
        assert(!res.status.called);
      });
    });

    it("should reject if remaining quota is equal to 0 and reset timestamp has not passed", () => {
      simple.mock(cache, "getUserQuotaFor").resolveWith({remaining: 0, resetTs: (Date.now() / SECONDS) + 100});

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(cache.getUserQuotaFor.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], CONFLICT_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Quota limit reached.");
      });
    });

    it("should reject if cached quota is valid but Twitter API rejects", () => {
      simple.mock(cache, "getUserQuotaFor").resolveWith(null);
      simple.mock(twitter, "getUserTimeline").rejectWith({
        quota: {
          remaining: 0,
          resetTs: (Date.now() / SECONDS) + 100,
          valid: false
        },
        error: {
          quotaLimitReached: true
        }
      });

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(cache.getUserQuotaFor.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], CONFLICT_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Quota limit reached.");
      });
    });

    describe("should log when quota usage is high", () => {
      it("should log when quota information is not available", () => {
        simple.mock(cache, "getUserQuotaFor").resolveWith(null);

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(cache.getUserQuotaFor.called);

          assert(console.warn.called);
          assert.equal(console.warn.lastCall.args[0], "Missing rate limit headers for company: test");
        });
      });

      it("should log when quota usage is above 50%", () => {
        simple.mock(cache, "getUserQuotaFor").resolveWith(null);

        tlResponse.quota.remaining = 40;
        tlResponse.quota.total = 100;
        tlResponse.quota.resetTs = (Date.now() / SECONDS) + 100;

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(cache.getUserQuotaFor.called);

          assert(console.warn.called);
          assert.equal(console.warn.lastCall.args[0], "Current quota usage above 50% for company: test");
        });
      });

      it("should log when quota usage is above 80%", () => {
        simple.mock(cache, "getUserQuotaFor").resolveWith(null);

        tlResponse.quota.remaining = 15;
        tlResponse.quota.total = 100;
        tlResponse.quota.resetTs = (Date.now() / SECONDS) + 100;

        return timelines.handleGetTweetsRequest(req, res)
        .then(() => {
          assert(cache.getUserQuotaFor.called);

          assert(console.warn.called);
          assert.equal(console.warn.lastCall.args[0], "Current quota usage above 80% for company: test");
        });
      });
    });
  });
});
