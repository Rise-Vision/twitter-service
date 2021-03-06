const assert = require("assert");
const simple = require("simple-mock");

const constants = require("../../src/constants");
const credentials = require("../../src/credentials");
const db = require("../../src/redis-otp/api");
const twitter = require("../../src/twitter");

const {BAD_REQUEST_ERROR, SERVER_ERROR} = constants;

describe("Credentials", () => {
  let req = null;
  let res = null;

  beforeEach(() => {
    req = {
      query: {
        companyId: "test"
      }
    };
    res = {
      status: simple.stub(),
      send: simple.stub(),
      json: simple.stub()
    }
  });

  afterEach(() => {
    simple.restore();
  });

  describe("handleVerifyCredentialsRequest", () => {
    it("should reject if companyId is not provided", (done) => {
      credentials.handleVerifyCredentialsRequest({query: {}}, res)
      .then(() => {
        assert.equal(res.status.lastCall.args[0], BAD_REQUEST_ERROR);
        done();
      });
    });

    it("should reject if credentials do not exist", (done) => {
      simple.mock(db, "getCredentials").rejectWith(new Error("No credentials for"));

      credentials.handleVerifyCredentialsRequest(req, res)
      .then(() => {
        assert(!res.send.called);
        assert(!res.json.lastCall.args[0].success);
        done();
      });
    });

    it("should reject if Twitter credentials are not valid", (done) => {
      const error = new Error("Invalid or expired token");
      error.code = constants.TWITTER_API_INVALID_OR_EXPIRED_TOKEN;

      simple.mock(db, "getCredentials").resolveWith({});
      simple.mock(twitter, "verifyCredentials").rejectWith(error);

      credentials.handleVerifyCredentialsRequest(req, res)
      .then(() => {
        assert(!res.send.called);
        assert(!res.json.lastCall.args[0].success);
        done();
      });
    });

    it("should reject in case of other errors", (done) => {
      simple.mock(db, "getCredentials").rejectWith(new Error("Random error"));

      credentials.handleVerifyCredentialsRequest(req, res)
      .then(() => {
        assert.equal(res.status.lastCall.args[0], SERVER_ERROR);
        assert.equal(res.send.lastCall.args[0], "Random error");
        done();
      });
    });

    it("should send a successful response for valid accounts", (done) => {
      simple.mock(db, "getCredentials").resolveWith({});
      simple.mock(twitter, "verifyCredentials").resolveWith({});

      credentials.handleVerifyCredentialsRequest(req, res)
      .then(() => {
        assert(res.json.lastCall.args[0].success);
        done();
      });
    });
  });
});
