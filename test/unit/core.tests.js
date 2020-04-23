/* eslint-disable no-magic-numbers */
const assert = require("assert");
const simple = require("simple-mock");

const config = require("../../src/config");
const utils = require("../../src/utils");
const core = require("../../src/core");
const cache = require("../../src/redis-cache/api");

describe("Core", () => {
  const companyId = "testCompanyId";
  const presentationId = "testPresentationId";
  const componentId = "testComponentId";
  const useDraft = false;

  beforeEach(() => {
    config.coreBaseUrl = "https://rvacore-test.appspot.com/_ah/api";

    simple.mock(cache, "getCompanyIdFor").resolveWith();
    simple.mock(cache, "getUsernameFor").resolveWith();
    simple.mock(cache, "saveCompanyId").resolveWith();
    simple.mock(cache, "saveUsername").resolveWith();
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

      core.getPresentation(presentationId, componentId, null, useDraft)
      .then(presentation => {
        assert.equal(utils.fetch.lastCall.args[0], `${config.coreBaseUrl}/content/v0/presentation?id=${presentationId}&useDraft=false`);
        assert.equal(presentation.companyId, companyId);
        assert.equal(presentation.username, "cnn");

        assert(cache.getCompanyIdFor.called);
        assert.equal(cache.saveCompanyId.lastCall.args[1], companyId);
        assert.equal(cache.saveUsername.lastCall.args[2], "cnn");

        done();
      })
    });

    it("should reject if failure response is received", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: false,
        statusText: "Not Found"
      });

      core.getPresentation(presentationId, componentId, null, useDraft)
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

      core.getPresentation(presentationId, componentId, null, useDraft)
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

      core.getPresentation(presentationId, componentId, null, useDraft)
      .catch(err => {
        assert.equal(err.message, "Invalid companyId in Presentation");
        done();
      })
    });

    describe("cache", () => {
      const cachedPresentationId = "21c97752-0b8b-4a0c-852c-83c0471a3e00";
      const cachedComponentId = "rise-data-twitter-01";
      const cachedHash = "7e5f08005453cdc84155be70574531e271e05644";
      const cachedCompanyId = "87977ab8-38b6-47fb-ad5e-256b8cc4b46d";
      const cachedUsername = "cnn";

      beforeEach(() => {
        simple.mock(utils, "fetch").resolveWith({
          ok: true,
          json: () => ({items: [
          {
            companyId: cachedCompanyId,
            templateAttributeData: `{"components":[{"id":"${cachedComponentId}","username":"newUsername","maxitems":10}]}`
          }
          ]})
        });
      });

      it("should succeed if presentation data is cached", (done) => {
        simple.mock(utils, "fetch").resolveWith();
        simple.mock(cache, "getCompanyIdFor").resolveWith(cachedCompanyId);
        simple.mock(cache, "getUsernameFor").resolveWith(cachedUsername);

        core.getPresentation(cachedPresentationId, cachedComponentId, cachedHash)
        .then(presentation => {
          assert.equal(presentation.companyId, cachedCompanyId);
          assert.equal(presentation.username, cachedUsername);

          assert(!utils.fetch.called);

          assert(cache.getCompanyIdFor.called);
          assert(cache.getUsernameFor.called);
          assert(!cache.saveCompanyId.called);
          assert(!cache.saveUsername.called);

          done();
        })
      });

      it("should succeed if cache does not exist, but presentation data exists in Core", (done) => {
        core.getPresentation(cachedPresentationId, cachedComponentId, cachedHash)
        .then(presentation => {
          assert.equal(presentation.companyId, cachedCompanyId);
          assert.equal(presentation.username, "newUsername");

          assert(utils.fetch.called);

          assert(cache.getCompanyIdFor.called);
          assert(cache.getUsernameFor.called);
          assert(cache.saveCompanyId.called);
          assert(cache.saveUsername.called);

          done();
        })
      });

      it("should succeed if hash does not match cached data, but presentation data exists in Core", (done) => {
        simple.mock(cache, "getCompanyIdFor").resolveWith(cachedCompanyId);
        simple.mock(cache, "getUsernameFor").resolveWith(cachedUsername);

        core.getPresentation(cachedPresentationId, cachedComponentId, "invalidCache")
        .then(presentation => {
          assert.equal(presentation.companyId, cachedCompanyId);
          assert.equal(presentation.username, "newUsername");

          assert(utils.fetch.called);

          assert(cache.getCompanyIdFor.called);
          assert(cache.getUsernameFor.called);
          assert(cache.saveCompanyId.called);
          assert(cache.saveUsername.called);

          done();
        })
      });

      it("should fail if hash does not match cached data and presentation data does not exist in Core", (done) => {
        simple.mock(utils, "fetch").resolveWith({ok: false, statusText: "Not Found"});
        simple.mock(cache, "getCompanyIdFor").resolveWith(cachedCompanyId);
        simple.mock(cache, "getUsernameFor").resolveWith(cachedUsername);

        core.getPresentation(cachedPresentationId, cachedComponentId, "invalidCache")
        .catch(err => {
          assert(utils.fetch.called);

          assert.equal(err.message, "Not Found");

          assert(cache.getCompanyIdFor.called);
          assert(cache.getUsernameFor.called);
          assert(!cache.saveCompanyId.called);
          assert(!cache.saveUsername.called);

          done();
        });
      });
    });
  });
});
