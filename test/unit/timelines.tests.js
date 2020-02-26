const assert = require("assert");
const simple = require("simple-mock");

const db = require("../../src/redis-otp/api");
const constants = require("../../src/constants");
const timelines = require("../../src/timelines");
const twitter = require("../../src/twitter");

const { FORBIDDEN_ERROR, SERVER_ERROR } = constants;

// TODO: extract to real tweets structure in following cards.
const sampleTweets = [
  { "id": "1" },
  { "id": "2" }
];

describe("Timelines", () => {
  let req = null;
  let res = null;

  beforeEach(() => {
    req = {
      query: {
        companyId: "test",
        username: "RiseVision"
      }
    };
    res = {
      status: simple.stub(),
      send: simple.stub(),
      json: simple.stub()
    }

    simple.mock(db, "getCredentials").resolveWith({});
  });

  afterEach(() => {
    simple.restore();
  });

  describe("handleGetTweetsRequest", () => {
    it("should reject if credentials do not exist", () => {
      simple.mock(db, "getCredentials").rejectWith(new Error("No credentials for"));

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], FORBIDDEN_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "No credentials for");
      });
    });

    it("should reject if Twitter API call fails", () => {
      simple.mock(twitter, "getUserTimeline").rejectWith(new Error("Network error."));

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], SERVER_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], "Network error.");
      });
    });

    it("should return tweets if Twitter API call is successful", () => {
      simple.mock(twitter, "getUserTimeline").resolveWith(sampleTweets);

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);
        assert.deepEqual(res.json.lastCall.args[0], {
          tweets: sampleTweets
        });

        assert(!res.status.called);
        assert(!res.send.called);
      });
    });
  });
});
