const assert = require("assert");
const simple = require("simple-mock");

const cache = require('../../src/redis-cache/api');
const oauthTokenProvider = require("../../src/redis-otp/api");
const constants = require("../../src/constants");
const timelines = require("../../src/timelines");
const twitter = require("../../src/twitter");

const sample2Tweets = require("./samples/tweets-2").data;
const sample30Tweets = require("./samples/tweets-30").data;

const {
  BAD_REQUEST_ERROR, CONFLICT_ERROR, CONFLICT_ERROR_MESSAGE, FORBIDDEN_ERROR,
  SERVER_ERROR
} = constants;

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

    simple.mock(cache, "getStatusFor").resolveWith({loading: false})
    simple.mock(oauthTokenProvider, "getCredentials").resolveWith({});
  });

  afterEach(() => {
    simple.restore();
  });

  describe("handleGetTweetsRequest", () => {
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

    it("should reject if the loading flag is set", () => {
      simple.mock(cache, "getStatusFor").resolveWith({loading: true});

      return timelines.handleGetTweetsRequest(req, res)
      .then(() => {
        assert(!res.json.called);

        assert(res.status.called);
        assert.equal(res.status.lastCall.args[0], CONFLICT_ERROR);

        assert(res.send.called);
        assert.equal(res.send.lastCall.args[0], CONFLICT_ERROR_MESSAGE);
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

    it("should return tweets even if there's no username status stored", () => {
      simple.mock(twitter, "getUserTimeline").resolveWith(sample2Tweets);
      simple.mock(cache, "getStatusFor").resolveWith(null);

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

    it("should return 25 tweets by default", () => {
      simple.mock(twitter, "getUserTimeline").resolveWith(sample30Tweets);

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

      simple.mock(twitter, "getUserTimeline").resolveWith(sample30Tweets);

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
