/* eslint-disable no-magic-numbers */

const {HOURS, MINUTES} = require('./constants');

module.exports = {
  defaultPort: 80,
  defaultTweetCount: 25,
  cacheExpirationInMillis: 4 * HOURS,
  loadingFlagTimeoutInMillis: 2 * MINUTES,

  /* client will be asked to retry after this time to see if loading flag has been cleared */
  retryLoadInSeconds: 30,
  numberOfCachedTweets: 100,
  redisCacheHostname: "ts-redis-master",
  redisOtpHostname: "otp-redis-master"
};
