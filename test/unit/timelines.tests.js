const assert = require("assert");
const simple = require("simple-mock");

const db = require("../../src/redis-otp/api");
const constants = require("../../src/constants");
const timelines = require("../../src/timelines");
const twitter = require("../../src/twitter");

const sample2Tweets = require("./samples/tweets-2").data;
const sample20Tweets = require("./samples/tweets-20").data;

const { FORBIDDEN_ERROR, SERVER_ERROR } = constants;

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
      simple.mock(twitter, "getUserTimeline").resolveWith(sample2Tweets);

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);
        assert.deepEqual(res.json.lastCall.args[0], {
          tweets: sample2Tweets
        });

        assert(!res.status.called);
        assert(!res.send.called);
      });
    });

    it("should return 10 tweets by default", () => {
      simple.mock(twitter, "getUserTimeline").resolveWith(sample20Tweets);

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(res.json.called);

        const data = res.json.lastCall.args[0];
        assert(data);
        assert(data.tweets);
        assert.equal(10, data.tweets.length);

        assert(!res.status.called);
        assert(!res.send.called);
      });
    });

    it("should limit number of tweets based on count param", () => {
      req.query.count = "15";

      simple.mock(twitter, "getUserTimeline").resolveWith(sample20Tweets);

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
});
