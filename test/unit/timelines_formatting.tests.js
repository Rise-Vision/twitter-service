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
    it("should populate correct values", () => {
      const formatted = timelineFormatter.getTimelineFormatted(sampleTweets);

      assert.deepEqual(formatted[0].statistics, {
        retweetCount: sampleTweets[0].retweet_count,
        likeCount: sampleTweets[0].favorite_count
      });
    });
  });
});
