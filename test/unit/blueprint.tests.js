const assert = require("assert");
const simple = require("simple-mock");

const config = require("../../src/config");
const utils = require("../../src/utils");
const blueprint = require("../../src/blueprint");

const sampleBlueprint = require("./samples/blueprint").data;

describe("Blueprint", () => {
  const productCode = "abc123";

  beforeEach(() => {
    config.coreBlueprintUrl = "https://widgets.risevision.com/staging/templates/PRODUCT_CODE/blueprint.json";
  });

  afterEach(() => {
    simple.restore();
  });

  describe("load", () => {
    it("should configure url with product code and return JSON data when request successful", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: true,
        json: () => sampleBlueprint
      });

      blueprint.load(productCode)
        .then(data => {
          assert.equal(utils.fetch.lastCall.args[0], "https://widgets.risevision.com/staging/templates/abc123/blueprint.json");
          assert.equal(data.width, "1920");
          assert.equal(data.height, "1080");

          done();
        })
    });

    it("should reject if failure response is received", (done) => {
      simple.mock(utils, "fetch").resolveWith({
        ok: false,
        statusText: "Not Found"
      });

      blueprint.load(productCode)
        .catch(err => {
          assert.equal(err.message, "Not Found");
          done();
        })
    });
  });

  describe("extractUsername", () => {
    it("should return the username value of component from blueprint", () => {
      assert.equal(blueprint.extractUsername(sampleBlueprint, "rise-data-twitter-01"), "cnn");
    });

    it("should return null if missing information", () => {
      assert.equal(blueprint.extractUsername({components: [{id: "rise-data-twitter-01"}]}, "rise-data-twitter-01"), null);
    });
  });

});
