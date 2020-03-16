/* eslint-disable no-magic-numbers */

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;
const PERCENT = 100;

module.exports = {
  SECONDS,
  MINUTES,
  HOURS,
  PERCENT,
  BAD_REQUEST_ERROR: 400,
  FORBIDDEN_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  CONFLICT_ERROR_MESSAGE: "Another request is already loading user timeline. Please retry in a few seconds.",
  SERVER_ERROR: 500,
  MEDIA_TYPE_IMAGE: "photo",
  MEDIA_TYPE_ANIMATED_GIF: "animated_gif",

  // Twitter API codes: https://developer.twitter.com/en/docs/basics/response-codes
  TWITTER_API_RESOURCE_NOT_FOUND_CODE: 34
};
