const assert = require("assert");
const simple = require("simple-mock");

const config = require("../../src/config");
const utils = require("../../src/utils");
const core = require("../../src/core");

describe("Core", () => {
  const companyId = "testCompanyId";
  const presentationId = "testPresentationId";
  const componentId = "testComponentId";

  beforeEach(() => {
    config.coreBaseUrl = "https://rvacore-test.appspot.com/_ah/api";
  });

  afterEach(() => {
    simple.restore();
  });

  describe("getPresentation", () => {
    it("should succeed if presentation data is complete", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: true,
        json: () => ({items: [
        {
          companyId,
          templateAttributeData: `{"components":[{"id":"${componentId}","username":"cnn","maxitems":10}]}`
        }
        ]})
      });

      core.getPresentation(presentationId, componentId)
      .then(presentation => {
        assert.equal(utils.fetch.lastCall.args[0], `${config.coreBaseUrl}/content/v0/presentation?id=${presentationId}`);
        assert.equal(presentation.companyId, companyId);
        assert.equal(presentation.username, "cnn");
        done();
      })
    });

    it("should reject if failure response is received", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: false,
        statusText: "Not Found"
      });

      core.getPresentation(presentationId, componentId)
      .catch(err => {
        assert.equal(err.message, "Not Found");
        done();
      })
    });

    it("should reject if empty response is received", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: true,
        json: () => ({items: []})
      });

      core.getPresentation(presentationId, componentId)
      .catch(err => {
        assert.equal(err.message, "Invalid response");
        done();
      })
    });

    it("should reject if presentation data is not complete", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: true,
        json: () => ({items: [{}]})
      });

      core.getPresentation(presentationId, componentId)
      .catch(err => {
        assert.equal(err.message, "Invalid companyId in Presentation");
        done();
      })
    });

    it("should reject if presentation data is not complete", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: true,
        json: () => ({items: [{}]})
      });

      core.getPresentation(presentationId, componentId)
      .catch(err => {
        assert.equal(err.message, "Invalid companyId in Presentation");
        done();
      })
    });
  });
});
