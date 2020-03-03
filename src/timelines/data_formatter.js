
const getStatisticsFields = (tweet) => {
  return {
    retweetCount: !("retweet_count" in tweet) ? null : tweet.retweet_count,
    likeCount: !("favorite_count" in tweet) ? null : tweet.favorite_count
  };
};

const getUserFields = (tweet) => {
  if (!("user" in tweet)) { return {}}

  return {
    description: !("description" in tweet.user) ? null : tweet.user.description,
    statuses: !("statuses_count" in tweet.user) ? null : tweet.user.statuses_count,
    followers: !("followers_count" in tweet.user) ? null : tweet.user.followers_count
  };
};

const getRootFields = (tweet) => {
  let userFields = {};

  if (!("user" in tweet)) {
    userFields.name = userFields.screenName = userFields.profilePicture = null;
  } else {
    userFields.name = !("name" in tweet.user) ? null : tweet.user.name;
    userFields.screenName = !("screen_name" in tweet.user) ? null : tweet.user.screen_name;
    userFields.profilePicture = !("profile_image_url_https" in tweet.user) ? null : tweet.user.profile_image_url_https;
  }

  // TODO: text, image, and quoted fields

  return Object.assign({}, userFields, {
    createdAt: !("created_at" in tweet) ? null : tweet.created_at
  })
};

const getTweetFormatted = (tweet) => {
  let subFields = {};

  subFields.user = getUserFields(tweet);
  subFields.statistics = getStatisticsFields(tweet);

  return Object.assign({}, getRootFields(tweet), subFields);
};

const getTimelineFormatted = (timeline) => {
  if (!timeline || !timeline.length || timeline.length <= 0) {
    return [];
  }

  return timeline.map(tweet => getTweetFormatted((JSON.parse(JSON.stringify(tweet)))));
};

module.exports = {
  getTimelineFormatted
};
