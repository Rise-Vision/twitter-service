const assert = require("assert");
const simple = require("simple-mock");

const Twitter = require('twitter');
const twitter = require("../../src/twitter");

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
});
