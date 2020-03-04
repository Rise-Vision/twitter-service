/* eslint-disable max-statements */

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
      assert.equal(formatted[0].text, sampleTweets[0].full_text);
      assert.deepEqual(formatted[0].images, ["https://pbs.twimg.com/media/ERpd155WAAIbGuw?format=jpg&name=large"]);
    });

    it("should nullify root values when timeline missing required fields", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].user, "name");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "screen_name");
      Reflect.deleteProperty(modifiedSampleTweets[0].user, "profile_image_url_https");
      Reflect.deleteProperty(modifiedSampleTweets[0], "created_at");
      Reflect.deleteProperty(modifiedSampleTweets[0], "full_text");

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].name === null);
      assert(formatted[0].screenName === null);
      assert(formatted[0].profilePicture === null);
      assert(formatted[0].createdAt === null);
      assert(formatted[0].text === null);
    });

    it("should fallback on 'text' if 'full_text' not present", () => {
      const modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets)),
        text = "Testing fallback on text";

      Reflect.deleteProperty(modifiedSampleTweets[0], "full_text");

      modifiedSampleTweets[0].text = text;

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].text === text);
    });

    it("should return an empty array for 'images' if required fields missing", () => {
      // test for missing "extended_entities"
      let modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0], "extended_entities");

      let formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "media"
      modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities, "media");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for invalid "media"
      modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities, "media");
      modifiedSampleTweets[0].extended_entities.media = "test";

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "type"
      modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities.media[0], "type");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for invalid "type"
      modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));
      modifiedSampleTweets[0].extended_entities.media[0].type = "test";

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "media_url_https"
      modifiedSampleTweets = JSON.parse(JSON.stringify(sampleTweets));

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities.media[0], "media_url_https");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

    });
  });
});
