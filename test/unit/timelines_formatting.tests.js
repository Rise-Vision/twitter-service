const assert = require("assert");
const simple = require("simple-mock");

const timelineFormatter = require("../../src/timelines/data_formatter");

const sampleTweets = require("./samples/tweets-timeline").data;

describe("Timelines Data Formatting", () => {

  beforeEach(() => {

  });

  afterEach(() => {
    simple.restore();
  });

  describe("getTimelineFormatted / statistics", () => {
    it("should populate statistics values", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.deepEqual(formatted[0].statistics, {
        retweetCount: sampleTweets[0].retweet_count,
        likeCount: sampleTweets[0].favorite_count
      });
    });

    it("should nullify statistics values when timeline missing required fields", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0], "retweet_count");
      Reflect.deleteProperty(modifiedSampleTweets[0], "favorite_count");

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].statistics, {
        retweetCount: null,
        likeCount: null
      });
    });
  });

  describe("getTimelineFormatted / user", () => {
    it("should populate user values", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.deepEqual(formatted[0].user, {
        description: sampleTweets[0].user.description,
        statuses: sampleTweets[0].user.statuses_count,
        followers: sampleTweets[0].user.followers_count
      });
    });

    it("should nullify user values when timeline missing required user fields", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].user, "description");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "statuses_count");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "followers_count");

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].user, {
        description: null,
        statuses: null,
        followers: null
      });
    });

    it("should populate empty object for user when required user field missing", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0], "user");

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].user, {});
    });
  });

  describe("getTimelineFormatted / root", () => {
    it("should populate root values", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.equal(formatted[0].name, sampleTweets[0].user.name);
      assert.equal(formatted[0].screenName, sampleTweets[0].user.screen_name);
      assert.equal(formatted[0].profilePicture, sampleTweets[0].user.profile_image_url_https);
      assert.equal(formatted[0].createdAt, sampleTweets[0].created_at);
    });

    it("should nullify root values when timeline missing required fields", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].user, "name");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "screen_name");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "profile_image_url_https");
      Reflect.deleteProperty(modifiedSampleTweets[0], "created_at");

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].name === null);
      assert(formatted[0].screenName === null);
      assert(formatted[0].profilePicture === null);
      assert(formatted[0].createdAt === null);
    });
  });
});