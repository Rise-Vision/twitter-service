/* eslint-disable no-warning-comments */

const getStatisticsFields = (tweet) => {
  return {
    retweetCount: "retweet_count" in tweet ? tweet.retweet_count : null,
    likeCount: "favorite_count" in tweet ? tweet.favorite_count : null
  };
};

const getUserFields = (tweet) => {
  if (!("user" in tweet)) {return {}}

  return {
    description: "description" in tweet.user ? tweet.user.description : null,
    statuses: "statuses_count" in tweet.user ? tweet.user.statuses_count : null,
    followers: "followers_count" in tweet.user ? tweet.user.followers_count : null
  };
};

const getRootFields = (tweet) => {
  const userFields = {};

  if ("user" in tweet) {
    userFields.name = "name" in tweet.user ? tweet.user.name : null;
    userFields.screenName = "screen_name" in tweet.user ? tweet.user.screen_name : null;
    userFields.profilePicture = "profile_image_url_https" in tweet.user ? tweet.user.profile_image_url_https : null;
  } else {
    userFields.name = null;
    userFields.screenName = null;
    userFields.profilePicture = null;
  }

  // TODO: text, image, and quoted fields

  return Object.assign({}, userFields, {
    createdAt: "created_at" in tweet ? tweet.created_at : null
  })
};

const getTweetFormatted = (tweet) => {
  const subFields = {};

  subFields.user = getUserFields(tweet);
  subFields.statistics = getStatisticsFields(tweet);

  return Object.assign({}, getRootFields(tweet), subFields);
};

const getTimelineFormatted = (timeline) => {
  if (!timeline || !timeline.length || timeline.length <= 0) {
    return [];
  }

  return timeline.map(tweet => getTweetFormatted(JSON.parse(JSON.stringify(tweet))));
};

module.exports = {
  getTimelineFormatted
};
