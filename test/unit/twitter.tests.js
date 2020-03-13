/* eslint-disable init-declarations, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");

const Twitter = require('twitter');
const twitter = require("../../src/twitter");
const config = require("../../src/config");

const sampleTweets = require("./samples/tweets-timeline").data;

describe("Twitter", () => {
  afterEach(() => {
    simple.restore();
  });

  describe("isInvalidOrExpiredTokenError", () => {
    it("should recognize invalid or expired token error", () => {
      const result = twitter.isInvalidOrExpiredTokenError({
        message: "Invalid or expired token."
      });

      assert(result);
    });

    it("should not recognize invalid or expired token error on other message string", () => {
      const result = twitter.isInvalidOrExpiredTokenError({
        message: "Another error."
      });

      assert(!result);
    });

    it("should not recognize invalid or expired token error when there is no message string", () => {
      const result = twitter.isInvalidOrExpiredTokenError({});

      assert(!result);
    });
  });

  describe("isInvalidUsernameError", () => {
    it("should recognize invalid username error", () => {
      const result = twitter.isInvalidUsernameError({
        code: 34
      });

      assert(result);
    });

    it("should not recognize invalid username error on other error code", () => {
      const result = twitter.isInvalidUsernameError({
        code: 10
      });

      assert(!result);
    });

    it("should not recognize invalid username error when there is no error code", () => {
      const result = twitter.isInvalidUsernameError({});

      assert(!result);
    });
  });

  describe("verifyCredentials", () => {
    it("should resolve to true on successful invocation", (done) => {
      simple.mock(Twitter.prototype, "get").resolveWith({});

      twitter.verifyCredentials("test")
      .then(response => {
        assert(response);
        done();
      });
    });

    it("should reject if Twitter API does not indicate success", (done) => {
      const error = {
        message: "Invalid credentials"
      };

      simple.mock(Twitter.prototype, "get").rejectWith([error]);

      twitter.verifyCredentials("test")
      .catch(response => {
        assert.equal(response, error);
        done();
      });
    });
  });

  describe("getUserTimeline", () => {
    let query;

    beforeEach(() => {
      query = {
        username: "risevision",
        status: {}
      };
    });

    it("should request user timeline", () => {
      simple.mock(Twitter.prototype, "get").resolveWith(sampleTweets);

      return twitter.getUserTimeline({}, query)
      .then(response => {
        assert.deepEqual(response, sampleTweets);

        assert(Twitter.prototype.get.called);
        assert.deepEqual(Twitter.prototype.get.lastCall.args[1], {
          screen_name: "risevision",
          count: config.numberOfCachedTweets,
          tweet_mode: "extended"
        });
      });
    });

    it("should request user timeline since last loaded tweet id", () => {
      simple.mock(Twitter.prototype, "get").resolveWith(sampleTweets);

      query.status.lastTweetId = "323222";

      return twitter.getUserTimeline({}, query)
      .then(response => {
        assert.deepEqual(response, sampleTweets);

        assert(Twitter.prototype.get.called);
        assert.deepEqual(Twitter.prototype.get.lastCall.args[1], {
          screen_name: "risevision",
          count: config.numberOfCachedTweets,
          tweet_mode: "extended",
          since_id: "323222"
        });
      });
    });
  });
});
