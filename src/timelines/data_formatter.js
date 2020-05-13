/* eslint-disable no-warning-comments */

const constants = require('../constants');
const utils = require('../utils');
const allowedMediaTypes = [constants.MEDIA_TYPE_IMAGE, constants.MEDIA_TYPE_ANIMATED_GIF];

const isExpectedMediaFormat = (tweet) => {
  if (!("extended_entities" in tweet)) {return false}

  if (!("media" in tweet.extended_entities)) {return false}

  if (!Array.isArray(tweet.extended_entities.media) || tweet.extended_entities.media.length === 0) {return false;}

  if (!("type" in tweet.extended_entities.media[0])) {return false}

  return allowedMediaTypes.includes(tweet.extended_entities.media[0].type);
};

const getFormattedImageURL = (imageItem) => {
  if (!("media_url_https" in imageItem)) {return ""}

  const baseUrl = imageItem.media_url_https.substring(0, imageItem.media_url_https.lastIndexOf(".")),
    extension = imageItem.media_url_https.slice(imageItem.media_url_https.lastIndexOf(".") + 1),
    name = "large";

  return `${baseUrl}?format=${extension}&name=${name}`
};

const getImagesField = (tweet) => {
  if (!isExpectedMediaFormat(tweet)) {return []}

  const images = tweet.extended_entities.media.map(imageItem => getFormattedImageURL(utils.deepClone(imageItem)));

  return images.filter(url => url !== "");
};

const getQuotedField = (tweet) => {
  if (!("is_quote_status" in tweet)) {return null;}

  if (!tweet.is_quote_status) {return null;}

  if (!("quoted_status" in tweet)) {return null;}

  return getTweetFormatted(tweet.quoted_status, false);
};

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

const getTextField = (tweet) => {
  const data = "retweeted_status" in tweet ? tweet.retweeted_status : tweet;

  if ("full_text" in data) {
    return data.full_text;
  }

  if ("text" in data) {
    return data.text;
  }

  return null;
};

const getLargeProfileUrl = (profileUrl) => {
  return profileUrl.includes("_normal") ? profileUrl.replace("_normal", "") : profileUrl;
}

const getRootFields = (tweet) => {
  const userFields = {};

  if ("user" in tweet) {
    userFields.name = "name" in tweet.user ? tweet.user.name : null;
    userFields.screenName = "screen_name" in tweet.user ? tweet.user.screen_name : null;
    userFields.profilePicture = "profile_image_url_https" in tweet.user ? getLargeProfileUrl(tweet.user.profile_image_url_https) : null;
  } else {
    userFields.name = null;
    userFields.screenName = null;
    userFields.profilePicture = null;
  }

  return Object.assign({}, userFields, {
    createdAt: "created_at" in tweet ? tweet.created_at : null,
    text: getTextField(tweet),
    images: getImagesField(tweet)
  })
};

const getTweetFormatted = (tweet, includeQuoted = true) => {
  const subFields = {};

  subFields.user = getUserFields(tweet);
  subFields.statistics = getStatisticsFields(tweet);
  subFields.quoted = includeQuoted ? getQuotedField(tweet) : null;

  return Object.assign({}, getRootFields(tweet), subFields);
};

const getTimelineFormatted = (timeline) => {
  if (!timeline || !timeline.length || timeline.length <= 0) {
    return [];
  }

  return timeline.map(tweet => getTweetFormatted(utils.deepClone(tweet)));
};

module.exports = {
  getTimelineFormatted
};
