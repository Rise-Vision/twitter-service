/* eslint-disable max-statements, no-magic-numbers */

const assert = require("assert");
const simple = require("simple-mock");
const utils = require("../../src/utils");

const timelineFormatter = require("../../src/timelines/data_formatter");

const sampleTweets = require("./samples/tweets-timeline").data;

describe("Timelines Data Formatting", () => {

  beforeEach(() => {

  });

  afterEach(() => {
    simple.restore();
  });

  describe("isQuotedTweet", () => {
    it("should return false when not a quote tweet", () => {
      assert(!timelineFormatter.isQuotedTweet(sampleTweets[0]));
    });

    it("should return true when is a quote tweet", () => {
      assert(timelineFormatter.isQuotedTweet(sampleTweets[2]));
    });
  });

  describe("getTextWithoutShortenedUrls()", () => {
    it("should return the text without the API shortened url at the end", () => {
      assert.equal(timelineFormatter.getTextWithoutShortenedUrls(sampleTweets[2].full_text), "Example quoted tweet️");
    });

    it("should return the text without multiple shortened urls at the end", () => {
      const text = "original message";

      assert.equal(timelineFormatter.getTextWithoutShortenedUrls(`${text} https://t.co/TEST1 https://t.co/TEST2`), text);
    });

    it("should return the text unchanged if the API did not add shortened url at the end", () => {
      assert.equal(timelineFormatter.getTextWithoutShortenedUrls(sampleTweets[0].full_text), sampleTweets[0].full_text);
    });

    it("should return the text unchanged if the url at the end is not an API shortened url", () => {
      assert.equal(timelineFormatter.getTextWithoutShortenedUrls(`${sampleTweets[0].full_text} https://test.com`), `${sampleTweets[0].full_text} https://test.com`);
    });
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
      const modifiedSampleTweets = utils.deepClone(sampleTweets);

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
      const modifiedSampleTweets = utils.deepClone(sampleTweets);

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
      const modifiedSampleTweets = utils.deepClone(sampleTweets);

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
      assert.equal(formatted[0].profilePicture, "https://pbs.twimg.com/profile_images/1145679135873933312/OF0s1_Pe.png");
      assert.equal(formatted[0].createdAt, sampleTweets[0].created_at);
      assert.equal(formatted[0].text, sampleTweets[0].full_text);
      assert.deepEqual(formatted[0].images, ["https://pbs.twimg.com/media/ERpd155WAAIbGuw?format=jpg&name=large"]);
    });

    it("should nullify root values when timeline missing required fields", () => {
      const modifiedSampleTweets = utils.deepClone(sampleTweets);

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
      const modifiedSampleTweets = utils.deepClone(sampleTweets),
        text = "Testing fallback on text";

      Reflect.deleteProperty(modifiedSampleTweets[0], "full_text");

      modifiedSampleTweets[0].text = text;

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].text === text);
    });

    it("should return 'full_text' from 'retweeted_status' if present", () => {
      const modifiedSampleTweets = utils.deepClone(sampleTweets),
        name = "original tweeter",
        text = "original message";

      modifiedSampleTweets[0].retweeted_status = {
        "full_text": text,
        "user": {
          "screen_name": name
        }
      };

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].text === `RT @${name}: ${text}`);
    });

    it("should fallback on 'text' from 'retweeted_status' if 'full_text' not present", () => {
      const modifiedSampleTweets = utils.deepClone(sampleTweets),
        name = "original tweeter",
        text = "original message";

      modifiedSampleTweets[0].retweeted_status = {
        text,
        "user": {
          "screen_name": name
        }
      };

      const formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[0].text === `RT @${name}: ${text}`);
    });

    it("should remove the shortened url from the text for quote tweets", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.equal(formatted[2].text, "Example quoted tweet️");
    });

    it("should return an empty array for 'images' if required fields missing", () => {
      // test for missing "extended_entities"
      let modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[0], "extended_entities");

      let formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "media"
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities, "media");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for invalid "media"
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities, "media");
      modifiedSampleTweets[0].extended_entities.media = "test";

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "type"
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities.media[0], "type");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for invalid "type"
      modifiedSampleTweets = utils.deepClone(sampleTweets);
      modifiedSampleTweets[0].extended_entities.media[0].type = "test";

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

      // test for missing "media_url_https"
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[0].extended_entities.media[0], "media_url_https");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert.deepEqual(formatted[0].images, []);

    });
  });

  describe("getTimelineFormatted / quoted", () => {
    it("should populate quoted object", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.deepEqual(formatted[2].quoted.user, {
        description: sampleTweets[2].quoted_status.user.description,
        statuses: sampleTweets[2].quoted_status.user.statuses_count,
        followers: sampleTweets[2].quoted_status.user.followers_count
      });

      assert.deepEqual(formatted[2].quoted.statistics, {
        retweetCount: sampleTweets[2].quoted_status.retweet_count,
        likeCount: sampleTweets[2].quoted_status.favorite_count
      });

      assert.equal(formatted[2].quoted.name, sampleTweets[2].quoted_status.user.name);
      assert.equal(formatted[2].quoted.screenName, sampleTweets[2].quoted_status.user.screen_name);
      assert.equal(formatted[2].quoted.profilePicture, "https://pbs.twimg.com/profile_images/1197533022263877635/JxM1Ba0d.jpg");
      assert.equal(formatted[2].quoted.createdAt, sampleTweets[2].quoted_status.created_at);
      assert.equal(formatted[2].quoted.text, sampleTweets[2].quoted_status.full_text);
      assert.deepEqual(formatted[2].images, []);

      assert(formatted[2].quoted.quoted === null);
    });

    it("should nullify 'quoted' if required fields missing", () => {
      // test for missing "is_quote_status"
      let modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[2], "is_quote_status");

      let formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[2].quoted === null);

      // test for quote_status equal to false
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      modifiedSampleTweets[2].is_quote_status = false;

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[2].quoted === null);

      // test for missing "quoted_status"
      modifiedSampleTweets = utils.deepClone(sampleTweets);

      Reflect.deleteProperty(modifiedSampleTweets[2], "quoted_status");

      formatted = timelineFormatter.getTimelineFormatted(modifiedSampleTweets);

      assert(formatted[2].quoted === null);
    });

  });
});
