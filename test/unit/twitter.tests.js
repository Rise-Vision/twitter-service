const assert = require("assert");
const simple = require("simple-mock");

const Twitter = require('twitter-lite');
const twitter = require("../../src/twitter");

describe("Twitter", () => {
  afterEach(() => {
    simple.restore();
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
